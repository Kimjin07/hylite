-- HY-LITE 云同步数据库结构
-- 应用: npx wrangler d1 execute hylite-sync --file schema.sql [--local|--remote]

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_code TEXT UNIQUE NOT NULL,          -- 同步码 HY-XXXX-XXXX（登录凭证之一，也是找回钥匙）
  username TEXT UNIQUE,                    -- 账号名（可选；学生自选，建议手机号或姓名拼音）
  pass_hash TEXT,                          -- PBKDF2-SHA256 十六进制
  pass_salt TEXT,                          -- 16字节盐 十六进制
  nickname TEXT NOT NULL,                  -- 学生姓名（管理后台识别用）
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen TEXT,
  pet_data TEXT,                           -- 学习伙伴/表情图鉴 JSON（全局一份，不分词书）
  pet_at TEXT                              -- 宠物数据落库时间
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,                  -- 32字节随机 十六进制
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS progress (
  user_id INTEGER NOT NULL,
  book_id TEXT NOT NULL,                   -- b3000/prep/basic/core/green/a2/b1/b1p/b2
  data TEXT NOT NULL,                      -- 学习进度 S 的完整 JSON
  updated_at TEXT NOT NULL,                -- 客户端提交时间(ISO)
  server_at TEXT NOT NULL DEFAULT (datetime('now')),  -- 服务端落库时间
  device TEXT,                             -- 设备标识（诊断用）
  prev_data TEXT,                          -- 被覆盖前的上一版数据（一层历史，误覆盖保底）
  prev_server_at TEXT,                     -- 上一版的落库时间
  PRIMARY KEY (user_id, book_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 登录限流（按 IP+账号 计数）
CREATE TABLE IF NOT EXISTS rate_limits (
  rl_key TEXT PRIMARY KEY,                 -- ip|username 或 ip|code
  count INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL
);

-- English Compass 付费访问：激活码只保存 SHA-256 哈希，明文仅在创建时返回一次。
CREATE TABLE IF NOT EXISTS compass_licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_hash TEXT UNIQUE NOT NULL,
  code_suffix TEXT NOT NULL,
  student_name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  max_devices INTEGER NOT NULL DEFAULT 2 CHECK (max_devices BETWEEN 1 AND 2),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used TEXT
);

CREATE TABLE IF NOT EXISTS compass_devices (
  license_id INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen TEXT,
  PRIMARY KEY (license_id, device_id),
  FOREIGN KEY (license_id) REFERENCES compass_licenses(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_compass_devices_license ON compass_devices(license_id);

-- 即使两个激活请求同时到达，数据库也不会让一个码绑定第 3 台设备。
CREATE TRIGGER IF NOT EXISTS compass_devices_limit
BEFORE INSERT ON compass_devices
WHEN (SELECT COUNT(*) FROM compass_devices WHERE license_id=NEW.license_id) >=
     (SELECT max_devices FROM compass_licenses WHERE id=NEW.license_id)
BEGIN
  SELECT RAISE(ABORT, 'device limit reached');
END;

CREATE TABLE IF NOT EXISTS compass_sessions (
  token TEXT PRIMARY KEY,
  license_id INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used TEXT,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (license_id) REFERENCES compass_licenses(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_compass_sessions_license ON compass_sessions(license_id);
CREATE INDEX IF NOT EXISTS idx_compass_sessions_expiry ON compass_sessions(expires_at);
