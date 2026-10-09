"""Meaningful smoke checks for the rendered blog. Requires Python Playwright."""
from pathlib import Path
import json
import os
from playwright.sync_api import sync_playwright

base = os.environ.get('BLOG_TEST_URL', 'http://127.0.0.1:4000').rstrip('/')
reports = Path(__file__).resolve().parents[1] / 'reports'
reports.mkdir(exist_ok=True)
results = []
routes = ['/', '/posts/welcome/', '/posts/markdown-showcase/', '/about/', '/projects/', '/404.html', '/archives/', '/categories/', '/tags/', '/categories/博客与写作/', '/tags/Markdown/']

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1050}, color_scheme='light', permissions=['clipboard-read', 'clipboard-write'])
    page = context.new_page()
    page.set_default_navigation_timeout(60000)
    errors = []
    failed_requests = []
    network = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('requestfailed', lambda request: failed_requests.append(request.url))
    page.on('request', lambda request: network.append(request.url))
    for route in routes:
        response = page.goto(base + route, wait_until='networkidle')
        assert response.status == 200, (route, response.status)
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), route
        results.append({'page': route, 'status': response.status})
    page.goto(base, wait_until='networkidle')
    page.screenshot(path=str(reports / 'desktop.png'), full_page=True)
    columns = page.locator('.columns > .column').evaluate_all('(els)=>els.map(e=>({x:e.getBoundingClientRect().x,width:e.getBoundingClientRect().width}))')
    assert all(column['width'] > 100 for column in columns), columns
    page.locator('.navbar-item.search').click()
    input_box = page.locator('.searchbox-input')
    input_box.fill('Markdown')
    page.wait_for_timeout(350)
    assert page.locator('.searchbox-body a[href="/posts/markdown-showcase/"]').count() > 0
    page.keyboard.press('Escape')
    assert not page.locator('.searchbox').evaluate('(e)=>e.classList.contains("show")')
    page.keyboard.press('Control+k')
    assert page.locator('.searchbox').evaluate('(e)=>e.classList.contains("show")')
    page.keyboard.press('Escape')
    page.goto(base + '/posts/markdown-showcase/', wait_until='networkidle')
    assert page.locator('.katex').count() == 4
    assert page.locator('.katex-error').count() == 0
    assert page.locator('.mermaid svg').count() == 1
    assert page.locator('#toc a').count() >= 5
    assert page.locator('.hljs-keyword').count() > 0
    page.locator('.copy-code').first.click()
    page.wait_for_timeout(150)
    clipboard = page.evaluate('navigator.clipboard.readText()')
    assert "const note = {" in clipboard and 'Research notes' in clipboard
    assert '复制代码' not in clipboard and not clipboard.startswith('1\n')
    page.screenshot(path=str(reports / 'article.png'), full_page=True)
    page.evaluate('scrollTo({top: document.body.scrollHeight, behavior: "instant"})')
    page.wait_for_function('scrollY > 400')
    page.wait_for_timeout(100)
    assert page.locator('#back-top').is_visible()
    page.locator('#back-top').click()
    page.wait_for_function('scrollY < 10')
    page.get_by_role('button', name='切换到深色模式').click()
    page.wait_for_timeout(400)
    assert page.locator('html').get_attribute('data-theme') == 'dark'
    assert page.locator('.mermaid svg').count() == 1
    contrast = page.locator('.article .content p').first.evaluate('''(node) => {
      const values = color => color.match(/\\d+(?:\\.\\d+)?/g).slice(0, 3).map(Number);
      const luminance = color => values(color).map(n => n / 255).map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4).reduce((s, n, i) => s + n * [0.2126, 0.7152, 0.0722][i], 0);
      const fg = luminance(getComputedStyle(node).color), bg = luminance(getComputedStyle(node.closest('.card')).backgroundColor);
      return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
    }''')
    assert contrast >= 4.5, contrast
    page.screenshot(path=str(reports / 'dark.png'), full_page=True)
    page.reload(wait_until='networkidle')
    assert page.locator('html').get_attribute('data-theme') == 'dark'
    page.get_by_role('button', name='切换到浅色模式').click()
    for width in [320, 390, 768, 1024]:
        page.set_viewport_size({'width': width, 'height': 844})
        for route in ['/', '/posts/markdown-showcase/', '/categories/', '/about/']:
            page.goto(base + route, wait_until='networkidle')
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), (route, width)
        results.append({'responsiveWidth': width, 'overflow': False})
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto(base, wait_until='networkidle')
    assert not page.locator('.column-left').is_visible()
    page.screenshot(path=str(reports / 'mobile-home.png'), full_page=True)
    page.goto(base + '/posts/markdown-showcase/', wait_until='networkidle')
    page.screenshot(path=str(reports / 'mobile-article.png'), full_page=True)
    page.locator('.navbar-item.catalogue').click()
    assert page.locator('#toc').evaluate('(e)=>e.classList.contains("is-active")')
    assert page.locator('#toc').is_visible()
    page.locator('#toc a').first.click()
    assert page.locator('#toc').evaluate('(e)=>!e.classList.contains("is-active")')
    page.locator('.navbar-item.search').click()
    input_box.fill('welcome unlikely search text xyz')
    page.wait_for_timeout(300)
    page.keyboard.press('Escape')
    assert not errors, errors
    assert not failed_requests, failed_requests
    if base.startswith('http://127.0.0.1'):
        assert all(url.startswith(base) for url in network), 'Unnecessary remote resource requests'
    browser.close()

report = {'base': base, 'checks': results, 'search': 'passed', 'clipboard': 'passed', 'katex': '4 expressions passed', 'mermaid': 'light/dark passed', 'toc': 'desktop/mobile passed', 'darkPersistence': 'passed', 'backToTop': 'passed', 'javascriptErrors': errors, 'failedRequests': failed_requests}
(reports / 'browser-check.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
