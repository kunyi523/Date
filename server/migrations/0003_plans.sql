-- 短链：一份计划存成一行，换一个 6 位 id。
--
-- 存的就是长链接 ?s= 后面那一串（整份计划 + 展示用的设置），原样存、原样还回去，
-- 后台不解释它，前端怎么认长链就怎么认短链跳过去的那一条。
-- 没有账号：id 是随机的、不可枚举的，知道 id 就等于拿到了链接——和长链接一样的思路。
-- 30 天后过期；过期的行在下一次有人存计划时顺手删掉，这张表不会一直长。
-- lang 是发件人排的时候用的语言：跳回网站时带上 &lang=en，收件人打开是同一种语言（和长链一致）。
CREATE TABLE IF NOT EXISTS plans (
  id   TEXT    PRIMARY KEY,       -- 6 位，[a-zA-Z2-9] 去掉易混的 0 O 1 l I
  s    TEXT    NOT NULL,          -- ?s= 那一串（base64url）
  lang TEXT    NOT NULL DEFAULT 'zh',
  at   INTEGER NOT NULL,          -- 存进来的毫秒时间戳
  exp  INTEGER NOT NULL           -- 过期的毫秒时间戳（at + 30 天）
);
CREATE INDEX IF NOT EXISTS idx_plans_exp ON plans (exp);
