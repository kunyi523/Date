# 今天，怎么心动？ — Style Reference

> 一个两个人用的深色"菜单"。整站建立在纸感的暖米底（`#F5F0E6`）与丝绒紫黑卡片（`#251C29`）之间，靠香槟金（`#C9A96A`）做唯一的强调色——它只出现在西文小标、时间、数字和被选中的状态上，不做大面积填充。中文标题用 Noto Serif SC 900 压住版面，西文小标和时间用 Cormorant Garamond 的斜体与宽字距（4–5px）做"印刷品"的呼吸感。圆角一律接近直角（3–8px），只有封蜡（`--radius-full`）和底部抽屉（`16px`）是圆的；没有卡片阴影是软的，投影都带着 12–18px 的垂直偏移，像一张纸压在另一张纸上。它不是 App，是一份每天重新印一次的菜单。

**Theme:** dark / light 双主题（跟随系统 `prefers-color-scheme`，深色是主场）

**Source:** [https://kunyi523.github.io/Date/](https://kunyi523.github.io/Date/)
本文档的格式参考 [ricocc/brands-design-md](https://github.com/ricocc/brands-design-md) 与 [design.ricoui.com/brands](https://design.ricoui.com/brands) 的 `DESIGN.md` 约定。
令牌的唯一事实来源是 `index.html` 里 `:root` 的那一段；这份文档负责解释每个令牌该用在哪。

---

## Tokens — Colors

| Name | Value | Token | Role |
|---|---|---|---|
| paper | `#F5F0E6` | `--paper` | 页面底色，纸感暖米 |
| paper 2 | `#EFE8DA` | `--paper2` | 次级底色 |
| ink | `#2B2130` | `--ink` | 正文与标题 |
| ink soft | `rgba(43,33,48,.62)` | `--ink-soft` | 辅助说明、占位 |
| gold | `#A9853F` | `--gold` | 描边、西文小标（浅色主题） |
| gold bright | `#C9A96A` | `--gold-bright` | 深色卡片上的强调、被选中的字 |
| rose | `#9C6B76` | `--rose` | 情绪色，副标题与卡片分类 |
| card | `#251C29` | `--card` | 深色卡片底 |
| card top | `#33283A` | `--card-top` | 深色渐变的高光端 |
| card ivory | `#FBF7EE` | `--card-ivory` | 浅色控件底（chip、输入框） |
| on dark | `#F0E8DC` | `--on-dark` | 深色卡片上的文字 |
| on dark soft | `rgba(240,232,220,.6)` | `--on-dark-soft` | 深色卡片上的次要文字 |
| on dark line | `rgba(240,232,220,.14)` | `--on-dark-line` | 深色卡片里的分隔线 |
| line | `rgba(43,33,48,.16)` | `--line` | 浅色主题的发丝线 |
| gold line | `rgba(201,169,106,.4)` | `--gold-line` | 菜单内框那道金线 |

深色主题只覆盖这几个：`--paper:#1D1620`、`--paper2:#261E2A`、`--ink:#F2EAE0`、
`--ink-soft:rgba(242,234,224,.6)`、`--gold:#C9A96A`、`--line:rgba(242,234,224,.14)`、`--card-ivory:#2A2130`。
深色卡片本身两个主题下一模一样——计划长什么样，不该跟着系统变。

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
| `--dur-fast` | .16s | 卡片按下、hover |
| `--dur-base` | .25s | 提示条、按钮缩放 |
| `--dur-slow` | .7s | 开场淡出、滚动渐显 |
| `--ease` | ease | 全站只用这一条曲线 |

`@media (prefers-reduced-motion:reduce)` 里所有动画和过渡全部关掉，这条不许省。

### Layout

- **手机：** 单列，`max-width 430px`，左右 22px，顶部 30px
- **桌面（≥1000px）：** 两列 `360px + 1fr`，列间 56px，`max-width 1020px`，左列 sticky
- **她的视角（`body.guest`）：** 桌面也收成单列 `max-width 540px`，因为那一屏只需要读
- **触摸目标：** `--tap: 44px`，所有可点元素的下限。"换"这种视觉上必须小的按钮，用 `::after` 撑出 44px 的透明点击区

---

## Components

### eyebrow
- **font:** `{latin}` `{text-caption}` `{track-eyebrow}` uppercase
- **color:** `{gold}`
- **role:** 每一块内容上方的西文小标，全站的呼吸节奏靠它

### h1
- **font:** `{serif}` 900 `{text-display-xl}`
- **line-height:** 1.25
- **note:** 设置了称呼就变成"瑶瑶，今天怎么心动？"

### hero stat
- **border:** 上 1px `{ink}`，下 1px `{line}`
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
- **content:** 送的人名字的第一个字，没署名就是 `♥`
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
- 改样式先改 `:root` 里的令牌，组件里不要再写死数值
- 金色只用于强调：西文小标、时间、数字、选中态。它不做大面积背景
- 深色卡片代表"计划本身"，浅色底代表"你在挑"。这个对应关系不要反
- 所有可点元素至少 `{tap}` 高；视觉必须小的，用透明区域补
- 只用 ES5 语法（`var` / `function` / 回调）——很多人在微信内置浏览器里打开
- 任何外部数据都要能失败：拿不到就静默回落到手写卡池，界面照常可用

### Don't
- 不要引入令牌之外的颜色，尤其不要加第二个强调色
- 不要把圆角做圆（除了封蜡和底部抽屉），这是活字印刷的气质，不是圆角卡片 App
- 不要给中文正文加字距，也不要给西文小标去掉字距
- 不要在她的视角（`body.guest`）里露出抽卡、设置这些发送方的操作
- 不要动这些：favicon、连点 5 次页脚的「初衷」彩蛋、`4-15` 与 `12-6` 的自动彩蛋、旧的 `?c=` 链接兼容
- 不要为了塞功能把"打开 → 一键 → 送出去"这条路变长
