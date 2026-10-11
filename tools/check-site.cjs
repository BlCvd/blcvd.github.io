'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');
const { unescapeHTML } = require('hexo-util');
const { root, load } = require('./profile.cjs');
const { topics, projectData } = require('./content.cjs');
const { publicPath } = require('./seo.cjs');
const publicDir = path.join(root, 'public');
const origin = new URL(load('profile.yml').site.url).origin;
const failures = [];
let references = 0;
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
function resolveReference(reference, source) {
  if (!reference || /^(?:data|javascript|mailto|tel):/i.test(reference)) return;
  const url = new URL(unescapeHTML(reference), origin + '/' + path.relative(publicDir, source).replaceAll('\\', '/'));
  if (url.origin !== origin) return;
  references++;
  const targetPath = path.join(publicDir, decodeURIComponent(url.pathname));
  const target = fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory() ? path.join(targetPath, 'index.html') : targetPath;
  if (!target.startsWith(publicDir + path.sep) && target !== publicDir) throw new Error('Reference outside public directory');
  if (!fs.existsSync(target)) { failures.push(`${path.relative(publicDir, source)} → missing ${url.pathname}`); return; }
  if (url.hash && target.endsWith('.html')) {
    const anchor = decodeURIComponent(url.hash.slice(1));
    const content = fs.readFileSync(target, 'utf8');
    const ids = [...content.matchAll(/\bid=["']([^"']+)["']/g)].map(match => unescapeHTML(match[1]));
    if (!ids.includes(anchor)) failures.push(`${path.relative(publicDir, source)} → missing anchor ${url.pathname}${url.hash}`);
  }
}
assert(fs.existsSync(publicDir), 'Run npm run build first');
const files = walk(publicDir);
const htmlFiles = files.filter(file => file.endsWith('.html'));
for (const file of files) {
  if (file.endsWith('.html')) {
    const content = fs.readFileSync(file, 'utf8');
    assert(!/katex-error/.test(content), `Invalid math in ${file}`);
    const canonical = [...content.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/g)];
    const route = path.relative(publicDir, file).replaceAll('\\', '/');
    assert.equal(canonical.length, 1, `Expected one canonical in ${route}`);
    const expectedUrl = new URL(publicPath(route), origin).href;
    assert.equal(unescapeHTML(canonical[0][1]), expectedUrl, `Incorrect canonical in ${route}`);
    const schema = JSON.parse(content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || 'null');
    assert(schema && schema.url === expectedUrl, `Incorrect JSON-LD in ${route}`);
    const image = content.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
    assert(image && unescapeHTML(image).endsWith('.png'), `PNG share image missing in ${route}`);
    resolveReference(image, file);
    const markup = content.replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, '<script$1></script>');
    for (const match of markup.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) resolveReference(match[1], file);
  } else if (file.endsWith('.css')) {
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) resolveReference(match[1], file);
  }
}
const researchTopics = topics(yaml.load(fs.readFileSync(path.join(root, 'source/_data/topics.yml'), 'utf8')));
for (const page of ['index.html', 'about/index.html', 'projects/index.html', 'writing/index.html', 'series/index.html', 'subscribe/index.html', '404.html', 'archives/index.html', 'categories/index.html', 'tags/index.html', ...researchTopics.map(topic => `topics/${topic.id}/index.html`)]) {
  assert(fs.existsSync(path.join(publicDir, page)), `Missing core page: ${page}`);
}
const search = JSON.parse(fs.readFileSync(path.join(publicDir, 'content.json'), 'utf8'));
assert(Array.isArray(search.posts) && Array.isArray(search.tags) && Array.isArray(search.categories));
const showcase = path.join(publicDir, 'posts/markdown-showcase/index.html');
if (fs.existsSync(showcase)) {
  const sample = fs.readFileSync(showcase, 'utf8');
  assert(sample.includes('class="katex"'), 'Sample math missing');
  assert(sample.includes('class="mermaid"'), 'Sample diagram missing');
  assert(sample.includes('class="highlight'), 'Sample code missing');
  assert(sample.includes('id="toc"'), 'Sample TOC missing');
  assert(sample.includes('reading-page') && sample.includes('article-author'), 'Reading layout or author missing');
  assert(sample.includes('article-brief') && sample.includes('article-resources'), 'Sample brief or references missing');
  assert(sample.includes('This is escaped example code') && sample.includes('&lt;') && !sample.includes('<script>alert('), 'Example HTML must remain escaped');
}
const home = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
assert(home.includes('research-intro') && home.includes('research-topics'), 'Home entry points must be present without JavaScript');
for (const topic of researchTopics) assert(home.includes(`href="/topics/${topic.id}/"`), 'Missing topic entry');
const projects = projectData(yaml.load(fs.readFileSync(path.join(root, 'source/_data/projects.yml'), 'utf8')));
const projectsHtml = fs.readFileSync(path.join(publicDir, 'projects/index.html'), 'utf8');
for (const group of projects.groups) assert(projectsHtml.includes(`id="project-group-${group.id}"`), 'Project group missing');
if (!projects.items.length) assert(projectsHtml.includes('目前尚未收录公开项目'), 'Empty projects must be clearly identified');
const contentChecks = require('./content-check.cjs').run();
const editorialChecks = require('./editorial-check.cjs').run();
for (const file of ['atom.xml', 'rss.xml', 'sitemap.xml', 'robots.txt']) assert(fs.existsSync(path.join(publicDir, file)), `Missing ${file}`);
const sitemapXml = fs.readFileSync(path.join(publicDir, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => unescapeHTML(match[1]));
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, 'Duplicate sitemap URL');
for (const url of sitemapUrls) {
  resolveReference(url, path.join(publicDir, 'index.html'));
  const target = path.join(publicDir, decodeURIComponent(new URL(url).pathname), 'index.html');
  const actual = fs.existsSync(target) ? target : path.join(publicDir, decodeURIComponent(new URL(url).pathname));
  assert(!fs.readFileSync(actual, 'utf8').includes('content="noindex,follow"'), `Sitemap includes noindex page: ${url}`);
}
for (const entry of search.posts) assert(!fs.readFileSync(path.join(publicDir, new URL(entry.link, origin).pathname, 'index.html'), 'utf8').includes('content="noindex,follow"'), 'Search includes a non-formal post');
const shareImages = files.filter(file => file.includes(path.join('img', 'share')) && file.endsWith('.png'));
for (const file of shareImages) {
  const data = fs.readFileSync(file);
  assert.equal(data.readUInt32BE(16), 1200);
  assert.equal(data.readUInt32BE(20), 630);
}
const workflow = yaml.load(fs.readFileSync(path.join(root, '.github/workflows/pages.yml'), 'utf8'));
assert.deepEqual(workflow.on.push.branches, ['main']);
assert.deepEqual(workflow.on.pull_request.branches, ['main']);
assert.equal(workflow.permissions.contents, 'read');
assert.equal(workflow.jobs.build.permissions?.contents || workflow.permissions.contents, 'read');
assert.equal(workflow.jobs.deploy.permissions.pages, 'write');
assert.equal(workflow.jobs.deploy.permissions['id-token'], 'write');
assert.equal(workflow.jobs.deploy.needs, 'build');
assert(workflow.jobs.build.steps.some(step => step.run === 'npm ci'));
assert(workflow.jobs.build.steps.some(step => step.run === 'npm run check'));
assert(workflow.jobs.build.steps.some(step => step.run === 'python tools/browser_ci.py'));
assert(workflow.jobs.build.steps.some(step => step.run === 'python tools/content-integration.py'));
assert(workflow.jobs.deploy.if.includes("github.event_name != 'pull_request'"));
if (failures.length) throw new Error(failures.join('\n'));
const report = { htmlPages: htmlFiles.length, localReferences: references, brokenReferences: failures.length, searchPosts: search.posts.length, categories: search.categories.length, tags: search.tags.length, researchTopics: researchTopics.length, contentChecks, editorialChecks, seo: 'canonical, JSON-LD and PNG cards passed', sitemapUrls: sitemapUrls.length, shareImages: shareImages.length, workflowStructure: 'passed' };
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports/site-check.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
