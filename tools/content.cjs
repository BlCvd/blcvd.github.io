'use strict';

const { escapeHTML } = require('hexo-util');
const assert = require('node:assert/strict');
const editorial = require('./editorial.cjs');
const text = value => escapeHTML(String(value ?? ''));

function link(value) {
  assert(typeof value === 'string', 'A link must be text');
  assert(!/[\\\s\u0000-\u001f]/.test(value), `Invalid link: ${value}`);
  if (value.startsWith('/') && !value.startsWith('//')) return text(value);
  const url = new URL(value);
  assert(['https:', 'http:'].includes(url.protocol) && !url.username && !url.password, 'Use a public HTTP(S) or root-relative link');
  return text(value);
}

function groups(values, name) {
  assert(Array.isArray(values) && values.length > 0, `${name} must be a nonempty list`);
  const ids = new Set();
  return values.map(value => {
    assert(value && /^[a-z][a-z0-9-]*$/.test(value.id) && !ids.has(value.id), `${name}: unique ASCII ids are required`);
    assert(typeof value.title === 'string' && value.title.trim(), `${name}: a title is required`);
    assert(typeof value.description === 'string', `${name}: a description is required`);
    ids.add(value.id);
    return value;
  });
}

function topics(values) {
  return groups(values, 'topics').map(topic => {
    assert(Array.isArray(topic.categories) && topic.categories.length && topic.categories.every(category => typeof category === 'string' && category.trim()), 'A topic needs category names');
    return topic;
  });
}

function postsFor(posts, topic) {
  return posts.filter(post => editorial.isFormal(post)
    && post.categories.toArray().some(category => topic.categories.includes(category.name)));
}

function topicCards(values, posts) {
  return `<section class="research-topics" aria-labelledby="research-topics-title"><div class="section-caption"><h2 id="research-topics-title">研究主题</h2><span>沿着问题，慢慢积累</span></div><div class="topic-grid">${values.map((topic, index) => {
    const count = postsFor(posts, topic).length;
    return `<a class="topic-card" href="/topics/${text(topic.id)}/"><span class="topic-number" aria-hidden="true">0${index + 1}</span><h3>${text(topic.title)}</h3><p>${text(topic.description)}</p><span class="topic-count">${count ? `${count} 篇文章` : '暂无文章'}<span aria-hidden="true">↗</span></span></a>`;
  }).join('')}</div></section>`;
}

function homeIntro(config, values, posts, profile, series) {
  return editorial.homePage(config, profile, topicCards(values, posts), editorial.edition(posts, series));
}

function topicPage(topic, posts, values) {
  const articles = postsFor(posts, topic).sort((a, b) => Number(b.date) - Number(a.date));
  const navigation = values.map(value => `<a href="/topics/${text(value.id)}/"${value.id === topic.id ? ' aria-current="page"' : ''}>${text(value.title)}</a>`).join('');
  return `<section class="topic-page" data-topic="${text(topic.id)}"><p class="page-lead">${text(topic.description)}</p><nav class="topic-navigation" aria-label="研究主题">${navigation}</nav><p class="collection-count">${articles.length} 篇文章</p>${articles.length ? `<ol class="topic-articles">${articles.map(post => `<li><time datetime="${post.date.toISOString()}">${post.date.format('YYYY-MM-DD')}</time><h2><a href="${link('/' + post.path)}">${text(post.title)}</a></h2>${post.description ? `<p>${text(post.description)}</p>` : ''}</li>`).join('')}</ol>` : '<div class="collection-empty"><span class="empty-mark" aria-hidden="true">…</span><h2>这里的记录还在路上</h2><p>这个主题暂时没有正式文章。新的笔记会从一个具体问题开始。</p></div>'}<a class="text-link" href="/archives/">浏览全部文章 <span aria-hidden="true">↗</span></a></section>`;
}

function projectData(data) {
  assert(data && typeof data.intro === 'string', 'projects needs intro text');
  const sections = groups(data.groups, 'project groups');
  assert(Array.isArray(data.items), 'projects.items must be a list');
  const ids = new Set();
  for (const item of data.items) {
    assert(item && /^[a-z][a-z0-9-]*$/.test(item.id) && !ids.has(item.id), 'Each project needs a unique ASCII id');
    ids.add(item.id);
    assert(sections.some(section => section.id === item.group), 'Unknown project group');
    for (const field of ['name', 'summary', 'role']) assert(typeof item[field] === 'string' && item[field].trim(), `Project ${item.id} needs ${field}`);
    assert(['进行中', '已发布', '已归档'].includes(item.status), 'Project status must be 进行中, 已发布 or 已归档');
    assert(Array.isArray(item.technologies) && item.technologies.every(value => typeof value === 'string'), 'technologies must be a text list');
    assert(item.links && typeof item.links === 'object' && !Array.isArray(item.links), 'Project links must be an object');
    for (const [kind, value] of Object.entries(item.links)) {
      assert(['code', 'demo', 'article'].includes(kind), 'Use code, demo or article links');
      link(value);
    }
    if (item.evidence != null) assert(typeof item.evidence === 'string', 'evidence must be text');
  }
  return { ...data, groups: sections };
}

