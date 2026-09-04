# 后台

网站本身是纯静态的，没有这个后台也能完整使用——评分会先存在自己手机上，
等后台上线之后自动补交。这个后台只做前端做不到的两件事：
**把所有情侣的评分合并起来**，以及**让两个人共用同一张足迹地图**。

## 部署源（2026-09-03 起）

Worker `xindong` 的构建源应指向 **`kunyi523/Date`，根目录 `server/`**，部署命令 `npm run deploy`
（先跑 D1 迁移再发布）。以后合并 Date 的 main 就自动重新部署，`kunyi523/xindong` 那份副本不再维护。

迁移按文件名顺序只执行一次：**不要改已经执行过的迁移文件**（比如 0001），要改表就加新文件（0002…）。
`test.mjs` 现在也按同样顺序跑全部迁移，改了老迁移本地就会暴露。

## 部署：点一下就好（推荐）

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kunyi523/Date/tree/main/server)

这个按钮做的事：在**你自己的** Cloudflare 账号里建好 Worker、自动开一个 D1 数据库、
建好表、配好每次 push 自动部署。**不需要把任何密钥交给别人**，也不用装命令行工具。

**已经部署好了：`https://xindong.707748836.workers.dev`**，
并且已经写进 `index.html` 的 `API_DEFAULT`，所以打开网站就是连着的，不用带任何参数。

想临时指到别处（比如本地调试）加 `?api=http://localhost:8787`；
想彻底断开走纯本地加 `?api=off`。

**还剩一件小事**：IP 哈希用的盐。配置文件里不再写它（`keep_vars = true`，面板上设的值部署后保留），
没设的话代码里有个默认值，能跑但弱。
它只用来防止有人从库里反推 IP（IP 本身不入库，只存哈希、只留一小时），
所以不紧急，但建议换掉。在 Cloudflare 面板 → Workers & Pages → `xindong`
→ Settings → Variables，把 `IP_SALT` 改成任意一串字符即可；或者：

```bash
npx wrangler secret put IP_SALT
```

> 这个按钮偶尔会出问题（Cloudflare 自己的 issue #14553：有时新建的仓库只有两个文件、
> Worker 停在 Hello World）。如果碰上了，用下面的命令行方式，两分钟。

## 部署：命令行

```bash
npm i -g wrangler
wrangler login

cd server
npm install
wrangler d1 create xindong                 # 把返回的 database_id 填进 wrangler.toml
npm run deploy                             # 建表 + 发布
```

## 接口

| 方法 | 路径 | 作用 |
|---|---|---|
| `POST` | `/reviews` | 交一条评分 |
| `GET` | `/places?ids=…&mbti=…` | 按地点取合并后的分数 |
| `GET` | `/cards?lat=&lon=` | 把评分高的真实地点反过来喂回抽卡 |
| `GET` | `/weather?lat=&lon=` | 代理 open-meteo，让前端只认一个域名 |
| `POST` | `/couple` | 上传"我这半张"足迹（整份覆盖，幂等） |
| `GET` | `/couple?id=&by=` | 读回对方那半张 |
| `POST` | `/plans` | 存一份计划换 6 位短链：body `{ s, lang }`，`s` 就是长链 `?s=` 后那一串；返回 `{ id, url, exp }`，30 天过期 |
| `GET` | `/p/:id` | 一页只有 og 标签的 HTML（「坤怿为你排好了一天」+ 封蜡卡），脚本立刻跳到 `网站/?s=…&p=:id`；找不到或过期 404 |
| `POST` | `/ev` | 匿名计数：body `{ e, id? }`，`e ∈ open / accept / handoff / sent / poster`，`id` 是短链 id（可无）。只存动作名、哪一天、id 前 4 位 |
| `GET` | `/sweet` | 占位，以后接模型写情话 |

短链跳回的网站默认是 `https://kunyi523.github.io/Date/`，自己部署的人在面板 Variables 里设 `SITE` 即可（`og-seal.png` 也从那儿取）。
`/p/:id` 对爬虫和人返回同一页：聊天软件的爬虫不跑脚本，读到 og 就出卡片；人被 `location.replace` 带走，历史里不留这一页。
预览里只有日期、几站、几点开始——她想说的那句话和每一站都在封蜡后面。
跳回去的地址末尾多一个 `&p=:id`，只是给计数用的钥匙：网站认的仍然只是 `?s=`，`&p=` 缺了也照常打开。

## 算 K

K = 收到链接的人里，有多少接着发出了自己的一份 = `handoff / open`。这是这个产品唯一要盯的数（见 `ROADMAP.md`「增长模型」）。

