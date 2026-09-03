const { launch, BASE, PHONE, wait, ok, done } = require('./_lib');
(async()=>{
const b=await launch();
const p=await b.newPage();
p.on('pageerror',e=>console.log('[ERR]',e.message));
await p.emulate(PHONE);
await p.goto(BASE + '/index.html',{waitUntil:'networkidle2'});
await wait(800);
for (const [ds,hh] of [['2026-11-15',18],['2026-06-21',18],['2026-11-15',13]]){
  const r = await p.evaluate((ds,hh)=>{
    const [y,mo,da]=ds.split('-').map(Number);
    window.now = new Date(y,mo-1,da,hh,0,0);
    state.lat=43.2557; state.lon=-79.8711; state.loc=NEAR; window._sunCache=null;
    const all=candidates(false).concat(candidates(true));
    const needLight=all.filter(c=>c.sun).map(c=>c.t);
    const s=sunTimes(state.lat,state.lon,window.now);
    const f=m=>Math.floor(m/60)+':'+String(Math.round(m%60)).padStart(2,'0');
    return { 日落:f(s.set), 候选数:all.length, 还需天光的:needLight,
      前六张:all.slice(0,6).map(c=>c.t) };
  }, ds, hh);
  const afterDark = ds === '2026-11-15' && hh === 18;
  if (afterDark) ok(r.还需天光的.length === 0, ds + ' ' + hh + ':00 日落 ' + r.日落 + ' 之后没有需要天光的卡', r.还需天光的.join('、') || '无');
  else ok(r.还需天光的.includes('球场投篮'), ds + ' ' + hh + ':00 天还亮着，球场仍在候选', r.日落);
}
await b.close();
done();
})().catch(e=>{ console.error('FATAL', e); process.exit(1); });
