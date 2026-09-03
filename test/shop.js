const { launch, BASE, PHONE, wait, ok, done } = require('./_lib');
const SHOP = { n:'Sweet Cup 奶茶', la:43.25570, lo:-79.87110, p:'坐在店里第二杯半价', id:'sweetcup-hamilton' };
const b64 = o => Buffer.from(JSON.stringify(o),'utf8').toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
(async () => {
  const b = await launch();
  const p = await b.newPage();
  const dialogs = [], posted = [];
  p.on('pageerror', e=>console.log('[ERR]', e.message));
  p.on('dialog', d=>{ dialogs.push(d.message()); d.dismiss(); });
  await p.emulate(PHONE);
  await p.setRequestInterception(true);
  p.on('request', r=>{
    if (r.url().includes('/redeem')){
      const cors = {
        'Access-Control-Allow-Origin':'*',
        'Access-Control-Allow-Methods':'POST, OPTIONS',
        'Access-Control-Allow-Headers':'content-type'
      };
      if (r.method()==='OPTIONS') return r.respond({status:204,headers:cors});
      posted.push(JSON.parse(r.postData()||'{}'));
      return r.respond({status:200,headers:{...cors,'content-type':'application/json'},body:'{"ok":true}'});
    }
    r.continue();
  });
  const url = `${BASE}/index.html?t=19:30&shop=${encodeURIComponent(b64(SHOP))}`;
  await p.goto(url, { waitUntil:'networkidle2' });
  await wait(1200);
  ok((await p.evaluate(()=>navigator.permissions.query({name:'geolocation'}).then(s=>s.state))) === 'prompt', '落地不要定位权限');

  await p.click('#shopGo');
  await p.waitForFunction(()=>!document.getElementById('menu').classList.contains('hidden'), {timeout:30000}).catch(()=>console.log('  (没等到计划)'));
  await wait(4000);
  console.log('=== 计划 ===');
  ok((await p.$$eval('#m-courses .course', a=>a.length)) === 3, '起点 + 两站');
  const rows = await p.$$eval('#m-courses .course', a=>a.map(e=>e.innerText.replace(/\n/g,' | ')));
  rows.forEach((r,i)=>console.log('  '+(i+1)+'. '+r.slice(0,120)));
  const noHours = await p.$$eval('#m-courses .course', a=>a.filter(e=>/营业时间没查到/.test(e.innerText)).length);
  ok(noHours === 0, '没有营业时间不明的站');

  console.log('=== 出示页 ===');
  await p.click('#m-courses .course.start .show-perk'); await wait(800);
  const sc = await p.evaluate(()=>{
    const x=document.getElementById('showcase');
    if(!x||!x.classList.contains('on')) return null;
    const q=s=>x.querySelector(s);
    return { shop:q('.sc-shop').textContent, perk:q('.sc-perk').textContent,
      date:q('.sc-date').textContent, clock:q('.sc-clock').textContent,
      px:parseFloat(getComputedStyle(q('.sc-perk')).fontSize) };
  });
  ok(!!sc, '出示页弹出');
if(!sc){ }
  else {
    console.log('  店名:', sc.shop);
    console.log('  福利:', sc.perk, '('+sc.px+'px)');
    console.log('  日期:', sc.date, ' 时钟:', sc.clock);
    await wait(2300);
    const c2 = await p.evaluate(()=>{const e=document.getElementById('scClock');return e&&e.textContent;});
    ok(sc.clock !== c2, '出示页时钟在跳', sc.clock + ' → ' + c2);
      }
  console.log('  上传:', JSON.stringify(posted));

  await p.click('#scX'); await wait(400);
  for (let i=0;i<4;i++){
    await p.click('#m-courses .course.start .show-perk'); await wait(300);
    await p.click('#scX'); await wait(200);
  }
  ok(posted.length === 1, '连点五次只上传一条', posted.length);
ok(posted[0] && posted[0].first === 1, '第一次标 first:1', JSON.stringify(posted[0]));
  console.log('  按钮:', await p.$eval('#m-courses .course.start .show-perk', e=>e.textContent));
  console.log('  起点卡打卡了:', await p.$$eval('#m-courses .course.start.done', a=>a.length?'是 ✓':'否'));
  ok(dialogs.length === 0, '没弹任何对话框');

  // 换一天：应该能再算一次
  await p.evaluate(()=>{
    const k='xindong_redeem_v1', o=JSON.parse(localStorage.getItem(k)||'{}');
    for(const s in o) o[s].d='2020-01-01';       // 假装上次是很久以前
    localStorage.setItem(k,JSON.stringify(o));
  });
  await p.reload({waitUntil:'networkidle2'}); await wait(1200);
  await p.click('#shopGo').catch(()=>{});
  await p.waitForFunction(()=>!document.getElementById('menu').classList.contains('hidden'),{timeout:30000}).catch(()=>{});
  await wait(4000);
  await p.click('#m-courses .course.start .show-perk').catch(()=>{}); await wait(700);
  ok(posted.length===2 && posted[1].first===0, '隔天再出示标成回头 first:0', JSON.stringify(posted[1]));
  await b.close();
  done();
})().catch(e=>{ console.error('FATAL', e); process.exit(1); });
