"""Meaningful smoke checks for the rendered blog. Requires Python Playwright."""
from pathlib import Path
import json
import os
import struct
import xml.etree.ElementTree as ET
from urllib.parse import quote, urlparse
from playwright.sync_api import sync_playwright

base = os.environ.get('BLOG_TEST_URL', 'http://127.0.0.1:4000').rstrip('/')
reports = Path(__file__).resolve().parents[1] / 'reports'
reports.mkdir(exist_ok=True)
results = []
routes = ['/', '/writing/', '/series/', '/subscribe/', '/posts/welcome/', '/posts/markdown-showcase/', '/about/', '/projects/', '/404.html', '/archives/', '/categories/', '/tags/', '/categories/博客与写作/', '/tags/Markdown/', '/topics/papers/', '/topics/ai/', '/topics/engineering/']

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
    search_data = context.request.get(base + '/content.json').json()
    formal_count = len(search_data['posts'])
    assert all('/posts/welcome/' not in entry['link'] and '/posts/markdown-showcase/' not in entry['link'] for entry in search_data['posts'])
    share_images = set()
    for route in routes:
        response = page.goto(base + route, wait_until='networkidle')
        assert response.status == 200, (route, response.status)
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), route
        canonical = page.locator('link[rel=canonical]')
        assert canonical.count() == 1, route
        canonical_url = canonical.get_attribute('href')
        assert urlparse(canonical_url).path == quote(route), (route, canonical_url)
        schema = json.loads(page.locator('script[type="application/ld+json"]').inner_text())
        assert schema['url'] == canonical_url, route
        assert page.locator('link[rel=alternate][type="application/atom+xml"]').count() == 1
        assert page.locator('link[rel=alternate][type="application/rss+xml"]').count() == 1
        share_images.add(page.locator('meta[property="og:image"]').get_attribute('content'))
        results.append({'page': route, 'status': response.status})
    canonical_origin = urlparse(canonical_url).scheme + '://' + urlparse(canonical_url).netloc
    for image_url in share_images:
        response = context.request.get(base + urlparse(image_url).path)
        assert response.status == 200
        image_bytes = response.body()
        assert image_bytes[:8] == b'\x89PNG\r\n\x1a\n'
        assert struct.unpack('>II', image_bytes[16:24]) == (1200, 630)
    atom = ET.fromstring(context.request.get(base + '/atom.xml').body())
    rss = ET.fromstring(context.request.get(base + '/rss.xml').body())
    atom_entries = atom.findall('{http://www.w3.org/2005/Atom}entry')
    rss_entries = rss.findall('./channel/item')
    assert len(atom_entries) == len(rss_entries) == min(50, formal_count)
    sitemap = ET.fromstring(context.request.get(base + '/sitemap.xml').body())
    sitemap_urls = [node.text for node in sitemap.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    assert len(sitemap_urls) == len(set(sitemap_urls))
    assert canonical_origin + '/' in sitemap_urls
    assert not any('/posts/welcome/' in url or '/posts/markdown-showcase/' in url for url in sitemap_urls)
    results.append({'formalPosts': formal_count, 'feedEntries': len(atom_entries), 'sitemapUrls': len(sitemap_urls), 'shareImages': len(share_images)})
    page.goto(base, wait_until='networkidle')
    page.screenshot(path=str(reports / 'desktop.png'), full_page=True)
    columns = page.locator('.columns > .column').evaluate_all('(els)=>els.filter(e=>e.getBoundingClientRect().width>0).map(e=>({x:e.getBoundingClientRect().x,width:e.getBoundingClientRect().width}))')
    assert all(column['width'] > 100 for column in columns), columns
    assert page.locator('.home-sections').is_visible()
    assert page.locator('.hero-links a').count() == 3
    assert page.locator('.research-intro').count() == 1
    assert page.locator('.topic-card').count() == 3
    page.locator('.topic-card').first.click()
    page.wait_for_url(base + '/topics/papers/')
    if page.locator('.collection-entry').count() == 0:
        assert page.locator('.collection-empty').is_visible()
    page.goto(base + '/projects/', wait_until='networkidle')
    assert page.locator('.project-group').count() == 3
    if page.locator('.project-entry').count() == 0:
        assert '目前尚未收录公开项目' in page.locator('.projects-notice').inner_text()
    page.screenshot(path=str(reports / 'projects.png'), full_page=True)
    page.goto(base + '/writing/', wait_until='networkidle')
    assert page.locator('.type-filters button').count() == 6
    assert page.locator('.writing-page > .writing-list > li').count() == formal_count
    page.locator('.type-filters button[data-kind=paper]').click()
    assert '?type=paper' in page.url
    assert page.locator('.type-filters button[data-kind=paper]').get_attribute('aria-pressed') == 'true'
    page.locator('.type-filters button[data-kind=all]').click()
    assert '?type=' not in page.url
    page.screenshot(path=str(reports / 'writing.png'), full_page=True)
    page.goto(base + '/subscribe/', wait_until='networkidle')
    assert page.locator('.feed-options a').count() == 2
    page.goto(base, wait_until='networkidle')
    page.locator('.navbar-item.search').click()
    input_box = page.locator('.searchbox-input')
    input_box.fill('关注')
    page.wait_for_timeout(350)
    assert page.locator('.searchbox-body a[href="/about/"]').count() > 0
    assert page.locator('.searchbox-body a[href="/posts/markdown-showcase/"]').count() == 0
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
    assert page.locator('#toc').count() == 1
    assert not page.locator('.column-left').count()
    assert page.locator('.article-brief').is_visible()
    assert page.locator('.article-author .author-name').inner_text() == 'BlCvd'
    assert page.locator('.article-resources a').first.get_attribute('href') == 'https://hexo.io/docs/'
    paragraph = page.locator('.article>.content>p').first
    assert float(paragraph.evaluate('(e)=>getComputedStyle(e).fontSize').replace('px', '')) == 18
    assert page.locator('.hljs-keyword').count() > 0
    page.locator('.copy-code').first.click()
    page.wait_for_timeout(150)
    clipboard = page.evaluate('navigator.clipboard.readText()')
    assert "const note = {" in clipboard and 'Research notes' in clipboard
    assert '复制代码' not in clipboard and not clipboard.startswith('1\n')
    page.evaluate('scrollTo({top: 0, behavior: "instant"})')
    page.wait_for_timeout(150)
    page.screenshot(path=str(reports / 'article.png'), full_page=True)
    page.set_viewport_size({'width': 1280, 'height': 900})
    width = paragraph.evaluate('(e)=>e.getBoundingClientRect().width')
    assert 700 <= width <= 780, width
    page.evaluate('scrollTo({top: 700, behavior: "instant"})')
    page.wait_for_timeout(150)
    sticky_top = page.locator('.column-right').evaluate('(e)=>e.getBoundingClientRect().top')
    assert 20 <= sticky_top <= 40, sticky_top
    page.locator('#toc a').filter(has_text='流程图').click()
    page.wait_for_function('Array.from(document.querySelectorAll("#toc a.is-active")).some(e=>e.textContent.includes("流程图"))')
    assert '#流程图' in page.url or '%E6%B5%81%E7%A8%8B%E5%9B%BE' in page.url
    assert page.locator('#toc a.is-active').filter(has_text='流程图').count() == 1
    page.set_viewport_size({'width': 1440, 'height': 1050})
    results.append({'readingWidthAt1280': width, 'readingFontSize': 18, 'stickyTocTop': sticky_top})
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
    for width in [320, 390, 768, 820, 1024]:
        page.set_viewport_size({'width': width, 'height': 844})
        for route in ['/', '/writing/', '/series/', '/subscribe/', '/posts/markdown-showcase/', '/categories/', '/about/', '/projects/', '/topics/papers/']:
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
    page.locator('#toc').wait_for(state='visible')
    assert page.locator('#toc').is_visible()
    page.wait_for_function('document.activeElement?.classList.contains("toc-close")')
    assert page.locator('.navbar-item.catalogue').get_attribute('aria-expanded') == 'true'
    page.keyboard.press('Escape')
    page.locator('#toc').wait_for(state='hidden')
    assert not page.locator('#toc').is_visible()
    assert page.locator('.navbar-item.catalogue').get_attribute('aria-expanded') == 'false'
    page.locator('.navbar-item.catalogue').click()
    page.locator('#toc').wait_for(state='visible')
    page.locator('#toc a').first.click()
    assert page.locator('#toc').evaluate('(e)=>!e.classList.contains("is-active")')
    assert not page.locator('html').evaluate('(e)=>e.classList.contains("toc-open")')
    page.set_viewport_size({'width': 820, 'height': 900})
    assert page.locator('.navbar-item.catalogue').is_visible()
    page.locator('.navbar-item.catalogue').click()
    page.locator('#toc').wait_for(state='visible')
    assert page.locator('#toc').is_visible()
    page.get_by_role('button', name='关闭文章目录').click()
    page.set_viewport_size({'width': 1280, 'height': 900})
    page.wait_for_function('document.querySelector("#toc")?.parentElement.classList.contains("column-right")')
    assert page.locator('#toc').is_visible()
    assert page.locator('#toc').count() == 1
    page.locator('.navbar-item.search').click()
    input_box.fill('welcome unlikely search text xyz')
    page.wait_for_timeout(300)
    page.keyboard.press('Escape')
    assert not errors, errors
    assert not failed_requests, failed_requests
    if base.startswith('http://127.0.0.1'):
        assert all(url.startswith(base) for url in network), 'Unnecessary remote resource requests'
    no_js = browser.new_context(viewport={'width': 1280, 'height': 900}, java_script_enabled=False)
    static_page = no_js.new_page()
    static_page.goto(base, wait_until='networkidle')
    assert static_page.locator('.research-intro').count() == 1
    assert static_page.locator('.topic-card').count() == 3
    static_page.locator('.topic-card').first.click()
    if static_page.locator('.collection-entry').count() == 0:
        assert static_page.locator('.collection-empty').is_visible()
    static_page.goto(base + '/writing/', wait_until='networkidle')
    assert not static_page.locator('.type-filters').is_visible()
    assert static_page.locator('.writing-page > .writing-list > li').count() == formal_count
    no_js.close()
    browser.close()

report = {'base': base, 'checks': results, 'topicNavigation': 'including without JavaScript passed', 'honestProjectEmptyState': 'passed', 'articleBriefAndReferences': 'passed', 'search': 'passed', 'clipboard': 'passed', 'katex': '4 expressions passed', 'mermaid': 'light/dark passed', 'toc': 'sticky desktop, mobile/tablet drawer, resize, Escape passed', 'darkPersistence': 'passed', 'backToTop': 'passed', 'javascriptErrors': errors, 'failedRequests': failed_requests}
(reports / 'browser-check.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
