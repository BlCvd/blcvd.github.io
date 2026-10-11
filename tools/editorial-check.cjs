'use strict';

const assert = require('node:assert/strict');
const moment = require('moment');
const { edition, articleNavigation, postRows } = require('./editorial.cjs');
const { headMarkup, publicPath } = require('./seo.cjs');

function run() {
  const definitions = { items: [{ id: 'methods', title: '研究方法', description: '一个真实问题' }] };
  const post = (slug, values = {}) => ({ title: slug, slug, path: `posts/${slug}/index.html`, date: moment('2020-01-01'), updated: moment('2020-01-02'), published: true, type: 'paper', categories: { toArray: () => [] }, ...values });
  const first = post('first', { series: { id: 'methods', order: 1 }, related: ['second'] });
  const second = post('second', { series: { id: 'methods', order: 2 }, title: '<img src=x onerror=alert(1)>' });
  const candidates = [second, post('demo', { demo: true }), first, post('draft', { draft: true }), post('private', { published: false }), post('future', { date: moment().add(1, 'year'), updated: null })];
  const model = edition(candidates, definitions);
  assert.deepEqual(model.formal.map(post => post.slug), ['second', 'first']);
  assert.deepEqual(model.groups[0].posts.map(post => post.slug), ['first', 'second']);
  const navigation = articleNavigation(first, model);
  assert(navigation.includes('rel="next"') && !navigation.includes('rel="prev"'));
  assert(navigation.includes('aria-current="page"') && navigation.includes('相关笔记'));
  assert(!postRows([second]).includes('<img src=x'));
  assert.throws(() => edition([first, post('second', { series: { id: 'methods', order: 1 } })], definitions));
  assert.throws(() => edition([post('bad', { type: 'unknown' })], definitions));
  assert.throws(() => edition([post('bad', { series: { id: 'missing', order: 1 } })], definitions));
  assert.throws(() => edition([post('bad', { related: ['future'] }), candidates.at(-1)], definitions));
  assert.throws(() => edition([post('bad', { updated: moment('1999-01-01') })], definitions));
  const config = { url: 'https://blcvd.github.io', title: 'Research', description: 'Notes', subtitle: 'AI', author: 'BlCvd' };
  const profile = { author: { name: 'BlCvd', github_url: 'https://github.com/BlCvd' } };
  const dangerous = post('safe', { title: '</script><script>alert(1)</script>', __post: true });
  const html = headMarkup('<html><head><title>Article</title></head></html>', { page: dangerous, config, path: dangerous.path }, model, profile, [], 0);
  const schema = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(schema).headline, dangerous.title);
  assert(!schema.includes('</script>'));
  assert.equal(publicPath('index.html'), '/');
  assert.equal(publicPath('series/methods/index.html'), '/series/methods/');
  return { unifiedPublicationScope: 'passed', contentValidation: 'passed', seriesOrderAndNavigation: 'passed', htmlAndJsonEscaping: 'passed' };
}

if (require.main === module) console.log(JSON.stringify(run(), null, 2));
module.exports = { run };
