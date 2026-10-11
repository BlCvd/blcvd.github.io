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
type: article
description: 用一句话说明这篇文章的问题与结论
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

## 五种内容与模板

```powershell
npm.cmd run new -- "普通技术笔记"
npm.cmd run new -- note "一条短笔记"
npm.cmd run new -- paper "论文阅读：标题"
npm.cmd run new -- experiment "复现：实验名称"
npm.cmd run new -- project "项目：名称"
```

这些命令会写入 `_posts`。若还不适合公开，请先用 `draft`，再把所需模板的章节与字段复制到草稿。模板中的 `待补充` 需依据真实材料填写。

| type | 展示名称 | 适合内容 |
| --- | --- | --- |
| article | 技术长文 | 概念、推导、方法与工程分析 |
| note | 短笔记 | 单个观察、问题或解决办法 |
| paper | 论文阅读 | 问题、方法、证据、局限与引用 |
| experiment | 实验复现 | 环境、步骤、真实结果与误差 |
| project | 项目记录 | 目标、角色、实现、状态与验证 |

`type` 决定文章页徽标和 `/writing/` 筛选，分类决定研究主题，标签描述领域。旧文章未填 `type` 时按 `article` 处理。短笔记模板默认不显示目录；你可修改 `toc`。未知类型、重复 slug、错误日期等会让构建失败。`updated` 应为真实修改时间且不得早于 `date`。

## 系列、精选与关联文章

在 `source/_data/series.yml` 的 `items` 中定义一个实际系列：

```yaml
items:
  - id: your-series
    title: 你的系列标题
    description: 说明阅读目标与覆盖范围
    prerequisites:
      - 必要前置知识
```

给该系列的正式文章添加：

```yaml
series:
  id: your-series
  order: 1
related:
  - another-published-slug
featured: true
```

`id` 用唯一的小写 ASCII 名称；`order` 用正整数，同系列不能重复，阅读按这个字段排序。系列有两篇以上正式文章时才出现在系列入口、首页和站点地图。单篇系列可从文章跳转，但不占用首页系列推荐。系列文章末尾自动显示完整阅读路径和真实的上一篇、下一篇。

`related` 填其他已公开正式文章的 slug；未发布、未来文章、示例或不存在的 slug 会让构建失败。没有关联文章时保留 `[]`。`featured: true` 手动加入精选，首页最多显示最近更新的两篇精选；最近记录最多显示六篇。未填这些字段的旧文章仍能正常发布，网址保持不变。

## 正式内容与订阅

`demo: true` 表示排版示例，继续保留公开网址，并在首页和文章入口的折叠区域展示。示例不进入正式主题、类型筛选、系列、精选、搜索或订阅。草稿、未来日期与 `published: false` 文章不进入生产站点。公开仓库中的 `_posts` 源码仍可被访问；未准备好的内容应放入被 Git 忽略的 `_drafts`。

订阅入口为 `/subscribe/`，Atom 地址为 `/atom.xml`，RSS 地址为 `/rss.xml`。发布后自动更新，默认保留最新 50 篇正式文章；目前没有正式文章时输出有效的空订阅源。

每页有规范网址和 JSON-LD；文章提供真实发表与修改日期，自动生成 1200 × 630 PNG 分享卡片。标题、简介和修改时间变化会生成新图片地址。示例、空列表、归档和 404 页面保留可访问网址并标记 `noindex`，站点地图仅收录可索引的内容页面。修改网站域名时同步 `profile.yml` 后重新构建。

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

正文介绍在 `source/about/index.md` 编辑，项目资料在 `source/_data/projects.yml` 编辑；`source/projects/index.md` 保留项目页标题与搜索摘要。导航、首页侧栏与 logo 文本在 `_config.icarus.yml` 编辑，文章侧栏在 `_config.post.yml` 编辑。不要直接改 `node_modules/hexo-theme-icarus/`。

## 研究主题与阅读提要

首页三个主题来自 `source/_data/topics.yml`，按 `categories` 关联实际文章：论文阅读对应“论文阅读”，AI 实践对应“技术学习 / 科研记录”，工程记录对应“工程实践”。示例文章（`demo: true`）、草稿和未来日期文章不计入。没有文章时显示空状态；新增正式文章并重新构建后自动收录。

给文章填写可选的 front matter 字段，就会在标题下显示阅读提要，并在文末显示资料链接：

```yaml
research:
  question: 用一句话写出本文要解决的问题
  takeaway: 写出已获得证据支持的核心结论
  prerequisites:
    - 所需前置知识
references:
  - title: 实际引用来源的标题
    url: https://hexo.io/docs/
code_url: https://github.com/BlCvd/blcvd.github.io
```

以上链接只是字段格式示例，请替换为这篇文章的真实来源与代码。未填写字段不会产生空提要或空资料区。引用只支持公开 HTTP(S) 链接与以 `/` 开头的本站路径；不允许脚本地址或嵌入凭据。

普通、草稿、论文和项目模板均提供了这些字段。文章的 `updated` 填写实际修改时间，修改已有文章时一并更新。正文应把问题、核心结论、方法与证据、局限、参考资料写完整；复现文章区分原文结果和自己实际执行的结果。

## 添加真实项目

编辑 `source/_data/projects.yml`，在 `items: []` 位置写入项目列表。保留已有 `groups`；`group` 对应 `research`、`ai` 或 `engineering`。每个项目的必填字段为 `id`、`group`、`name`、`summary`、`role`、`status`、`technologies`、`links`。

```yaml
items:
  - id: your-project-id
    group: engineering
    name: 你的真实项目名称
    summary: 实际解决的问题与实现范围
    role: 你实际承担的开发或协作职责
    status: 进行中
    technologies:
      - Python
    evidence: 实际完成的测试、结果或验证范围
    links: {}
```

这是一份待作者替换的格式示例。`status` 可填“进行中 / 已发布 / 已归档”；`links` 中可加入 `code`（仓库）、`demo`（演示）、`article`（本站项目文章），各字段填写完整 URL 或本站 `/posts/slug/`。不提供链接时保留 `{}`。`evidence` 可选，应如实填写。未知分组、不完整字段或不安全链接会让构建停止，修正后重试。

运行 `npm.cmd run build`、`npm.cmd run check`、`npm.cmd run preview` 检查展示，再按正常流程发布。

## 修改主题与备份

阅读样式在 `source/css/research.css`，交互在 `source/js/research.js`，公式与高亮在 `scripts/markdown.cjs`。升级依赖前保存 Git 提交，单独升级并运行 build / check / 预览；提交新的锁文件。

完整源码在 `main`。`public` 和 `node_modules` 可随时重建。`_drafts` 没有云端备份，请自行备份到私有位置；不要将敏感草稿移入 `_posts`。