前端在五个点各打一次 `POST /ev`：她拆开封蜡（`open`）、点「我答应你」（`accept`）、点「下次换我排」（`handoff`）、
他把链接发出去（`sent`，短链到手那一刻记，同一份只记一次）、存成图片（`poster`）。
`open` 记在网站上拆封蜡那一下而不是 `/p/:id`——爬虫也会打那一页。
表 `events` 一行只有三列：动作、哪一天（UTC）、短链 id 前 4 位（长链打开的留空）。**不存 IP、UA、couple id、设备 id，连精确时间都不存。**
前 4 位够把同一份计划的 拆开 → 愿意 → 接手 串起来，又不是那条短链本身。

```sql
-- 按周看漏斗和 K。分母为 0 的周 K 记 0
SELECT strftime('%Y-W%W', d)  AS week,
       SUM(e = 'sent')        AS sent,
       SUM(e = 'open')        AS opened,
       SUM(e = 'accept')      AS accepted,
       SUM(e = 'handoff')     AS handed,
       SUM(e = 'poster')      AS posters,
       ROUND(1.0 * SUM(e = 'handoff') / MAX(SUM(e = 'open'), 1), 2) AS K
  FROM events
 GROUP BY week
 ORDER BY week DESC;
```

跑法：Cloudflare 面板 → D1 → `xindong` → Console 粘进去；或者 `cd server && npx wrangler d1 execute DB --remote --command "…"`。
按份看（同一条短链被拆开几次、有没有接手）：`SELECT pid4, GROUP_CONCAT(e) FROM events WHERE pid4 <> '' GROUP BY pid4;`
`test.mjs` 会把上面那段 sql 直接从这份 README 里抠出来跑，改了查询别忘了看它还过不过。

`GET /places` 返回：

```json
{ "places": { "osm:node/123": {
  "n": 42, "score": 4.4,
  "match": { "n": 9, "score": 4.7 },
  "dims": { "quiet": 0.8, "pair": 0.9, "linger": 0.6, "photo": 0.7, "noqueue": 0.4 },
  "tags": [["纪念日", 12], ["第一次约会", 7]],
  "cost": "小奢侈",
  "quotes": ["靠窗那一桌可以坐很久"]
} } }
```

`match` 是「和你们 MBTI 接近的情侣」那一档：把一对情侣在 E/I、S/N、T/F、J/P
四个轴上的倾向各算一个字母（两人一致取该字母，不一致记 `?`），四个轴里至少三个
对得上才算接近。少于 3 对就不显示，避免一两条评分被当成结论。

## 自测

```bash
cd server && npm i && npm test
```

用 sql.js 在内存里冒充 D1，直接跑真正的 `worker.js`，**不需要 Cloudflare 账号**。
135 条断言，覆盖校验、去重、合并、文字过滤、限流、下架、MBTI 相似度、
两个人共享足迹的上传/读回/幂等/脏数据清洗、短链 + og 预览、匿名计数 + 算 K 的那条查询。改完 `worker.js` 请跑一遍。

## 两个人共一张地图

`POST /couple` 是**整份覆盖**而不是逐条追加，所以同步是幂等的：重传结果一样，
断在中间也不会留下半份数据。每台设备一行，`GET` 只返回**别人**那几行，所以自己读不到自己。

`couple id` 是一串不可枚举的随机字符，知道它就等于有权限——和分享链接一样的思路。
没有账号，也就没有账号可以泄露。照片只上传缩略图，原图永远留在本机。

## 隐私与分寸

- **不做账号。** 每台设备生成一串随机 id，只用来去重和限流。
- 收上来的只有：地点标识、分数、五个布尔维度、标签、一句话、MBTI 组合、设备 id、时间。
  **没有位置、没有姓名、没有联系方式**，打卡记录和照片一律留在本机。
- 同一台设备对同一个地点只保留最新一条（`PRIMARY KEY (pid, by_id)`）。
- 一台设备一小时最多 20 条。
- 评价文字最多 60 字，去掉换行和链接。
- 要下架某条评价：`UPDATE reviews SET hidden = 1 WHERE pid = ? AND by_id = ?;`
  `hidden = 1` 的记录不再参与合并。**上线之前一定要想好谁来看这个表**——
  只要能写自由文本，就会有人写不该写的东西。

## 还没做的

- 评价文字目前只有长度和链接过滤，没有内容审核。真要开放给陌生人，得加一层
  （关键词表，或者交给一个小模型先判一遍）。
- 没有分地区。同名的连锁店在不同城市会被当成不同地点（因为 pid 用的是 OSM 的
  node/way id），这是对的；但"活动"类的 `act:火锅暖场` 是全国合并的。
- 没有短链和链接预览图，也没有「她拆开了」提醒。计划目前整份塞在 URL 里（800~1200 字符）。
- 没有分地区合并"活动"类评分（`act:火锅暖场` 是全国合并的）。
