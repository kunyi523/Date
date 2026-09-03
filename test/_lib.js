// 所有测试共用：起浏览器、站点地址、断言计数。
// CHROME_PATH 环境变量指定 Chrome；BASE_URL 指定被测站点（默认本地 8099）。
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const BASE = (process.env.BASE_URL || 'http://localhost:8099').replace(/\/$/, '');
const CANDIDATES = [process.env.CHROME_PATH, '/usr/local/bin/google-chrome', '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium',
  '/opt/hostedtoolcache/setup-chrome/chromium/stable/x64/chrome'].filter(Boolean);
function chrome(){
  for (const c of CANDIDATES) if (fs.existsSync(c)) return c;
  throw new Error('找不到 Chrome，设 CHROME_PATH');
}
async function launch(){
  return puppeteer.launch({ executablePath: chrome(), headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
}
const PHONE = { viewport:{width:440,height:956,deviceScaleFactor:2,isMobile:true,hasTouch:true}, userAgent:'iPhone' };
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, passes = 0;
function ok(cond, msg, extra){
  if (cond){ passes++; console.log('  ✓ ' + msg + (extra !== undefined ? '  (' + extra + ')' : '')); }
  else { fails++; console.log('  ✗ ' + msg + (extra !== undefined ? '  (' + extra + ')' : '')); }
}
function done(){
  console.log(`\n${fails ? '✗' : '✓'} ${passes} 通过，${fails} 失败\n`);
  process.exit(fails ? 1 : 0);
}
module.exports = { launch, BASE, PHONE, wait, ok, done };
