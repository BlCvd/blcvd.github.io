'use strict';

const assert = require('node:assert/strict');
const { unescapeHTML } = require('hexo-util');
const { postsFor, topics, projectData, projectPage, articleBrief, articleEnding } = require('./content.cjs');

function run() {
  const topic = topics([{ id: 'papers', title: '论文阅读', description: '', categories: ['论文阅读'] }])[0];
  const post = (overrides = {}) => ({ date: new Date('2020-01-01'), published: true, categories: { toArray: () => [{ name: '论文阅读' }] }, ...overrides });
  const real = post({ title: '真实笔记' });
  const candidates = [real, post({ demo: true }), post({ published: false }), post({ date: new Date(Date.now() + 86400000) }), post({ categories: { toArray: () => [{ name: '博客与写作' }] } })];
  assert.deepEqual(postsFor(candidates, topic), [real], 'Topics must exclude examples, drafts, future and unrelated posts');
  assert.throws(() => topics([topic, topic]), 'Duplicate topic routes must fail');
  const data = {
    intro: '项目列表', groups: [{ id: 'research', title: '研究工具', description: '' }],
    items: [{ id: 'tool', group: 'research', name: '<img src=x onerror=alert(1)>', summary: '实际问题', role: '开发者', status: '进行中', technologies: ['Python'], links: { article: '/posts/welcome/' }, evidence: '本地验证' }]
  };
  const html = projectPage(projectData(data));
  assert(html.includes('&lt;img') && !html.includes('<img src=x'), 'Project fields must remain text');
  const links = [...html.matchAll(/href="([^"]+)"/g)].map(match => unescapeHTML(match[1]));
  assert(html.includes('我的角色') && html.includes('验证与成果') && links.includes('/posts/welcome/'), 'Real project metadata and links must render');
  assert.throws(() => projectData({ ...data, items: [{ ...data.items[0], group: 'unknown' }] }), 'Unknown groups must fail');
  const profile = { author: { name: 'BlCvd', avatar: '/img/github-avatar.png', tagline: 'Research', github_url: 'https://github.com/BlCvd' } };
  for (const url of ['javascript:alert(1)', '//example.invalid/', 'https://user:password@example.invalid/', '/bad\\path']) {
    assert.throws(() => articleEnding({ references: [{ title: 'source', url }] }, profile), `Unsafe resource link must fail: ${url}`);
  }
  assert.equal(articleBrief({ research: { question: null, takeaway: null, prerequisites: [] } }), '', 'Empty template fields must not create an empty brief');
  return { topicPublicationRules: 'passed', projectFieldsAndEscaping: 'passed', publicLinks: 'passed', optionalArticleFields: 'passed' };
}

if (require.main === module) console.log(JSON.stringify(run(), null, 2));
module.exports = { run };
