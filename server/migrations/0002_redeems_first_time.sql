-- 这台手机以前在这家店出示过没有。够画出"回头"那一栏，
-- 又不需要任何能认出人的东西。
-- 单独一个迁移：0001 在线上已经执行过，改它不会生效（wrangler 按文件名记录已跑过的）。
ALTER TABLE redeems ADD COLUMN first_time INTEGER NOT NULL DEFAULT 0;
