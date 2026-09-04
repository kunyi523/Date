/**
 * 后台自测。不需要 Cloudflare 账号：用 sql.js 在内存里冒充 D1，
 * 直接跑真正的 worker.js，把请求打进去看返回。
 *
 *   cd server && npm i sql.js && node test.mjs
 *
 * 改了 worker.js 之后请跑一遍。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

const here = dirname(fileURLToPath(import.meta.url));
const SQL = await initSqlJs();

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name, extra === undefined ? '' : JSON.stringify(extra)); }
}
function eq(name, got, want) {
  ok(name + `  (${JSON.stringify(got)})`, JSON.stringify(got) === JSON.stringify(want), { got, want });
}

/** 内存版 D1：只实现 worker 用到的 prepare().bind().all()/run() */
function makeDB() {
  const db = new SQL.Database();
  // 和线上一样按文件名顺序跑全部迁移，这样"改了已执行的迁移"这种错本地也会暴露
  for (const f of readdirSync(join(here, 'migrations')).filter(x => x.endsWith('.sql')).sort()){
    db.run(readFileSync(join(here, 'migrations', f), 'utf8'));
  }
  return {
    prepare(sql) {
      let args = [];
      const api = {
        bind(...a) { args = a; return api; },
        async all() {
          const st = db.prepare(sql);
          st.bind(args);
          const results = [];
          while (st.step()) results.push(st.getAsObject());
          st.free();
          return { results };
        },
        async run() { db.run(sql, args); return { success: true }; },
      };
      return api;
    },
  };
}

const worker = (await import(join('file://', here, 'worker.js'))).default;

