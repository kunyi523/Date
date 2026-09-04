/**
 * 今天，怎么心动？ · 后台
 *
 * 干四件事：
 *   1. 收情侣们对某个地点的评分（POST /reviews）
 *   2. 合并之后按地点发回来（GET /places?ids=…&mbti=…）
 *   3. 顺手代理天气和卡池，让前端只认一个域名（GET /weather, /cards, /sweet）
 *   4. 把整份计划换成一个 6 位短链，贴进聊天软件有卡片预览（POST /plans → GET /p/:id）
 *
 * 不做账号。一台设备一个随机 id（前端生成，存在本机），同一对情侣对同一个地点
 * 只算最新一条。收上来的只有：地点标识、分数、几个布尔维度、标签、一句话、
 * MBTI 组合、设备 id、时间。没有位置、没有姓名、没有联系方式。
 *
 * 部署：README.md 里有一个「Deploy to Cloudflare」按钮，点一下就会在你自己的
 * 账号里开好 Worker 和 D1、建好表。想用命令行就是：
 *   npm install && wrangler login
 *   wrangler d1 create xindong      # 把 database_id 填进 wrangler.toml
 *   npm run deploy                  # = d1 migrations apply DB --remote && wrangler deploy
 * 然后打开 https://kunyi523.github.io/Date/?api=https://你的.workers.dev
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });

const DIMS = ['quiet', 'pair', 'linger', 'photo', 'noqueue'];
const FIT_TAGS = ['第一次约会', '纪念日', '随便逛逛', '深夜', '带家人也行'];
const COSTS = ['穷开心', '小奢侈', '豪华版'];

/** 只留能认的字段，长度也掐住，别让人往库里塞东西 */
function clean(body) {
  const pid = String(body.pid || '').slice(0, 120);
  if (!/^(osm:(node|way|relation)\/\d+|act:.{1,60})$/.test(pid)) return null;

  const r = Math.round(Number(body.r));
  if (!(r >= 1 && r <= 5)) return null;

  const dims = {};
  for (const k of DIMS) dims[k] = body.dims && body.dims[k] ? 1 : 0;

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t) => FIT_TAGS.includes(t)).slice(0, 5)
    : [];

  const cost = COSTS.includes(body.cost) ? body.cost : '';

  // 评价文字是要给别的情侣看的，所以卡短一点，也不接受换行和链接。
  // 去掉链接之后剩下的碎片（"去  领红包"）不该被当成一句话，太短就整条丢掉。
  let txt = String(body.txt || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[a-z0-9.-]+\.(com|cn|net|org|xyz|top|vip)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 60);
  if (txt.length < 4) txt = '';

  const mbti = String(body.mbti || '')
    .toUpperCase()
    .split('-')
    .filter((t) => /^[EI][NS][TF][JP]$/.test(t))
    .sort()
    .slice(0, 2)
    .join('-');

  const by = String(body.by || '').slice(0, 40);
  if (!/^[a-z0-9]{4,40}$/i.test(by)) return null;

  return {
    pid,
    name: String(body.name || '').slice(0, 60),
    r,
    dims,
    tags,
    cost,
    txt,
    mbti,
    by,
  };
}

/**
 * 两对情侣有多像，返回 0–4（4 是一模一样）。
 *
 * 不能把一对情侣压成"共识字母"（两人一致取该字母、不一致记 ?）——互补型的情侣
 * （比如 ENFP + ISFJ，四个轴里三个都相反）会变成三个 ?，于是永远匹配不到任何人，
 * 连另一对同样是 ENFP+ISFJ 的都匹配不上。
 *
 * 所以按"这一对里有几个人偏这一头"来算：每个轴取 0 / .5 / 1，
 * 再比两对之间的差。ENFP+ISFJ 对上 ENFP+ISFJ 就是满分。
 */
