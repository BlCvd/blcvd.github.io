'use strict';

const assert = require('node:assert/strict');
const { escapeHTML, stripHTML, unescapeHTML } = require('hexo-util');
const labels = { article: '技术长文', note: '短笔记', paper: '论文阅读', experiment: '实验复现', project: '项目记录' };
const text = value => escapeHTML(String(value ?? ''));
const plain = value => unescapeHTML(stripHTML(String(value ?? ''))).replace(/\s+/g, ' ').trim();
const isPublic = post => post.published !== false && post.draft !== true && Number(post.date) <= Date.now();
const isFormal = post => isPublic(post) && !post.demo;
const dateLabel = value => value.format ? value.format('YYYY-MM-DD') : new Date(value).toISOString().slice(0, 10);

function seriesData(data = { items: [] }) {
  assert(data && Array.isArray(data.items), 'series.yml needs an items list');
  const ids = new Set();
  for (const item of data.items) {
    assert(item && /^[a-z][a-z0-9-]*$/.test(item.id) && !ids.has(item.id), 'Series ids must be unique ASCII slugs');
    assert(typeof item.title === 'string' && item.title.trim(), 'A series needs a title');
    assert(typeof item.description === 'string', 'A series needs a description');
    assert(item.prerequisites == null || (Array.isArray(item.prerequisites) && item.prerequisites.every(value => typeof value === 'string')), 'Series prerequisites must be a text list');
    ids.add(item.id);
  }
  return data.items;
}

function edition(posts, data) {
  const definitions = seriesData(data);
  const published = posts.filter(isPublic);
  const slugs = new Set();
  for (const post of published) {
    assert(typeof post.title === 'string' && post.title.trim(), 'A published post needs a title');
    assert(typeof post.slug === 'string' && post.slug.trim() && !/[\/\\\s\u0000-\u001f]/.test(post.slug), 'A post needs a single, nonempty slug');
    assert(!slugs.has(post.slug), `Duplicate post slug: ${post.slug}`);
    slugs.add(post.slug);
    assert(labels[post.type || 'article'], `Unknown content type in ${post.slug}`);
    assert(Number.isFinite(Number(post.date)), `Invalid date in ${post.slug}`);
    if (post.updated) assert(Number.isFinite(Number(post.updated)) && Number(post.updated) >= Number(post.date), `updated precedes date in ${post.slug}`);
    for (const field of ['demo', 'featured']) if (post[field] != null) assert(typeof post[field] === 'boolean', `${field} must be true or false in ${post.slug}`);
    if (post.description != null) assert(typeof post.description === 'string', `description must be text in ${post.slug}`);
    if (post.related != null) assert(Array.isArray(post.related) && post.related.every(slug => typeof slug === 'string') && new Set(post.related).size === post.related.length, `related must contain unique post slugs in ${post.slug}`);
  }
  const formal = published.filter(isFormal);
  const bySlug = new Map(formal.map(post => [post.slug, post]));
  const orders = new Set();
  for (const post of formal) {
    if (post.series != null) {
      assert(typeof post.series === 'object' && !Array.isArray(post.series) && definitions.some(item => item.id === post.series.id), `Unknown series in ${post.slug}`);
      assert(Number.isInteger(post.series.order) && post.series.order > 0, `Series order must be a positive integer in ${post.slug}`);
      const key = `${post.series.id}:${post.series.order}`;
      assert(!orders.has(key), `Duplicate series order: ${key}`);
      orders.add(key);
    }
    for (const slug of post.related || []) assert(slug !== post.slug && bySlug.has(slug), `related must reference another published formal post: ${slug}`);
  }
  const groups = definitions.map(item => ({ ...item, posts: formal.filter(post => post.series?.id === item.id).sort((a, b) => a.series.order - b.series.order) }));
  return { formal, demos: published.filter(post => post.demo), groups, bySlug };
}

const summary = post => plain(post.description || String(post.excerpt || post.content || '').replace(/<div class="summary-tags">[\s\S]*?<\/div>/g, '')).slice(0, 160);
const postLink = post => '/' + post.path;
const updatedOrder = posts => [...posts].sort((a, b) => Number(b.updated || b.date) - Number(a.updated || a.date));

