'use strict';

const { escapeHTML } = require('hexo-util');

// Hexo's documented injection API keeps the npm theme unchanged and upgradeable.
hexo.extend.injector.register('head_begin', `<script>(function(){try{var t=localStorage.getItem('research-theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}catch(e){}})();</script>`);
hexo.extend.injector.register('head_end', '<link rel="stylesheet" href="/vendor/highlight.js/styles/atom-one-light.css"><link rel="stylesheet" href="/vendor/katex/katex.min.css"><link rel="stylesheet" href="/css/research.css">');
hexo.extend.injector.register('head_end', `<meta name="research-subtitle" content="${escapeHTML(hexo.config.subtitle)}">`);
hexo.extend.injector.register('body_begin', '<a class="skip-link" href="#main-content">跳到正文</a>');
hexo.extend.injector.register('body_end', '<button id="back-top" class="back-top" type="button" aria-label="返回顶部" hidden>↑</button><script src="/js/research.js" defer></script>');

// Append tags to homepage summaries; the stock theme only shows them on full posts.
hexo.extend.filter.register('after_post_render', data => {
  if (!data.excerpt || !data.tags?.length) return data;
  const tags = data.tags.map(tag => `<a class="summary-tag" href="/${tag.path}">${escapeHTML(tag.name)}</a>`).join('');
  data.excerpt += `<div class="summary-tags">${tags}</div>`;
  return data;
});
hexo.extend.filter.register('after_render:html', html => html
  .replace(', maximum-scale=1', '')
  .replace('class="column order-2 column-main', 'id="main-content" class="column order-2 column-main')
  // Stock column.js clones sidebar IDs. Keep one TOC and relocate it on mobile.
  .replace(/<script\b[^>]*\bsrc=["']\/js\/column\.js["'][^>]*><\/script>/gi, ''));
