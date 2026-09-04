const { launch, BASE, PHONE, wait, ok, done } = require('./_lib');
(async()=>{
const b=await launch();
// 第一步：他排好一份，拿到分享链接
const p=await b.newPage(); p.on('pageerror',e=>console.log('[ERR]',e.message));
await p.emulate(PHONE);
await p.goto(BASE + '/index.html?t=14:00',{waitUntil:'networkidle2'}); await wait(800);
await p.evaluate(()=>openPanel()); await wait(400);
await p.type('#cfgFrom','坤怿'); await p.type('#cfgTo','瑶瑶');
await p.click('#saveCfg'); await wait(400);
await p.click('#quickBtn'); await wait(2500);
await p.click('#shareOpen'); await wait(400);
await p.click('#shMake'); await wait(600);
const link = await p.$eval('#shOut', e=>e.value);
ok(/\?s=/.test(link) && link.length > 100, '分享链接生成', link.length + ' 字');
// 第二步：她在另一台"手机"上打开
const q=await b.newPage(); q.on('pageerror',e=>console.log('[ERR]',e.message));
await q.emulate(PHONE);
await q.goto(link,{waitUntil:'networkidle2'}); await wait(1200);
await q.click('#sealBtn').catch(()=>{}); await wait(1500);
const btns = await q.$$eval('#guestActs .act', a=>a.filter(e=>e.offsetParent).map(e=>e.textContent.replace(/\s/g,'')));
ok(btns.length === 3, '拆开后三个按钮', btns.join('/'));
await q.click('#acceptBtn'); await wait(600);
const rc = await q.$$eval('#replyMask .act', a=>a.map(e=>e.textContent.replace(/\s/g,'')));
ok(rc.some(t=>/下次换你排/.test(t)), '回话弹层有「下次换你排」', rc.join('/'));
await q.click('#rcNext'); await wait(800);
const after = await q.evaluate(()=>({
  guest: document.body.classList.contains('guest'),
  to: cfg.to, from: cfg.from,
  toast: (document.querySelector('.toast')||{}).textContent||'',
  saved: (JSON.parse(localStorage.getItem('xindong_cfg_v2')||localStorage.getItem('cfg')||'{}')||{}).to
}));
ok(after.to==='坤怿' && after.from==='瑶瑶' && !after.guest, '她成了发送者，名字对调，零输入', JSON.stringify({from:after.from,to:after.to}));
// 第三步：同一个链接，英文收件人打开（?lang=en）——客人那一面必须全英文，中文路径不受影响
const e=await b.newPage(); e.on('pageerror',err=>console.log('[ERR]',err.message));
await e.emulate(PHONE);
await e.goto(link + '&lang=en',{waitUntil:'networkidle2'}); await wait(1200);
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
await s.click('#shareOpen'); await wait(400);
bad = await zhScan(s);
ok(bad.length===0, '英文发件人：分享面板无中文', bad.join(' | ') || 'clean');
await s.click('#shMake'); await wait(600);
const enLink = await s.$eval('#shOut', el=>el.value);
ok(/\?s=.*&lang=en$/.test(enLink), '英文发件人：链接带 &lang=en');
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