const AXIS_FIRST = ['E', 'N', 'T', 'J'];
function mbtiProfile(pair) {
  const types = String(pair || '').split('-').filter((t) => /^[EI][NS][TF][JP]$/.test(t));
  if (!types.length) return null;
  return AXIS_FIRST.map((letter, i) =>
    types.reduce((n, t) => n + (t[i] === letter ? 1 : 0), 0) / types.length
  );
}
function mbtiCloseness(a, b) {
  const x = mbtiProfile(a), y = mbtiProfile(b);
  if (!x || !y) return 0;
  let dist = 0;
  for (let i = 0; i < 4; i++) dist += Math.abs(x[i] - y[i]);
  return 4 - dist;
}

function aggregate(rows, mbti) {
  const out = {};
  for (const row of rows) {
    const pid = row.pid;
    let a = out[pid];
    if (!a) {
      a = out[pid] = {
        n: 0, sum: 0,
        dimSum: Object.fromEntries(DIMS.map((k) => [k, 0])),
        tagCount: {},
        quotes: [],
        match: { n: 0, sum: 0 },
        cost: {},
      };
    }
    a.n++;
    a.sum += row.r;
    let dims = {};
    try { dims = JSON.parse(row.dims || '{}'); } catch {}
    for (const k of DIMS) if (dims[k]) a.dimSum[k]++;
    let tags = [];
    try { tags = JSON.parse(row.tags || '[]'); } catch {}
    for (const t of tags) a.tagCount[t] = (a.tagCount[t] || 0) + 1;
    if (row.cost) a.cost[row.cost] = (a.cost[row.cost] || 0) + 1;
    // 只有"看起来是认真填的"评价才会被引用给别的情侣看：给了 4 分以上、
    // 话说得完整、而且至少勾了一个维度或标签。这不是内容审核，只是抬一下门槛。
    const substantial = Object.values(dims).some(Boolean) || tags.length > 0;
    if (row.txt && row.txt.length >= 6 && row.r >= 4 && substantial && a.quotes.length < 3) {
      a.quotes.push(row.txt);
    }
    // 和请求方 MBTI 至少三个轴一致，才算"和你们像的"
    if (mbti && mbtiCloseness(mbti, row.mbti) >= 3) {
      a.match.n++;
      a.match.sum += row.r;
    }
  }

  const places = {};
  for (const [pid, a] of Object.entries(out)) {
    const dims = {};
    for (const k of DIMS) dims[k] = +(a.dimSum[k] / a.n).toFixed(2);
    places[pid] = {
      n: a.n,
      score: +(a.sum / a.n).toFixed(2),
      dims,
      tags: Object.entries(a.tagCount).sort((p, q) => q[1] - p[1]).slice(0, 4),
      cost: Object.entries(a.cost).sort((p, q) => q[1] - p[1])[0]?.[0] || '',
      quotes: a.quotes,
      match: a.match.n ? { n: a.match.n, score: +(a.match.sum / a.match.n).toFixed(2) } : { n: 0, score: 0 },
    };
  }
  return places;
}

