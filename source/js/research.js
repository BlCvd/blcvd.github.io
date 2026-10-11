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
    // Own the drawer handlers; Icarus main.js has already attached its legacy toggles.
    window.jQuery?.('#toc, #toc-mask, .navbar-main .catalogue').off('click');
    const catalogue = document.querySelector('.navbar-main .catalogue');
    const mask = document.querySelector('#toc-mask') || document.body.appendChild(document.createElement('div'));
    mask.id = 'toc-mask';
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'toc-close'; close.textContent = '关闭';
    close.setAttribute('aria-label', '关闭文章目录');
    toc.querySelector('.menu-label')?.append(close);
    const compact = matchMedia(document.body.classList.contains('reading-page') ? '(max-width: 1023px)' : '(max-width: 768px)');
    catalogue?.setAttribute('role', 'button'); catalogue?.setAttribute('aria-controls', 'toc');
    catalogue?.setAttribute('aria-label', '打开文章目录'); catalogue?.setAttribute('aria-expanded', 'false');
    const setTocOpen = (open, restoreFocus = false) => {
      toc.classList.toggle('is-active', open); mask.classList.toggle('is-active', open);
      root.classList.toggle('toc-open', open);
      catalogue?.setAttribute('aria-expanded', String(open));
      if (compact.matches) toc.setAttribute('aria-hidden', String(!open));
      if (open) requestAnimationFrame(() => { if (toc.classList.contains('is-active')) close.focus(); });
      else if (restoreFocus) catalogue?.focus();
    };
    catalogue?.addEventListener('click', event => { event.preventDefault(); setTocOpen(!toc.classList.contains('is-active')); });
    catalogue?.addEventListener('keydown', event => { if (event.key === ' ') { event.preventDefault(); catalogue.click(); } });
    close.addEventListener('click', () => setTocOpen(false, true));
    mask.addEventListener('click', () => setTocOpen(false, true));
    const anchor = document.createComment('Desktop TOC position'); toc.before(anchor);
    const relocateToc = () => {
      setTocOpen(false);
      if (compact.matches) {
        document.body.append(toc); toc.setAttribute('aria-hidden', 'true');
        toc.setAttribute('role', 'dialog'); toc.setAttribute('aria-modal', 'true');
        toc.setAttribute('aria-label', '文章目录');
      } else {
        anchor.after(toc); toc.removeAttribute('aria-hidden'); toc.removeAttribute('aria-modal');
        toc.setAttribute('role', 'navigation'); toc.setAttribute('aria-label', '文章目录');
      }
    };
    relocateToc(); compact.addEventListener('change', relocateToc);
    const entries = [...toc.querySelectorAll('a[href^="#"]')].map(menu => ({
      menu, heading: document.getElementById(decodeURIComponent(menu.getAttribute('href').slice(1)))
    })).filter(entry => entry.heading);
    for (const { menu, heading } of entries) {
      heading.tabIndex = -1;
      menu.addEventListener('click', () => {
        if (compact.matches) setTocOpen(false);
        heading.focus({ preventScroll: true });
      });
    }
    let frame;
    const updateActive = () => {
      frame = undefined;
      const current = entries.filter(entry => entry.heading.getBoundingClientRect().top <= 120).at(-1) || entries[0];
      for (const entry of entries) {
        const active = entry === current; entry.menu.classList.toggle('is-active', active);
        if (active) entry.menu.setAttribute('aria-current', 'location');
        else entry.menu.removeAttribute('aria-current');
      }
    };
    addEventListener('scroll', () => { frame ||= requestAnimationFrame(updateActive); }, { passive: true });
    updateActive();
    document.addEventListener('keydown', event => {
      if (!compact.matches || !toc.classList.contains('is-active')) return;
      if (event.key === 'Escape') setTocOpen(false, true);
      if (event.key === 'Tab') {
        const items = [...toc.querySelectorAll('button,a[href]')].filter(item => item.getClientRects().length);
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }
  // Enhance the server-rendered list; without JavaScript all formal entries remain readable.
  const writing = document.querySelector('.writing-page');
  if (writing) {
    const filters = writing.querySelector('.type-filters');
    const entries = [...writing.querySelectorAll(':scope > .writing-list > .writing-entry')];
    const buttons = [...filters.querySelectorAll('button')];
    filters.hidden = false;
    const applyType = (kind, updateUrl = false) => {
      if (!buttons.some(button => button.dataset.kind === kind)) kind = 'all';
      for (const entry of entries) entry.hidden = kind !== 'all' && entry.dataset.kind !== kind;
      for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.kind === kind));
      const count = entries.filter(entry => !entry.hidden).length;
      writing.querySelector('.collection-count').textContent = `${count} 篇正式文章`;
      writing.querySelector('.writing-no-results').hidden = count > 0 || entries.length === 0;
      if (updateUrl) {
        const url = new URL(location.href);
        if (kind === 'all') url.searchParams.delete('type'); else url.searchParams.set('type', kind);
        history.replaceState(null, '', url);
      }
    };
    for (const button of buttons) button.addEventListener('click', () => applyType(button.dataset.kind, true));
    applyType(new URLSearchParams(location.search).get('type') || 'all');
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
