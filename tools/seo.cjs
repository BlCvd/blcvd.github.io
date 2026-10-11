'use strict';

const { createHash } = require('node:crypto');
const sharp = require('sharp');
const { text, plain, summary, labels, isFormal } = require('./editorial.cjs');

function publicPath(path = '') {
  return '/' + path.replace(/^\/+/, '').replace(/(?:^|\/)index\.html$/, '/').replace(/^\//, '');
}
const absolute = (path, config) => new URL(publicPath(path), config.url).href;

function cardInfo(config, post) {
  const title = post ? post.title : config.title;
  const subtitle = post ? summary(post) : config.description;
  const badge = post ? (post.demo ? '排版示例' : labels[post.type || 'article']) : config.subtitle;
  const date = post ? new Date(Number(post.updated || post.date)).toISOString().slice(0, 10) : '';
  const key = createHash('sha256').update(JSON.stringify([title, subtitle, badge, date, config.author])).digest('hex').slice(0, 20);
  return { title, subtitle, badge, date, path: `img/share/${key}.png` };
}

function lines(value, capacity, count) {
  const output = [];
  let line = '', width = 0;
  for (const char of Array.from(plain(value))) {
    const step = /[\u0000-\u00ff]/.test(char) ? .55 : 1;
    if (width + step > capacity) {
      output.push(line); line = ''; width = 0;
      if (output.length === count) break;
    }
    line += char; width += step;
  }
  if (line && output.length < count) output.push(line);
  if (output.join('').length < plain(value).length) output[output.length - 1] = output.at(-1).slice(0, -1) + '…';
  return output;
}

async function cardBuffer(card, config) {
  const title = lines(card.title, 20, 3), subtitle = lines(card.subtitle, 42, 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#f3f6fa"/><rect x="38" y="38" width="1124" height="554" rx="18" fill="#fff" stroke="#dce5ef"/><path d="M90 110h70" stroke="#326aab" stroke-width="4"/><g font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif"><text x="90" y="156" font-size="22" fill="#326aab">${text(card.badge)}</text>${title.map((line, index) => `<text x="88" y="${234 + index * 68}" font-size="48" font-weight="500" fill="#263549">${text(line)}</text>`).join('')}${subtitle.map((line, index) => `<text x="90" y="${title.length > 2 ? 446 + index * 30 : 404 + index * 30}" font-size="22" fill="#5e6f86">${text(line)}</text>`).join('')}<path d="M90 526h1020" stroke="#e5ebf2"/><text x="90" y="562" font-size="23" fill="#263549">${text(config.author)} · Research / Notes</text><text x="1090" y="562" text-anchor="end" font-size="20" fill="#5e6f86">${text(card.date || new URL(config.url).hostname)}</text></g></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function emptyFeed(config, kind) {
  const url = absolute('', config), path = kind === 'atom' ? 'atom.xml' : 'rss.xml';
  if (kind === 'atom') return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom" xml:lang="zh-CN"><id>${text(url)}</id><title>${text(config.title)}</title><subtitle>${text(config.description)}</subtitle><updated>${new Date().toISOString()}</updated><author><name>${text(config.author)}</name></author><link rel="self" href="${text(absolute(path, config))}" type="application/atom+xml"/><link rel="alternate" href="${text(url)}"/></feed>`;
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${text(config.title)}</title><link>${text(url)}</link><description>${text(config.description)}</description><language>zh-CN</language><atom:link href="${text(absolute(path, config))}" rel="self" type="application/rss+xml"/></channel></rss>`;
}

function sitemap(config, paths) {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(paths)].sort().map(path => `<url><loc>${text(absolute(path, config))}</loc></url>`).join('')}</urlset>`;
}

function indexable(page, path, model, topicValues, projectCount) {
  if (page.__post) return isFormal(page);
  if (path === '404.html' || /^(?:archives|categories|tags|page)(?:\/|$)/.test(path)) return false;
  if (page.research_topic) {
    const topic = topicValues.find(value => value.id === page.research_topic);
    return model.formal.some(post => post.categories.toArray().some(category => topic.categories.includes(category.name)));
  }
  if (page.research_collection === 'writing') return model.formal.length > 0;
  if (page.research_collection === 'series') return model.groups.some(group => group.posts.length >= 2);
  if (page.research_collection === 'series-detail') return model.groups.find(group => group.id === page.series_id)?.posts.length >= 2;
  if (path === 'projects/index.html') return projectCount > 0;
  return true;
}

function headMarkup(html, locals, model, profile, topicValues, projectCount, siteConfig = locals.config) {
  const { page, config, path } = locals;
  const url = absolute(path, config), image = absolute(cardInfo(siteConfig, page.__post ? page : null).path, config);
  const title = plain(page.title || html.match(/<title>([\s\S]*?)<\/title>/)?.[1] || config.title);
  const description = (page.__post ? summary(page) : plain(page.description || config.description)).slice(0, 180);
  const person = { '@type': 'Person', '@id': absolute('about/', config) + '#author', name: profile.author.name, url: absolute('about/', config), sameAs: [profile.author.github_url] };
  let schema = { '@context': 'https://schema.org', '@type': 'WebPage', url, name: title, description, inLanguage: 'zh-CN' };
  if (path === 'index.html') schema = { ...schema, '@type': 'WebSite', '@id': url + '#website', name: config.title, author: person };
  else if (path === 'about/index.html') schema = { ...schema, '@type': 'ProfilePage', mainEntity: person };
  else if (page.__post) schema = { ...schema, '@type': 'BlogPosting', headline: page.title, author: person, mainEntityOfPage: url, image: [image], datePublished: new Date(Number(page.date)).toISOString(), dateModified: new Date(Number(page.updated || page.date)).toISOString(), articleSection: labels[page.type || 'article'] };
  else if (page.research_collection || page.research_topic || path === 'projects/index.html') schema['@type'] = 'CollectionPage';
  const json = JSON.stringify(schema).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  html = html.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, '')
    .replace(/<meta\b[^>]*(?:property|name)=["'](?:og:(?:url|image(?::[^"']+)?|description)|twitter:(?:card|image|title|description)|robots)["'][^>]*>/gi, '');
  const head = `<link rel="canonical" href="${text(url)}"><meta property="og:url" content="${text(url)}"><meta property="og:description" content="${text(description)}"><meta property="og:image" content="${text(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${text(image)}"><meta name="twitter:title" content="${text(title)}"><meta name="twitter:description" content="${text(description)}"><link rel="alternate" type="application/atom+xml" title="${text(config.title)} · Atom" href="/atom.xml"><link rel="alternate" type="application/rss+xml" title="${text(config.title)} · RSS" href="/rss.xml">${indexable(page, path, model, topicValues, projectCount) ? '' : '<meta name="robots" content="noindex,follow">'}<script type="application/ld+json">${json}</script>`;
  return html.replace('</head>', head + '</head>');
}

module.exports = { publicPath, absolute, cardInfo, cardBuffer, emptyFeed, sitemap, indexable, headMarkup };
