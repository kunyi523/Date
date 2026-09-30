const { launch, BASE, PHONE, wait, ok, done } = require('./_lib');
const zlib = require('zlib');
// 一张 256×256 的深色 PNG 当地图瓦片：CI 上不碰真的 OSM，而且深色好认——画上去了，地图那一块就一定是暗的
const TILE_PNG = (() => {
  const W = 256, H = 256, raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++){ raw[y * (W * 3 + 1)] = 0; for (let x = 0; x < W; x++){ const o = y * (W * 3 + 1) + 1 + x * 3; raw[o] = 0x30; raw[o + 1] = 0x30; raw[o + 2] = 0x30; } }
  const T = []; for (let n = 0; n < 256; n++){ let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  const crc = b => { let c = 0xFFFFFFFF; for (const v of b) c = T[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
})();
const isTile = r => /tile\.openstreetmap\.org\//.test(r.url());
const serveTile = r => r.respond({ status:200, headers:{ 'content-type':'image/png', 'Access-Control-Allow-Origin':'*' }, body: TILE_PNG });
// Story 图是异步画的（等瓦片、等照片），轮询到 1080×1920 为止
const waitStory = async (page) => {
  for (let i = 0; i < 50; i++){
    const d = await page.$eval('#posterImg', e => ({ w:e.naturalWidth, h:e.naturalHeight }));
    if (d.w === 1080 && d.h === 1920) return d;
    await wait(200);
  }
  return page.$eval('#posterImg', e => ({ w:e.naturalWidth, h:e.naturalHeight }));
};
// 把 #posterImg 画回 canvas 读像素：解二维码、取某一点的颜色
const readPoster = (page) => page.evaluate(() => {
  const im = document.getElementById('posterImg'), c = document.createElement('canvas');
  c.width = im.naturalWidth; c.height = im.naturalHeight;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height);
  const at = (px, py) => { const i = (py * c.width + px) * 4; return [d.data[i], d.data[i + 1], d.data[i + 2]]; };
  const q = window.jsQR ? jsQR(d.data, c.width, c.height) : null;
  return { qr: q ? q.data : null, map: at(126, 800), corner: at(60, 60) };
});
(async()=>{
const b=await launch();
// 第一步：他排好一份，拿到分享链接
const p=await b.newPage(); p.on('pageerror',e=>console.log('[ERR]',e.message));
await p.emulate(PHONE);
// 短链（任务 4）：后台的 POST /plans 在这里被拦下来假装存好了。测的是前端的约定——
// 拿到就用短链、拿不到就长链、手打的字只在点按时才发出去。后台那一头（og、跳转、过期）在 server/test.mjs。
const CORS = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type'};
const SHORT_ID = 'kZ7mQ4', SHORT = BASE + '/p/' + SHORT_ID;
const plansPosted = [];
// 匿名计数（任务 5）：POST /ev 也拦下来记着。每一页都得拦——不拦的话测试会把假事件打进线上的 K 里
const evTrap = (list) => (r) => {
  if (!/\/ev$/.test(r.url())) return false;
  if (r.method()==='OPTIONS'){ r.respond({status:204, headers:CORS}); return true; }
  list.push(JSON.parse(r.postData()||'{}'));
  r.respond({status:200, headers:{...CORS,'content-type':'application/json'}, body:'{"ok":true}'});
  return true;
};
const evSender = [], trapSender = evTrap(evSender);
// 她拆开了（任务 9）：GET /opened?ids=… 也拦下来。openedAt 为 0 = 还没拆，答空；有值 = 这条短链几点拆的。
// 拆开的时间挑 14:32——手册里写的就是「她拆开了 · 14:32」；是今天，所以只显示时间
let openedAt = 0; const OPENED_AT = (()=>{ const d = new Date(); d.setHours(14, 32, 0, 0); return d.getTime(); })();
const openedTrap = (list) => (r) => {
  if (!/\/opened\?/.test(r.url())) return false;
  list.push(r.url());
  const body = openedAt ? { opened: { [SHORT_ID]: openedAt } } : { opened: {} };
  r.respond({status:200, headers:{...CORS,'content-type':'application/json','cache-control':'no-store'}, body: JSON.stringify(body)});
  return true;
};
const openedAsked = [], trapOpened = openedTrap(openedAsked);
await p.setRequestInterception(true);
p.on('request', r=>{
  if (trapSender(r)) return;
  if (trapOpened(r)) return;
  if (isTile(r)) return serveTile(r);
  if (/\/plans$/.test(r.url())){
    if (r.method()==='OPTIONS') return r.respond({status:204, headers:CORS});
    const body = JSON.parse(r.postData()||'{}');
    plansPosted.push(body);
    const reply = () => r.respond({status:200, headers:{...CORS,'content-type':'application/json'},
      body: JSON.stringify({ok:true, id:SHORT_ID, url:SHORT, exp:Date.now()+30*86400e3})});
    // 第二份（带手打的话）故意慢 400ms：点按那一下必须先给长链，不能等网络
    return plansPosted.length > 1 ? setTimeout(reply, 400) : reply();
  }
  r.continue();
});
await p.goto(BASE + '/index.html?t=14:00',{waitUntil:'networkidle2'}); await wait(800);
await p.evaluate(()=>openPanel()); await wait(400);
await p.type('#cfgFrom','坤怿'); await p.type('#cfgTo','瑶瑶');
await p.evaluate(()=>{ document.getElementById('cfgAnni').value = '2025-08-13'; });   // 第 6 条：Story 图上最大的数字是在一起的天数
await p.click('#saveCfg'); await wait(400);
await p.click('#quickBtn'); await wait(2500);
await p.click('#shareOpen'); await wait(400);
ok(plansPosted.length === 1 && plansPosted[0].lang === 'zh', '打开分享面板就去要了短链（lang=zh）', plansPosted.length);
ok(evSender.length === 0, '计数：排好、打开面板、预取短链都不算「发出」', JSON.stringify(evSender));
await p.click('#shMake'); await wait(600);
const link0 = await p.$eval('#shOut', e=>e.value);
ok(link0 === SHORT && plansPosted.length === 1, '点「生成」直接给短链，没有重复去要', link0);
ok(evSender.length === 1 && evSender[0].e === 'sent' && evSender[0].id === SHORT_ID && Object.keys(evSender[0]).sort().join() === 'e,id',
  '计数：点「生成」记一次 sent，只带动作名和短链 id', JSON.stringify(evSender));
// 第 9 条：短链到手那一刻，回忆本那一条记住 id，然后立刻去问一次拆开没有
ok(openedAsked.length >= 1 && /\/opened\?ids=kZ7mQ4$/.test(openedAsked[0]), '她拆开了：短链到手就去问了一次，只带短链 id', openedAsked[0]);
const rec0 = await p.evaluate(()=>JSON.parse(localStorage.getItem('xindong_log_v1'))[0]);
ok(rec0 && Array.isArray(rec0.sids) && rec0.sids.join() === SHORT_ID && !rec0.opened && rec0.sentAt > 0, '回忆本那一条记住了短链 id，还没拆', JSON.stringify({sids:rec0.sids, opened:rec0.opened}));
ok(await p.evaluate(()=>$('openedLine').classList.contains('hidden') && $('shOpened').classList.contains('hidden') && !document.querySelector('.memo-row .mo')), '还没拆：计划卡下面、分享面板里、回忆本里都没有那一行');
const dec = s => { try{ return JSON.parse(Buffer.from(s, 'base64url').toString('utf8')); }catch(e){ return null; } };
const box0 = dec(plansPosted[0].s);
ok(box0 && box0.k==='plan' && box0.p.from==='坤怿' && box0.p.to==='瑶瑶' && box0.p.s.length>=2 && box0.c && box0.c.to==='瑶瑶',
  '存到后台的就是 ?s= 那一串：整份计划 + 展示用的设置', box0 && JSON.stringify({from:box0.p.from, to:box0.p.to, n:box0.p.s.length}));
// 手打一句话：打字期间一个字都不出手机；点「生成」那一下先复制长链（永远能打开），短链回来再换进输入框
await p.type('#shNote', '今天别看手机'); await wait(300);
ok(plansPosted.length === 1, '手打的话在打字期间没有发出去');
await p.click('#shMake');
const first = await p.$eval('#shOut', e=>e.value);
ok(/\?s=/.test(first) && first.indexOf(BASE + '/index.html?s=') === 0 && plansPosted.length === 2, '内容改了：先给长链，不等网络', first.length + ' 字');
ok(evSender.length === 1, '计数：短链还没回来时不记 sent（记了也没 id 可串）', evSender.length);
await wait(900);
const link = await p.$eval('#shOut', e=>e.value);
ok(link === SHORT, '短链回来后换进输入框', link);
ok(evSender.length === 2 && evSender[1].e === 'sent' && evSender[1].id === SHORT_ID, '计数：短链到手那一刻记 sent（新的一份内容，另算一次）', JSON.stringify(evSender[1]));
await p.click('#shCopy'); await wait(400);
ok(evSender.length === 2, '计数：同一份内容再点「复制」不重复记', evSender.length);
const box1 = dec(plansPosted[1].s);
ok(box1 && box1.p.note === '今天别看手机', '这次存的是带那句话的新一份', box1 && box1.p.note);
const longLink = BASE + '/index.html?s=' + plansPosted[1].s;
ok(longLink === first, '长链 = 网站 + ?s= + 存到后台的那一串（一字不差）');
// 海报：出过图就记一次 poster，带这份计划的短链 id；再出一次不重复
await p.click('#shClose'); await wait(200);
await p.click('#posterBtn'); await wait(1200);
ok(await p.evaluate(()=>document.getElementById('posterMask').classList.contains('show')), '海报画出来了');
ok(evSender.length === 3 && evSender[2].e === 'poster' && evSender[2].id === SHORT_ID, '计数：存成图片记一次 poster，带短链 id', JSON.stringify(evSender[2]));
// 第 6 条：同一个弹层里两种比例都能存。默认计划图（750 宽的竖图），切到 Story 是 1080×1920，上面的二维码要能解回站点地址
const ratio = await p.$$eval('#posterRatio button', a=>a.filter(x=>x.offsetParent).map(x=>x.textContent + (x.classList.contains('on') ? '*' : '')));
ok(ratio.join('/') === '计划图*/Story · 9:16', '海报弹层里有两种比例，默认计划图', ratio.join('/'));
const planDim = await p.$eval('#posterImg', e=>({ w:e.naturalWidth, h:e.naturalHeight }));
ok(planDim.w === 750 && planDim.h > 750, '计划图还是 750 宽的竖图', planDim.w + 'x' + planDim.h);
ok(await p.$eval('#posterHint', e=>e.textContent) === '长按图片保存，发给她就行', '计划图的提示一字不变');
await p.click('#ratioStory');
const storyDim = await waitStory(p);
ok(storyDim.w === 1080 && storyDim.h === 1920, 'Story 版是 1080×1920（9:16）', storyDim.w + 'x' + storyDim.h);
ok(await p.$eval('#posterHint', e=>e.textContent) === '长按保存，发到 Story 或小红书', 'Story 的提示换成发出去', await p.$eval('#posterHint', e=>e.textContent));
ok((await p.$$eval('#posterRatio button.on', a=>a.map(x=>x.id))).join() === 'ratioStory', '开关选中态跟着换');
await p.addScriptTag({ path: require.resolve('jsqr/dist/jsQR.js') });
const zhStory = await readPoster(p);
ok(zhStory.qr === BASE + '/index.html', 'Story 上的二维码解出来就是站点地址（自己编的码，不打第三方接口）', zhStory.qr);
const zhCopy = await p.evaluate(()=>({ copy: storyCopy(currentPlan, storyFacts()), days: document.getElementById('days').textContent }));
ok(zhCopy.copy.label === '在一起' && zhCopy.copy.unit === '天' && String(zhCopy.copy.num) === zhCopy.days && +zhCopy.days > 400,
  'Story：最大的数字 = 首页「在一起第 N 天」的 N', JSON.stringify({label:zhCopy.copy.label, num:zhCopy.copy.num, unit:zhCopy.copy.unit, days:zhCopy.days}));
ok(zhCopy.copy.names === '坤怿  &  瑶瑶' && /^\d+月\d+日 · \d 站 · \d\d:\d\d 出发$/.test(zhCopy.copy.stats) && zhCopy.copy.url === BASE.replace(/^https?:\/\//, '') + '/index.html',
  'Story：名字、没打过卡就写今天几站几点出发、图上印着网址', JSON.stringify({names:zhCopy.copy.names, stats:zhCopy.copy.stats, url:zhCopy.copy.url}));
await p.click('#ratioPlan'); await wait(300);
ok((await p.$eval('#posterImg', e=>e.naturalWidth)) === 750, '切回计划图');
await p.click('#posterClose'); await wait(200);
await p.click('#posterBtn'); await wait(1000);
ok(evSender.length === 3, '计数：同一份计划再出图不重复记', evSender.length);
await p.click('#posterClose').catch(()=>{}); await wait(200);
// 第二步：她在另一台"手机"上打开短链。后台那一页对人就是一个跳转，这里用 302 代替它。
// 另一台手机 = 另一个浏览器上下文（localStorage 不共享）：他的手机认得出自己发的短链、拆开不算她拆（下面第 2b 步测），她的手机不认识
const herCtx = await b.createBrowserContext();
const q=await herCtx.newPage(); q.on('pageerror',e=>console.log('[ERR]',e.message));
await q.emulate(PHONE);
// 真的短链在 workers.dev，网站的 service worker 管不到；这个替身和网站同源，得绕开 SW 才拦得住
await q.setBypassServiceWorker(true);
const evGuest = [], trapGuest = evTrap(evGuest);
await q.setRequestInterception(true);
q.on('request', r=>{
  if (trapGuest(r)) return;
  // 真的 /p/:id 跳回来时末尾带 &p=<id>（server/test.mjs 验它），这里照样带上
  if (r.url() === SHORT) return r.respond({status:302, headers:{Location: longLink + '&p=' + SHORT_ID}});
  r.continue();
});
await q.goto(link,{waitUntil:'networkidle2'}); await wait(1200);
ok(await q.evaluate(()=>location.pathname.replace(/^.*\//,'') === 'index.html' && location.search.indexOf('?s=') === 0), '短链跳到 ?s= 长链，老链接那一套原样接手', await q.evaluate(()=>location.search.slice(0,12)));
ok(/坤怿/.test(await q.$eval('#iTitle', el=>el.textContent)), '她看到的是他的名字', await q.$eval('#iTitle', el=>el.textContent.replace(/\n/g,' ')));
ok(evGuest.length === 0, '计数：只是打开、还没拆，不算 open', JSON.stringify(evGuest));
await q.click('#sealBtn').catch(()=>{}); await wait(1500);
const btns = await q.$$eval('#guestActs .act', a=>a.filter(e=>e.offsetParent).map(e=>e.textContent.replace(/\s/g,'')));
ok(btns.length === 3, '拆开后三个按钮', btns.join('/'));
ok(evGuest.length === 1 && evGuest[0].e === 'open' && evGuest[0].id === SHORT_ID, '计数：拆封蜡那一下记 open，带短链 id', JSON.stringify(evGuest));
await q.click('#acceptBtn'); await wait(600);
const rc = await q.$$eval('#replyMask .act', a=>a.map(e=>e.textContent.replace(/\s/g,'')));
ok(rc.some(t=>/下次换你排/.test(t)), '回话弹层有「下次换你排」', rc.join('/'));
ok(evGuest.length === 2 && evGuest[1].e === 'accept' && evGuest[1].id === SHORT_ID, '计数：点「我答应你」记 accept', JSON.stringify(evGuest[1]));
await q.click('#rcNext'); await wait(800);
const after = await q.evaluate(()=>({
  guest: document.body.classList.contains('guest'),
  to: cfg.to, from: cfg.from,
  toast: (document.querySelector('.toast')||{}).textContent||'',
  saved: (JSON.parse(localStorage.getItem('xindong_cfg_v2')||localStorage.getItem('cfg')||'{}')||{}).to
}));
ok(after.to==='坤怿' && after.from==='瑶瑶' && !after.guest, '她成了发送者，名字对调，零输入', JSON.stringify({from:after.from,to:after.to}));
ok(evGuest.length === 3 && evGuest[2].e === 'handoff' && evGuest[2].id === SHORT_ID, '计数：点「下次换你排」记 handoff（K 的分子）', JSON.stringify(evGuest[2]));
ok(evGuest.every(x=>Object.keys(x).sort().join()==='e,id'), '计数：她这一头发出去的每一条只有动作名 + 短链 id，没有名字、没有那句话、没有 couple', JSON.stringify(evGuest));
ok(!(await q.evaluate(()=>OWN_LINK)), '她的手机不认识这条短链（不是自己发的）');
await herCtx.close();
// 第 2a 步：她拆开了——后台在 plans 那一行盖了 14:32。他的页面切回前台就问一次，问到了写回本机，三处同时出现那一行
openedAt = OPENED_AT;
await p.bringToFront();
const askedBefore = openedAsked.length;
await p.evaluate(()=>{ document.dispatchEvent(new Event('visibilitychange')); });   // 切回来立刻问一次
await wait(800);
const shown = await p.evaluate(()=>({
  hiddenDoc: document.hidden,
  hidden: $('openedLine').classList.contains('hidden'), txt: $('openedLine').textContent, html: $('openedLine').innerHTML,
  rec: JSON.parse(localStorage.getItem('xindong_log_v1'))[0].opened,
  memo: Array.from(document.querySelectorAll('.memo-row .mo')).map(e=>e.textContent),
  visible: $('openedLine').offsetParent !== null
}));
ok(openedAsked.length > askedBefore, '她拆开了：切回前台立刻又问了一次', (openedAsked.length - askedBefore) + ' 次, document.hidden=' + shown.hiddenDoc);
ok(!shown.hidden && shown.visible && shown.txt === '瑶瑶拆开了 · 14:32', '计划卡下面出现「瑶瑶拆开了 · 14:32」（称呼进句子，今天只写时间）', shown.txt);
ok(shown.html === '瑶瑶拆开了 · <b>14:32</b>', '时间那一段是金色西文 <b>', shown.html);
ok(shown.rec === OPENED_AT, '写回本机：回忆本那一条 opened = 后台答的时间', shown.rec);
ok(shown.memo.join('|') === '瑶瑶拆开了 · 14:32', '回忆本那一条也多了这一行', shown.memo.join('|'));
await p.click('#shareOpen'); await wait(400);
ok(await p.evaluate(()=>!$('shOpened').classList.contains('hidden') && $('shOpened').textContent === '瑶瑶拆开了 · 14:32'), '分享面板里、链接下面也是这一行');
await p.click('#shClose'); await wait(200);
const askedAfter = openedAsked.length;
await p.evaluate(()=>Opened.kick()); await wait(500);
ok(openedAsked.length === askedAfter, '拆开了就不再问（本机有答案了）', openedAsked.length - askedAfter);
ok(evSender.every(x=>x.e !== 'open'), '他这一头从头到尾没有打过 open', JSON.stringify(evSender.map(x=>x.e)));
// 第 2b 步：他自己点开自己发的短链看看效果——同一台手机（同一个上下文）认得出这条 id，拆开不算她拆、也不进 K
const me=await b.newPage(); me.on('pageerror',e=>console.log('[ERR]',e.message));
await me.emulate(PHONE);
await me.setBypassServiceWorker(true);
const evSelf = [], trapSelf = evTrap(evSelf), askedSelf = [], trapOpenedSelf = openedTrap(askedSelf);
await me.setRequestInterception(true);
me.on('request', r=>{
  if (trapSelf(r)) return;
  if (trapOpenedSelf(r)) return;
  if (r.url() === SHORT) return r.respond({status:302, headers:{Location: longLink + '&p=' + SHORT_ID}});
  r.continue();
});
await me.goto(link,{waitUntil:'networkidle2'}); await wait(1000);
ok(await me.evaluate(()=>OWN_LINK === true && SHORT_ID === 'kZ7mQ4'), '自己的手机认得出：这条短链是自己发的');
await me.click('#sealBtn').catch(()=>{}); await wait(1200);
ok(await me.$$eval('#guestActs .act', a=>a.filter(e=>e.offsetParent).length) === 3, '自己点开：信照样拆得开');
await me.click('#acceptBtn'); await wait(500);
ok(evSelf.length === 0, '自己点开自己发的：拆开、愿意都不记（不算她拆开，也不进 K）', JSON.stringify(evSelf));
ok(askedSelf.length === 0, '她那一面（body.guest）从不去问「拆开了没有」', askedSelf.length);
await me.close();
// 第 2c 步：下次打开——他隔天再打开网站，回忆本那一条直接从本机读出「瑶瑶拆开了 · 14:32」，不用再问后台；点「看」计划卡下面也有
const p2=await b.newPage(); p2.on('pageerror',e=>console.log('[ERR]',e.message));
await p2.emulate(PHONE);
const evP2 = [], trapP2 = evTrap(evP2), askedP2 = [], trapOpenedP2 = openedTrap(askedP2);
await p2.setRequestInterception(true);
p2.on('request', r=>{ if (trapP2(r) || trapOpenedP2(r)) return; if (isTile(r)) return serveTile(r); r.continue(); });
await p2.goto(BASE + '/index.html?t=14:00',{waitUntil:'networkidle2'}); await wait(1000);
ok((await p2.$$eval('.memo-row .mo', a=>a.map(e=>e.textContent))).join('|') === '瑶瑶拆开了 · 14:32', '下次打开：回忆本那一条写着「瑶瑶拆开了 · 14:32」', await p2.$$eval('.memo-row .mo', a=>a.map(e=>e.textContent)));
ok(askedP2.length === 0, '下次打开：本机已有答案，不再问后台', askedP2.length);
ok(await p2.evaluate(()=>$('openedLine').classList.contains('hidden')), '还没点开哪一份计划：计划卡下面那一行不出现');
await p2.click('.memo-row .mb'); await wait(500);
ok(await p2.evaluate(()=>!$('openedLine').classList.contains('hidden') && $('openedLine').textContent === '瑶瑶拆开了 · 14:32'), '点「看」：计划卡下面出现那一行');
await p2.close();
// 第三步：同一个链接，英文收件人打开（?lang=en）——客人那一面必须全英文，中文路径不受影响
const e=await b.newPage(); e.on('pageerror',err=>console.log('[ERR]',err.message));
await e.emulate(PHONE);
const evLong = [], trapLong = evTrap(evLong);
await e.setRequestInterception(true);
e.on('request', r=>{ if (!trapLong(r)) r.continue(); });
await e.goto(longLink + '&lang=en',{waitUntil:'networkidle2'}); await wait(1200);
const enTitle = await e.$eval('#iTitle', el=>el.textContent);
ok(/planned/.test(enTitle) && !/[\u4e00-\u9fa5]/.test(enTitle.replace(/坤怿|瑶瑶/g,'')), '英文收件人：标题是英文', JSON.stringify(enTitle));
ok(/stops · from/.test(await e.$eval('#iMeta', el=>el.textContent)), '英文收件人：日期行是英文');
await e.click('#sealBtn').catch(()=>{}); await wait(1500);
// 第 3 条：他用中文排的计划，她用英文看——每一站的标题、描述、落款都是英文
const cn = /[\u4e00-\u9fa5]/;
const courses = await e.$$eval('#m-courses .course', a=>a.map(c=>({
  t:(c.querySelector('.t')||{}).textContent||'', d:(c.querySelector('.d')||{}).textContent||'' })));
ok(courses.length>=2, '英文收件人：计划有站', courses.length);
ok(courses.every(c=>!cn.test(c.t.replace(/坤怿|瑶瑶/g,''))), '英文收件人：每站标题英文', courses.map(c=>c.t).join(' / '));
ok(courses.every(c=>!cn.test(c.d.replace(/坤怿|瑶瑶/g,''))), '英文收件人：每站描述英文', courses.map(c=>c.d).join(' / ').slice(0,90));
const sig = await e.$eval('#m-courses .sig, .sig', el=>el.textContent).catch(()=>'');
ok(sig && !cn.test(sig), '英文收件人：落款英文', sig);
const enBtns = await e.$$eval('#guestActs .act', a=>a.filter(x=>x.offsetParent).map(x=>x.textContent.trim()));
ok(enBtns.length===3 && !enBtns.some(x=>/[\u4e00-\u9fa5]/.test(x)), '英文收件人：三个按钮无中文', enBtns.join(' / '));
await e.click('#acceptBtn'); await wait(600);
const enReply = await e.$eval('#rcBody', el=>el.textContent);
ok(!/[\u4e00-\u9fa5]/.test(enReply), '英文收件人：回话是英文', enReply);
ok(/Your turn/.test(await e.$eval('#rcNext', el=>el.textContent)), '英文收件人：主按钮 Your turn next time');
await e.click('#rcNext'); await wait(800);
const enAfter = await e.evaluate(()=>({to:cfg.to, from:cfg.from, guest:document.body.classList.contains('guest'), lang:document.documentElement.getAttribute('lang')}));
ok(enAfter.to==='坤怿' && enAfter.from==='瑶瑶' && !enAfter.guest, '英文收件人：接手后名字同样对调', JSON.stringify(enAfter));
ok(enAfter.lang==='en', '<html lang> 是 en');
ok(evLong.map(x=>x.e).join()==='open,accept,handoff' && evLong.every(x=>!('id' in x)), '计数：从长链打开（没有 &p=）三个动作照记，只是不带 id', JSON.stringify(evLong));

// 第四步：英文发件人（任务 2b）——干净的浏览器上下文，首页 → 设置 → 一键 → 分享面板，
// 全程扫可见文字里的中文。卡池文案（卡片标题/描述/结尾句/情话）和人名不算，那是任务 3。
const POOL_SEL = '.card .t, .card .d, .card .meta, .card .tip, .course .t, .course .d, .course .x, .sig, #sweet, #lnBody, .memo-row .mt, #langGroup';
const zhScan = (page) => page.evaluate((excl) => {
  const bad = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())){
    const s = n.textContent.replace(/坤怿|瑶瑶|Kun|Yao/g, '');
    if (!/[\u4e00-\u9fa5]/.test(s)) continue;
    const el = n.parentElement;
    if (!el || el.closest('script,style,noscript,svg') || el.closest(excl)) continue;
    let vis = true, cur = el;
    while (cur && cur !== document.body){
      const cs = getComputedStyle(cur);
      if (cs.display === 'none' || cs.visibility === 'hidden'){ vis = false; break; }
      cur = cur.parentElement;
    }
    if (!vis) continue;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    bad.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + ': ' + s.trim().slice(0, 30));
  }
  return bad;
}, POOL_SEL);
const ctx = await b.createBrowserContext();
const s = await ctx.newPage(); s.on('pageerror',err=>console.log('[ERR]',err.message));
await s.emulate(PHONE);
// 这一页后台够不着（/plans 直接断掉）：分享必须静默回落到长链，界面上看不出区别
let plansFailed = 0, tilesServed = 0, openedTried = 0; const evTried = [];
// 瓦片是网站的 service worker 接走的（cacheFirst），不绕开它这里就拦不到
await s.setBypassServiceWorker(true);
await s.setRequestInterception(true);
s.on('request', r=>{
  if (isTile(r)){ tilesServed++; return serveTile(r); }
  if (/\/plans$/.test(r.url())){ plansFailed++; return r.abort('failed'); }
  if (/\/opened\?/.test(r.url())){ openedTried++; return r.abort('failed'); }   // 这一页不该问：没有短链、已拆开的也不用再问
  if (/\/ev$/.test(r.url())){
    if (r.method()==='OPTIONS') return r.respond({status:204, headers:CORS});   // 预检放过，才看得到那条 POST 想发什么
    evTried.push(JSON.parse(r.postData()||'{}')); return r.abort('failed');
  }
  r.continue();
});
await s.goto(BASE + '/index.html?t=14:00&lang=en',{waitUntil:'networkidle2'}); await wait(800);
let bad = await zhScan(s);
ok(bad.length===0, '英文发件人：首页无中文', bad.join(' | ') || 'clean');
ok(/Where to today/.test(await s.$eval('#h1', el=>el.textContent)), '英文发件人：h1 是英文');
// 第 7 条：没有链接、没填称呼的生人，第一屏一句话说清是什么、给谁用
ok(await s.$eval('#sub', el=>el.textContent)==='Date plans for couples: I plan today, you send it, they open it and go.', '英文发件人：首屏一句话说清是什么、给谁用', await s.$eval('#sub', el=>el.textContent));
ok(await s.$eval('#quickBtn .qt', el=>el.textContent)==='Plan today', '英文发件人：一键按钮 Plan today');
ok(/^Tweak · Today · Leave now · A little treat · Around town$/.test(await s.$eval('#foldTxt', el=>el.textContent)), '英文发件人：条件摘要是英文', await s.$eval('#foldTxt', el=>el.textContent));
await s.evaluate(()=>_setFold(true)); await wait(300);
bad = await zhScan(s);
ok(bad.length===0, '英文发件人：条件区 + 手动抽卡区无中文', bad.join(' | ') || 'clean');
const chips = await s.$$eval('#budgets .chip', a=>a.map(x=>x.textContent));
ok(chips.join('/')==='Cheap & happy/A little treat/Go big', '英文发件人：预算 chips 英文，state 仍是中文 key', chips.join('/'));
ok(await s.evaluate(()=>state.budget)==='小奢侈', '英文发件人：state.budget 还是「小奢侈」');
await s.evaluate(()=>openPanel()); await wait(400);
bad = await zhScan(s);
ok(bad.length===0, '英文发件人：设置面板无中文（语言开关那一组除外）', bad.join(' | ') || 'clean');
const langChips = await s.$$eval('#cfgLang .chip', a=>a.map(x=>x.textContent + (x.classList.contains('on') ? '*' : '')));
ok(langChips.join('/')==='中文/English*', '设置里有「语言 / Language」开关，当前 English', langChips.join('/'));
await s.type('#cfgFrom','Kun'); await s.type('#cfgTo','Yao');
await s.click('#saveCfg'); await wait(400);
ok(/taking Yao today/.test(await s.$eval('#h1', el=>el.textContent)), '英文发件人：填了称呼后 h1 带名字', await s.$eval('#h1', el=>el.textContent));
await s.click('#quickBtn'); await wait(2500);
bad = await zhScan(s);
ok(bad.length===0, '英文发件人：排好一份后页面无中文（卡池文案除外）', bad.join(' | ') || 'clean');
ok(/^Today, for Yao$/.test(await s.$eval('#m-title', el=>el.textContent)), '英文发件人：计划标题 Today, for Yao', await s.$eval('#m-title', el=>el.textContent));
ok(/check-in/.test(await s.$eval('#m-progress', el=>el.textContent)), '英文发件人：打卡提示英文');
ok((await s.$$eval('#m-courses .swap', a=>a.map(x=>x.textContent))).every(x=>x==='Swap'), '英文发件人：「换」变成 Swap');
ok(/Send today to Yao/.test(await s.$eval('#shareOpen', el=>el.textContent)), '英文发件人：主按钮 Send today to Yao');
// 还没分享过就先出图：海报照出，但不该顺手生成 couple id（那是分享才做的事）
await s.click('#posterBtn'); await wait(1200);
const pk = await s.evaluate(()=>({ show: document.getElementById('posterMask').classList.contains('show'), mem: cfg.couple || '', saved: (JSON.parse(localStorage.getItem('xindong_cfg_v1')||'{}')).couple || '' }));
ok(pk.show && !pk.mem && !pk.saved, '没分享过就出图：海报照出，不顺手生成 couple id', JSON.stringify(pk));
// 第 6 条（英文 + 地图那一路）：种两条带位置的打卡，Story 图上就该有足迹地图——瓦片被替身接住（深色），
// 画上去那一块就一定是暗的；字全是英文；没设日子就数点亮的地方
// 这一条顺手也当第 9 条的英文样本：发过短链（sids）、三天前 09:05 拆开的（opened）——不是今天，所以带日期
const OPENED_EN = (()=>{ const d = new Date(); d.setDate(d.getDate() - 3); d.setHours(9, 5, 0, 0); return d; })();
const MON_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const OPENED_EN_TXT = 'Yao opened it · ' + MON_EN[OPENED_EN.getMonth()] + ' ' + OPENED_EN.getDate() + ', 09:05';
await s.evaluate((openedAt)=>{
  const plan = { ymd:'2026-09-12', s:[{t:'小巷咖啡', te:'Alley coffee', c:'食', m:600, u:60}, {t:'湖边走走', te:'Lakeside walk', c:'行', m:690, u:90}] };
  localStorage.setItem('xindong_log_v1', JSON.stringify([{ sig:'2026-09-12|小巷咖啡,湖边走走', ymd:'2026-09-12', done:true, plan,
    sids:['kZ7mQ4'], sentAt: openedAt - 3600e3, opened: openedAt,
    checks:{ 0:{t:Date.now()-2e6, lat:43.6532, lon:-79.3832}, 1:{t:Date.now()-1e6, lat:43.6387, lon:-79.3810} } }]));
}, OPENED_EN.getTime());
await s.click('#ratioStory');
const enDim = await waitStory(s);
ok(enDim.w === 1080 && enDim.h === 1920, '英文发件人：Story 版 1080×1920', enDim.w + 'x' + enDim.h);
ok(tilesServed > 0, 'Story：足迹地图去要了瓦片（被替身接住，测试不碰真的 OSM）', tilesServed + ' 张');
await s.addScriptTag({ path: require.resolve('jsqr/dist/jsQR.js') });
const enStory = await readPoster(s);
ok(enStory.map.every(v=>v < 120), 'Story：瓦片真的画进了地图那一块（跨域图片带 CORS，canvas 没被污染，存得出来）', enStory.map.join(','));
ok(enStory.qr === BASE + '/index.html', '英文发件人：Story 二维码同样解回站点地址', enStory.qr);
const enCopy = await s.evaluate(()=>storyCopy(currentPlan, storyFacts()));
const enVals = Object.keys(enCopy).map(k=>String(enCopy[k])).join(' | ');
ok(!/[\u4e00-\u9fa5]/.test(enVals.replace(/Kun|Yao/g,'')), '英文发件人：Story 上的每一句都是英文', enVals);
ok(enCopy.label === 'LIT UP' && enCopy.num === 2 && enCopy.unit === 'PLACES' && enCopy.stats === '2 places lit · 2 check-ins' && enCopy.names === 'Kun  &  Yao',
  '英文发件人：没设日子就数点亮的地方；地图下面一行是打卡数', JSON.stringify({label:enCopy.label, num:enCopy.num, unit:enCopy.unit, stats:enCopy.stats}));
ok(/post it to your Story/.test(await s.$eval('#posterHint', e=>e.textContent)), '英文发件人：Story 提示是英文', await s.$eval('#posterHint', e=>e.textContent));
await s.click('#posterClose'); await wait(200);
await s.click('#shareOpen'); await wait(400);
bad = await zhScan(s);
ok(bad.length===0, '英文发件人：分享面板无中文', bad.join(' | ') || 'clean');
await s.click('#shMake'); await wait(600);
const enLink = await s.$eval('#shOut', el=>el.value);
ok(/\?s=.*&lang=en$/.test(enLink), '英文发件人：链接带 &lang=en');
ok(plansFailed >= 1 && enLink.indexOf(BASE + '/index.html?s=') === 0, '后台够不着：试过短链，静默回落长链', plansFailed + ' 次');
ok(!evTried.some(x=>x.e==='sent'), '后台够不着：短链没到手就不记 sent', JSON.stringify(evTried));
ok(evTried.length===1 && evTried[0].e==='poster' && !('id' in evTried[0]), '没分享过就出图：poster 照记，没有短链就不带 id（而且照样打不出去也无所谓）', JSON.stringify(evTried));
ok(/^Done ✓/.test(await s.$eval('#shMake', el=>el.textContent)), '英文发件人：生成后按钮变 Done ✓');
const enToast = await s.$eval('#toast', el=>el.textContent);
ok(!/[\u4e00-\u9fa5]/.test(enToast), '英文发件人：toast 是英文', enToast);
// 第 9 条（英文）：回忆本里那条三天前拆开的写成 "Yao opened it · Sep 27, 09:05"（不是今天 → 带日期）；这一页从头到尾没去问过后台
const enOpened = await s.$$eval('.memo-row .mo', a=>a.map(e=>e.textContent));
ok(enOpened.join('|') === OPENED_EN_TXT, '英文发件人：「她拆开了」那一行是英文，不是今天的带日期', enOpened.join('|') + ' vs ' + OPENED_EN_TXT);
ok(await s.evaluate(()=>$('openedLine').classList.contains('hidden')), '英文发件人：这份没拿到短链，计划卡下面那一行不出现');
ok(openedTried === 0, '英文发件人：没有短链的不问、已拆开的也不问——这一页一次都没打 /opened', openedTried);
// 语言开关：点「中文」→ 写 xd_lang → 带 ?lang=zh 重载，?s= 这类参数照旧
await s.click('#shClose'); await wait(200);
await s.evaluate(()=>openPanel()); await wait(300);
await Promise.all([s.waitForNavigation({waitUntil:'networkidle2'}), s.click('#cfgLang .chip:first-child')]);
await wait(600);
const sw = await s.evaluate(()=>({ lang: document.documentElement.getAttribute('lang'), st: localStorage.getItem('xd_lang'), q: location.search, h1: document.getElementById('h1').textContent, sub: document.getElementById('sub').textContent }));
ok(sw.st==='zh' && /lang=zh/.test(sw.q) && /t=14:00/.test(sw.q) && sw.lang!=='en', '语言开关：切回中文，xd_lang=zh，?t= 保留', JSON.stringify(sw));
ok(sw.h1==='今天带Yao去哪？', '语言开关：切回后 h1 是中文', sw.h1);
ok(sw.sub==='我帮你排好，你再发给Yao', '填过称呼的人副标题照旧带名字（第 7 条那句只给生人看）', sw.sub);
await ctx.close();

// 第五步：中文一字不变——干净上下文打开 ?lang=zh，首屏文字和从前一样（第 7 条改掉的只有副标题那一句和按钮顺序）
const ctx2 = await b.createBrowserContext();
const z = await ctx2.newPage(); await z.emulate(PHONE);
await z.goto(BASE + '/index.html?t=14:00&lang=zh',{waitUntil:'networkidle2'}); await wait(800);
const zh = await z.evaluate(()=>({
  h1: document.getElementById('h1').textContent, sub: document.getElementById('sub').textContent,
  subH: document.getElementById('sub').getBoundingClientRect().height,
  qt: document.querySelector('#quickBtn .qt').textContent, qd: document.querySelector('#quickBtn .qd').textContent,
  fold: document.getElementById('foldTxt').textContent, gear: document.getElementById('gearBtn').textContent,
  hero: document.querySelector('.hero-stat').textContent.replace(/\s+/g,''),
  chips: Array.from(document.querySelectorAll('#budgets .chip')).map(x=>x.textContent).join('/'),
  lang: document.documentElement.getAttribute('lang'), title: document.title,
  // 第 7 条：第一屏只有一个主按钮，一键在前、「调一调」那道线之后才是定位
  order: Array.from(document.querySelectorAll('#quickBtn, #tempBtn, #foldBtn, #sweetBtn')).map(x=>x.id).join(','),
  primaries: Array.from(document.querySelectorAll('.quick, .act.primary, .final, .deal')).filter(x=>x.offsetParent && x.getBoundingClientRect().top < innerHeight).map(x=>x.id).join(','),
  quickIn: document.getElementById('quickBtn').getBoundingClientRect().bottom <= innerHeight
}));
ok(zh.h1==='今天，怎么心动？' && zh.title==='今天，怎么心动？', '中文：标题不变', zh.h1);
ok(zh.sub==='情侣约会计划：一键排好今天，发给她，她拆开就出发' && zh.subH < 30, '中文：首屏一句话说清是什么、给谁用，一行放得下', zh.sub + ' / ' + zh.subH + 'px');
ok(zh.order==='quickBtn,foldBtn,tempBtn,sweetBtn', '按钮顺序：一键 → 调一调 → 定位 → 情话', zh.order);
ok(zh.primaries==='quickBtn' && zh.quickIn, '第一屏只有「一键定今天」一个主按钮，且不用滚就看得见', zh.primaries);
ok(zh.qt==='一 键 定 今 天' && zh.qd==='不用想，我按现在的时间直接排好一份', '中文：一键按钮不变');
ok(zh.fold==='调一调 · 今天 · 现在出发 · 小奢侈 · 市区逛逛' && zh.gear==='⚙︎ 设置', '中文：条件摘要 / 设置按钮不变', zh.fold);
ok(zh.hero==='在一起第天' && zh.chips==='穷开心/小奢侈/豪华版' && zh.lang==='zh-CN', '中文：大数字 / chips / <html lang> 不变', zh.hero + ' ' + zh.chips);
await ctx2.close();
await b.close();
done();
})().catch(e=>{ console.error('FATAL', e); process.exit(1); });
