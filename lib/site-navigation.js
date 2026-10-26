'use strict';

const HEADER_ASSET_VERSION = '20261026a';
const HEADER_FONT_URL = 'https://fonts.googleapis.com/css2?family=VT323&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=JetBrains+Mono:wght@400;500;700&display=swap';
const NAVIGATION = [
  { href: 'index.html#contents', label: '课程目录', priority: true },
  { href: 'catalog.html', label: '课程表', priority: true },
  { href: 'prereqs.html', label: '路线图' },
  { href: 'learning-paths.html', label: '学习路径', priority: true },
  { href: 'certifications.html', label: '认证' },
  { href: 'projects.html', label: '实战项目' },
  { href: 'manuals.html', label: '技术手册' },
  { href: 'glossary.html', label: '术语表' },
  { href: 'cheatsheets', label: '速查表' },
  { href: 'practice', label: '编程练习' },
  { href: 'how-to-learn.html', label: '学习方法' },
  { href: 'skills.html', label: 'Agent 技能' },
  { href: 'inside-an-ai-agent.html', label: 'Agent 内部机制' },
  { href: 'highlights.html', label: '我的高亮' },
  { href: 'about.html', label: '关于' },
];

const GITHUB_LINK = '<a href="https://github.com/fancyboi999/ai-engineering-from-scratch-zh" target="_blank" rel="noopener" class="header-github" aria-label="在 GitHub 查看 AI Engineering from Scratch 中文版">'
  + '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>'
  + '<svg class="star-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 19.896l-7.416 3.517 1.48-8.279L0 9.306l8.332-1.151z"/></svg>'
  + '<span class="star-count" data-loading="true" aria-label="GitHub Star 数">…</span></a>';

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function routeKey(href) {
  return String(href || '').split(/[?#]/)[0].split('/').pop().replace(/\.html$/, '');
}

function renderNavigation(base = '', active = '') {
  const links = NAVIGATION.map(item => '<a href="' + escapeAttribute(base + item.href) + '" data-header-page="' + routeKey(item.href) + '"'
    + (item.priority ? ' data-header-priority' : '')
    + (active && routeKey(item.href) === routeKey(active) ? ' aria-current="page"' : '')
    + '>' + item.label + '</a>');
  return '<!-- Shared navigation: lib/site-navigation.js -->\n'
    + links.join('\n') + '\n' + GITHUB_LINK;
}

// The complete shell is shared; page scripts may still own their theme handler.
function renderHeader({ base = '', active = '', themeOwner = 'page', narration = 'auto' } = {}) {
  return `<header class="site-header" data-header-theme-owner="${escapeAttribute(themeOwner)}" data-header-narration="${escapeAttribute(narration)}">
  <div class="header-inner">
    <a href="${escapeAttribute(base + 'index.html')}" class="logo"><span class="logo-icon" aria-hidden="true"></span><span class="logo-label">AI / FROM SCRATCH</span></a>
    <nav class="header-nav" aria-label="主导航">${renderNavigation(base, active)}</nav>
    <button class="search-toggle" type="button" data-cmd-palette aria-label="搜索（⌘K）" title="搜索（⌘K）"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button><!--header-tools-->
    <span class="header-narration-slot"></span>
    <button class="theme-toggle" id="themeToggle" aria-label="切换主题" type="button"><span class="theme-icon" id="themeIcon">N</span></button>
  </div>
</header>`;
}

function normalizeHeaderNavigation(html) {
  if (!/<header\b[^>]*\bclass=["'][^"']*\bsite-header\b/.test(html)) return html;
  if (!/<link\b[^>]*href=["']https:\/\/fonts\.googleapis\.com\/css2[^"']*family=VT323/.test(html)) {
    html = html.replace('</head>', '<link rel="stylesheet" href="' + HEADER_FONT_URL + '">\n</head>');
  }
  const script = html.match(/<script\b[^>]*\bsrc=["']([^"']*?)header\.js(?:\?[^"']*)?["']/);
  const style = html.match(/<link\b[^>]*\bhref=["']([^"']*?)style\.css(?:\?[^"']*)?["']/);
  const base = script ? script[1] : style ? style[1] : '';
  if (!script) {
    html = html.replace('</body>', '<script src="' + escapeAttribute(base + 'header.js?v=' + HEADER_ASSET_VERSION) + '" defer></script>\n</body>');
  }
  const normalized = html.replace(/<header\b[^>]*\bclass=["'][^"']*\bsite-header\b[^"']*["'][^>]*>[\s\S]*?<\/header>/g, shell => {
    const current = shell.match(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*\baria-current=["']page["'][^>]*>/);
    const owner = shell.match(/data-header-theme-owner="([^"]+)"/);
    const narration = shell.match(/data-header-narration="([^"]+)"/);
    const hadTheme = /id=["']themeToggle["']/.test(shell);
    return renderHeader({ base, active: current ? current[1] : '',
      themeOwner: owner ? owner[1] : hadTheme ? 'page' : 'header',
      narration: narration ? narration[1] : hadTheme ? 'auto' : 'off' });
  });
  if (/data-header-theme-owner="header"/.test(normalized) && !normalized.includes('id="header-theme-bootstrap"')) {
    return normalized.replace('<head>', '<head>\n<script id="header-theme-bootstrap">(function(){var s="";try{s=localStorage.getItem("theme")||"";}catch(_){}document.documentElement.setAttribute("data-theme",s||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"));})();</script>');
  }
  return normalized;
}

module.exports = { HEADER_ASSET_VERSION, NAVIGATION, renderNavigation, renderHeader, normalizeHeaderNavigation };
