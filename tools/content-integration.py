"""Verify actual Hexo content, then restore sources and rebuild before publication."""
from pathlib import Path
import json
import subprocess
import xml.etree.ElementTree as ET
from browser_ci import ROOT, serve
from playwright.sync_api import sync_playwright

REPORTS = ROOT / 'reports'
SERIES = ROOT / 'source/_data/series.yml'
SLUGS = ['local-verification-first', 'local-verification-second']
FILES = {
    ROOT / f'source/_posts/{SLUGS[0]}.md': '''---
title: LOCALVERIFY 论文阅读
date: 2020-01-01 09:00:00
updated: 2020-01-03 09:00:00
slug: local-verification-first
type: paper
categories: [论文阅读]
tags: [LOCALVERIFY]
description: 用临时内容检查系列与正式订阅。
featured: true
series: {id: local-verification, order: 1}
related: [local-verification-second]
research: {question: 如何检查阅读路径？, takeaway: 按显式顺序阅读。}
references: [{title: Hexo 文档, url: 'https://hexo.io/docs/'}]
---
临时文章，只在自动验收期间存在。

## 核心结论
这是第一篇。
''',
    ROOT / f'source/_posts/{SLUGS[1]}.md': '''---
title: LOCALVERIFY 实验复现
date: 2020-01-02 09:00:00
updated: 2020-01-02 09:00:00
slug: local-verification-second
type: experiment
categories: [科研记录]
tags: [LOCALVERIFY]
description: 用临时内容检查筛选与前后篇导航。
series: {id: local-verification, order: 2}
---
临时文章，只在自动验收期间存在。

## 复现记录
这是第二篇。
''',
    ROOT / 'source/_posts/local-verification-future.md': '''---
title: LOCALVERIFY_FUTURE
date: 2099-01-01 09:00:00
slug: local-verification-future
type: note
---
不应在公开构建中出现。
''',
    ROOT / 'source/_posts/local-verification-private.md': '''---
title: LOCALVERIFY_PRIVATE
date: 2020-01-01 09:00:00
slug: local-verification-private
published: false
type: note
---
不应在公开构建中出现。
''',
    ROOT / 'source/_drafts/local-verification-draft.md': '''---
title: LOCALVERIFY_DRAFT
date: 2020-01-01 09:00:00
slug: local-verification-draft
type: note
---
不应在公开构建中出现。
''',
}


def build(label: str) -> None:
    log = REPORTS / f'integration-{label}.log'
    command = ['node', 'node_modules/hexo/bin/hexo', 'clean']
    with log.open('w', encoding='utf-8') as output:
        subprocess.run(command, cwd=ROOT, stdout=output, stderr=subprocess.STDOUT, check=True, timeout=120)
        subprocess.run(['node', 'node_modules/hexo/bin/hexo', 'generate'], cwd=ROOT, stdout=output, stderr=subprocess.STDOUT, check=True, timeout=180)


