'use strict';

const texmath = require('markdown-it-texmath');
const katex = require('katex');
const MarkdownIt = require('markdown-it');
const { highlight, escapeHTML, slugize } = require('hexo-util');
const parser = new MarkdownIt(hexo.config.markdown.render);

parser.use(texmath, {
    engine: katex,
    delimiters: ['dollars', 'brackets'],
    katexOptions: { throwOnError: true, strict: 'warn', trust: false, output: 'htmlAndMathml' }
});
parser.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index];
    const language = token.info.trim().split(/\s+/)[0];
    if (language === 'mermaid') {
      return `<pre class="mermaid" aria-label="流程图">${escapeHTML(token.content)}</pre>`;
    }
    const caption = language ? `<span>${escapeHTML(language)}</span>` : '<span>code</span>';
    return highlight(token.content, {
      lang: language || undefined, autoDetect: false, gutter: true,
      wrap: true, hljs: true, caption
    });
};
parser.renderer.rules.heading_open = (tokens, index, options, env, renderer) => {
  const heading = tokens[index + 1];
  const text = heading.children?.map(token => token.content).join('') || heading.content;
  const base = slugize(text, { transform: 1 }) || 'section';
  env.headingIds ||= new Map();
  const count = (env.headingIds.get(base) || 0) + 1;
  env.headingIds.set(base, count);
  tokens[index].attrSet('id', count === 1 ? base : `${base}-${count}`);
  return renderer.renderToken(tokens, index, options);
};
function render(data, options = {}) {
  const env = { postPath: data.path };
  return options.inline ? parser.renderInline(data.text, env) : parser.render(data.text, env);
}
for (const extension of ['md', 'markdown', 'mkd', 'mkdn', 'mdwn', 'mdtxt', 'mdtext']) {
  hexo.extend.renderer.register(extension, 'html', render, true);
}
