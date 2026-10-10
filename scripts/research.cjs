'use strict';

const { topics, topicPage, projectData, projectPage } = require('../tools/content.cjs');

hexo.extend.generator.register('research-topics', locals => {
  const values = topics(locals.data.topics);
  return values.map(topic => ({
    path: `topics/${topic.id}/index.html`,
    layout: 'page',
    data: {
      title: topic.title, description: topic.description, layout: 'page',
      content: topicPage(topic, locals.posts.toArray(), values),
      research_topic: topic.id, toc: false, __page: true
    }
  }));
});

// Icarus merges its per-layout settings at priority 10. Change only this page's locals.
hexo.extend.filter.register('template_locals', locals => {
  if (locals.page.path === 'projects/index.html') {
    locals.page.content = projectPage(projectData(locals.site.data.projects));
  }
  return locals;
}, 20);
