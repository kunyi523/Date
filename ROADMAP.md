# 怎么心动 · 唯一目标：传播

海外、双语、静态网站。**不赚钱，不做小程序，不做商家。只问一件事：它怎么像病毒一样传出去。**
UI/UX 保留，规矩在 `DESIGN.md`，那一份不动。

这份文件同时是**给自动运行的代理的操作手册**。各节用标题引用，不用编号。人（坤怿）2026-09-04 起手术休养，几周不在。
代理由 Cursor 定时自动化唤醒，每次都是新实例，没有上一次的记忆——**这份文件就是记忆。**

---

## 每次被唤醒时照这个做

1. `git fetch origin main && git checkout main && git pull`
2. 读这份文件。看「任务清单」，找**第一条**未勾选、且"依赖"已满足的任务
3. 开分支 `cursor/<任务名>-cb25`，只做这一条，做小做完
4. 本地先跑测试：仓库根目录 `python3 -m http.server 8099 &`，然后 `cd test && npm install && npm test`；
   后端 `cd server && npm install && node test.mjs`。本地没有 Chrome 就跳过，靠 PR 上的 CI。
   跑不过就修，修不好就写进「日志」、不合并
5. 提交、推送、开 PR（用 ManagePullRequest 工具）。PR 正文写：做了什么、怎么验的、没做什么
6. 等 CI：用 ManagePullRequest 的 `get_ci_status` 查（或 cursor-subscriptions 的 `subscribe_github_ci` 等），
   一般 3 分钟。三项都要绿：`test / 站点冒烟`、`test / 后端`、`Cloudflare Pages`
7. **如果「授权状态」里合并为"是"且 CI 绿**：合并到 main。
   **合并只能用 Github MCP 的 `merge_pull_request`（owner `kunyi523`, repo `Date`, 方法 `squash`）——
   `gh` 命令是只读的，`gh pr merge` 会失败。** 合并即上线（GitHub Pages + Cloudflare Pages 都跟着 main）。
   CI 红就只留 PR，把红的原因写进 PR 正文和「日志」
8. 在「任务清单」把这条勾掉，在「日志」写一行（日期、做了什么、下次注意什么）——
   这两处改动可以直接放进同一个 PR
9. 一次只做一条。做完就停，等下一次唤醒。**如果醒来发现有自己上次开的、CI 已绿但没合的 PR，先合它再做新的**

**绝不做的事**（没有任何例外）：
- 改 `DESIGN.md` 里的视觉规则、改配色令牌、动花和明暗主题
- 加登录、账号、下载 App、付费
- 加任何让第三个人进入"排—发—拆—愿意"过程的功能（投票、评论、参与）
- 用主人的任何账号（Gmail、X、小红书）对外发任何东西。文案可以写进 `launch/`，发是人的事
- 动 `kunyi523/xindong` 仓库（Worker 的部署副本），除非「授权状态」写了可以
- 让旧链接失效：`?s=` `?c=` `?shop=` 必须一直能打开
- 不确定就开 PR 不合并，把问题写进 PR 正文和「日志」

---

## 人回来时要做的（坤怿看这里）

只有一件事没做完，**5 分钟**，不做也不影响前三条任务：

Cloudflare 面板 → Workers & Pages → `xindong` → Settings → Build →
仓库换成 `kunyi523/Date`、分支 `main`、根目录 `server`、部署命令 `npm run deploy` → 保存。
顺手在 Variables and Secrets 里把 `IP_SALT` 改成任意一串字符。

做完之后合并 main 会自动部署后端，第 4/5/9 条（短链、计数、「她拆开了」）才能上线。
其他一切看「日志」——每次运行一行。有没合进去的 PR，正文里写着为什么。

---

## 增长模型

核心动作——他排好、发给她、她拆开、她点愿意——**每次只碰两个人**。
它自己不会病毒式传播，除非收到的人变成下一个发的人。所以：

> **K = 收到链接的人里，有多少比例接着发出了自己的一份**

三个回路，按杠杆排：

1. **一对一链接**（最强）：她点完"愿意"，下一步就是"下次换你排"，他的名字已填好。
   每一次收到都是一次产品体验，发生在情绪最高点。→ 已做（任务清单第 0 条）
