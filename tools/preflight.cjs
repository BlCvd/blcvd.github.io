'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { load, root } = require('./profile.cjs');
const profile = load('profile.yml');
const review = process.argv.includes('--review');
if (!review && !profile.publication.approved) throw new Error('First public release is awaiting the owner’s explicit approval in profile.yml.');
const samples = [];
for (const name of fs.readdirSync(path.join(root, 'source/_posts')).filter(name => name.endsWith('.md'))) {
  const text = fs.readFileSync(path.join(root, 'source/_posts', name), 'utf8');
  const frontMatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const metadata = frontMatter ? require('js-yaml').load(frontMatter[1]) : {};
  if (metadata.demo) samples.push(name);
}
if (!review && samples.length && !profile.publication.examples_approved) throw new Error('Example posts require approval or removal before public release.');
const patterns = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /gh[pousr]_[A-Za-z0-9]{30,}/, /github_pat_[A-Za-z0-9_]{50,}/, /AKIA[0-9A-Z]{16}/];
const allowedDirs = ['source', 'scaffolds', 'scripts', 'tools', '.github'];
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['vendor', '_drafts'].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { scan(file); continue; }
    if (/^\.env(?:\.|$)|\.(?:pem|key|pfx)$/i.test(entry.name)) throw new Error(`Sensitive file in publishable source: ${file}`);
    if (/\.(?:md|js|cjs|json|yml|yaml|html|css|ps1)$/.test(file)) {
      const text = fs.readFileSync(file, 'utf8');
      if (patterns.some(pattern => pattern.test(text))) throw new Error(`Potential credential in publishable source: ${file}`);
    }
  }
}
for (const dir of allowedDirs) scan(path.join(root, dir));
const ignored = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
for (const entry of ['public/', 'node_modules/', '.env', 'source/_drafts/', 'tooling/']) {
  if (!ignored.split(/\r?\n/).includes(entry)) throw new Error(`Missing ignore rule: ${entry}`);
}
console.log(JSON.stringify({ repository: `${profile.author.github_username}/${profile.author.github_username.toLowerCase()}.github.io`, url: profile.site.url, publicProfile: { author: profile.author.name, github: profile.author.github_url, avatar: profile.author.avatar }, examplePosts: samples, approved: profile.publication.approved, examplesApproved: profile.publication.examples_approved, credentialScan: 'passed' }, null, 2));
