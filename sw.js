/* 今天，怎么心动？ · Service Worker
 *
 * 这是一个出门在外用的东西：地铁里、山上、信号一格的时候也得能打开打勾。
 * 所以：
 *   - 页面本身走"先网络后缓存"：有网就拿最新的，没网就用上次那份
 *   - 字体和图标走"先缓存"：Google 字体在国内经常拉不到，第一次拿到就一直用
 *   - 地图瓦片顺手缓存，走过的地方离线也能看，超过上限就丢最早的
 *   - 接口（评分、附近、天气）一律只走网络：这些东西宁可失败，也不能给旧数据
 *
 * 改动这个文件请把 VERSION 加一，不然老缓存不会退休。
 */
var VERSION = 'v1';
var SHELL = 'xd-shell-' + VERSION;
var FONTS = 'xd-fonts-' + VERSION;
var TILES = 'xd-tiles-' + VERSION;
var TILE_CAP = 400;

var SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL).then(function (c) {
      // 单个文件失败不该让整次安装失败（比如图标还没上传）
      return Promise.all(SHELL_FILES.map(function (u) {
        return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL && k !== FONTS && k !== TILES) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// 页面可以主动让新版本立刻接管
self.addEventListener('message', function (e) {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

function isFont(u) {
  return u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
}
function isTile(u) {
  return /(^|\.)tile\.openstreetmap\.org$/.test(u.hostname) ||
         /basemaps\.cartocdn\.com$/.test(u.hostname) ||
         /maps\.wikimedia\.org$/.test(u.hostname);
}
function isLiveData(u) {
  return /overpass/.test(u.hostname) ||
         u.hostname === 'nominatim.openstreetmap.org' ||
         u.hostname === 'api.open-meteo.com';
}

function trim(cacheName, cap) {
  caches.open(cacheName).then(function (c) {
    c.keys().then(function (keys) {
      if (keys.length <= cap) return;
      // keys() 是按写入顺序给的，砍掉最早的那一批
      for (var i = 0; i < keys.length - cap; i++) c.delete(keys[i]);
    });
  });
}

function cacheFirst(e, cacheName, cap) {
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        // 瓦片和字体是跨域的，拿到的是 opaque response，照样能存能用
        if (res && (res.ok || res.type === 'opaque')) {
          var copy = res.clone();
          caches.open(cacheName).then(function (c) {
            c.put(e.request, copy);
            if (cap) trim(cacheName, cap);
          });
        }
        return res;
      });
    }).catch(function () { return caches.match(e.request); })
  );
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // 评分/附近/天气这些实时数据，宁可失败也不给旧的
  if (isLiveData(url)) return;

  if (isFont(url)) return cacheFirst(e, FONTS, 0);
  if (isTile(url)) return cacheFirst(e, TILES, TILE_CAP);

  // 自己域名下的东西（页面、图标、manifest）：先网络，拿不到用缓存
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(SHELL).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          if (hit) return hit;
          // 直接打开带参数的链接（?s=…）离线时也要能落到首页
          if (req.mode === 'navigate') return caches.match('./index.html');
          return new Response('', { status: 504, statusText: 'offline' });
        });
      })
    );
  }
});
