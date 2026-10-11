# 开源依赖与素材

博客整体布局参考 <https://mrlaolu.github.io/>，通过官方 Icarus 定制实现。未使用参考作者的文章、个人资料、头像或图片，也没有复制其部署 HTML。

- Hexo：MIT
- hexo-generator-feed / feedsmith：MIT；使用官方生成器输出正式文章订阅
- sharp：Apache-2.0；底层 libvips 等许可见对应发行包，用于构建时生成分享图片
- Icarus / hexo-component-inferno：MIT，页脚保留主题归属
- markdown-it：MIT；Hexo renderer 接入代码为本项目实现
- KaTeX：MIT
- markdown-it-texmath：MIT
- Mermaid：MIT
- jQuery / Moment / highlight.js：分别按各包 LICENSE 分发
- Font Awesome Free：图标 CC BY 4.0、字体 SIL OFL 1.1、代码 MIT，详见包许可证
- Ubuntu 与 Source Code Pro：各字体的开放字体许可证，由 Fontsource 分发

运行资源准备时会将相应许可复制到 `public/vendor/licenses/`。完整依赖许可请以锁文件对应包的 LICENSE 为准。

`source/img/favicon.svg`、`avatar-placeholder.svg` 与 `research-cover.svg` 为本博客原创矢量素材。`github-avatar.png` 来自已登录账户主动使用的公开 GitHub 头像，归账户所有者或相关权利人所有。
`public/img/share/*.png` 由本项目的原创 SVG 模板与文章公开字段生成。CI 使用的 Noto CJK 字体按其开放字体许可提供，Windows 本地构建使用系统已有字体。

博客默认未为作者文章选择 Creative Commons 许可；需要时由作者自行决定。源码与文字的授权安排也由仓库所有者决定。
