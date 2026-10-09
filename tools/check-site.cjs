'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');
const { root, load } = require('./profile.cjs');
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
  const url = new URL(reference.replace(/&amp;/g, '&'), origin + '/' + path.relative(publicDir, source).replaceAll('\\', '/'));
  if (url.origin !== origin) return;
  references++;
  const targetPath = path.join(publicDir, decodeURIComponent(url.pathname));
  const target = fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory() ? path.join(targetPath, 'index.html') : targetPath;
  if (!target.startsWith(publicDir + path.sep) && target !== publicDir) throw new Error('Reference outside public directory');
  if (!fs.existsSync(target)) { failures.push(`${path.relative(publicDir, source)} → missing ${url.pathname}`); return; }
  if (url.hash && target.endsWith('.html')) {
    const anchor = decodeURIComponent(url.hash.slice(1));
    const content = fs.readFileSync(target, 'utf8');
    const ids = [...content.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
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
    const markup = content.replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, '<script$1></script>');
    for (const match of markup.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) resolveReference(match[1], file);
  } else if (file.endsWith('.css')) {
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) resolveReference(match[1], file);
  }
}
for (const page of ['index.html', 'about/index.html', 'projects/index.html', '404.html', 'archives/index.html', 'categories/index.html', 'tags/index.html']) {
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
  assert(sample.includes('This is escaped example code') && sample.includes('&lt;') && !sample.includes('<script>alert('), 'Example HTML must remain escaped');
}
const workflow = yaml.load(fs.readFileSync(path.join(root, '.github/workflows/pages.yml'), 'utf8'));
assert.deepEqual(workflow.on.push.branches, ['main']);
assert.equal(workflow.permissions.contents, 'read');
assert.equal(workflow.jobs.build.permissions?.contents || workflow.permissions.contents, 'read');
assert.equal(workflow.jobs.deploy.permissions.pages, 'write');
assert.equal(workflow.jobs.deploy.permissions['id-token'], 'write');
assert.equal(workflow.jobs.deploy.needs, 'build');
assert(workflow.jobs.build.steps.some(step => step.run === 'npm ci'));
assert(workflow.jobs.build.steps.some(step => step.run === 'npm run check'));
if (failures.length) throw new Error(failures.join('\n'));
const report = { htmlPages: htmlFiles.length, localReferences: references, brokenReferences: failures.length, searchPosts: search.posts.length, categories: search.categories.length, tags: search.tags.length, workflowStructure: 'passed' };
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports/site-check.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
