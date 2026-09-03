const { launch, BASE, wait, ok, done } = require('./_lib');
(async () => {
  const b = await launch();
  const p = await b.newPage();
  await p.emulate({ viewport:{width:440,height:956,deviceScaleFactor:3,isMobile:true,hasTouch:true}, userAgent:'iPhone' });
  await p.goto(process.argv[2] || (BASE + '/index.html'), { waitUntil:'networkidle2' });
  await wait(1500);
  const r = await p.evaluate(() => {
    const de = document.documentElement;
    const vw = de.clientWidth;
    const bad = [];
    document.querySelectorAll('*').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed') return;          // fixed 不参与文档宽度
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      if (r.right > vw + 0.5) bad.push({
        el: el.tagName.toLowerCase() + (el.id ? '#'+el.id : '') + '.' + String(el.getAttribute('class')||''),
        left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), pos: cs.position,
      });
    });
    // canvas 的位图尺寸
    const cv = document.getElementById('petals');
    return {
      视口宽: vw, 文档宽: de.scrollWidth, 溢出: de.scrollWidth - vw,
      花瓣画布: cv ? { 位图: cv.width + 'x' + cv.height, css: Math.round(cv.getBoundingClientRect().width) + 'x' + Math.round(cv.getBoundingClientRect().height) } : null,
      非fixed溢出元素: bad,
    };
  });
  ok(r.溢出 === 0, '文档不比视口宽（否则 iOS 会缩放）', '视口 ' + r.视口宽 + ' 文档 ' + r.文档宽);
  ok(r.花瓣画布 && /^440x/.test(r.花瓣画布.css), '花瓣画布不撑破视口', r.花瓣画布 && r.花瓣画布.css);
  await b.close();
  done();
})().catch(e=>{ console.error('FATAL', e); process.exit(1); });