2. **链接预览**：链接贴进 iMessage / WhatsApp / Instagram / Discord 时显示成一张封蜡卡片
   「Someone planned your day」而不是一串乱码。点开率差一个量级。→ 需要短链 + og:image
3. **海报**：在一起 N 天 + 足迹地图 + 照片钉 + 站点地址，9:16 发 Instagram Story / 小红书。
   这是唯一能出情侣圈的东西。

**双语不是本地化，是功能**：混语情侣（一个说中文一个说英文）——他用中文排，她用英文看。
没有竞品有这个。这是"海外"两个字真正的含义。

---

## 授权状态（人来填，代理只读）

| 项 | 状态 | 说明 |
|---|---|---|
| 代理可以把 CI 绿的 PR 合并到 main | **是**（人合并 #22 即为授权；撤销就把这里改回"否"） | 合并 = 上线。第 1 条任务（CI）做完之前，只合并 CI 已存在且绿的 PR |
| Worker 从 `kunyi523/Date` 的 `server/` 自动部署 | **切换中**（人在 Cloudflare 面板改构建源；`server/` 已就位：真 database_id、迁移历史已修、`npm run deploy`） | 切好后合并 main 即部署后端。代理验证方法：Cloudflare-builds 工具看 xindong 有没有来自 Date 的新构建且 success。第 4/5/9 条以此为依赖 |
| 代理可以从主人账号对外发内容 | **否**，永远 | 文案写进 `launch/`，人发 |

---

## 已经有的

- 单文件 `index.html`，GitHub Pages，无 key；后端 Cloudflare Worker（`xindong`）+ D1 已部署
- 一键排今天、真实时间轴、附近真实地点（OSM）、出逃半日、偏好、打卡、足迹地图、照片、
  两人共一张地图、备份、装主屏、离线、日出日落感知
- 分享：`?s=` 整份计划进链接；封蜡；海报；文字版
- 商家入口屏（`?shop=`）——代码留着，方向上不再投入
- 出示页、老板娘页（`shop.html`）——同上

---

## 任务清单（有序；每条一次唤醒能做完）

- [x] **0. 收件人变发送人** ——她点完"愿意"复制回话后，主按钮是「下次换你排 →」，
  点进去 `cfg.from/to` 对调（她=原 to，发给原 from），零输入。`mineBtn` 改名同义。
  验收：客人流程走完点它，`cfg.to` 等于发件人名字，`body` 不再是 guest。✓ 2026-09-03

- [x] **1. 测试进仓库 + GitHub Actions** ✓ 2026-09-03（`test/` 五套 + `server/test.mjs`，`.github/workflows/test.yml`）
  把冒烟测试写进 `test/`（puppeteer-core，Chrome 由 Action 装）：主流程出计划、客人拆信到接手、
  排程 3300 组合越界 0、`?shop=` 三站且不要定位、缩放溢出 0。`.github/workflows/test.yml` 在 PR 上跑。
  **没有这条，自动合并就是盲飞，所以它排第一。**
  验收：开一个 PR，Actions 绿。
  依赖：无

- [ ] **2. 英文界面（第一层：UI 字符串）**
  所有界面文字抽进一个 `I18N` 字典（zh/en），`t('key')` 取。切换：`?lang=en` > `localStorage` >
  `navigator.language` 以 `en` 开头 > 默认 zh。设置里一个开关。**不动布局、不动令牌。**
  卡池文案（t/d）这一条不碰，留给第 3 条。
  验收：`?lang=en` 打开全站无中文残留（正则扫 `[\u4e00-\u9fa5]` 排除卡池）；zh 一字不变。
  依赖：1

- [ ] **3. 卡池双语 + 按收件人语言显示**
  每张手写卡加 `t_en` / `d_en`；`ENDINGS` / `REPLIES` / `SWEETS` 同样。
  **收件人看自己的语言**：链接里带发件人语言，页面按收件人的 `lang` 渲染，同一份计划两种语言。
  英文不要翻译腔，要像英语母语的人写给恋人；每张卡英文不超过中文的 1.3 倍长度（版面）。
  验收：zh 排一份 → `?lang=en` 打开同一链接，三站标题描述全是英文，时间轴不变。
  依赖：2

