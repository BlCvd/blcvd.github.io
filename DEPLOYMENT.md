# GitHub Pages 部署

目标仓库：`BlCvd/blcvd.github.io`；目标网址：<https://blcvd.github.io/>。

仓库保存完整 Hexo 源码，`main` 为默认分支。`public/`、依赖、草稿、本地工具与 `.env` 文件不提交。

## 首次公开发布

首次创建公开仓库、首次 push 和首次发布必须经过所有者明确确认。确认范围包括 `profile.yml` 的公开用户名与头像、关于页和项目页、两篇明确标注示例的文章以及完整可维护源码。

`publication.approved` 和 `examples_approved` 由执行者在收到明确确认后改为 `true`。如果你不希望发布示例，可先移走两篇 demo 文章，再修正欢迎页之间的链接。不要把这两个字段当成登录凭据。

GitHub CLI 是可选工具。本项目已准备可校验来源的便携版，位于 `tooling/gh/bin/gh.exe`（不提交）。登录由本人执行：

```powershell
& .\tooling\gh\bin\gh.exe auth login --hostname github.com --git-protocol https --web
```

不需要给任何人发送密码或 token。GitHub CLI 使用系统凭据存储。若同名仓库已经存在，先检查内容、默认分支与 Pages 状态，禁止直接覆盖。

获得确认且仓库不存在后，可以创建不包含预置文件的公开仓库，再推送已经审核的源码：

```powershell
& .\tooling\gh\bin\gh.exe repo create BlCvd/blcvd.github.io --public --description "Personal academic blog: AI, research and engineering"
& .\tooling\gh\bin\gh.exe auth setup-git
git remote add origin https://github.com/BlCvd/blcvd.github.io.git
git push -u origin main
```

本项目设置仓库级 Git 用户名与 GitHub noreply 邮箱，以免提交时使用机器全局配置中的私人邮箱。该设置不影响其他仓库。

## Pages 设置

网页路径：**仓库 → Settings → Pages → Build and deployment → Source → GitHub Actions**。

已授权 GitHub CLI 时，也可以用 Pages 官方 REST API：

```powershell
& .\tooling\gh\bin\gh.exe api --method POST repos/BlCvd/blcvd.github.io/pages -f build_type=workflow
```

对已经启用 Pages 的仓库，使用 `PUT` 更新 `build_type=workflow`。只有 API 成功或网页设置核验成功，才能算作已经配置。

## 自动化工作流

`.github/workflows/pages.yml` 使用当前已核验的 GitHub 官方 Actions，固定 release commit，步骤如下：

```text
main push / 手动运行
  → checkout
  → setup-node（22.x，npm 缓存）
  → npm ci
  → npm run build
  → npm run check
  → 发布确认与源码凭据检查
  → upload-pages-artifact（仅 public）
  → configure-pages（部署任务内）
  → deploy-pages
```

构建任务只有 `contents: read`。部署任务只额外获得 `pages: write` 和 `id-token: write`，环境为 `github-pages`。不会使用个人访问令牌。每次同一站点只保留一个部署过程，避免新旧构建互相覆盖。

本地执行 `npm.cmd ci` 验证锁文件安装，然后 build / check。工作流本地语法检查可运行 `tooling/actionlint.exe .github/workflows/pages.yml`；真正的 Linux 执行与 Pages 上传结果以 GitHub Actions 为准。

## 后续更新

写作指南见 `BLOG_GUIDE.md`。文章移入 `_posts` 并预览后：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\Publish.ps1 -Message "docs: add a new research note"
```

该命令不会强推，也不会删除远程历史。失败的 push 保留本地提交。你也可以手动 `git add`、`git commit`、`git push`；Pages 会自动重建。

## 检查结果与常见问题

GitHub：**仓库 → Actions → Deploy Hexo to GitHub Pages**；成功后 **Settings → Pages** 显示网址。命令行可用 `gh run list`、`gh run view <id> --log-failed`。

| 情况 | 处理 |
| --- | --- |
| PowerShell 阻止 npm.ps1 | 使用 `npm.cmd`，不用修改系统执行策略 |
| 发布脚本执行受限 | 用文档中的 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File`，只作用于这一进程 |
| 端口 4000 被占用 | 停止自己的旧预览，或 `hexo server --ip 127.0.0.1 --port 4001` |
| npm ci 锁文件不匹配 | 本地运行 npm install 修正锁文件，build / check 后一并提交 |
| 构建成功但部署失败 | 核验 Pages Source、工作流权限、github-pages 环境允许 main 部署 |
| Pages 404 | 等待成功部署，检查仓库名与 profile.site.url；访问正确的用户站点根路径 |
| 公式报错 | 检查分隔符、反斜杠和 KaTeX 支持的命令；看浏览器与 build 输出 |
| Mermaid 显示源码 | 看浏览器控制台，检查语法与本地 vendor 文件是否生成 |
| 分类或标签为空 | 检查文章 front matter；不要预先创建空类别页面 |
| Push rejected | 用 git fetch 检查远端差异，必要时正常合并；不要强推 |

## 依赖审计的边界

项目对可用修复进行了更新，特别是 Markdown 解析器。Hexo / Icarus 的上游构建依赖仍可能在 `npm audit` 中报告 advisory（例如 braces、sprintf-js），且当前注册表没有对应修复版。Mermaid 的预构建包包含自己的 KaTeX；替换根依赖不会重打它的包。

2026-10-09 的最终审计为 13 条报告（9 high、2 moderate、2 low，包含依赖传播），没有 critical。Markdown 解析器相关报告已解决；剩余报告来自上游构建依赖及 Mermaid 内置 KaTeX。这些情况应随上游升级复查，不能把 audit 报告称为“零漏洞”。本站只部署静态产物，不运行 npm 服务；构建输入来自你维护的 Markdown。不要盲目执行 `npm audit fix --force`，它可能降级生成器或主题并破坏兼容性。

## 官方资料

- [Hexo GitHub Pages](https://hexo.io/docs/github-pages)
- [GitHub 自定义 Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Icarus 官方主题](https://github.com/ppoffice/hexo-theme-icarus)
- [Hexo 8.1.2](https://github.com/hexojs/hexo/releases/tag/v8.1.2)