def verify() -> dict:
    public = ROOT / 'public'
    for file in public.rglob('*'):
        if file.suffix in ['.html', '.json', '.xml']:
            rendered = file.read_text(encoding='utf-8')
            assert not any(marker in rendered for marker in ['LOCALVERIFY_FUTURE', 'LOCALVERIFY_PRIVATE', 'LOCALVERIFY_DRAFT']), file
    search = json.loads((public / 'content.json').read_text(encoding='utf-8'))
    baseline_posts = [entry for entry in search['posts'] if not any(slug in entry['link'] for slug in SLUGS)]
    assert len(search['posts']) == len(baseline_posts) + 2
    assert all(any(slug in entry['link'] for entry in search['posts']) for slug in SLUGS)
    atom = ET.parse(public / 'atom.xml').getroot()
    rss = ET.parse(public / 'rss.xml').getroot()
    atom_links = [item.attrib['href'] for item in atom.findall('{http://www.w3.org/2005/Atom}entry/{http://www.w3.org/2005/Atom}link')]
    rss_links = [item.text for item in rss.findall('./channel/item/link')]
    if len(search['posts']) <= 50:
        assert len(atom_links) == len(rss_links) == len(search['posts'])
        assert all(any(slug in link for link in atom_links) and any(slug in link for link in rss_links) for slug in SLUGS)
    sitemap = ET.parse(public / 'sitemap.xml').getroot()
    sitemap_urls = [node.text for node in sitemap.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    assert all(any(slug in url for url in sitemap_urls) for slug in SLUGS)
    assert any('/series/local-verification/' in url for url in sitemap_urls)
    assert not any('/posts/welcome/' in url or '/posts/markdown-showcase/' in url for url in sitemap_urls)
    with serve() as base, sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(base + '/writing/?type=paper', wait_until='networkidle')
        first = page.locator('.writing-page > .writing-list > li[data-slug="' + SLUGS[0] + '"]')
        second = page.locator('.writing-page > .writing-list > li[data-slug="' + SLUGS[1] + '"]')
        assert first.is_visible() and not second.is_visible()
        page.locator('.type-filters button[data-kind=experiment]').click()
        assert second.is_visible() and not first.is_visible()
        assert '?type=experiment' in page.url
        page.locator('.type-filters button[data-kind=all]').click()
        assert first.is_visible() and second.is_visible()
        page.screenshot(path=str(REPORTS / 'integration-writing.png'), full_page=True)
        page.goto(base + '/series/', wait_until='networkidle')
        page.locator('.series-card h2 a[href="/series/local-verification/"]').click()
        entries = page.locator('.series-detail .writing-entry').evaluate_all('(els)=>els.map(e=>e.dataset.slug)')
        assert entries == SLUGS
        assert 'Markdown' in page.locator('.series-prerequisites').inner_text()
        page.screenshot(path=str(REPORTS / 'integration-series.png'), full_page=True)
        page.locator('.series-detail .writing-entry h2 a').first.click()
        assert page.locator('.article-series a[aria-current=page]').count() == 1
        related_href = page.locator('.article-related a').get_attribute('href')
        assert related_href in [f'/posts/{SLUGS[1]}/', f'/posts/{SLUGS[1]}/index.html']
        schema = json.loads(page.locator('script[type="application/ld+json"]').inner_text())
        assert schema['@type'] == 'BlogPosting'
        assert schema['dateModified'] > schema['datePublished']
        assert page.locator('meta[name=robots]').count() == 0
        page.locator('.article-series a[rel=next]').click()
        assert SLUGS[1] in page.url
        page.locator('.article-series a[rel=prev]').click()
        assert SLUGS[0] in page.url
        page.goto(base, wait_until='networkidle')
        assert page.locator('.home-records .writing-list').first.locator('li[data-slug="' + SLUGS[0] + '"]').count() == 1
        page.locator('.navbar-item.search').click()
        page.locator('.searchbox-input').fill('LOCALVERIFY')
        page.wait_for_timeout(350)
        assert page.locator('.searchbox-body a').filter(has_text='LOCALVERIFY').count() >= 2
        assert not errors, errors
        browser.close()
    return {'formalFixturePosts': 2, 'types': 'paper / experiment', 'series': 'order, current article, previous / next and prerequisites passed', 'related': 'passed', 'feeds': 'Atom and RSS XML parsed', 'searchAndFilters': 'passed', 'futurePrivateDraft': 'absent from generated pages, search and feeds', 'sitemapAndStructuredData': 'passed'}


def main() -> None:
    REPORTS.mkdir(exist_ok=True)
    original_series = SERIES.read_bytes()
    assert not any(file.exists() for file in FILES), 'A fixture filename already exists; refusing to overwrite it'
    # JSON is valid YAML; preserve existing series by reading it with the project's YAML parser.
    current = json.loads(subprocess.check_output(['node', '-e', "process.stdout.write(JSON.stringify(require('./tools/profile.cjs').load('source/_data/series.yml')))"], cwd=ROOT, text=True, encoding='utf-8'))
    assert not any(item['id'] == 'local-verification' for item in current['items'])
    current['items'].append({'id': 'local-verification', 'title': 'LOCALVERIFY 阅读路径', 'description': '临时自动验收系列。', 'prerequisites': ['Markdown']})
    report = {}
    try:
        for file, content in FILES.items():
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text(content, encoding='utf-8')
        SERIES.write_text(json.dumps(current, ensure_ascii=False), encoding='utf-8')
        build('fixtures')
        report = verify()
    finally:
        SERIES.write_bytes(original_series)
        for file in FILES:
            if file.exists():
                file.unlink()
        build('restored')
        assert SERIES.read_bytes() == original_series
        assert not any(file.exists() for file in FILES)
        assert not any('local-verification' in str(file) for file in (ROOT / 'public').rglob('*'))
        subprocess.run(['node', 'tools/check-site.cjs'], cwd=ROOT, check=True, timeout=60)
    report['productionSourcesAndBuildRestored'] = True
    (REPORTS / 'content-integration.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
