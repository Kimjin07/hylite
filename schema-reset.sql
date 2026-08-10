-- 开发期重置（上线后禁用！会清空所有数据）
DROP TABLE IF EXISTS progress;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS compass_sessions;
DROP TRIGGER IF EXISTS compass_devices_limit;
DROP TABLE IF EXISTS compass_devices;
DROP TABLE IF EXISTS compass_licenses;
