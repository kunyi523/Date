# 后台

网站本身是纯静态的，没有这个后台也能完整使用——评分会先存在自己手机上，
等后台上线之后自动补交。这个后台只做一件前端做不到的事：**把所有情侣的评分合并起来**。

## 部署

```bash
npm i -g wrangler
wrangler login

cd server
wrangler d1 create xindong                 # 记下返回的 database_id
# 把 database_id 填进 wrangler.toml
wrangler d1 execute xindong --remote --file=./schema.sql
wrangler deploy
```

部署完会给你一个地址，比如 `https://xindong.你的账号.workers.dev`。
然后这样打开网站，前端就会走后台：

```
https://kunyi523.github.io/Date/?api=https://xindong.你的账号.workers.dev
```

确认好用之后，把 `index.html` 里 `API` 那一段的 `base` 默认值改成这个地址，
就不用每次带参数了。

## 接口

| 方法 | 路径 | 作用 |
|---|---|---|
| `POST` | `/reviews` | 交一条评分 |
| `GET` | `/places?ids=…&mbti=…` | 按地点取合并后的分数 |
| `GET` | `/cards?lat=&lon=` | 把评分高的真实地点反过来喂回抽卡 |
| `GET` | `/weather?lat=&lon=` | 代理 open-meteo，让前端只认一个域名 |
| `GET` | `/sweet` | 占位，以后接模型写情话 |

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
- 没有做「两个人共享同一张足迹地图」。那需要一个 `couple id`，见 `ROADMAP.md` 第二步。
