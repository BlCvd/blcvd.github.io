# Personal Research Blog

面向 AI 学习、论文阅读与工程记录的个人博客。使用官方 Hexo / Icarus npm 主题，保留经典三栏布局，用少量独立 CSS 与 Hexo 注入扩展完成定制。没有复制参考作者的文章、头像或个人资料。

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
- 浅色与深色模式、响应式布局、返回顶部、404
- GitHub Actions 构建完整源码，GitHub Pages 托管 `public/`

数学采用构建时 KaTeX，自定义脚本不修改主题文件。深色模式由独立 CSS 变量实现。默认不启用访客计数、第三方评论或广告。

## 工程结构

```text
profile.yml              公开个人资料与首次发布确认状态
_config.yml              Hexo 站点配置（身份字段由 profile 同步）
_config.icarus.yml       Icarus 配置（个人卡片字段由 profile 同步）
source/_posts/           公开文章 Markdown
source/_drafts/          本地草稿（Git 忽略，生产构建排除）
source/about/            关于我
source/projects/         项目展示
source/css/              字体与阅读样式
source/js/               深色模式、代码复制、Mermaid 等
source/img/              自有 SVG 与公开 GitHub 头像
scaffolds/               写作、论文笔记、项目介绍模板
scripts/                 Hexo 扩展
tools/                   资源准备、发布检查与 PowerShell 发布脚本
.github/workflows/       Pages 自动化部署
public/                  生成结果（Git 忽略）
reports/                 本地检查与截图（Git 忽略）
tooling/                 可选本地工具（Git 忽略）
```

文章分类与标签页由主题及生成器自动创建，只有实际使用的分类和标签才生成。

## 维护入口

- [BLOG_GUIDE.md](BLOG_GUIDE.md)：写作、模板、头像与样式修改
- [DEPLOYMENT.md](DEPLOYMENT.md)：首次部署、自动化更新与故障处理
- [THIRD_PARTY.md](THIRD_PARTY.md)：开源依赖及素材说明

本项目没有数据库后台，不需要手动上传 HTML。首次公开发布必须先审核资料及示例文章。
