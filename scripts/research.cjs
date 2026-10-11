'use strict';

const { topics, topicPage, projectData, projectPage } = require('../tools/content.cjs');
const { edition, isPublic, isFormal, writingPage, seriesIndex, seriesPage, subscriptionPage } = require('../tools/editorial.cjs');
const { publicPath, absolute, cardInfo, cardBuffer, emptyFeed, sitemap } = require('../tools/seo.cjs');

function page(path, title, description, content, extra = {}) {
  return { path, layout: 'page', data: { path, title, description, content, layout: 'page', toc: false, __page: true, ...extra } };
}

hexo.extend.generator.register('research-topics', locals => {
  const values = topics(locals.data.topics), posts = locals.posts.toArray();
  return values.map(topic => page(`topics/${topic.id}/index.html`, topic.title, topic.description, topicPage(topic, posts, values), { research_topic: topic.id }));
});

hexo.extend.generator.register('research-collections', locals => {
  const model = edition(locals.posts.toArray(), locals.data.series);
  return [
    page('writing/index.html', '文章与笔记', '论文阅读、实验复现与工程记录，按主题和内容类型浏览。', writingPage(model), { research_collection: 'writing' }),
    page('series/index.html', '系列阅读', '围绕研究问题组织前置知识、方法与实践的阅读路径。', seriesIndex(model), { research_collection: 'series' }),
    page('subscribe/index.html', '订阅更新', '通过 RSS 或 Atom 订阅新的正式研究笔记。', subscriptionPage(model), { research_collection: 'subscribe' }),
    ...model.groups.map(group => page(`series/${group.id}/index.html`, group.title, group.description, seriesPage(group), { research_collection: 'series-detail', series_id: group.id }))
  ];
});

hexo.extend.generator.register('research-metadata', async locals => {
  const posts = locals.posts.toArray(), model = edition(posts, locals.data.series);
  const values = topics(locals.data.topics);
  const paths = ['', 'about/', 'subscribe/', ...model.formal.map(post => post.path)];
  if (model.formal.length) paths.push('writing/');
  if (projectData(locals.data.projects).items.length) paths.push('projects/');
  if (model.groups.some(group => group.posts.length >= 2)) paths.push('series/');
  for (const group of model.groups.filter(group => group.posts.length >= 2)) paths.push(`series/${group.id}/`);
  for (const topic of values) if (model.formal.some(post => post.categories.toArray().some(category => topic.categories.includes(category.name)))) paths.push(`topics/${topic.id}/`);
  const cards = [cardInfo(hexo.config), ...posts.filter(isPublic).map(post => cardInfo(hexo.config, post))];
  const unique = [...new Map(cards.map(card => [card.path, card])).values()];
  return [
    { path: 'sitemap.xml', data: sitemap(hexo.config, paths) },
    { path: 'robots.txt', data: `User-agent: *\nAllow: /\nSitemap: ${absolute('sitemap.xml', hexo.config)}\n` },
    ...await Promise.all(unique.map(async card => ({ path: card.path, data: await cardBuffer(card, hexo.config) })))
  ];
});

// Wrap supported generator outputs rather than editing the installed theme.
hexo.extend.filter.register('after_init', () => {
  const index = hexo.extend.generator.get('index');
  hexo.extend.generator.register('index', async locals => {
    const routes = await index.call(hexo, locals);
    return routes.map(route => publicPath(route.path) === '/' ? { ...route, data: { ...route.data, posts: [], total: 1, research_home: true } } : route);
  });
  const insight = hexo.extend.generator.get('insight');
  hexo.extend.generator.register('insight', locals => {
    const posts = locals.posts.filter(isFormal);
    const used = (field, item) => posts.toArray().some(post => post[field].toArray().some(value => value.name === item.name));
    return insight.call(hexo, { ...locals, posts, tags: locals.tags.filter(tag => used('tags', tag)), categories: locals.categories.filter(category => used('categories', category)), pages: locals.pages.filter(page => page.path !== '404.html') });
  });
  for (const kind of ['atom', 'rss2']) {
    const original = hexo.extend.generator.get(kind);
    if (!original) throw new Error(`Missing official ${kind} feed generator`);
    hexo.extend.generator.register(kind, locals => {
      const posts = locals.posts.filter(isFormal);
      return posts.length ? original.call(hexo, { ...locals, posts }) : { path: kind === 'atom' ? 'atom.xml' : 'rss.xml', data: emptyFeed(hexo.config, kind) };
    });
  }
});

// Icarus merges per-layout settings at priority 10; these settings affect this page only.
hexo.extend.filter.register('template_locals', locals => {
  if (locals.page.research_home) locals.config = { ...locals.config, widgets: [] };
  if (locals.page.path === 'projects/index.html') locals.page.content = projectPage(projectData(locals.site.data.projects));
  return locals;
}, 20);
