# HY-LITE 单词网站

环亚国际教育背单词网站，线上地址：**https://hylite.com.cn/vocabulary/**

## 项目结构

```
vocabulary/
  src/               源码（改这里）
    shell.html       页面骨架模板
    bc.css           样式
    bc-body.html     页面结构
    bc-core.js       核心逻辑（词书注册/记忆算法/存档）
    bc-session.js    学习会话
    bc-views.js      界面渲染
    units-data.js    必会3000 词库数据
    books-extra.js   其他词书数据（预备/基础/核心/绿皮书/A2/B1/B1+/B2）
  build.ps1          单文件构建（生成 vocabulary/index.html，本地备份用）
  build-split.js     拆分构建（生成 deploy/vocabulary/，线上部署用）
  convert-book.js    词表 txt → 词书数据转换器
  check-words.ps1    数据体检（结构类问题）
  check-mojibake.js  数据体检（乱码/音标字符）
deploy/              线上部署目录（Cloudflare Pages）
*.txt                词表源文件
```

## 常用操作

**改词库/代码后发布：**
```powershell
node vocabulary/build-split.js
npx wrangler pages deploy .\deploy --project-name hylite --branch main --commit-dirty=true
```

**加一本新词书：**
1. `node vocabulary/convert-book.js <词表.txt> <常量名>`（词表格式：单元标题行不含中文；词条行 `word /音标/ 中文释义 词性.`）
2. 在 `vocabulary/src/bc-core.js` 的 `BOOKS` 数组加一行，`__reg` 列表加一行
3. 在 `vocabulary/build-split.js` 的 `BOOK_MAP` 加一行
4. 跑体检：`powershell -File vocabulary/check-words.ps1` 和 `node vocabulary/check-mojibake.js`
5. 构建 + 部署（见上）

## 托管

- Cloudflare Pages 项目 `hylite`，域名 `hylite.com.cn`（NS 在 Cloudflare）
- 根路径 `/` 暂时 302 跳转到 `/vocabulary/`（`deploy/_redirects`），公司主页就位后替换