function postRows(posts, { demos = false } = {}) {
  return `<ol class="writing-list">${posts.map(post => `<li class="writing-entry" data-kind="${text(post.type || 'article')}" data-slug="${text(post.slug)}"><div class="entry-meta"><span class="content-kind">${demos ? '排版示例' : text(labels[post.type || 'article'])}</span><time datetime="${new Date(Number(post.updated || post.date)).toISOString()}">${dateLabel(post.updated || post.date)}${Number(post.updated || post.date) > Number(post.date) ? ' 更新' : ''}</time></div><h2><a href="${text(postLink(post))}">${text(post.title)}</a></h2><p>${text(summary(post))}</p></li>`).join('')}</ol>`;
}

function demoSection(posts) {
  return posts.length ? `<details class="demo-samples"><summary>查看 ${posts.length} 篇排版示例</summary><p>这些文章用于展示排版与功能，不计入正式研究内容。</p>${postRows(updatedOrder(posts), { demos: true })}</details>` : '';
}

function writingPage(model) {
  return `<section class="writing-page"><p class="page-lead">沿着问题积累理解，记录论文、实验与工程中的发现。</p><div class="writing-tools"><div class="type-filters" aria-label="按内容类型筛选" hidden>${[['all', '全部'], ...Object.entries(labels)].map(([kind, label]) => `<button type="button" data-kind="${kind}" aria-pressed="${kind === 'all'}">${label}</button>`).join('')}</div><nav class="browse-links" aria-label="其他浏览方式"><a href="/archives/">归档</a><a href="/categories/">分类</a><a href="/tags/">标签</a><a href="/series/">系列</a></nav></div><p class="collection-count" aria-live="polite">${model.formal.length} 篇正式文章</p>${model.formal.length ? postRows(updatedOrder(model.formal)) : '<div class="collection-empty"><span class="empty-mark" aria-hidden="true">…</span><h2>正式笔记从一个问题开始</h2><p>目前尚未收录正式文章。你可以先查看下方的排版示例。</p></div>'}<p class="writing-no-results" hidden>这个类型暂时没有文章。</p>${demoSection(model.demos)}</section>`;
}

function seriesIndex(model) {
  const visible = model.groups.filter(group => group.posts.length >= 2);
  return `<section class="series-index"><p class="page-lead">把相关的问题串成一条阅读路径，从必要基础走向方法与实践。</p>${visible.length ? `<div class="series-list">${visible.map(group => `<article class="series-card"><span class="content-kind">${group.posts.length} 篇文章</span><h2><a href="/series/${text(group.id)}/">${text(group.title)}</a></h2><p>${text(group.description)}</p><a class="text-link" href="/series/${text(group.id)}/">开始阅读 <span aria-hidden="true">↗</span></a></article>`).join('')}</div>` : '<div class="collection-empty"><span class="empty-mark" aria-hidden="true">↗</span><h2>阅读路径正在积累</h2><p>同一主题形成两篇以上正式文章后，会在这里展示系列与阅读顺序。</p></div>'}<a class="text-link" href="/writing/">浏览文章与笔记 <span aria-hidden="true">↗</span></a></section>`;
}

function seriesPage(group) {
  return `<section class="series-detail"><p class="page-lead">${text(group.description)}</p>${group.prerequisites?.length ? `<div class="series-prerequisites"><p class="brief-label">前置知识</p><p>${group.prerequisites.map(text).join(' · ')}</p></div>` : ''}<p class="collection-count">${group.posts.length} 篇正式文章 · 按阅读顺序排列</p>${group.posts.length ? postRows(group.posts) : '<div class="collection-empty"><h2>暂时没有公开文章</h2><p>这个系列尚未收录正式内容。</p></div>'}<a class="text-link" href="/series/">返回全部系列</a></section>`;
}

function articleNavigation(post, model) {
  if (!isFormal(post)) return '';
  const group = model.groups.find(item => item.id === post.series?.id);
  let html = '';
  if (group) {
    const index = group.posts.findIndex(item => item.slug === post.slug);
    html += `<nav class="article-series" aria-label="系列阅读"><div class="section-caption"><p class="brief-label">系列 · <a href="/series/${text(group.id)}/">${text(group.title)}</a></p><span>第 ${index + 1} / ${group.posts.length} 篇</span></div><ol>${group.posts.map(item => `<li><a href="${text(postLink(item))}"${item.slug === post.slug ? ' aria-current="page"' : ''}>${text(item.title)}</a></li>`).join('')}</ol><div class="series-neighbors">${index > 0 ? `<a rel="prev" href="${text(postLink(group.posts[index - 1]))}">← 上一篇：${text(group.posts[index - 1].title)}</a>` : '<span>这是系列的第一篇</span>'}${index < group.posts.length - 1 ? `<a rel="next" href="${text(postLink(group.posts[index + 1]))}">下一篇：${text(group.posts[index + 1].title)} →</a>` : '<span>已读到最新一篇</span>'}</div></nav>`;
  }
  if (post.related?.length) html += `<section class="article-related"><p class="brief-label">相关笔记</p><ul>${post.related.map(slug => `<li><a href="${text(postLink(model.bySlug.get(slug)))}">${text(model.bySlug.get(slug).title)}</a></li>`).join('')}</ul></section>`;
  return html;
}