- [ ] **4. 短链 + 链接预览（og:image）**
  Worker：`POST /plans` 存计划返回 6 位 id（30 天过期，无账号）；`GET /p/:id` 返回一页 HTML，
  带 `og:title`「{from} planned your day」/ `og:image`（封蜡卡，canvas 那套逻辑搬到 Worker 用
  `@cloudflare/pages-plugin` 或预渲染 PNG）/ `og:description`，然后跳到
  `index.html?s=…`。前端分享时优先拿短链，拿不到回落长链。
  验收：短链贴进 iMessage / Discord 出卡片；旧 `?s=` 链接照常。
  依赖：1，**且「授权状态」里 Worker 部署为"是"或构建源已改**

- [ ] **5. 匿名计数（算 K）**
  Worker `POST /ev` 收 `{e, id?}`，`e ∈ {open, accept, handoff, sent, poster}`，只存事件名、天、
  计划 id 前 4 位；不存 IP、不存 UA、不存 couple id。前端在五个点各打一次。
  `server/README.md` 写一条 D1 查询算 K = handoff / open。
  验收：本地 test.mjs 覆盖；线上打开一次后 D1 里能查到。
  依赖：4（同一次 Worker 部署）

- [ ] **6. 海报 Story 版**
  9:16 一版（现有是方的），站点地址 + 二维码醒目，天数最大，地图其次，英文版跟 `lang`。
  验收：两种比例都能存，肉眼看 `DESIGN.md` 的字号和留白规则。
  依赖：2

- [ ] **7. 落地页三秒说清**
  没有链接直接打开的人，第一屏一句话双语讲清"这是什么、给谁用"，一个主按钮。
  **不改布局结构**，只改 hero 文案和按钮顺序。
  验收：新访客 3 秒内知道能干什么（找三个不知道的人看截图）。
  依赖：2

- [ ] **8. `launch/` 文案包（人来发）**
  Product Hunt 一版、Reddit 三版（r/LongDistance、r/relationship_advice、r/dating）、
  TikTok 三条 30 秒脚本（创始人故事：在加拿大给女友做了这个）、小红书海外版三条、
  Instagram 简介。全部双语。**只写不发。**
  依赖：3、4、6（要有能贴出去的短链和海报）

- [ ] **9. 「她拆开了」**
  `GET /p/:id` 第一次被打开时记一下；发件人页面轮询或下次打开时看到"她拆开了 · 14:32"。
  不推送、不要通知权限。
  依赖：4

---

## 日志（代理每次追加一行）

- 2026-09-03 · 方向定为海外双语 + 传播唯一目标；完成第 0 条；写下这份手册。
- 2026-09-03 · 完成第 1 条：测试搬进 `test/`（sched / smoke / shop / layout / daylight），
  GitHub Actions 在 PR 和 main 上跑站点 + 后端两组。本地全绿。
  下次注意：`shop.js` 和 `smoke.js` 会碰真实的 Overpass，CI 上可能慢或被限流；
  站点测试都有 30 秒等待和无网络兜底，正常应通过。若 CI 红且是网络原因，先重跑一次再判断。
  从第 2 条（英文界面）开始，每个 PR 必须 CI 绿才合并。
- 2026-09-03 · 后端准备好从 Date 直接部署（#25）：查线上 D1 发现 redeems 没有 first_time 列——
  我此前把新列加进了已执行的 0001，wrangler 不会重跑它。改成 0002 ALTER，test.mjs 按顺序跑全部迁移。
  **教训：永远不要改已执行过的迁移文件，加新文件。** database_id 换真、IP_SALT 出配置 + keep_vars。
  人正在面板把构建源切到 Date/server。做第 4 条之前先用 Cloudflare-builds 工具确认有来自 Date 的成功构建。

---

## 明确不做

- 微信小程序、任何国内平台版本
- 任何付费、任何商家路线的新投入
- 登录 / 账号 / App / 推送权限
- 情侣评分评价（UGC）、社交流、别人的计划
- 接高德 / Google Places / 小模型写文案（文案手写，双语也手写）

## H5 维护须知

- 一个 `index.html`，JS 按编号小节排好，改动前先看小节标题；有意只用 ES5
- 样式一律走 `:root` 令牌，规矩见 `DESIGN.md`
- 时间相关的改动跑多时段自测：每一站必须落在自己的营业时段内，需要天光的不排在日落后
- 后端在 `server/`，`node test.mjs` 64 条断言；schema 在 `migrations/`
