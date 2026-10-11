# Personal Research Blog

面向 AI 学习、论文阅读与工程记录的个人博客。使用官方 Hexo / Icarus npm 主题，首页集中展示研究主题、精选与最近记录，文章页采用宽正文与固定目录。通过独立 CSS 与 Hexo 扩展完成定制，主题可正常升级。

线上博客：[Personal Research Blog](https://blcvd.github.io/) · [GitHub 源码仓库](https://github.com/BlCvd/blcvd.github.io)

## 开始使用

Windows PowerShell：

```powershell
Set-Location 'D:\A_folder\personal-blog'
npm.cmd ci
npm.cmd run dev
```

打开 <http://127.0.0.1:4000/>。`dev` 包含本地草稿；生产构建不包含草稿。按 Ctrl+C 停止服务。

```powershell
npm.cmd run build
npm.cmd run check
npm.cmd run preview
```

## 技术与版本

本项目于 2026-10-09 核验 npm 官方注册表：Hexo **8.1.2**、Icarus **6.1.1**；Node.js 使用 **22.x**（本机 22.20.0）。直接依赖锁定精确版本，完整依赖由 `package-lock.json` 固定。

Icarus 内部仍依赖 Hexo 7，但根目录使用 Hexo 8，已进行真实构建与浏览器验证。Markdown 使用官方 markdown-it 15.0.2，通过一个小型 Hexo renderer 扩展接入：旧 hexo-renderer-markdown-it 依赖旧版内部 Token 接口，无法兼容修复后的解析器，因此已移除。最终安装需使用 `npm ci`，不要删掉锁文件。

- Markdown、代码高亮与复制、图片、表格、引用块
- KaTeX 构建时输出 HTML / MathML；支持 `$...$`、`$$...$$` 与 `\(...\)`
- Mermaid 12.1.0 在有图的文章页按需加载
- 本地 Insight 全文搜索；Ctrl+K / Cmd+K 打开
- 阅读时间、目录、前后文章、分类、标签、归档
- 构建时生成的研究主题入口与列表，排除示例、草稿及未来文章
- 科研文章阅读提要、引用链接、复现材料与文末作者资料
- 数据驱动的项目分组、角色、状态、技术与成果链接
- 五种内容类型与文章筛选；显式系列顺序、前后篇及相关文章
- Atom / RSS 订阅、站点地图、规范网址、JSON-LD 与自动生成的中文 PNG 分享卡片
- 浅色与深色模式、响应式布局、返回顶部、404
- GitHub Actions 对 main 和 PR 执行静态、浏览器与真实内容验收；仅 main 发布 Pages

数学采用构建时 KaTeX，自定义脚本不修改主题文件。深色模式由独立 CSS 变量实现。默认不启用访客计数、第三方评论或广告。

## 工程结构

```text
profile.yml              公开个人资料与首次发布确认状态
_config.yml              Hexo 站点配置（身份字段由 profile 同步）
_config.icarus.yml       Icarus 配置（个人卡片字段由 profile 同步）
_config.post.yml         文章布局配置（只保留目录侧栏）
source/_posts/           公开文章 Markdown
source/_drafts/          本地草稿（Git 忽略，生产构建排除）
source/about/            关于我
source/projects/         项目展示
source/_data/topics.yml  主题标题、说明与对应分类
source/_data/projects.yml 公开项目与分组数据
source/_data/series.yml  系列定义、说明与前置知识
source/css/              字体与阅读样式
source/js/               深色模式、代码复制、Mermaid 等
source/img/              自有 SVG 与公开 GitHub 头像
scaffolds/               长文、短笔记、论文、实验与项目模板
scripts/                 Hexo 扩展
tools/                   资源准备、发布检查与 PowerShell 发布脚本
.github/workflows/       Pages 自动化部署
public/                  生成结果（Git 忽略）
reports/                 本地检查与截图（Git 忽略）
tooling/                 可选本地工具（Git 忽略）
```

文章分类与标签页由主题及生成器自动创建，只有实际使用的分类和标签才生成。
研究主题有独立入口 `/topics/papers/`、`/topics/ai/`、`/topics/engineering/`；没有正式文章时显示明确空状态。项目列表默认为空，新增真实项目的方法见写作指南。
文章入口为 `/writing/`，系列为 `/series/`，订阅为 `/subscribe/`。两篇示例保留原网址，在文章入口的折叠区域展示，不进入正式内容搜索、主题、系列、精选或订阅。原归档、分类和标签仍可访问。

## 自动验收

`npm.cmd run check` 检查本地链接、公式输出、内容字段、系列顺序、规范网址、JSON-LD 和分享图片。浏览器验收还覆盖搜索、复制、目录、深色模式、手机与平板布局：

```powershell
python -m pip install -r tools/requirements-browser.txt
python -m playwright install chromium
python -X utf8 tools/browser_ci.py
python -X utf8 tools/content-integration.py
```

先执行 `npm.cmd run build`。Python 工具用临时本地端口提供静态产物，结束后关闭服务。集成验收临时写入两篇正式文章、未来文章、未发布文章和草稿，检查系列、筛选、订阅与排除规则；无论成功与否都恢复源文件并重建生产产物。失败会阻止 CI 部署。`reports/` 保存结果与截图，Actions 保留它们 7 天。

日常构建仅需 Node.js 22；浏览器验收使用 Python 3.13 与锁定版本的 Playwright。PNG 卡片由 sharp 在构建时生成；Windows 使用微软雅黑，Linux 工作流安装 Noto CJK 字体。

## 维护入口

- [BLOG_GUIDE.md](BLOG_GUIDE.md)：写作、模板、头像与样式修改
- [DEPLOYMENT.md](DEPLOYMENT.md)：首次部署、自动化更新与故障处理
- [THIRD_PARTY.md](THIRD_PARTY.md)：开源依赖及素材说明

本项目没有数据库后台，不需要手动上传 HTML。首次公开发布必须先审核资料及示例文章。
