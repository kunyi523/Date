-- 匿名计数：算 K。
--
-- K = 收到链接的人里，有多少接着发出了自己的一份 = handoff / open。
-- 一行 = 一个动作发生过一次。只有三样：动作名、哪一天、计划短链 id 的前 4 位。
-- 没有 IP、没有 UA、没有 couple id、没有设备 id，连精确到秒的时间都没有——
-- 这张表只回答"回路转起来了没有"，不回答"谁做了什么"。
-- 前 4 位够把同一份计划的 拆开 → 愿意 → 接手 串起来，又不是那条短链本身（短链要 6 位）。
-- 单独一个迁移：0001–0003 在线上已经执行过，改它们不会生效。
CREATE TABLE IF NOT EXISTS events (
  e    TEXT NOT NULL,               -- open / accept / handoff / sent / poster
  d    TEXT NOT NULL,               -- 哪一天，YYYY-MM-DD（UTC）
  pid4 TEXT NOT NULL DEFAULT ''     -- 短链 id 前 4 位；从长链打开的没有，留空
);
CREATE INDEX IF NOT EXISTS idx_events_d ON events (d, e);
