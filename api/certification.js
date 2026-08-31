const fs = require('fs');
const path = require('path');

const ORIGIN = 'https://aieng-zh.cn';
const SEO_START = '<!-- AIFS:CERTIFICATION-SEO:START -->';
const SEO_END = '<!-- AIFS:CERTIFICATION-SEO:END -->';
const FALLBACK_START = '<!-- AIFS:CERTIFICATION-FALLBACK:START -->';
const FALLBACK_END = '<!-- AIFS:CERTIFICATION-FALLBACK:END -->';
const CERTIFICATION_QUERY_NAMES = new Set(['id', 'track', 'legacy']);

let productionAssets;

function loadProductionAssets() {
  if (!productionAssets) {
    productionAssets = {
      template: fs.readFileSync(path.join(__dirname, '..', 'site', 'certification.html'), 'utf8'),
      manifest: JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'site', 'certification-seo.json'), 'utf8')),
    };
  }
  return productionAssets;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonForHtml(value) {
  return JSON.stringify(value)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
}

function queryValue(req, name) {
  const direct = req.query && req.query[name];
  if (Array.isArray(direct)) return '';
  if (typeof direct === 'string') return direct;
  try {
    return new URL(req.url || '/', 'http://localhost').searchParams.get(name) || '';
  } catch (_) {
    return '';
  }
}

function queryNames(req) {
  const names = new Set();
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach(function (name) { names.add(name); });
  }
  try {
    new URL(req.url || '/', 'http://localhost').searchParams.forEach(function (_, name) {
      names.add(name);
    });
  } catch (_) {}
  return names;
}

function hasUnknownQuery(req) {
  return Array.from(queryNames(req)).some(function (name) {
    return !CERTIFICATION_QUERY_NAMES.has(name);
  });
}

function validTrackId(value) {
  if (!value || value.includes('..') || value.includes('\\') || value.includes('\0')) return false;
  return /^[a-z0-9][a-z0-9._-]*$/i.test(value);
}

function trackAliases(entry) {
  if (!entry || typeof entry !== 'object') return [];
  const aliases = [entry.id, entry.slug, entry.examCode];
  if (typeof entry.id === 'string' && entry.id.startsWith('claude-')) {
    aliases.push(entry.id.slice('claude-'.length));
  }
  return aliases.filter(Boolean).map(function (value) { return String(value).toLowerCase(); });
}

function resolveTrack(tracks, requestedId) {
  if (!tracks || typeof tracks !== 'object' || !validTrackId(requestedId)) return null;
  const normalized = requestedId.toLowerCase();
  return Object.values(tracks).find(function (entry) {
    return trackAliases(entry).includes(normalized);
  }) || null;
}

function canonicalForTrack(trackId) {
  return `${ORIGIN}/certification?id=${encodeURIComponent(trackId)}`;
}

function replaceMarkedRegion(template, start, end, content) {
  const startIndex = template.indexOf(start);
  const endIndex = template.indexOf(end);
  if (
    startIndex < 0 ||
    endIndex < startIndex ||
    template.indexOf(start, startIndex + start.length) >= 0 ||
    template.indexOf(end, endIndex + end.length) >= 0
  ) {
    throw new Error('template-markers');
  }
  const bodyStart = startIndex + start.length;
  return `${template.slice(0, bodyStart)}\n${content}\n      ${template.slice(endIndex)}`;
}

function trackLessons(entry) {
  if (!Array.isArray(entry.lessons)) return [];
  return entry.lessons.filter(function (lesson) {
    return lesson && typeof lesson === 'object' && lesson.path && lesson.title;
  });
}

function certificationHead(entry, trackId) {
  const canonical = canonicalForTrack(trackId);
  const title = entry.seoTitle || `${entry.title} - AI Engineering from Scratch`;
  const description = entry.description || entry.excerpt || '免费、独立的认证备考路线，包含有序课程与原创练习。';
  const course = {
    '@type': 'Course',
    name: entry.title,
    description,
    url: canonical,
    inLanguage: 'zh-CN',
    isAccessibleForFree: true,
  };
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      course,
      {
        '@type': 'CollectionPage',
        name: entry.title,
        description,
        url: canonical,
        mainEntity: course,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: ORIGIN },
          { '@type': 'ListItem', position: 2, name: '认证备考', item: `${ORIGIN}/certifications.html` },
          { '@type': 'ListItem', position: 3, name: entry.title, item: canonical },
        ],
      },
    ],
  };

  return [
    `  <title>${escapeHtml(title)}</title>`,
    `  <meta name="description" content="${escapeHtml(description)}">`,
    `  <link rel="canonical" href="${escapeHtml(canonical)}">`,
    `  <meta property="og:title" content="${escapeHtml(title)}">`,
    `  <meta property="og:description" content="${escapeHtml(description)}">`,
    `  <meta property="og:image" content="${ORIGIN}/og-image.png?v=3">`,
    `  <meta property="og:url" content="${escapeHtml(canonical)}">`,
    '  <meta property="og:type" content="website">',
    '  <meta name="twitter:card" content="summary_large_image">',
    `  <meta name="twitter:title" content="${escapeHtml(title)}">`,
    `  <meta name="twitter:description" content="${escapeHtml(description)}">`,
    `  <meta name="twitter:image" content="${ORIGIN}/og-image.png?v=3">`,
    `  <script type="application/ld+json" id="certificationJsonLd">${jsonForHtml(jsonLd)}</script>`,
  ].join('\n');
}

