# 写作与维护指南

## 新建、预览与发布

在 `D:\A_folder\personal-blog` 打开 PowerShell：

```powershell
npm.cmd run draft -- "我的第一篇研究笔记"
npm.cmd run dev
```

编辑 `source/_drafts/我的第一篇研究笔记.md`，在 <http://127.0.0.1:4000/> 预览。草稿只保存在本机，默认不进入 Git 仓库或线上搜索。

完成后把 `slug` 填成稳定的 ASCII 名称，例如 `my-first-note`：

```yaml
---
title: 我的第一篇研究笔记
date: 2026-10-09 10:00:00
slug: my-first-note
categories:
  - 技术学习
tags:
  - ML
  - 学习笔记
cover: /img/research-cover.svg
toc: true
---
```

开头写摘要，再插入 `<!-- more -->`，后面写正文。永久链接为 `/posts/my-first-note/`；公开后保持 `slug` 不变。

```powershell
npm.cmd run publish -- "我的第一篇研究笔记"
npm.cmd run build
npm.cmd run check
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Publish.ps1 -Message "docs: add my first research note"
```

`hexo publish` 只把草稿移到 `source/_posts/`，不联网。`Publish.ps1` 会构建、检查、提交和推送源码，随后 GitHub Actions 自动发布。首次公开确认尚未完成时，脚本会停止。只检查、不提交：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Publish.ps1 -CheckOnly
```

也可以直接新建公开文章：`npm.cmd run new -- "文章名称"`。仓库里所有 `source/_posts/` 内容都会公开；用草稿目录保存尚未准备好的文字。

## 三类模板

```powershell
npm.cmd run new -- "普通技术笔记"
npm.cmd run new -- paper "论文阅读：标题"
npm.cmd run new -- project "项目：名称"
```

这三个命令会写入 `_posts`。若还不适合公开，请先用 `draft`，再把 `scaffolds/paper.md` 或 `project.md` 的章节复制到草稿正文。模板中的 `待补充` 需由你依据真实材料填写。你可以自由修改 `scaffolds/`，后续新文章采用更新后的模板。

## 分类与标签

一级分类建议按文章形式组织：

| 分类 | 用途 |
| --- | --- |
| 技术学习 | 概念、推导、实现细节 |
| 论文阅读 | 论文拆解、方法分析 |
| 科研记录 | 实验、复现、失败与待解问题 |
| 工程实践 | 项目、开发工具、系统实现 |
| 学习与成长 | 课程、大学生活、保研与学习方法 |
| 博客与写作 | 博客维护、写作示例 |

细分领域用标签：`ML`、`DL`、`CV`、`LLM`、`NLP`、`RL`、`Multimodal`、`AI Agents`；再按需加入 `论文笔记`、`复现`、`Python`、`保研`。只给实际文章添加相关标签，不提前创建空页面。

Hexo 的 `categories: [技术学习, 深度学习]` 表示上下级分类；如果不需要层级，只放一个分类。

## Markdown、公式、图表与图片

- fenced code 写明语言，如 `python`、`javascript`、`powershell`。复制按钮只复制代码。
- 行内数学用 `$x^2$` 或 `\(x^2\)`；块公式用单独的 `$$` 行。KaTeX 不支持全部 LaTeX 包，复杂内容请简化为 KaTeX 支持的命令。
- Mermaid 使用 `mermaid` fenced block。默认严格模式，流程图按需加载；切换主题后会重新绘制。
- 图片放到 `source/img/`，Markdown 写 `![图注](/img/filename.png)`。文章封面在 front matter 填 `cover: /img/filename.png`。
- 表格、引用块与图片示例见 `source/_posts/markdown-showcase.md`。数学错误应在检查或浏览器预览中修正，不用截图替代正文公式。
- 只有存在真实前后文章时才显示相应导航。未来日期文章在日期到达前不进入生产构建。

## 修改个人资料

统一编辑 **`profile.yml`**：网站标题、副标题、简介、网址、作者名、GitHub 链接和头像。随后执行 `npm.cmd run build` 或 `dev`；身份字段会同步到站点和主题配置。

当前头像是已登录 GitHub 账户的公开头像，保存为 `source/img/github-avatar.png`。替换为你有权使用的图片后，修改 `author.avatar` 即可。占位头像为 `/img/avatar-placeholder.svg`。不需要填写邮箱、电话或学校。

如需从当前登录账户重新读取公开资料：`npm.cmd run profile`。它只读 GitHub API，但会覆盖作者名、用户名、链接、头像 URL 和 Pages URL；新的头像使用 GitHub 远程地址。

正文介绍在 `source/about/index.md` 编辑，项目列表在 `source/projects/index.md` 编辑。导航、侧栏与 logo 文本在 `_config.icarus.yml` 编辑。不要直接改 `node_modules/hexo-theme-icarus/`。

## 修改主题与备份

阅读样式在 `source/css/research.css`，交互在 `source/js/research.js`，公式与高亮在 `scripts/markdown.cjs`。升级依赖前保存 Git 提交，单独升级并运行 build / check / 预览；提交新的锁文件。

完整源码在 `main`。`public` 和 `node_modules` 可随时重建。`_drafts` 没有云端备份，请自行备份到私有位置；不要将敏感草稿移入 `_posts`。