async function getPlaces(env, url) {
  const ids = (url.searchParams.get('ids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 60);
  if (!ids.length) return json({ places: {} });

  const mbti = String(url.searchParams.get('mbti') || '').toUpperCase();
  const marks = ids.map(() => '?').join(',');
  const { results } = await env.DB.prepare(
    `SELECT pid, r, dims, tags, cost, txt, mbti FROM reviews
      WHERE pid IN (${marks}) AND hidden = 0`
  ).bind(...ids).all();

  return json({ places: aggregate(results || [], mbti) });
}

/**
 * 按 IP 限流。
 *
 * 只按 by_id 限流是没用的：by_id 是前端自己随机生成的，换一个就绕过去了。
 * 所以真正拦得住的是 IP，Cloudflare 直接把它放在 CF-Connecting-IP 里。
 * IP 不入库（存进去就等于存了位置），只存一个哈希，而且只留一小时。
 */
async function ipHash(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const salt = (env && (env.IP_SALT || 'xindong-default-salt')) || 'xindong';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + '|' + ip));
  return [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}
const IP_PER_HOUR = 40;

async function postReview(env, request) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }

  const rec = clean(body);
  if (!rec) return json({ error: 'bad review' }, 400);

  const now = Date.now();
  const since = now - 3600e3;

  // 先按 IP 拦：换 by_id 绕不过去
  const ip = await ipHash(request, env);
  await env.DB.prepare('DELETE FROM hits WHERE at <= ?').bind(since).run();
  const { results: byIp } = await env.DB.prepare(
    'SELECT COUNT(*) AS c FROM hits WHERE ip = ? AND at > ?'
  ).bind(ip, since).all();
  if ((byIp?.[0]?.c || 0) >= IP_PER_HOUR) return json({ error: 'slow down' }, 429);

  // 再按设备拦：同一对情侣手滑连点也不该刷满
  const { results: recent } = await env.DB.prepare(
    'SELECT COUNT(*) AS c FROM reviews WHERE by_id = ? AND at > ?'
  ).bind(rec.by, since).all();
  if ((recent?.[0]?.c || 0) >= 20) return json({ error: 'slow down' }, 429);

  await env.DB.prepare('INSERT INTO hits (ip, at) VALUES (?, ?)').bind(ip, now).run();

  // 同一台设备对同一个地点只保留最新一条
  await env.DB.prepare(
    `INSERT INTO reviews (pid, name, r, dims, tags, cost, txt, mbti, by_id, at, hidden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(pid, by_id) DO UPDATE SET
       name=excluded.name, r=excluded.r, dims=excluded.dims, tags=excluded.tags,
       cost=excluded.cost, txt=excluded.txt, mbti=excluded.mbti, at=excluded.at`
  ).bind(
    rec.pid, rec.name, rec.r,
    JSON.stringify(rec.dims), JSON.stringify(rec.tags),
    rec.cost, rec.txt, rec.mbti, rec.by, Date.now()
  ).run();

  return json({ ok: true });
}

/* ── 两个人共一张地图 ──
   couple id 是不可枚举的随机串，知道它就等于有权限——和分享链接一样的思路，
   没有账号也就没有账号能泄露的东西。每台设备上传"自己那半张"，读回来的是对方那半张。 */
const COUPLE_RE = /^c[a-z0-9]{16,40}$/;
const COUPLE_MAX = 420 * 1024;      // 一台设备最多这么多，主要是给缩略图留的

function cleanPins(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 400).map((p) => {
    const out = {
      sig: String(p.sig || '').slice(0, 200),
      i: Math.max(0, Math.min(20, parseInt(p.i, 10) || 0)),
      ymd: /^\d{4}-\d{2}-\d{2}$/.test(p.ymd) ? p.ymd : '',
      title: String(p.title || '').slice(0, 60),
      at: Number(p.at) || 0,
    };
    if (isFinite(p.lat) && isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180) {
      out.lat = +Number(p.lat).toFixed(5);
      out.lon = +Number(p.lon).toFixed(5);
    }
    // 只接 data:image 的缩略图，别让人把这里当图床
    if (typeof p.thumb === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(p.thumb) && p.thumb.length < 120000) {
      out.thumb = p.thumb;
    }
    return out;
  }).filter((p) => p.sig && p.title);
}