function projectPage(data) {
  const labels = { code: '代码仓库', demo: '在线演示', article: '项目记录' };
  return `<section class="projects-index"><p class="page-lead">${text(data.intro)}</p>${data.items.length ? `<p class="collection-count">${data.items.length} 个公开项目</p>` : '<div class="projects-notice"><span class="status-dot" aria-hidden="true"></span><p>目前尚未收录公开项目。这里将逐步补充真实作品与过程记录。</p></div>'}<div class="project-groups">${data.groups.map((group, index) => {
    const items = data.items.filter(item => item.group === group.id);
    return `<section class="project-group" aria-labelledby="project-group-${text(group.id)}"><header><span class="project-group-number" aria-hidden="true">0${index + 1}</span><div><h2 id="project-group-${text(group.id)}">${text(group.title)}</h2><p>${text(group.description)}</p></div></header>${items.length ? `<div class="project-list">${items.map(item => `<article class="project-entry" id="project-${text(item.id)}"><div class="project-entry-heading"><h3>${text(item.name)}</h3><span class="project-status">${text(item.status)}</span></div><p>${text(item.summary)}</p><dl class="project-details"><div><dt>我的角色</dt><dd>${text(item.role)}</dd></div><div><dt>技术</dt><dd>${item.technologies.map(text).join(' · ') || '暂无技术说明'}</dd></div>${item.evidence ? `<div><dt>验证与成果</dt><dd>${text(item.evidence)}</dd></div>` : ''}</dl><div class="project-links">${Object.entries(item.links).map(([kind, value]) => `<a href="${link(value)}">${labels[kind]} <span aria-hidden="true">↗</span></a>`).join('')}</div></article>`).join('')}</div>` : '<p class="project-empty">暂无公开项目</p>'}</section>`;
  }).join('')}</div></section>`;
}

function articleBrief(page) {
  const research = page.research;
  if (!research || (!research.question && !research.takeaway && !research.prerequisites?.length)) return '';
  assert(typeof research === 'object' && !Array.isArray(research), 'research must be an object');
  if (research.prerequisites != null) assert(Array.isArray(research.prerequisites), 'research.prerequisites must be a list');
  return `<aside class="article-brief" aria-label="阅读提要"><p class="brief-label">阅读提要</p><dl>${[['问题', research.question], ['核心结论', research.takeaway], ['前置知识', research.prerequisites?.join(' · ')]].filter(([, value]) => value).map(([label, value]) => `<div><dt>${label}</dt><dd>${text(value)}</dd></div>`).join('')}</dl></aside>`;
}

function articleEnding(page, profile) {
  const references = page.references || [];
  assert(Array.isArray(references), 'references must be a list');
  const resources = references.map((reference, index) => {
    assert(reference && typeof reference.title === 'string' && reference.title.trim(), 'A reference needs a title');
    return `<li><a href="${link(reference.url)}">[${index + 1}] ${text(reference.title)}</a></li>`;
  });
  if (page.code_url) resources.push(`<li><a href="${link(page.code_url)}">代码与复现材料 <span aria-hidden="true">↗</span></a></li>`);
  return `${resources.length ? `<section class="article-resources" aria-label="引用与复现材料"><p class="brief-label">引用与复现材料</p><ul>${resources.join('')}</ul></section>` : ''}<footer class="article-author"><img class="not-gallery-item" src="${link(profile.author.avatar)}" alt="${text(profile.author.name)} 的头像" width="48" height="48" loading="lazy"><div><a class="author-name" href="/about/">${text(profile.author.name)}</a><p>${text(profile.author.tagline)}</p></div><a class="author-follow" href="${link(profile.author.github_url)}">GitHub <span aria-hidden="true">↗</span></a></footer>`;
}

module.exports = { topics, postsFor, homeIntro, topicPage, projectData, projectPage, articleBrief, articleEnding };