function certificationFallback(entry, trackId) {
  const lessons = trackLessons(entry);
  const visibleLessons = lessons.slice(0, 12);
  const lessonItems = visibleLessons.map(function (lesson) {
    const params = new URLSearchParams();
    params.set('path', lesson.path);
    params.set(
      lesson.path.startsWith('certifications/claude/lessons/') ? 'track' : 'fromTrack',
      trackId
    );
    const href = `/lesson?${params.toString()}`;
    return `<li><a href="${escapeHtml(href)}">${escapeHtml(lesson.title)}</a></li>`;
  }).join('');
  const remaining = lessons.length - visibleLessons.length;
  const excerpt = entry.excerpt || entry.description;

  return [
    '      <div class="cert-track-not-found-copy cert-seo-fallback" data-server-rendered="true">',
    '        <div class="cert-eyebrow">独立认证备考</div>',
    `        <h1>${escapeHtml(entry.title)}</h1>`,
    excerpt ? `        <p class="cert-track-summary">${escapeHtml(excerpt)}</p>` : '',
    entry.description && entry.description !== excerpt ? `        <p>${escapeHtml(entry.description)}</p>` : '',
    `        <p>这条免费社区学习路线按明确顺序组织了 ${lessons.length} 节实践课程，并连接原创诊断和练习。它不颁发证书，也不复刻受保护的考试题目。</p>`,
    lessonItems ? `        <h2>路线课程</h2><ol>${lessonItems}</ol>` : '',
    remaining > 0 ? `        <p>交互路线中还有 ${remaining} 节课程。</p>` : '',
    `        <div class="cert-track-hero-actions"><a class="cert-action" href="/certifications.html">全部认证路线</a><a class="cert-action secondary" href="${escapeHtml(canonicalForTrack(trackId))}">打开交互路线</a></div>`,
    '      </div>',
  ].filter(Boolean).join('\n');
}

function errorPage(title, message) {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="noindex"><title>${escapeHtml(title)} - AI Engineering from Scratch 中文版</title></head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><nav aria-label="恢复导航"><ul><li><a href="/certifications.html">认证路线</a></li><li><a href="/catalog.html">课程目录</a></li><li><a href="/sitemap.xml">站点地图</a></li><li><a href="/llms.txt">Agent 课程索引</a></li></ul></nav></main></body></html>`;
}

function send(res, method, status, body, cacheControl) {
  const payload = String(body || '');
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Length', String(Buffer.byteLength(payload)));
  res.end(method === 'HEAD' ? '' : payload);
}

function sendRedirect(res, method, trackId) {
  res.setHeader('Location', `/certification?id=${encodeURIComponent(trackId)}`);
  send(res, method, 308, '', 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800');
}

function createHandler(options) {
  const loadAssets = options && typeof options.loadAssets === 'function'
    ? options.loadAssets
    : loadProductionAssets;
  return function certificationHandler(req, res) {
    const method = String(req.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      send(res, method, 405, errorPage('不支持该方法', '认证页面只接受 GET 或 HEAD。'), 'no-store');
      return;
    }

    const requestedId = queryValue(req, 'id') || queryValue(req, 'track');
    if (!validTrackId(requestedId)) {
      send(res, method, 404, errorPage('找不到认证路线', '这个路线 ID 不存在。请从认证目录、站点地图或课程目录继续。'), 'no-store');
      return;
    }

    try {
      const assets = loadAssets();
      const template = assets && assets.template;
      const manifest = assets && assets.manifest;
      if (typeof template !== 'string') throw new Error('template-shape');
      if (!manifest || !manifest.tracks || typeof manifest.tracks !== 'object') throw new Error('manifest-shape');
      const entry = resolveTrack(manifest.tracks, requestedId);
      if (!entry || !entry.id || !entry.title) {
        send(res, method, 404, errorPage('找不到认证路线', '这个路线 ID 不在当前认证目录中。请从认证目录、站点地图或课程目录继续。'), 'no-store');
        return;
      }
      const trackId = entry.id;
      const canonicalRequest = queryValue(req, 'id') === trackId && !queryValue(req, 'track');
      if (queryNames(req).has('legacy') || !canonicalRequest || hasUnknownQuery(req)) {
        sendRedirect(res, method, trackId);
        return;
      }
      let html = replaceMarkedRegion(template, SEO_START, SEO_END, certificationHead(entry, trackId));
      html = replaceMarkedRegion(html, FALLBACK_START, FALLBACK_END, certificationFallback(entry, trackId));
      send(res, method, 200, html, 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800');
    } catch (_) {
      send(res, method, 500, errorPage('认证页面暂不可用', '认证页面组装失败，请先从认证目录继续。'), 'no-store');
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.validTrackId = validTrackId;
module.exports.resolveTrack = resolveTrack;