async function putCouple(env, request) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }

  const couple = String(body.couple || '');
  const by = String(body.by || '');
  if (!COUPLE_RE.test(couple)) return json({ error: 'bad couple' }, 400);
  if (!/^[a-z0-9]{4,40}$/i.test(by)) return json({ error: 'bad device' }, 400);

  const data = JSON.stringify({ pins: cleanPins(body.pins) });
  if (data.length > COUPLE_MAX) return json({ error: 'too big' }, 413);

  const now = Date.now();
  const ip = await ipHash(request, env);
  await env.DB.prepare('DELETE FROM hits WHERE at <= ?').bind(now - 3600e3).run();
  const { results: byIp } = await env.DB.prepare(
    'SELECT COUNT(*) AS c FROM hits WHERE ip = ? AND at > ?'
  ).bind(ip, now - 3600e3).all();
  if ((byIp?.[0]?.c || 0) >= 120) return json({ error: 'slow down' }, 429);
  await env.DB.prepare('INSERT INTO hits (ip, at) VALUES (?, ?)').bind(ip, now).run();

  await env.DB.prepare(
    `INSERT INTO couple_state (couple, by_id, at, data) VALUES (?, ?, ?, ?)
     ON CONFLICT(couple, by_id) DO UPDATE SET at = excluded.at, data = excluded.data`
  ).bind(couple, by, now, data).run();

  return json({ ok: true, at: now });
}

async function getCouple(env, url) {
  const couple = String(url.searchParams.get('id') || '');
  const me = String(url.searchParams.get('by') || '');
  if (!COUPLE_RE.test(couple)) return json({ error: 'bad couple' }, 400);

  const { results } = await env.DB.prepare(
    'SELECT by_id, at, data FROM couple_state WHERE couple = ? AND by_id <> ? ORDER BY at DESC LIMIT 4'
  ).bind(couple, me).all();

  const others = (results || []).map((row) => {
    let pins = [];
    try { pins = JSON.parse(row.data).pins || []; } catch {}
    return { by: row.by_id, at: row.at, pins };
  });
  return json({ others });
}

/* ── 桌上二维码的核销计数 ──
   这是商家唯一能看到的数字，也是唯一的归因来源：她主动点了"给店员看这一下"。
   只存店铺标识和时间。不带 couple id、不带位置、不带任何打卡记录——
   打卡和照片一个字节都不出用户的手机，这条承诺不因为商家而松动。 */
async function postRedeem(env, request) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const shop = String(body.shop || '').slice(0, 40);
  if (!/^[\w\u4e00-\u9fa5.-]{1,40}$/.test(shop)) return json({ error: 'bad shop' }, 400);

  const now = Date.now();
  const ip = await ipHash(request, env);
  await env.DB.prepare('DELETE FROM hits WHERE at <= ?').bind(now - 3600e3).run();
  const { results } = await env.DB.prepare(
    'SELECT COUNT(*) AS c FROM hits WHERE ip = ? AND at > ?'
  ).bind(ip, now - 3600e3).all();
  if ((results?.[0]?.c || 0) >= 60) return json({ error: 'slow down' }, 429);
  await env.DB.prepare('INSERT INTO hits (ip, at) VALUES (?, ?)').bind(ip, now).run();

  // first：这台手机以前在这家店出示过没有。判断在手机上做，这里只收一个比特。
  // 老板娘想看的是回头客，而这一个比特就够画出那一栏，仍然不带任何用户标识。
  const first = body.first ? 1 : 0;
  await env.DB.prepare('INSERT INTO redeems (shop, at, first_time) VALUES (?, ?, ?)')
    .bind(shop, now, first).run();
  return json({ ok: true });
}

/**
 * 老板娘那一页要的数据。不给一个大数字——第一个月可能就是 3，一个大大的"3"
 * 显得可怜；按天打点才看得出在发生。外加回头那一栏。
 */