function makeCall(env) {
  return async function call(method, path, body, headers = {}) {
    const req = new Request('https://x' + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const res = await worker.fetch(req, env);
    let data = null;
    try { data = JSON.parse(await res.text()); } catch {}
    return { status: res.status, data, cors: res.headers.get('Access-Control-Allow-Origin') };
  };
}

const REVIEW = (over = {}) => ({
  pid: 'osm:node/111', name: '临江那家小馆', r: 5,
  dims: { quiet: 1, pair: 1, linger: 1 }, tags: ['纪念日'],
  cost: '小奢侈', txt: '靠窗那一桌可以坐很久', mbti: 'ENFP-ISFJ', by: 'devA1',
  ...over,
});

console.log('\n— 基本 —');
{
  const call = makeCall({ DB: makeDB() });
  const root = await call('GET', '/');
  eq('根路径可用', root.data, { ok: true, service: 'xindong' });
  ok('带 CORS 头', root.cors === '*', root.cors);
  const pre = await call('OPTIONS', '/reviews');
  ok('预检直接过', pre.status === 200, pre.status);
  const nf = await call('GET', '/nope');
  eq('未知路径 404', nf.status, 404);
}

console.log('\n— 校验：该拒的要拒 —');
{
  const call = makeCall({ DB: makeDB() });
  const bad = [
    ['伪造 pid', { pid: 'javascript:alert(1)' }],
    ['pid 为空', { pid: '' }],
    ['分数越界', { r: 9 }],
    ['分数是 0', { r: 0 }],
    ['分数不是数', { r: 'five' }],
    ['设备 id 太短', { by: 'x' }],
    ['设备 id 有怪字符', { by: 'dev;drop' }],
  ];
  for (const [name, over] of bad) {
    const res = await call('POST', '/reviews', REVIEW(over));
    ok(name + ' → 400', res.status === 400, res);
  }
  const good = await call('POST', '/reviews', REVIEW());
  eq('正常一条 → ok', good.data, { ok: true });
  const noJson = await worker.fetch(new Request('https://x/reviews', { method: 'POST', body: 'oops' }), { DB: makeDB() });
  eq('坏 JSON → 400', noJson.status, 400);
}

console.log('\n— 只留最新一条 —');
{
  const call = makeCall({ DB: makeDB() });
  await call('POST', '/reviews', REVIEW({ r: 5 }));
  await call('POST', '/reviews', REVIEW({ r: 2, txt: '改成两分' }));
  const p = await call('GET', '/places?ids=osm:node/111');
  eq('同设备同地点只算一条', p.data.places['osm:node/111'].n, 1);
  eq('留下的是最新的分数', p.data.places['osm:node/111'].score, 2);
}

console.log('\n— 合并 —');
{
  const call = makeCall({ DB: makeDB() });
  await call('POST', '/reviews', REVIEW({ by: 'devA1', r: 5 }));
  await call('POST', '/reviews', REVIEW({ by: 'devB2', r: 4, dims: { quiet: 1 }, tags: ['第一次约会', '纪念日'] }));
  await call('POST', '/reviews', REVIEW({ by: 'devC3', r: 3, dims: {}, tags: [], txt: '' }));
  const p = (await call('GET', '/places?ids=osm:node/111')).data.places['osm:node/111'];
  eq('三对情侣', p.n, 3);
  eq('平均分', p.score, 4);
  eq('维度按比例', p.dims.quiet, 0.67);
  eq('标签按次数排', p.tags[0], ['纪念日', 2]);
  ok('引用只取认真填的', p.quotes.length === 2, p.quotes);
  const none = await call('GET', '/places');
  eq('没给 ids 返回空', none.data, { places: {} });
}

console.log('\n— 文字过滤 —');
{
  const call = makeCall({ DB: makeDB() });
  await call('POST', '/reviews', REVIEW({ by: 'spam1', txt: '去 http://spam.example 领红包' }));
  await call('POST', '/reviews', REVIEW({ by: 'spam2', txt: '上 spam.com 看' }));
  await call('POST', '/reviews', REVIEW({ by: 'real1', txt: '二楼靠江那个角落能坐一下午' }));
  await call('POST', '/reviews', REVIEW({ by: 'nodim', txt: '这句话够长但什么都没勾', dims: {}, tags: [] }));
  const p = (await call('GET', '/places?ids=osm:node/111')).data.places['osm:node/111'];
  ok('链接残渣不被引用', !p.quotes.some((q) => /领红包|spam/.test(q)), p.quotes);
  ok('什么都没勾的不被引用', !p.quotes.some((q) => /什么都没勾/.test(q)), p.quotes);
  ok('真话被引用', p.quotes.includes('二楼靠江那个角落能坐一下午'), p.quotes);
  const long = await call('POST', '/reviews', REVIEW({ by: 'longtxt', txt: 'x'.repeat(200) }));
  eq('超长文字也照收（会被截断）', long.data, { ok: true });
}

console.log('\n— MBTI 匹配 —');
{
  const call = makeCall({ DB: makeDB() });
  await call('POST', '/reviews', REVIEW({ by: 'same1', r: 5, mbti: 'ENFP-ISFJ' }));
  await call('POST', '/reviews', REVIEW({ by: 'near1', r: 5, mbti: 'INFP-INFJ' }));
  await call('POST', '/reviews', REVIEW({ by: 'oppo1', r: 1, mbti: 'ESTJ-ESTP' }));
  await call('POST', '/reviews', REVIEW({ by: 'blank1', r: 1, mbti: '' }));
  const q = (await call('GET', '/places?ids=osm:node/111&mbti=ENFP-ISFJ')).data.places['osm:node/111'];
  eq('全部四对', q.n, 4);
  eq('像我们的是同款 + 相近那两对', q.match.n, 2);
  eq('像我们的平均分', q.match.score, 5);

  // 互补型的坑：ENFP+ISFJ 四个轴里三个相反，压成"共识字母"会全变成 ?，
  // 于是连另一对同样组合的都匹配不上。这条一定要守住。
  const self = (await call('GET', '/places?ids=osm:node/111&mbti=ENFP-ISFJ')).data.places['osm:node/111'];
  ok('互补型能匹配到同款（曾经的 bug）', self.match.n >= 1, self.match);

  const noMbti = (await call('GET', '/places?ids=osm:node/111')).data.places['osm:node/111'];
  eq('自己没填 MBTI 就不算匹配', noMbti.match.n, 0);
}

console.log('\n— 按 IP 限流（换 by_id 绕不过去）—');
{
  const env = { DB: makeDB(), IP_SALT: 'test' };
  const call = makeCall(env);
  const ip = { 'CF-Connecting-IP': '203.0.113.9' };
  let blocked = 0, sent = 0;
  for (let i = 0; i < 45; i++) {
    const res = await call('POST', '/reviews', REVIEW({ pid: 'osm:node/' + (200 + i), by: 'dev' + i }), ip);
    if (res.status === 429) blocked++; else sent++;
  }
  ok('40 条之后开始拦', sent === 40 && blocked === 5, { sent, blocked });
  const other = await call('POST', '/reviews', REVIEW({ pid: 'osm:node/999', by: 'devZ' }), { 'CF-Connecting-IP': '198.51.100.4' });
  eq('换个 IP 不受影响', other.data, { ok: true });
}

console.log('\n— 同一设备一小时 20 条上限 —');
{
  const env = { DB: makeDB(), IP_SALT: 'test' };
  const call = makeCall(env);
  let blocked = 0;
  for (let i = 0; i < 25; i++) {
    const res = await call('POST', '/reviews', REVIEW({ pid: 'osm:node/' + (400 + i), by: 'sameDev' }),
      { 'CF-Connecting-IP': '203.0.113.' + i });   // 每次换 IP，只测设备上限
    if (res.status === 429) blocked++;
  }
  ok('设备上限也生效', blocked === 5, { blocked });
}

console.log('\n— 高分地点反哺卡池 —');
{
  const call = makeCall({ DB: makeDB() });
  await call('POST', '/reviews', REVIEW({ pid: 'osm:node/222', name: '江边那家旧书店', by: 'dev01', r: 5, txt: '二楼有个能看江的角落' }));
  await call('POST', '/reviews', REVIEW({ pid: 'osm:node/222', name: '江边那家旧书店', by: 'dev02', r: 5, txt: '待了三个小时没人赶' }));
  await call('POST', '/reviews', REVIEW({ pid: 'osm:node/333', name: '只有一对评过的', by: 'dev03', r: 5 }));
  await call('POST', '/reviews', REVIEW({ pid: 'osm:node/444', name: '分数不高的', by: 'dev04', r: 2 }));
  await call('POST', '/reviews', REVIEW({ pid: 'osm:node/444', name: '分数不高的', by: 'dev05', r: 2 }));
  const cards = (await call('GET', '/cards?lat=30.66&lon=104.06')).data.cards;
  eq('只推 n≥2 且分数≥4 的', cards.map((c) => c.title), ['江边那家旧书店']);
  ok('带评分和条数', cards[0].rating === 5 && cards[0].reviews === 2, cards[0]);
  ok('带一句评价总结', !!cards[0].summary, cards[0]);
  const noCoords = (await call('GET', '/cards')).data.cards;
  eq('没给经纬度返回空', noCoords, []);
}

console.log('\n— 两个人共一张地图 —');
{
  const env = { DB: makeDB(), IP_SALT: 'test' };
  const call = makeCall(env);
  const COUPLE = 'c' + 'abc123def456ghi7';
  const pin = (over = {}) => ({ sig: '2026-09-02|老街区漫步', i: 0, ymd: '2026-09-02', title: '老街区漫步', at: 1, lat: 30.66, lon: 104.06, ...over });

  eq('couple id 不合格 → 400',
    (await call('POST', '/couple', { couple: 'nope', by: 'devA1', pins: [pin()] })).status, 400);
  eq('设备 id 不合格 → 400',
    (await call('POST', '/couple', { couple: COUPLE, by: 'x', pins: [pin()] })).status, 400);

  const up = await call('POST', '/couple', { couple: COUPLE, by: 'phoneA', pins: [pin(), pin({ i: 1, title: '水边咖啡座', lat: 30.67 })] });
  ok('他那半张传上去了', up.data.ok === true, up.data);

  const mineBack = await call('GET', `/couple?id=${COUPLE}&by=phoneA`);
  eq('自己读不到自己（读的是对方）', mineBack.data.others.length, 0);

  const hers = await call('GET', `/couple?id=${COUPLE}&by=phoneB`);
  eq('她能读到他那两处', hers.data.others[0].pins.length, 2);
  eq('标题对得上', hers.data.others[0].pins[0].title, '老街区漫步');

  await call('POST', '/couple', { couple: COUPLE, by: 'phoneB', pins: [pin({ i: 0, title: '她打的那一站', lat: 31.1 })] });
  const his = await call('GET', `/couple?id=${COUPLE}&by=phoneA`);
  eq('他也能读到她那一处', his.data.others[0].pins[0].title, '她打的那一站');

  // 幂等：同一台设备重传，还是一行，不会越传越多
  await call('POST', '/couple', { couple: COUPLE, by: 'phoneA', pins: [pin()] });
  await call('POST', '/couple', { couple: COUPLE, by: 'phoneA', pins: [pin()] });
  const again = await call('GET', `/couple?id=${COUPLE}&by=phoneB`);
  eq('重传只覆盖不追加', again.data.others.length, 1);
  eq('覆盖成最新那一份', again.data.others[0].pins.length, 1);

  // 别人的 couple id 猜不到，也就读不到
  const other = await call('GET', '/couple?id=c0000000000000000&by=phoneZ');
  eq('别的 couple 读到空', other.data.others, []);

  console.log('  · 脏数据清洗');
  await call('POST', '/couple', { couple: COUPLE, by: 'phoneC', pins: [
    pin({ lat: 999, lon: 999 }),
    pin({ i: 2, title: 'x'.repeat(200) }),
    pin({ i: 3, ymd: '乱写', title: '日期乱写' }),
    pin({ i: 4, title: '图床', thumb: 'https://evil.example/x.png' }),
    pin({ i: 5, title: '正常缩略图', thumb: 'data:image/jpeg;base64,AAAA' }),
    { title: '没有 sig 的' },
  ]});
  const cleaned = (await call('GET', `/couple?id=${COUPLE}&by=phoneB`)).data.others
    .find((o) => o.by === 'phoneC').pins;
  ok('越界经纬度被丢掉', cleaned[0].lat === undefined, cleaned[0]);
  ok('标题被截断', cleaned[1].title.length === 60, cleaned[1].title.length);
  eq('乱写的日期清空', cleaned[2].ymd, '');
  ok('外链缩略图被拒', cleaned[3].thumb === undefined, cleaned[3]);
  ok('data: 缩略图留下', cleaned[4].thumb === 'data:image/jpeg;base64,AAAA', cleaned[4]);
  eq('没有 sig 的整条丢掉', cleaned.length, 5);

  const big = await call('POST', '/couple', { couple: COUPLE, by: 'phoneD', pins: [
    pin({ thumb: 'data:image/jpeg;base64,' + 'A'.repeat(110000) }),
    pin({ i: 1, thumb: 'data:image/jpeg;base64,' + 'A'.repeat(110000) }),
    pin({ i: 2, thumb: 'data:image/jpeg;base64,' + 'A'.repeat(110000) }),
    pin({ i: 3, thumb: 'data:image/jpeg;base64,' + 'A'.repeat(110000) }),
  ]});
  eq('整份太大 → 413', big.status, 413);
}

console.log('\n— 下架 —');
{
  const db = makeDB();
  const call = makeCall({ DB: db });
  await call('POST', '/reviews', REVIEW({ by: 'keep', r: 5 }));
  await call('POST', '/reviews', REVIEW({ by: 'drop', r: 1, txt: '不该留的' }));
  await db.prepare('UPDATE reviews SET hidden = 1 WHERE by_id = ?').bind('drop').run();
  const p = (await call('GET', '/places?ids=osm:node/111')).data.places['osm:node/111'];
  eq('下架的不参与合并', p.n, 1);
  eq('分数只算剩下的', p.score, 5);
}

console.log('\n— 出示与回头 —');
{
  const db = makeDB();
  const call = makeCall({ DB: db });
  // 老板娘拿这个数对收银机，所以"首次"和"回头"必须分得开
  await call('POST', '/redeem', { shop: 'sweetcup', first: 1 });
  await call('POST', '/redeem', { shop: 'sweetcup', first: 1 });
  await call('POST', '/redeem', { shop: 'sweetcup', first: 0 });
  const r = (await call('GET', '/shop?id=sweetcup')).data;
  eq('出示总数', r.last30, 3);
  eq('其中首次', r.first, 2);
  eq('其中回头', r.repeat, 1);
  eq('按天打点只有今天一格', r.days.length, 1);
  eq('今天那一格的数', r.days[0].n, 3);
  eq('别人家的店读不到', (await call('GET', '/shop?id=other')).data.last30, 0);
  eq('店名乱写被拒', (await call('POST', '/redeem', { shop: 'a b/c?d' })).status, 400);
  eq('没有店名被拒', (await call('GET', '/shop?id=')).status, 400);
}

console.log('\n— 短链 + 链接预览 —');
{
  // 和前端 b64e 同一套：JSON → UTF-8 → base64url
  const b64e = (obj) => Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
  const STOP = (m, over = {}) => ({ t: '长堤走走', d: '风替我说想你', te: 'Walk the waterfront', de: 'Let the wind say I miss you', c: '玩', m, u: 60, ...over });
  const PLAN = (over = {}) => ({
    v: 2, ymd: '2026-09-05', from: '坤怿', to: '瑶瑶', note: '今天别看手机', ask: 0, e: '晚安，明天见',
    s: [STOP(840), STOP(930, { c: '食' }), STOP(1080)], ...over,
  });
  const CFG = { gate: false, anni: '', miles: '市区逛逛', from: '坤怿', to: '瑶瑶', theme: 'night', couple: 'cabc123def456ghi7' };
  const S = b64e({ k: 'plan', p: PLAN(), c: CFG });
  const SITE = 'https://kunyi523.github.io/Date/';

  const db = makeDB();
  const env = { DB: db, IP_SALT: 'test' };
  const call = makeCall(env);
  const page = async (path, method = 'GET') => {
    const res = await worker.fetch(new Request('https://x' + path, { method }), env);
    return { status: res.status, text: await res.text(), h: (k) => res.headers.get(k) };
  };

  const made = await call('POST', '/plans', { s: S, lang: 'zh' });
  ok('存一份 → ok + 6 位 id', made.data.ok === true && /^[a-km-zA-HJ-NP-Z2-9]{6}$/.test(made.data.id), made.data);
  eq('短链就是 origin + /p/ + id', made.data.url, 'https://x/p/' + made.data.id);
  ok('30 天后过期', Math.abs(made.data.exp - Date.now() - 30 * 86400e3) < 5000, made.data.exp);
  const again = await call('POST', '/plans', { s: S });
  ok('同一份再存是另一个 id（没有账号，不去重）', again.data.ok && again.data.id !== made.data.id, again.data);

  console.log('  · 只收计划');
  const bad = [
    ['没有 s', {}],
    ['不是 base64url', { s: 'not base64!!' + 'x'.repeat(20) }],
    ['能解但不是计划', { s: b64e({ k: 'cfg', c: CFG }) }],
    ['一站都没有', { s: b64e({ k: 'plan', p: PLAN({ s: [] }), c: CFG }) }],
    ['日期不像日期', { s: b64e({ k: 'plan', p: PLAN({ ymd: '周六' }), c: CFG }) }],
    ['太短', { s: 'eyJrIjoxfQ' }],
    ['太大', { s: b64e({ k: 'plan', p: PLAN({ note: 'x'.repeat(20000) }), c: CFG }) }],
  ];
  for (const [name, body] of bad) {
    const res = await call('POST', '/plans', body);
    ok(name + ' → 400', res.status === 400, res.status);
  }
  const noJson = await worker.fetch(new Request('https://x/plans', { method: 'POST', body: '{' }), env);
  eq('坏 JSON → 400', noJson.status, 400);

  console.log('  · 打开：爬虫读 og，人跳回网站');
  const pg = await page('/p/' + made.data.id);
  eq('200', pg.status, 200);
  ok('是 HTML', /^text\/html/.test(pg.h('Content-Type')), pg.h('Content-Type'));
  ok('不缓存、不索引', pg.h('Cache-Control') === 'no-store' && /noindex/.test(pg.h('X-Robots-Tag')), [pg.h('Cache-Control'), pg.h('X-Robots-Tag')]);
  ok('og:title 带发件人', pg.text.includes('<meta property="og:title" content="坤怿为你排好了一天">'), pg.text.match(/og:title[^>]*/)?.[0]);
  ok('og:description 只有日期 / 几站 / 几点开始',
    pg.text.includes('<meta property="og:description" content="9月5日 · 3 站 · 从 14:00 开始 · 轻点封蜡，拆开今天">'),
    pg.text.match(/og:description[^>]*/)?.[0]);
  ok('她想说的那句话不在预览里', !pg.text.includes('今天别看手机'));
  ok('每一站也不在预览里', !pg.text.includes('长堤走走') && !pg.text.includes('Walk the waterfront'));
  ok('og:image 是网站上那张封蜡卡', pg.text.includes(`<meta property="og:image" content="${SITE}og-seal.png">`) && pg.text.includes('summary_large_image'));
  eq('og:url 是短链自己', pg.text.match(/og:url" content="([^"]+)"/)?.[1], 'https://x/p/' + made.data.id);
  const target = SITE + '?s=' + S;
  ok('脚本立刻跳到长链接（?s= 原样）', pg.text.includes('<script>location.replace(' + JSON.stringify(target) + ');</script>'));
  ok('没脚本靠 meta refresh', pg.text.includes(`<meta http-equiv="refresh" content="0;url=${target}">`));
  ok('还有一个能点的兜底链接', pg.text.includes(`<a href="${target}">`));
  ok('中文页 lang=zh-CN', pg.text.includes('<html lang="zh-CN">'));
  eq('HEAD 也 200', (await page('/p/' + made.data.id, 'HEAD')).status, 200);

  console.log('  · 英文发件人');
  const en = await call('POST', '/plans', { s: b64e({ k: 'plan', p: PLAN({ from: 'Kun' }), c: CFG }), lang: 'en' });
  const enPg = await page('/p/' + en.data.id);
  ok('og:title 英文', enPg.text.includes('content="Kun planned your day"'), enPg.text.match(/og:title[^>]*/)?.[0]);
  ok('og:description 英文', enPg.text.includes('content="Sep 5 · 3 stops · from 14:00 · Tap the seal to open today"'), enPg.text.match(/og:description[^>]*/)?.[0]);
  ok('跳回去时带 &lang=en，收件人打开是同一种语言', enPg.text.includes('&lang=en");</script>') && enPg.text.includes('<html lang="en">'));

  console.log('  · 边角');
  const anon = await call('POST', '/plans', { s: b64e({ k: 'plan', p: PLAN({ from: '', s: [STOP(1500)] }), c: CFG }) });
  const anonPg = (await page('/p/' + anon.data.id)).text;
  ok('没署名：有人为你排好了一天', anonPg.includes('content="有人为你排好了一天"'));
  ok('跨过午夜的开始时间写成「次日」', anonPg.includes('1 站 · 从 次日 01:00 开始'), anonPg.match(/og:description[^>]*/)?.[0]);
  const anonEn = await call('POST', '/plans', { s: b64e({ k: 'plan', p: PLAN({ from: '' }), c: CFG }), lang: 'en' });
  ok('没署名（英文）：Someone planned your day', (await page('/p/' + anonEn.data.id)).text.includes('content="Someone planned your day"'));
  const evil = await call('POST', '/plans', { s: b64e({ k: 'plan', p: PLAN({ from: '<b>"x"</b>' }), c: CFG }) });
  const evilPg = (await page('/p/' + evil.data.id)).text;
  ok('名字里的 HTML 被转义', !evilPg.includes('<b>') && evilPg.includes('&lt;b&gt;&quot;x&quot;&lt;/b&gt;为你排好了一天'));
  ok('名字太长会截', (await page('/p/' + (await call('POST', '/plans', { s: b64e({ k: 'plan', p: PLAN({ from: '名'.repeat(40) }), c: CFG }) })).data.id)).text.includes('content="' + '名'.repeat(24) + '为你排好了一天"'));

  console.log('  · 找不到 / 过期');
  const nf = await page('/p/zzzzzz');
  ok('不存在的 id → 404 + 过期页', nf.status === 404 && nf.text.includes('This link has expired') && nf.text.includes(`href="${SITE}"`), nf.status);
  eq('id 格式不对 → 404', (await page('/p/abc')).status, 404);
  eq('id 带易混字符 → 404', (await page('/p/abc10O')).status, 404);
  eq('/p/ 本身 → 404', (await page('/p/')).status, 404);
  await db.prepare('INSERT INTO plans (id, s, lang, at, exp) VALUES (?, ?, ?, ?, ?)').bind('old2ld', S, 'zh', 1, 2).run();
  eq('过期的 → 404', (await page('/p/old2ld')).status, 404);
  await call('POST', '/plans', { s: S });
  eq('下一次存计划时过期的被清掉', (await db.prepare('SELECT COUNT(*) AS c FROM plans WHERE id = ?').bind('old2ld').all()).results[0].c, 0);
  ok('没过期的还在', (await db.prepare('SELECT COUNT(*) AS c FROM plans WHERE id = ?').bind(made.data.id).all()).results[0].c === 1);

  console.log('  · 自己部署的人换网站地址');
  const env2 = { DB: makeDB(), SITE: 'https://example.com/date' };   // 没写末尾斜杠也行
  const own = await makeCall(env2)('POST', '/plans', { s: S });
  const ownPg = await (await worker.fetch(new Request('https://x/p/' + own.data.id), env2)).text();
  ok('跳到自己的网站', ownPg.includes('location.replace("https://example.com/date/?s=') && ownPg.includes('content="https://example.com/date/og-seal.png"'));
  const env2b = { DB: makeDB(), SITE: 'https://example.com/date/index.html' };   // 直接指到文件也行
  const own2 = await makeCall(env2b)('POST', '/plans', { s: S });
  const ownPg2 = await (await worker.fetch(new Request('https://x/p/' + own2.data.id), env2b)).text();
  ok('SITE 指到 index.html：?s= 直接接在后面，卡还在目录下',
    ownPg2.includes('location.replace("https://example.com/date/index.html?s=') && ownPg2.includes('content="https://example.com/date/og-seal.png"'));

  console.log('  · 按 IP 限流');
  const env3 = { DB: makeDB(), IP_SALT: 'test' };
  const call3 = makeCall(env3);
  let blocked = 0, sent = 0;
  for (let i = 0; i < 65; i++) {
    const res = await call3('POST', '/plans', { s: S }, { 'CF-Connecting-IP': '203.0.113.77' });
    if (res.status === 429) blocked++; else sent++;
  }
  ok('一小时 60 份之后开始拦', sent === 60 && blocked === 5, { sent, blocked });
  eq('换个 IP 不受影响', (await call3('POST', '/plans', { s: S }, { 'CF-Connecting-IP': '198.51.100.9' })).status, 200);
}

console.log(`\n${fail ? '✗' : '✓'} ${pass} 条通过，${fail} 条失败\n`);
process.exit(fail ? 1 : 0);
