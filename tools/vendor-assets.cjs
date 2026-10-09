'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { root, sync } = require('./profile.cjs');
sync();
function copy(from, to) {
  const target = path.join(root, 'source', to);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, 'node_modules', from), target);
}
copy('jquery/dist/jquery.min.js', 'vendor/jquery/dist/jquery.min.js');
copy('moment/min/moment-with-locales.min.js', 'vendor/moment/min/moment-with-locales.min.js');
copy('highlight.js/styles/atom-one-light.css', 'vendor/highlight.js/styles/atom-one-light.css');
copy('@fortawesome/fontawesome-free/css/all.min.css', 'vendor/fontawesome/css/all.min.css');
for (const name of fs.readdirSync(path.join(root, 'node_modules/@fortawesome/fontawesome-free/webfonts')).filter(n => n.endsWith('.woff2'))) {
  copy(`@fortawesome/fontawesome-free/webfonts/${name}`, `vendor/fontawesome/webfonts/${name}`);
}
copy('katex/dist/katex.min.css', 'vendor/katex/katex.min.css');
for (const name of fs.readdirSync(path.join(root, 'node_modules/katex/dist/fonts'))) {
  copy(`katex/dist/fonts/${name}`, `vendor/katex/fonts/${name}`);
}
copy('mermaid/dist/mermaid.min.js', 'vendor/mermaid/mermaid.min.js');
for (const weight of [400, 500, 700]) {
  copy(`@fontsource/ubuntu/files/ubuntu-latin-${weight}-normal.woff2`, `vendor/fonts/ubuntu-${weight}.woff2`);
}
copy('@fontsource/source-code-pro/files/source-code-pro-latin-400-normal.woff2', 'vendor/fonts/source-code-pro-400.woff2');
const packages = ['jquery', 'moment', 'highlight.js', '@fortawesome/fontawesome-free', 'katex', 'mermaid', '@fontsource/ubuntu', '@fontsource/source-code-pro'];
for (const pkg of packages) {
  const dir = path.join(root, 'node_modules', pkg);
  const file = fs.readdirSync(dir).find(n => /^licen[cs]e(?:\.|$)/i.test(n));
  const licenseName = pkg.replace(/[^\w-]/g, '_').replace(/^_+/, '');
  if (file) copy(`${pkg}/${file}`, `vendor/licenses/${licenseName}.txt`);
  if (pkg.startsWith('@fontsource/')) {
    const ofl = fs.readdirSync(dir).find(n => /^OFL(?:\.|$)/i.test(n));
    if (ofl) copy(`${pkg}/${ofl}`, `vendor/licenses/${licenseName}-OFL.txt`);
  }
}
console.log('Profile synchronized; local vendor assets prepared.');