async function getShop(env, url) {
  const shop = String(url.searchParams.get('id') || '').slice(0, 40);
  if (!shop) return json({ error: 'bad shop' }, 400);
  const since = Date.now() - 30 * 86400e3;
  const { results: days } = await env.DB.prepare(
    `SELECT date(at / 1000, 'unixepoch') AS d,
            COUNT(*) AS n,
            SUM(CASE WHEN first_time = 1 THEN 1 ELSE 0 END) AS f
       FROM redeems WHERE shop = ? AND at > ?
      GROUP BY d ORDER BY d`
  ).bind(shop, since).all();
  const { results: all } = await env.DB.prepare(
    'SELECT COUNT(*) AS t, SUM(CASE WHEN first_time = 1 THEN 1 ELSE 0 END) AS f FROM redeems WHERE shop = ?'
  ).bind(shop).all();
  const series = (days || []).map((r) => ({ d: r.d, n: r.n || 0, f: r.f || 0 }));
  const last30 = series.reduce((a, r) => a + r.n, 0);
  const first30 = series.reduce((a, r) => a + r.f, 0);
  return json({
    shop,
    last30,
    first: first30,
    repeat: last30 - first30,
    total: all?.[0]?.t || 0,
    days: series
  });
}

/** 卡池：把收到的评分反过来喂回抽卡——评分高的真实地点会更容易被抽到 */
async function getCards(env, url) {
  const lat = parseFloat(url.searchParams.get('lat'));
  const lon = parseFloat(url.searchParams.get('lon'));
  if (!isFinite(lat) || !isFinite(lon)) return json({ cards: [] });

  // 只推被情侣们打过分、且分数不低的地点
  const { results } = await env.DB.prepare(
    `SELECT pid, name, AVG(r) AS score, COUNT(*) AS n,
            GROUP_CONCAT(txt, '␟') AS txts
       FROM reviews
      WHERE hidden = 0 AND name <> '' AND pid LIKE 'osm:%'
      GROUP BY pid
     HAVING n >= 2 AND score >= 4
      ORDER BY score DESC, n DESC
      LIMIT 40`
  ).all();

  const cards = (results || []).map((row) => ({
    title: row.name,
    detail: '别的情侣把这儿评得很高',
    category: '食',
    rating: +Number(row.score).toFixed(1),
    reviews: row.n,
    summary: String(row.txts || '').split('␟').filter(Boolean)[0] || '',
    near: true,
    source: row.pid,
  }));
  return json({ cards });
}

async function proxyWeather(url) {
  const lat = parseFloat(url.searchParams.get('lat'));
  const lon = parseFloat(url.searchParams.get('lon'));
  if (!isFinite(lat) || !isFinite(lon)) return json({ error: 'bad coords' }, 400);
  const up = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,weather_code'
  );
  const j = await up.json();
  return json({ temp: Math.round(j?.current?.temperature_2m), code: j?.current?.weather_code });
}

/* ── 短链 + 链接预览 ──
   长链接把整份计划塞在 ?s= 里，贴进 iMessage / WhatsApp / Discord 是一串乱码，没人点。
   这里把那一串原样存起来，换一个 6 位 id：POST /plans 存，GET /p/:id 还回一页只有
   og 标签的 HTML（「坤怿为你排好了一天」+ 封蜡卡），然后立刻跳到网站的长链接。
   聊天软件的爬虫不跑脚本，读到的是这一页的卡片；人打开的是原来那个网站。
   后台不解释计划内容，只验它确实是一份计划；过期 30 天；没有账号，id 猜不到就是权限。 */
const SITE_DEFAULT = 'https://kunyi523.github.io/Date/';
const PLAN_TTL = 30 * 86400e3;
const PLAN_MAX = 16 * 1024;                      // ?s= 那一串的上限，正常一份 2–4 KB
const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 去掉 0 O 1 l I
const ID_RE = /^[a-km-zA-HJ-NP-Z2-9]{6}$/;
const B64URL_RE = /^[A-Za-z0-9_-]+$/;

