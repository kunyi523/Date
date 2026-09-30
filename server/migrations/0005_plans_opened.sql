-- 「她拆开了」：这份计划第一次被拆开封蜡是几点。
--
-- 盖在 plans 那一行上，不放进 events：events 刻意没有精确时间、没有完整 id，回答不了"14:32 拆开的"。
-- plans 那一行本来就有完整 id 和精确时间（at / exp），多一列 opened 没有多暴露任何东西，
-- 而且它跟着那一行一起 30 天过期。
-- 只盖第一次（opened IS NULL 时才写）：她拆开是一件事，不是一串事。
-- 由拆封蜡那一下的 POST /ev（e=open，带整个 6 位 id）顺路写入，不记在 GET /p/:id——爬虫也会打那一页。
-- 单独一个迁移：0001–0004 在线上已经执行过，改它们不会生效。
ALTER TABLE plans ADD COLUMN opened INTEGER;   -- 毫秒时间戳；还没拆是 NULL
