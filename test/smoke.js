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
await b.close();
done();
})().catch(e=>{ console.error('FATAL', e); process.exit(1); });