/** 网站地址：目录（补上末尾斜杠）或者直接指到 index.html 都行 */
function siteOf(env) {
  const s = String((env && env.SITE) || SITE_DEFAULT);
  return s.endsWith('/') || /\.html$/i.test(s) ? s : s + '/';
}
function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let id = '';
  for (const b of bytes) id += ID_ALPHABET[b % ID_ALPHABET.length];
  return id;
}
/** 和前端 b64d 同一套：base64url → JSON。解不出来就返回 null */
function decodePlan(s) {
  try {
    let raw = s.replace(/-/g, '+').replace(/_/g, '/');
    while (raw.length % 4) raw += '=';
    const bin = atob(raw);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }
}
/** 是不是一份计划：k=plan、至少一站、日期像日期。别的一概不收 */
function planOf(s) {
  if (typeof s !== 'string' || s.length < 16 || s.length > PLAN_MAX || !B64URL_RE.test(s)) return null;
  const box = decodePlan(s);
  const p = box && box.k === 'plan' && box.p;
  if (!p || !Array.isArray(p.s) || !p.s.length || !/^\d{4}-\d{2}-\d{2}$/.test(String(p.ymd || ''))) return null;
  return p;
}

async function postPlan(env, request) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const s = String(body.s || '');
  if (!planOf(s)) return json({ error: 'bad plan' }, 400);
  const lang = body.lang === 'en' ? 'en' : 'zh';

  const now = Date.now();
  const ip = await ipHash(request, env);
  await env.DB.prepare('DELETE FROM hits WHERE at <= ?').bind(now - 3600e3).run();
  const { results } = await env.DB.prepare(
    'SELECT COUNT(*) AS c FROM hits WHERE ip = ? AND at > ?'
  ).bind(ip, now - 3600e3).all();
  if ((results?.[0]?.c || 0) >= 60) return json({ error: 'slow down' }, 429);
  await env.DB.prepare('INSERT INTO hits (ip, at) VALUES (?, ?)').bind(ip, now).run();

  // 过期的顺手清掉，这张表就不会一直长
  await env.DB.prepare('DELETE FROM plans WHERE exp <= ?').bind(now).run();

  const exp = now + PLAN_TTL;
  for (let tries = 0; tries < 5; tries++) {
    const id = newId();
    try {
      await env.DB.prepare('INSERT INTO plans (id, s, lang, at, exp) VALUES (?, ?, ?, ?, ?)')
        .bind(id, s, lang, now, exp).run();
      const origin = new URL(request.url).origin;
      return json({ ok: true, id, url: origin + '/p/' + id, exp });
    } catch (err) {
      if (!/UNIQUE|constraint/i.test(String(err && err.message || err))) throw err;   // 撞号就换一个
    }
  }
  return json({ error: 'try again' }, 503);
}

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dateLabel(ymd, en) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return '';
  const mo = parseInt(m[2], 10), d = parseInt(m[3], 10);
  return en ? `${MON_EN[mo - 1] || ''} ${d}` : `${mo}月${d}日`;
}
function clock(min, en) {
  if (!isFinite(min)) return '';
  const v = ((Math.round(min) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(v / 60)).padStart(2, '0'), mm = String(v % 60).padStart(2, '0');
  return (min >= 1440 ? (en ? 'next day ' : '次日 ') : '') + hh + ':' + mm;
}
/** 预览卡上的字。只有日期、几站、几点开始——她想说的那句话和每一站都在封蜡后面 */
function ogText(p, lang) {
  const en = lang === 'en';
  const from = String(p.from || '').slice(0, 24);
  const title = en
    ? `${from || 'Someone'} planned your day`
    : `${from || '有人'}为你排好了一天`;
  const bits = [dateLabel(p.ymd, en), en ? `${p.s.length} stops` : `${p.s.length} 站`];
  const start = clock(p.s[0] && Number(p.s[0].m), en);
  if (start) bits.push(en ? `from ${start}` : `从 ${start} 开始`);
  bits.push(en ? 'Tap the seal to open today' : '轻点封蜡，拆开今天');
  return { title, desc: bits.filter(Boolean).join(' · ') };
}

const PAGE_CSS = 'html{background:#140F19;color:#F4ECE2;font:16px/1.7 -apple-system,"Noto Sans SC","PingFang SC",sans-serif}' +
  'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:34px}' +
  'a{color:#CBAB6E}p{margin:0 0 12px;opacity:.7;letter-spacing:1px}';
const html = (body, status = 200, extra = {}) =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      ...extra,
    },
  });

