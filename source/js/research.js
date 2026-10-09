'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const navbar = document.querySelector('.navbar-end');
  const themeButton = document.createElement('button');
  themeButton.type = 'button'; themeButton.className = 'theme-toggle';
  const updateButton = () => {
    const dark = root.dataset.theme === 'dark';
    themeButton.innerHTML = `<span aria-hidden="true">${dark ? '☀' : '☾'}</span>`;
    themeButton.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
    themeButton.title = dark ? '浅色模式' : '深色模式';
    themeButton.setAttribute('aria-pressed', String(dark));
  };
  updateButton(); navbar?.append(themeButton);
  themeButton.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('research-theme', root.dataset.theme); } catch { /* Storage may be unavailable. */ }
    updateButton(); renderDiagrams();
  });
  document.querySelectorAll('.article-meta time').forEach(time => { time.textContent = time.dateTime.slice(0, 10); });
  if (location.pathname === '/') {
    const intro = document.createElement('header'); intro.className = 'research-intro';
    const description = document.querySelector('meta[name="description"]')?.content || '记录人工智能学习、科研探索与工程实践。';
    intro.innerHTML = '<div class="eyebrow">AI · RESEARCH · ENGINEERING</div><div class="intro-line"></div><h1>记录每一次理解与构建。</h1>';
    intro.querySelector('.eyebrow').textContent = document.querySelector('meta[name="research-subtitle"]')?.content || 'AI · Research · Engineering';
    const text = document.createElement('p'); text.textContent = description; intro.append(text);
    document.querySelector('.column-main')?.prepend(intro);
  }
  document.querySelectorAll('figure.highlight').forEach(figure => {
    let caption = figure.querySelector('figcaption');
    if (!caption) { caption = document.createElement('figcaption'); figure.prepend(caption); }
    const button = document.createElement('button'); button.type = 'button'; button.className = 'copy-code';
    button.textContent = '复制代码'; button.setAttribute('aria-label', '复制代码'); caption.append(button);
    button.addEventListener('click', async () => {
      const code = Array.from(figure.querySelectorAll('td.code .line')).map(line => line.textContent).join('\n');
      try {
        await navigator.clipboard.writeText(code || figure.querySelector('td.code')?.textContent || '');
        button.textContent = '已复制';
      } catch { button.textContent = '请手动选中复制'; }
      setTimeout(() => { button.textContent = '复制代码'; }, 2000);
    });
  });
  document.querySelectorAll('.article .content > table').forEach(table => {
    const wrapper = document.createElement('div'); wrapper.className = 'table-overflow'; table.before(wrapper); wrapper.append(table);
  });
  const backTop = document.querySelector('#back-top');
  const updateScroll = () => { backTop.hidden = scrollY < 400; };
  addEventListener('scroll', updateScroll, { passive: true }); updateScroll();
  backTop.addEventListener('click', () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
  const toc = document.querySelector('#toc');
  if (toc) {
    const anchor = document.createComment('Desktop TOC position'); toc.before(anchor);
    const relocateToc = () => {
      if (matchMedia('(max-width: 768px)').matches) document.body.append(toc);
      else { anchor.after(toc); toc.classList.remove('is-active'); document.querySelector('#toc-mask')?.classList.remove('is-active'); }
    };
    relocateToc(); addEventListener('resize', relocateToc, { passive: true });
  }
  // Improve stock Insight dialog keyboard navigation without changing its index format.
  const searchbox = document.querySelector('.searchbox');
  if (searchbox) {
    searchbox.setAttribute('role', 'dialog'); searchbox.setAttribute('aria-modal', 'true'); searchbox.setAttribute('aria-label', '搜索文章');
    const input = searchbox.querySelector('input'); input.setAttribute('aria-label', '搜索关键词');
    const searchLink = document.querySelector('.navbar-item.search'); searchLink?.setAttribute('aria-label', '搜索文章');
    searchLink?.addEventListener('click', () => setTimeout(() => input.focus(), 50));
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchLink?.click(); }
      if (event.key === 'Escape' && searchbox.classList.contains('show')) {
        searchbox.classList.remove('show');
        document.querySelector('.navbar-logo')?.focus();
      }
      if (event.key === 'Tab' && searchbox.classList.contains('show')) {
        const items = [...searchbox.querySelectorAll('input,a[href],button')].filter(e => e.getClientRects().length);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }
  const diagrams = [...document.querySelectorAll('pre.mermaid')];
  diagrams.forEach(node => { node.dataset.source = node.textContent; });
  let mermaidLoading;
  async function renderDiagrams() {
    if (!diagrams.length) return;
    try {
      if (!window.mermaid) {
        mermaidLoading ||= new Promise((resolve, reject) => {
          const script = document.createElement('script'); script.src = '/vendor/mermaid/mermaid.min.js';
          script.onload = resolve; script.onerror = reject; document.head.append(script);
        });
        await mermaidLoading;
      }
      window.mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: root.dataset.theme === 'dark' ? 'dark' : 'default', fontFamily: 'Ubuntu, Microsoft YaHei, sans-serif' });
      for (const node of diagrams) { node.removeAttribute('data-processed'); node.textContent = node.dataset.source; }
      await window.mermaid.run({ nodes: diagrams });
    } catch { for (const node of diagrams) { node.textContent = node.dataset.source; node.setAttribute('aria-label', '流程图源码：渲染失败'); } }
  }
  renderDiagrams();
});
