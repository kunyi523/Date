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
await b.close();
done();
})().catch(e=>{ console.error('FATAL', e); process.exit(1); });