async function getPlanPage(env, request, id) {
  const site = siteOf(env);
  if (!ID_RE.test(id)) return html(expiredPage(site), 404);
  const { results } = await env.DB.prepare('SELECT s, lang FROM plans WHERE id = ? AND exp > ?')
    .bind(id, Date.now()).all();
  const row = results && results[0];
  if (!row) return html(expiredPage(site), 404);

  const p = planOf(row.s);
  if (!p) return html(expiredPage(site), 404);
  const lang = row.lang === 'en' ? 'en' : 'zh';
  const target = site + '?s=' + row.s + (lang === 'en' ? '&lang=en' : '');
  const short = new URL(request.url).origin + '/p/' + id;
  const { title, desc } = ogText(p, lang);
  const image = site.replace(/[^/]*$/, '') + 'og-seal.png';   // 封蜡卡放在网站目录下

  // 人：head 里的脚本立刻 replace 过去，历史里不留这一页；没脚本就靠 meta refresh。
  // 爬虫：不跑脚本，读到的是下面这几行 og。
  return html(`<!DOCTYPE html>
<html lang="${lang === 'en' ? 'en' : 'zh-CN'}"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="今天，怎么心动？">
<meta property="og:url" content="${esc(short)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${lang === 'en' ? 'A sealed card' : '一张封着蜡的卡'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="theme-color" content="#140F19">
<script>location.replace(${JSON.stringify(target)});</script>
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<style>${PAGE_CSS}</style>
</head><body><div>
<p>${lang === 'en' ? 'Opening…' : '正在打开…'}</p>
<a href="${esc(target)}">${lang === 'en' ? 'Tap here if nothing happens' : '没跳过去的话，点这里'}</a>
</div></body></html>`);
}

function expiredPage(site) {
  return `<!DOCTYPE html>
<html lang="zh-CN"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>这个链接过期了 · This link has expired</title>
<meta property="og:title" content="今天，怎么心动？">
<meta property="og:description" content="这个链接过期了。 This link has expired.">
<style>${PAGE_CSS}</style>
</head><body><div>
<p>这个链接过期了，或者从来没有过。<br>This link has expired, or never was.</p>
<a href="${esc(site)}">去排一份新的 · Plan a new day →</a>
</div></body></html>`;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (request.method === 'POST' && path === '/reviews') return await postReview(env, request);
      if (request.method === 'GET' && path === '/places') return await getPlaces(env, url);
      if (request.method === 'POST' && path === '/redeem') return await postRedeem(env, request);
      if (request.method === 'GET' && path === '/shop') return await getShop(env, url);
      if (request.method === 'POST' && path === '/couple') return await putCouple(env, request);
      if (request.method === 'GET' && path === '/couple') return await getCouple(env, url);
      if (request.method === 'POST' && path === '/plans') return await postPlan(env, request);
      if ((request.method === 'GET' || request.method === 'HEAD') && path.startsWith('/p/')) {
        return await getPlanPage(env, request, path.slice(3));
      }
      if (request.method === 'GET' && path === '/cards') return await getCards(env, url);
      if (request.method === 'GET' && path === '/weather') return await proxyWeather(url);
      if (request.method === 'GET' && path === '/sweet') return json({});   // 留给以后接模型
      if (path === '/') return json({ ok: true, service: 'xindong' });
      return json({ error: 'not found' }, 404);
    } catch (err) {
      // 前端所有接口都会静默回落到本地，所以这里挂了不会把网站带崩
      return json({ error: String(err && err.message || err) }, 500);
    }
  },
};
