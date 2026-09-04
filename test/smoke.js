const { launch, BASE, PHONE, wait, ok, done } = require('./_lib');
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
await p.setRequestInterception(true);
p.on('request', r=>{
  if (trapSender(r)) return;
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
await p.click('#posterClose'); await wait(200);
await p.click('#posterBtn'); await wait(1000);
ok(evSender.length === 3, '计数：同一份计划再出图不重复记', evSender.length);
await p.click('#posterClose').catch(()=>{}); await wait(200);
// 第二步：她在另一台"手机"上打开短链。后台那一页对人就是一个跳转，这里用 302 代替它
const q=await b.newPage(); q.on('pageerror',e=>console.log('[ERR]',e.message));
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
let plansFailed = 0; const evTried = [];
await s.setRequestInterception(true);
s.on('request', r=>{
  if (/\/plans$/.test(r.url())){ plansFailed++; return r.abort('failed'); }
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
// 语言开关：点「中文」→ 写 xd_lang → 带 ?lang=zh 重载，?s= 这类参数照旧
await s.click('#shClose'); await wait(200);
await s.evaluate(()=>openPanel()); await wait(300);
await Promise.all([s.waitForNavigation({waitUntil:'networkidle2'}), s.click('#cfgLang .chip:first-child')]);
await wait(600);
const sw = await s.evaluate(()=>({ lang: document.documentElement.getAttribute('lang'), st: localStorage.getItem('xd_lang'), q: location.search, h1: document.getElementById('h1').textContent }));
ok(sw.st==='zh' && /lang=zh/.test(sw.q) && /t=14:00/.test(sw.q) && sw.lang!=='en', '语言开关：切回中文，xd_lang=zh，?t= 保留', JSON.stringify(sw));
ok(sw.h1==='今天带Yao去哪？', '语言开关：切回后 h1 是中文', sw.h1);
await ctx.close();

// 第五步：中文一字不变——干净上下文打开 ?lang=zh，首屏文字和从前一样
const ctx2 = await b.createBrowserContext();
const z = await ctx2.newPage(); await z.emulate(PHONE);
await z.goto(BASE + '/index.html?t=14:00&lang=zh',{waitUntil:'networkidle2'}); await wait(800);
const zh = await z.evaluate(()=>({
  h1: document.getElementById('h1').textContent, sub: document.getElementById('sub').textContent,
  qt: document.querySelector('#quickBtn .qt').textContent, qd: document.querySelector('#quickBtn .qd').textContent,
  fold: document.getElementById('foldTxt').textContent, gear: document.getElementById('gearBtn').textContent,
  hero: document.querySelector('.hero-stat').textContent.replace(/\s+/g,''),
  chips: Array.from(document.querySelectorAll('#budgets .chip')).map(x=>x.textContent).join('/'),
  lang: document.documentElement.getAttribute('lang'), title: document.title
}));
ok(zh.h1==='今天，怎么心动？' && zh.sub==='我帮你把今天排好，你只管发出去' && zh.title==='今天，怎么心动？', '中文：标题 / 副标题不变', zh.h1 + ' / ' + zh.sub);
ok(zh.qt==='一 键 定 今 天' && zh.qd==='不用想，我按现在的时间直接排好一份', '中文：一键按钮不变');
ok(zh.fold==='调一调 · 今天 · 现在出发 · 小奢侈 · 市区逛逛' && zh.gear==='⚙︎ 设置', '中文：条件摘要 / 设置按钮不变', zh.fold);
ok(zh.hero==='在一起第天' && zh.chips==='穷开心/小奢侈/豪华版' && zh.lang==='zh-CN', '中文：大数字 / chips / <html lang> 不变', zh.hero + ' ' + zh.chips);
await ctx2.close();
await b.close();
done();
})().catch(e=>{ console.error('FATAL', e); process.exit(1); });
