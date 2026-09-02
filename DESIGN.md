# 今天，怎么心动？ — Style Reference

> 一个两个人用的深色"菜单"。整站建立在纸感的暖米底（`#F5F0E6`）与丝绒紫黑卡片（`#251C29`）之间，靠香槟金（`#C9A96A`）做唯一的强调色——它只出现在西文小标、时间、数字和被选中的状态上，不做大面积填充。中文标题用 Noto Serif SC 900 压住版面，西文小标和时间用 Cormorant Garamond 的斜体与宽字距（4–5px）做"印刷品"的呼吸感。圆角一律接近直角（3–8px），只有封蜡（`--radius-full`）和底部抽屉（`16px`）是圆的；没有卡片阴影是软的，投影都带着 12–18px 的垂直偏移，像一张纸压在另一张纸上。它不是 App，是一份每天重新印一次的菜单。

**Theme:** 双主题 **晨光（day）/ 夜色（night）**，可跟随系统也可手动切。
`html[data-theme="day"|"night"]` 由 `<head>` 里的一小段脚本在 CSS 上色之前写好，所以不会闪一下另一套配色。
优先级：分享链接里带的 > 本机存的 > 跟随系统。

**Source:** [https://kunyi523.github.io/Date/](https://kunyi523.github.io/Date/)
本文档的格式参考 [ricocc/brands-design-md](https://github.com/ricocc/brands-design-md) 与 [design.ricoui.com/brands](https://design.ricoui.com/brands) 的 `DESIGN.md` 约定。
令牌的唯一事实来源是 `index.html` 里 `:root` 的那一段；这份文档负责解释每个令牌该用在哪。

---

## Tokens — Colors

两套配色用的是**同一组令牌名**，所以组件里永远只写 `var(--…)`，不写具体颜色。

| Token | 晨光 day | 夜色 night | Role |
|---|---|---|---|
| `--paper` | `#F8F3EA` | `#140F19` | 页面底色 |
| `--paper2` | `#F1EADD` | `#1D1622` | 次级底色 |
| `--ink` | `#34293B` | `#F4ECE2` | 正文与标题 |
| `--ink-soft` | `rgba(52,41,59,.58)` | `rgba(244,236,226,.56)` | 辅助说明、占位 |
| `--gold` | `#A98446` | `#CBAB6E` | 描边、西文小标 |
| `--gold-bright` | `#C9A96A` | `#DFC591` | 强调、被选中的字 |
| `--gold-soft` | `rgba(169,132,70,.5)` | `rgba(203,171,110,.45)` | 淡出的金色发丝线 |
| `--rose` | `#A4737E` | `#B98C97` | 情绪色，副标题、卡片分类、花瓣 |
| `--card` | `#2A2130` | `#211A27` | 深色卡片底 |
| `--card-top` | `#392C40` | `#2E2436` | 深色渐变的高光端 |
| `--card-ivory` | `#FDFAF4` | `#241C2B` | 控件底（chip、输入框） |
| `--on-dark` | `#F2EBE1` | `#F4ECE2` | 深色卡片上的文字 |
| `--line` | `rgba(52,41,59,.12)` | `rgba(244,236,226,.11)` | 发丝线 |
| `--gold-line` | `rgba(201,169,106,.42)` | `rgba(203,171,110,.42)` | 菜单内框那道金线 |
| `--glow-a` / `--glow-b` | 金 `.20` / 胭脂 `.13` | 金 `.16` / 胭脂 `.10` | 背景两团光、大数字的呼吸光 |

阴影也是每个主题一套（`--shadow-flat/card/raised/overlay/pressed/inset/seal`）：
**晨光的阴影更散更淡**（两层，最深只到 `.26`），**夜色的更深更沉**。
深色卡片在两个主题下都是深色——计划长什么样，不该跟着明暗变。

设计意图：晨光是"暖象牙纸 + 香槟金 + 一点胭脂"，夜色是"近黑丝绒紫 + 亮一档的金"。
夜色的金要比晨光亮（`#CBAB6E` vs `#A98446`），否则在近黑底上会发灰。

---

## Tokens — Typography

### 'Noto Serif SC' · `--serif`
- **Weights:** 600, 900
- **Role:** h1、计划标题、每一站的名字、情话、封蜡上的字。中文的重量全靠它。

### 'Noto Sans SC' · `--sans`
- **Weights:** 300, 400, 500, 700
- **Role:** 正文、说明、卡片描述、表单。默认字体。

### 'Cormorant Garamond' · `--latin`
- **Weights:** 500, 600（含 italic）
- **Role:** 西文小标（PRIVATE RESERVE / MENU DU JOUR）、时间、天数、日期。
  它承担全站的"印刷品"气质，永远配大字距。

### Type Scale

| Role | Size | Token | 用在哪 |
|---|---|---|---|
| hero | 34px | `--text-hero` | 在一起第 N 天的大数字 |
| display-xl | 32px | `--text-display-xl` | h1（桌面 36px） |
| display-lg | 27px | `--text-display-lg` | 开场提问、信封标题 |
| display-md | 23px | `--text-display-md` | 计划标题 |
| display-sm | 19px | `--text-display-sm` | 分区标题、面板标题 |
| title-lg | 17px | `--text-title-lg` | 每一站的名字、主行动按钮 |
| title | 16px | `--text-title` | 卡片名字、生成计划按钮 |
| button | 15px | `--text-button` | 次级按钮 |
| body | 14px | `--text-body` | 正文、chip、输入框 |
| body-sm | 13.5px | `--text-body-sm` | 纪念日行、状态行、回忆本 |
| caption | 12.5px | `--text-caption` | 卡片描述、菜单脚注、表单标签 |
| micro | 11.5px | `--text-micro` | 卡片分类、页脚、徽标 |
| input | 16px | `--text-input` | **所有输入框的下限。** 低于 16px，iOS Safari 一点输入框就会把整页放大，用户得手动缩回去——设置页之所以"很不流畅"，一半是这个 |

字距单列成令牌，因为中西文规则相反：西文小标一律拉开，中文正文一律不拉。

| Token | Value | 用在哪 |
|---|---|---|
| `--track-eyebrow` | 5px | PRIVATE RESERVE、MENU DU JOUR |
| `--track-label` | 4px | 分区的英文名 |
| `--track-tag` | 3px | 卡片分类、页脚 |
| `--track-button` | 2px | 按钮文字 |
| `--track-tight` | .5px | chip |

---

## Tokens — Spacing & Shapes

**Density:** editorial（比一般 App 松，比杂志紧）

### Spacing Scale

| Token | Value | | Token | Value |
|---|---|---|---|---|
| `--space-1` | 2px | | `--space-7` | 22px |
| `--space-2` | 4px | | `--space-8` | 26px |
| `--space-3` | 6px | | `--space-9` | 34px |
| `--space-4` | 8px | | `--space-10` | 44px |
| `--space-5` | 12px | | `--space-11` | 56px |
| `--space-6` | 16px | | | |

### Border Radius

| Token | Value | 用在哪 |
|---|---|---|
| `--radius-sm` | 3px | 按钮、chip、输入框（默认） |
| `--radius-md` | 6px | 卡片、爱语卡 |
| `--radius-lg` | 8px | 计划菜单、弹层卡片 |
| `--radius-sheet` | 16px | 底部抽屉的上两角 |
| `--radius-full` | 999px | 只给封蜡 |

### Shadows

| Token | 用在哪 |
|---|---|
| `--shadow-flat` | chip、回忆本按钮 |
| `--shadow-card` | 抽出来的卡片 |
| `--shadow-raised` | 主行动按钮、一键 |
| `--shadow-overlay` | 计划菜单、弹层 |
| `--shadow-pressed` | 卡片被选中（往里压） |
| `--shadow-inset` | chip 被选中 |
| `--shadow-seal` | 封蜡（唯一的一次性阴影） |

### Motion

| Token | Value | 用在哪 |
|---|---|---|
| `--dur-fast` | .16s | 卡片按下、chip 反馈 |
| `--dur-base` | .25s | 提示条、抽屉升起 |
| `--dur-veil` | .42s | 换主题时那层幕布 |
| `--dur-slow` | .7s | 开场淡出、滚动渐显 |
| `--ease` | `cubic-bezier(.22,.61,.36,1)` | 全站只用这一条曲线：起步快、收尾慢，像纸落下 |

**只允许动 `transform` 和 `opacity`。** 动 `left/top/width/height` 会每帧触发一次布局——
这个站以前的高光扫过就是动 `left` 的，静置不动的时候每 3 秒也要做 75 次布局。

常驻动画控制在三个以内（两处高光 + 大数字的呼吸）。像"120 秒转一圈"这种看不出来的动画不要留，
它看不见，但每一帧都要付一次样式重算。

`@media (prefers-reduced-motion:reduce)` 里所有动画和过渡全部关掉，这条不许省。
**因此元素的初始状态必须写在 `@keyframes from{}` 里，不能写在元素自己的规则上**——
写成 `.card{opacity:0; animation:in … forwards}` 的话，动画一被禁用，卡片就永远不出现了。

### Layout

- **手机：** 单列，`max-width 430px`，左右 22px，顶部 30px
- **桌面（≥1000px）：** 两列 `360px + 1fr`，列间 56px，`max-width 1020px`，左列 sticky
- **她的视角（`body.guest`）：** 桌面也收成单列 `max-width 540px`，因为那一屏只需要读
- **触摸目标：** `--tap: 44px`，所有可点元素的下限。"换"这种视觉上必须小的按钮，用 `::after` 撑出 44px 的透明点击区

---

## Components

### ornament（花枝）
- **两套花，按主题换。** 晨光是**山茶 + 茉莉**，夜色是**玫瑰 + 蔷薇**。
  五个 symbol：`#camellia` `#jasmine` `#rose` `#briar` `#bud`，
  组合成 `#sprigDay` / `#sprigNight`（叶 + 两侧花 + 主花）
- **切换方式:** 两套都放在 DOM 里，`<use class="fd">` / `<use class="fn">`，
  靠 `html[data-theme]` 决定显示哪一套。不用 JS，也就不会闪
- **style:** 只描边不填色，`stroke:currentColor` 1.05，所以颜色跟着主题自动走
- **sizes:** `.orn.sm` 112×29 / `.orn.md` 150×39 / `.orn.lg` 176×46（viewBox 200×52，比例 3.85）
- **一定要留够 viewBox 的余量。** 之前主花放在 `y="-4"` 而 viewBox 从 0 开始，
  最上面那片花瓣被裁掉了，看起来像两个半片交叉——这种裁切在小尺寸下很难发现，
  改完花饰**一定要放大到 90px 看一眼**
- **不要:** 不要填色、不要一屏出现三个以上、不要把主花放大到抢标题

### hero bloom（抬头背后那朵）
- **size:** 126px，`opacity:.085`，`rotate(-12deg)` 固定不转
- **位置:** 压在大数字右侧的空处，不能盖住 h1 或任何文字
- **role:** 让首屏不只是一堆横线，但它是背景，不是装饰主角

### petals（飘落的花瓣）
- **实现:** 一张 `<canvas id="petals">`，`z-index:-1`，`pointer-events:none`
- **常驻:** 10 片，尺寸 3.4–7.5，透明度 `.06–.17`，30fps，`devicePixelRatio` 上限 1.5
- **轮廓跟着主题:** 晨光偏圆（山茶/茉莉的瓣），夜色偏尖（玫瑰/蔷薇的瓣）
- **canvas 必须显式给 CSS 宽高。** 它是替换元素，`inset:0` 撑不开它；
  只写 `inset:0` 的话每次 `size()` 都会拿上一轮放大后的 `clientWidth` 再乘 dpr，
  300→450→675 越滚越大，而且盖不住整屏
- **技法:** 每种颜色先离屏画一片当 sprite，每帧只做 `drawImage`；`document.hidden` 时停
- **花雨:** `Petals.burst(n)` —— 拆开封蜡、一键出计划时撒一把（透明度高、会淡出）
- **为什么不用 CSS:** 原来的氛围是两个 `filter:blur(70px)` 的光斑，手机上一直在重绘；
  现在整个氛围只有一个合成层。**不要再引入 `filter:blur` 或 `backdrop-filter`。**

### theme toggle
- **位置:** 顶栏，`⚙︎ 设置` 左边，`min-width:{tap}`
- **图标:** 晨光显示 `☀`，夜色显示 `☾`
- **行为:** 点一下在晨光/夜色之间来回；想回到"跟随系统"去设置里的三选一
- **切换动效:** 盖一层当前底色的 `#veil` 淡入 → 换 `data-theme` → 淡出。
  **不要**给几十个元素各自加颜色过渡，那会在切换瞬间造成一次全页重绘

### bottom sheet（设置 / 分享）
- **结构:** `.panel-card` 是竖向 flex，分成 `.sheet-head`（粘顶）/ `.sheet-body`（滚）/ `.sheet-foot`（粘底）
- **高度:** `max-height:90dvh`，并保留 `90vh` 兜底。**不要只写 `vh`**，iOS 上地址栏会把它算错
- **滚动:** `.sheet-body` 必须有 `-webkit-overflow-scrolling:touch` 和 `overscroll-behavior:contain`，
  否则滚到底会把整页一起带走
- **底部:** `padding-bottom` 要加 `env(safe-area-inset-bottom)`
- **分组:** 内容按 `.group` + `.group-t`（Us / Days / Taste / Ours / Mood / Share）切开，
  一屏只需要看懂一件事；保存按钮永远在视野里，不用滚到底

### tick（打卡的圈）
- **size:** 26px 的圆，1px `rgba(201,169,106,.5)` 描边，透明底；`::after` 撑出 44px 点击区
- **checked:** 底色变 `{gold-bright}`，里面一个 `✓`，这一站的名字也转成 `{gold-bright}`
- **stamp:** 打完之后下面出现一行 `{latin}` `{text-micro}` 的金色小字（`08:21 到过 · 已记在地图上`），
  右边跟一张 52px 的照片缩略图，或者一个虚线的「📷 加张照片」
- **role:** 计划从"看的"变成"用的"就靠它。它必须比「换」显眼，但不能比每一站的名字显眼

### footprint map（足迹地图）
- **底图:** OpenStreetMap 标准瓦片，**不需要 key**，自己用 canvas 画（没有引任何地图库）
- **配色:** 靠 `ctx.filter` 把彩色底图调成两套主题——
  晨光 `grayscale(.82) sepia(.24) brightness(1.04) contrast(.9)`，
  夜色 `invert(1) hue-rotate(180deg) grayscale(.72) brightness(.8) contrast(1.06)`；
  老浏览器不支持 `ctx.filter` 就是一张普通彩色地图，功能不受影响
- **署名:** 右下角必须留 `© OpenStreetMap contributors`，这是使用条款，不许删
- **钉子:** 有照片的画成 36px 圆角方块（缩略图 + 金边），没照片的画成金点 + 外圈光晕；
  选中的放大并加亮光晕
- **交互:** 拖动平移、双指捏合换整级缩放、`＋ － 全部 ⤢` 四个按钮、点钉子出小卡片
- **画布倍率:** 上限 1.5（OSM 没有 @2x 瓦片，再高只是把 256px 图放得更虚）

### rate sheet（情侣评分）
- **总体:** 五颗心，`♡` / `♥`，选中转 `{gold-bright}`；每颗心自己就是一个 `{tap}` 大的按钮
- **维度:** 用 chip 而不是星星——五个维度各自只有"是/不是"，点亮就是是。
  评分要能在餐桌上三十秒填完，不是填表
- **聚合框:** `.rate-agg`，`{card-ivory}` 底 + 金边，显示所有情侣的分、
  和你们 MBTI 接近的那一档、他们说适合什么、以及一句引用
- **没接后台时:** 这个框要**明说**评分只存在本机、后台上线会自动补交，不许假装已经提交了

### card 上的评分行
- `.rate`，`{latin}` `{text-micro}` `{gold-bright}`，排在 `.meta` 下面、`.tip` 上面
- 只有真的有人评过才出现；一对情侣的评分不显示"和你们像的"（少于 3 对不做结论）

### own-add（自己加一站）
- 折在「生成最终计划」下面，默认收起——它是兜底，不该抢主路径
- 两条路：搜真实地点（结果是一排 `.own-hit`，右侧用 `{latin}` 标距离），或者自己写
- 加进来的卡带 `own` 标记，在牌面上显示成「Ours · 私藏」，并直接是选中态

### backup（备份）
- 设置里 `Keep` 一组：导出一个 `.json`（设置 + 计划 + 打卡 + 评分 + 照片），导入整体覆盖
- 下面一行灰字要**说实话**：用了多少空间、有没有拿到持久化存储、拿不到就建议导一份

### photo strip
- 72px 方形缩略图横向滚动，`scrollbar-width:none`
- 点开走海报那个弹层看原图
- 原图和缩略图都存在 IndexedDB 里（长边 1100 / 320，JPEG .76 / .7），
  **不要**往 localStorage 里塞照片，那里只有 5MB 还要放设置

### eyebrow
- **font:** `{latin}` `{text-caption}` `{track-eyebrow}` uppercase
- **color:** `{gold}`
- **role:** 每一块内容上方的西文小标，全站的呼吸节奏靠它

### h1
- **font:** `{serif}` 900 `{text-display-xl}`
- **line-height:** 1.25
- **note:** 设置了称呼就变成"瑶瑶，今天怎么心动？"

### hero stat
- **border:** 上边不是实线，而是**两端淡出的金色发丝线**
  （`linear-gradient(90deg, transparent, {gold-soft} 14%, {gold-soft} 86%, transparent)`
  当 `background-size:100% 1px` 用）；下 1px `{line}`。
  `.part-head` 的下边同理。整条死黑的横线太硬，是"柔和"要改掉的第一处
- **glow:** 大数字背后一团 `{glow-a}` 的径向光，7s 一次呼吸（只动 opacity 和 transform）
- **number:** `{serif}` 900 `{text-hero}` `{gold}`，进场有一次 900ms 的滚动
- **label:** `{text-caption}` `{track-tag}` `{ink-soft}`

### chip
- **background:** `{card-ivory}` / 选中 `{ink}`
- **text:** `{text-body}` `{track-tight}` / 选中 `{gold-bright}`
- **border:** 1px `rgba(43,33,48,.3)` / 选中 `{gold}`
- **radius:** `{radius-sm}`，**min-height:** `{tap}`
- **shadow:** `{shadow-flat}` / 选中 `{shadow-inset}`

### quick（一键定今天）
- **background:** `linear-gradient(160deg, {card-top}, {card})`
- **title:** `{serif}` 600 `{text-title-lg}` `{gold-bright}` `{track-tag}`
- **sub:** `{text-caption}` `{on-dark-soft}`
- **shadow:** `{shadow-raised}`，有一条 3.6s 循环的高光扫过
- **role:** 全站唯一的"不用想"入口，永远排在条件区之前

### deal button
- **background:** transparent，1px `{gold}` 描边
- **text:** `{serif}` 600 `{text-button}` `{gold}` 字距 5px

### card（抽出来的卡）
- **background:** `linear-gradient(160deg, #2C2230, {card})`
- **radius:** `{radius-md}`，**padding:** 15px 14px 13px
- **cat:** `{latin}` `{text-micro}` `{track-tag}` `{rose}`；私藏卡用 `{gold-bright}`
- **title:** `{serif}` 600 `{text-title}` `{on-dark}`
- **desc:** `{text-caption}` `rgba(240,232,220,.62)`
- **meta:** `{latin}` `{text-micro}` `rgba(201,169,106,.75)`——只放事实（步行几分钟、菜系、营业到几点）
- **selected:** `{shadow-pressed}` + 右上角"✓ 已入选"金色小标

### menu（最终计划）
- **background:** `linear-gradient(165deg, #2C2230, #221A26)`
- **radius:** `{radius-lg}`，**padding:** 32px 26px 26px
- **inner frame:** `inset 9px` 一道 1px `{gold-line}`，这道内框是这个牌子的签名
- **course:** 上边框 1px `{on-dark-line}`；序号用罗马数字 + 英文分类；时间 `{latin}`
- **note:** 居中，`{text-caption}`，末尾一句手写落款用 `{serif}` `{gold-bright}`

### love note（她收到的那句话）
- **background:** `{card-ivory}`，1px `rgba(201,169,106,.5)`
- **body:** `{serif}` 600 `{text-title-lg}`，行高 1.95
- **sign:** `{latin}` italic `{text-body}` `{rose}`
- **role:** 必须排在计划之前——她先读到人，再读到安排

### seal（封蜡）
- **size:** 106px，`{radius-full}`
- **background:** `radial-gradient(circle at 33% 26%, #D8BA7C, {gold} 58%, #7C5C24)`
- **content:** 送的人名字的第一个字（没署名就是 `♥`），下面压一朵 `#bloom` 当刻花
- **motion:** 1.9s 的心跳循环
- **role:** 她点开链接后的第一个可点物；除了它，那一屏没有别的操作

### act / act primary
- **grid:** 两列，主按钮独占一行
- **primary:** `linear-gradient(160deg, {card-top}, {card})`，`{serif}` 600 `{text-button}` 字距 4px
- **secondary:** transparent + 1px `{gold}` 描边

### mask / panel card
- **mask:** `rgba(43,33,48,.55)`；`.center` 变体用于居中的小卡
- **panel:** 贴底，`{radius-sheet}` 上两角，`max-height 88vh` 可滚
- **z 轴顺序:** 抽屉/面板 55 → 开场与信封 60 → 海报 70 → 答复与初衷 76 → 提示条 90

### toast
- **background:** `rgba(37,28,41,.96)`，1px `rgba(201,169,106,.35)`
- **text:** `{text-body-sm}`，居中，2.4s 后消失
- **role:** 所有"已复制/已保存/赶不上了"的反馈都走它，不用 alert

---

## Voice & Tone

文案是这个网站的命，比任何一个像素都重要。

**要这样写**
- 一句话只说一件事，短句优先。"路线我排好了，你只要来。"
- **事实归数据，情绪归手写。** 卡片的 `meta` 只放距离/菜系/营业时间，`d` 那一行才是我们的话。
- 站在"他对她说"的位置，而不是产品对用户。用"她""你"，不用"用户"。
- 允许一点自嘲和玩笑（"做丑了统一称为抽象派"），不允许煽情。
- 失败的提示也要有人味："这个点今天排不下了。" 后面跟一个"那就排明天"。

**不要这样写**
- 不用"亲爱的""么么哒""宝宝"这类称呼
- 不堆感叹号，不用"超级""绝了""yyds"
- 不写"点击此处""操作成功""系统提示"
- emoji 只允许出现在条件选项和状态行（☀️🌧️📍🕐🗓⏳），正文和标题里一个都不要

---

## Do's and Don'ts

### Do
- 改样式先改令牌，组件里不要再写死数值；颜色一律 `var(--…)`，两个主题才会同时对
- 金色只用于强调：西文小标、时间、数字、选中态。它不做大面积背景
- 深色卡片代表"计划本身"，浅色底代表"你在挑"。这个对应关系不要反
- 所有可点元素至少 `{tap}` 高；视觉必须小的，用透明区域补
- 输入框一律 `{text-input}`（16px）起
- 动画只动 `transform` 和 `opacity`；初始状态写进 `@keyframes from{}`
- 只用 ES5 语法（`var` / `function` / 回调）——很多人在微信内置浏览器里打开
- 任何外部数据都要能失败：拿不到就静默回落到手写卡池，界面照常可用
- 改完动效跑一遍"静置 3 秒的布局次数"，正常值是 0～2 次

### Don't
- **不要让布局比视口宽，一像素都不行。** iOS 会为了装下整个布局把整页缩小一档，
  那次缩放非常显眼，而且每次打开都会发生。`html` 上有 `overflow-x:clip` 兜底，
  但根因该修：绝对定位的装饰探出边界要用 `overflow:hidden` 裁掉
- 不要引入令牌之外的颜色，尤其不要加第二个强调色
- 不要写死墨色（`rgba(43,33,48,…)` 这类）：在夜色主题下会变成深色压深色，直接看不见
- 不要把圆角做圆（除了封蜡和底部抽屉），这是活字印刷的气质，不是圆角卡片 App
- 不要给中文正文加字距，也不要给西文小标去掉字距
- 不要用 `filter:blur` / `backdrop-filter` 做氛围，氛围已经交给那张 canvas 了
- 不要动 `left/top/width/height` 做动画
- 不要在她的视角（`body.guest`）里露出抽卡、设置这些发送方的操作
- 不要动这些：favicon、连点 5 次页脚的「初衷」彩蛋、`4-15` 与 `12-6` 的自动彩蛋、旧的 `?c=` 链接兼容
- 不要为了塞功能把"打开 → 一键 → 送出去"这条路变长