function articleLabel(post) {
  return `<div class="article-labels">${post.demo ? '<span class="content-kind">排版示例</span>' : `<a class="content-kind" href="/writing/?type=${text(post.type || 'article')}">${text(labels[post.type || 'article'])}</a>`}</div>`;
}

function subscriptionPage(model) {
  return `<section class="subscription-page"><p class="page-lead">在你喜欢的阅读器里，订阅新的论文笔记、实验与工程记录。</p><div class="feed-options"><a href="/atom.xml"><span class="content-kind">Atom</span><h2>订阅研究笔记</h2><p>复制链接到支持 Atom 的阅读器。</p><span class="feed-address">/atom.xml ↗</span></a><a href="/rss.xml"><span class="content-kind">RSS 2.0</span><h2>使用 RSS 阅读器</h2><p>复制链接到支持 RSS 的阅读器。</p><span class="feed-address">/rss.xml ↗</span></a></div><p class="subscription-status">${model.formal.length ? `目前已收录 ${model.formal.length} 篇正式文章。订阅源提供最新的正式文章。` : '目前暂无正式文章，订阅源已准备好；新文章发布后会自动更新。'}排版示例不进入订阅。</p><a class="text-link" href="/writing/">浏览文章与笔记</a></section>`;
}

function homePage(config, profile, topicHtml, model) {
  const featured = updatedOrder(model.formal.filter(post => post.featured)).slice(0, 2);
  const series = model.groups.filter(group => group.posts.length >= 2).slice(0, 2);
  return `<header class="research-intro home-hero"><div class="hero-copy"><div class="eyebrow">${text(config.subtitle)}</div><div class="intro-line"></div><h1>记录每一次理解与构建。</h1><p>${text(config.description)}</p><nav class="hero-links" aria-label="开始探索"><a href="/writing/">文章与笔记 <span aria-hidden="true">↗</span></a><a href="/projects/">项目记录 <span aria-hidden="true">↗</span></a><a href="/subscribe/">订阅更新 <span aria-hidden="true">↗</span></a></nav></div><aside class="hero-author"><img src="${text(profile.author.avatar)}" alt="${text(profile.author.name)} 的头像" width="64" height="64"><a href="/about/">${text(profile.author.name)}</a><p>${text(profile.author.tagline)}</p><a class="text-link" href="${text(profile.author.github_url)}">GitHub ↗</a></aside></header>${topicHtml}<div class="home-sections"><section class="home-records">${featured.length ? `<div class="section-caption"><h2>精选记录</h2></div>${postRows(featured)}` : ''}<div class="section-caption"><h2>最近的记录</h2><a href="/writing/">全部文章 ↗</a></div>${model.formal.length ? postRows(updatedOrder(model.formal).slice(0, 6)) : '<div class="home-empty"><h3>正式研究笔记，从这里开始。</h3><p>这里将收录论文阅读、实验与工程中的理解和发现。</p></div>'}${demoSection(model.demos)}</section><aside class="home-reading"><section><p class="brief-label">沿着主题阅读</p><h2>让笔记形成路径。</h2><p>把前置知识、方法与实践连成系列，方便持续学习与回顾。</p>${series.map(group => `<a class="home-series-link" href="/series/${text(group.id)}/">${text(group.title)} <span>${group.posts.length} 篇 ↗</span></a>`).join('')}<a class="text-link" href="/series/">浏览系列 ↗</a></section><section class="home-subscribe"><p class="brief-label">保持联系</p><h2>新记录，送到阅读器。</h2><p>通过 RSS 或 Atom，按自己的节奏关注更新。</p><a class="text-link" href="/subscribe/">订阅研究笔记 ↗</a></section></aside></div>`;
}

module.exports = { labels, plain, text, isPublic, isFormal, dateLabel, seriesData, edition, summary, postRows, writingPage, seriesIndex, seriesPage, articleNavigation, articleLabel, subscriptionPage, homePage };
