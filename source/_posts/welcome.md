---
title: 欢迎来到我的研究笔记｜示例文章
date: 2026-10-09 09:00:00
updated: 2026-10-09 09:00:00
slug: welcome
categories:
  - 博客与写作
tags:
  - 示例
  - Markdown
cover: /img/research-cover.svg
toc: true
demo: true
---

这是博客的**演示文章**。它用来展示阅读、代码和数学公式的排版，不代表作者已经完成任何科研成果。

从一个问题开始，用笔记把理解留下来，再用工程验证想法。这里将记录 AI 学习、论文阅读和项目实践。

<!-- more -->

## 这份笔记从哪里开始

一个可持续维护的博客，首先要让写作变得简单。文章用 Markdown 保存，网站由 Hexo 生成，源码提交后交给 GitHub Actions 构建。

> 本文及下一篇排版示例都是可删除的演示内容。正式文章应写清楚问题、来源和证据，而不是把模板填成成果。

未来的文章可以按学习主题与工作形式分类：技术学习、论文阅读、科研记录、工程实践、学习与成长。具体规范见项目里的 `BLOG_GUIDE.md`。

## 从公式到代码

以下只是排版演示。对线性模型 $\hat{y}=wx+b$，常见的均方误差写作：

$$
\mathcal{L}(w,b)=\frac{1}{N}\sum_{i=1}^{N}(wx_i+b-y_i)^2.
$$

```python
def mean_squared_error(predictions, targets):
    """A small formatting example, not an experiment result."""
    if len(predictions) != len(targets) or not predictions:
        raise ValueError("Expected equally sized, nonempty inputs")
    return sum((p - y) ** 2 for p, y in zip(predictions, targets)) / len(targets)
```

## 一条清晰的写作路径

```mermaid
flowchart LR
    Q[提出问题] --> R[阅读与记录]
    R --> E[实验或实现]
    E --> N[整理笔记]
    N --> Q
```

把可复现的方法、仍然不确定的地方和下一步问题放在同一页。慢慢积累，就能形成自己的知识地图。

## 继续阅读

- [Markdown 与数学排版示例](/posts/markdown-showcase/)
- [关于这个博客](/about/)
- [项目展示](/projects/)
- [全部归档](/archives/)
