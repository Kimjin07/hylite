# HY-LITE 单词网站

环亚国际教育背单词网站 + 云同步。线上：**https://hylite.com.cn/vocabulary/** · 管理后台：`/admin/`

> 面向运营者的说明见 **使用说明.md**；本文件面向开发。

## 结构

```
vocabulary/src/        前端源码（无框架单页应用，全局函数风格）
  bc-core.js           词书注册(BOOKS/__reg)、记忆算法、存档(normalize/load/save)
  bc-session.js        训练会话（题型 ec/ce/ls/sp/dt、听力特训链）
  bc-sync.js           云同步引擎（离线优先、乐观并发、冲突合并、备份槽）
  bc-views.js          界面渲染
  units-data.js        必会3000 数据
  books-extra.js       其余 12 本词书数据（*_UNITS 常量）
vocabulary/build.ps1       单文件构建 → vocabulary/index.html（本地离线版）
vocabulary/build-split.js  拆分构建 → deploy/vocabulary/（应用壳 + data/<id>.js 按需加载）
vocabulary/tools/          convert-book.js(标准/斜杠音标) convert-listen.js([]音标) + 双体检
functions/api/[[route]].js 云同步后端（Pages Functions + D1）
deploy/                    Pages 部署目录（含 admin 后台、_headers、_redirects）
tests/                     test-api.js(75) + test-sync-client.js(32)
词表源文件/                 词表原始 txt/docx
```

## 关键流程

**发布**：`node vocabulary/build-split.js && npx wrangler pages deploy ./deploy --project-name hylite --branch main --commit-dirty=true`

**加词书（四处注册缺一不可）**：
1. `node vocabulary/tools/convert-book.js <txt> <NAME_UNITS>`（听力用 convert-listen.js）
2. `bc-core.js`：`__reg` 列表 + `BOOKS` 数组（cat 分组 / listen 标记）
3. `build-split.js`：`BOOK_MAP`
4. `functions/api/[[route]].js`：`BOOK_IDS` 白名单 + `deploy/admin/index.html`：`BOOK_NAMES`
5. 体检：`tools/check-words.ps1` + `node tools/check-mojibake.js` → 构建 → 部署

**改同步代码**：必须跑 tests/ 两个套件（先 `npx wrangler pages dev --port 8788`）。本地库重置：`wrangler d1 execute hylite-sync --file schema-reset.sql --local -y && ... schema.sql`。**schema-reset 严禁 --remote**。

**Pages secret**：用 `wrangler pages secret bulk`（stdin 管道会被 PowerShell 污染），改后需重新 deploy。

## 云同步设计要点

同步码 HY-XXXX-XXXX 为根凭证；本地 localStorage 永远是主副本；推送带 base_server_at（409→进度多者胜合并）；空词态档禁止覆盖非空云档(422)；覆盖前留 prev_data 一层历史 + 本机时间戳备份槽；恢复/导入走意图直推不参与合并。详见 bc-sync.js 头注释。经两轮多智能体对抗审查（50 项确认问题已修复）。
