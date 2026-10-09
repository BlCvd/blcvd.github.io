'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const yaml = require('js-yaml');
const root = path.resolve(__dirname, '..');
function load(name) { return yaml.load(fs.readFileSync(path.join(root, name), 'utf8')); }
function write(name, data) { fs.writeFileSync(path.join(root, name), yaml.dump(data, { lineWidth: -1, noRefs: true }), 'utf8'); }
function validate(profile) {
  if (!/^https:\/\//.test(profile.site.url)) throw new Error('site.url must use HTTPS');
  if (!/^[\w-]+$/.test(profile.author.github_username)) throw new Error('Invalid GitHub username');
  if (!profile.site.title || !profile.author.name) throw new Error('A title and author name are required');
}
function sync() {
  const profile = load('profile.yml'); validate(profile);
  const site = load('_config.yml');
  Object.assign(site, profile.site, { author: profile.author.name });
  write('_config.yml', site);
  const theme = load('_config.icarus.yml');
  Object.assign(theme.head.manifest, { name: profile.site.title });
  Object.assign(theme.widgets.find(w => w.type === 'profile'), {
    author: profile.author.name, author_title: profile.author.tagline,
    avatar: profile.author.avatar, follow_link: profile.author.github_url,
    social_links: { GitHub: { icon: 'fab fa-github', url: profile.author.github_url } }
  });
  theme.navbar.links.GitHub.url = profile.author.github_url;
  write('_config.icarus.yml', theme);
}
if (require.main === module) {
  const gh = fs.existsSync(path.join(root, 'tooling/gh/bin/gh.exe')) ? path.join(root, 'tooling/gh/bin/gh.exe') : 'gh';
  const account = JSON.parse(execFileSync(gh, ['api', 'user', '--jq', '{login: .login, avatar_url: .avatar_url, html_url: .html_url}'], { encoding: 'utf8' }));
  const profile = load('profile.yml');
  Object.assign(profile.author, { name: account.login, github_username: account.login, github_url: account.html_url, avatar: account.avatar_url });
  profile.site.url = `https://${account.login.toLowerCase()}.github.io`;
  write('profile.yml', profile); sync();
  console.log(`Public GitHub profile configured for ${account.login}`);
}
module.exports = { load, sync, root };
