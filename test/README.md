# 测试

```sh
# 仓库根目录起一个静态服务
python3 -m http.server 8099 &
cd test && npm ci && npm test
```

- `sched.js`   排程：多个时刻 × 全部卡片组合，每站必须落在自己的营业时段内，越界 0
- `smoke.js`   主流程：排今天 → 分享链接 → 客人拆信 → 愿意 → 「下次换你排」名字对调
- `shop.js`    商家入口：不要定位权限、起点 + 两站、出示按天去重、时钟在跳、首次/回头
- `layout.js`  文档宽不超过视口（iOS 缩放的根源）
- `daylight.js` 日照门槛：11 月天黑后不排需要天光的卡，6 月同一时刻照排

环境变量：`CHROME_PATH`（Chrome 路径）、`BASE_URL`（默认 `http://localhost:8099`）。
后端测试在 `server/`：`node test.mjs`。
