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
  last_seen TEXT
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
