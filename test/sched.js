const { launch, BASE } = require('./_lib');
const URL = BASE + '/index.html';

(async () => {
  const browser = await launch();

  let violations = 0, checked = 0;
  for (const t of ['07:10', '09:45', '11:30', '13:50', '16:20', '19:05', '21:40', '23:30']) {
    const p = await browser.newPage();
    p.on('pageerror', e => console.log('[PAGEERROR]', t, e.message));
    await p.goto(`${URL}?t=${t}`, { waitUntil: 'networkidle2' });

    // exhaustively schedule many random hands and validate every stop against its window
    const res = await p.evaluate(() => {
      const out = { earliest: earliestStart(), bad: [], hands: 0, empty: 0, samples: [] };
      const budgets = ['穷开心', '小奢侈', '豪华版'];
      const locs = ['🏠 家附近', '🌆 市区逛逛', '🚗 出逃半日'];
      const weathers = ['☀️ 晴', '🌧️ 雨'];
      for (const b of budgets) for (const l of locs) for (const w of weathers) {
        state.budget = b; state.loc = l; state.weather = w;
        const plays = candidates(false), foods = candidates(true);
        if (!plays.length || !foods.length) { out.empty++; continue; }
        for (let n = 0; n < 25; n++) {
          const hand = [];
          for (let i = 0; i < 1 + (n % 4); i++) if (plays[(n + i) % plays.length]) hand.push(plays[(n + i) % plays.length]);
          for (let i = 0; i < 1 + (n % 3); i++) if (foods[(n + i) % foods.length]) hand.push(foods[(n + i) % foods.length]);
          const uniq = []; const seen = {};
          hand.forEach(x => { if (!seen[x.t]) { seen[x.t] = 1; uniq.push(x); } });
          const r = scheduleStops(uniq.slice());
          out.hands++;
          r.stops.forEach((s, i) => {
            const src = r.kept[i];
            if (s.m < out.earliest) out.bad.push(`${s.t} 排在 ${fmtClock(s.m)}，早于最早出发 ${fmtClock(out.earliest)}`);
            if (src.tw && s.m > src.tw[1] * 60) out.bad.push(`${s.t} 排在 ${fmtClock(s.m)}，但最晚只能 ${src.tw[1]}:00 开始`);
            if (src.tw && s.m < src.tw[0] * 60) out.bad.push(`${s.t} 排在 ${fmtClock(s.m)}，但 ${src.tw[0]}:00 才开门`);
            if (s.m + s.u > 25 * 60) out.bad.push(`${s.t} 结束于 ${fmtClock(s.m + s.u)}，超过收工线`);
            if (i > 0) {
              const prev = r.stops[i - 1];
              if (s.m < prev.m + prev.u) out.bad.push(`${s.t} ${fmtClock(s.m)} 和上一站 ${prev.t} ${fmtClock(prev.m + prev.u)} 撞了`);
            }
          });
          if (out.samples.length < 1 && r.stops.length >= 3) {
            out.samples.push(r.stops.map(s => `${fmtClock(s.m)}-${fmtClock(s.m + s.u)} ${s.t}`).join(' | '));
          }
        }
      }
      return out;
    });
    checked += res.hands;
    violations += res.bad.length;
    console.log(`t=${t}  最早出发 ${Math.floor(res.earliest / 60)}:${String(res.earliest % 60).padStart(2, '0')}  组合 ${res.hands}  无卡组合 ${res.empty}  越界 ${res.bad.length}`);
    if (res.bad.length) console.log('   ' + [...new Set(res.bad)].slice(0, 6).join('\n   '));
    if (res.samples[0]) console.log('   样例: ' + res.samples[0]);
    await p.close();
  }
  console.log(`\n合计校验 ${checked} 个组合，越界 ${violations} 处`);
  await browser.close();
  process.exit(violations ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
