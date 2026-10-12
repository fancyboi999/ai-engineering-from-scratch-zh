const fs = require('fs');
const path = require('path');

const SITE_ROOT = path.join(__dirname, '..', 'site');
const { PAGES: HTML_BY_PATH } = require('../lib/agent-content');

const { representation } = require('../lib/agent-http');

const HUB_PATH = /^\/(phase|glossary)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

// Only the source-generated registry can extend the finite public page allowlist.
function hubPageRegistry(manifest) {
  if (!manifest || !manifest.pages || typeof manifest.pages !== 'object' || Array.isArray(manifest.pages)) throw new Error('invalid hub registry');
  for (const [route, page] of Object.entries(manifest.pages)) {
    const match = HUB_PATH.exec(route);
    if (!match || !page || page.html !== `hubs/${match[1]}/${match[2]}.html` ||
        page.markdown !== `agent-pages/${match[1]}/${match[2]}.md`) throw new Error('invalid hub registry entry');
  }
  return manifest.pages;
}

function createHandler({ siteRoot = SITE_ROOT, readHubPages = () => JSON.parse(fs.readFileSync(path.join(siteRoot, 'hub-pages.json'), 'utf8')) } = {}) {
  let hubs;
  return (req, res) => {
  const method = req.method || 'GET';
  function send(status, contentType, body) {
    res.statusCode = status;
    res.setHeader('Content-Type', `${contentType}; charset=utf-8`);
    res.setHeader('Content-Length', String(Buffer.byteLength(body)));
    res.end(method === 'HEAD' ? undefined : body);
  }
  function problem(status, title, code, detail) {
    res.setHeader('Cache-Control', 'no-store');
    send(status, 'application/problem+json', JSON.stringify({
      type: 'about:blank', title, status, code, detail,
    }) + '\n');
  }

  const requested = (req.query && req.query.path) ?? '/';
  const requestPath = typeof requested === 'string' ? requested : '';
  const type = representation(req.headers.accept);
  res.setHeader('Vary', 'Accept, Accept-Encoding');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800');
  res.setHeader('X-API-Version', '1');
  res.setHeader('Content-Language', 'zh-CN');

  if (method !== 'GET' && method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    problem(405, 'Method Not Allowed', 'method_not_allowed', '请使用 GET 或 HEAD 读取公开资源。');
    return;
  }

  if (typeof requested !== 'string') {
    problem(400, 'Bad Request', 'invalid_parameter', 'path 必须是单个字符串参数。');
    return;
  }

  let page = Object.hasOwn(HTML_BY_PATH, requestPath)
    ? { html: HTML_BY_PATH[requestPath], markdown: 'agent-pages/' + HTML_BY_PATH[requestPath].replace('.html', '.md') }
    : null;
  if (!page && HUB_PATH.test(requestPath)) {
    try {
      if (!hubs) hubs = hubPageRegistry(readHubPages());
      page = Object.hasOwn(hubs, requestPath) ? hubs[requestPath] : null;
    } catch (_) {
      problem(503, 'Service Unavailable', 'content_unavailable', '页面内容暂不可用，请稍后重试。');
      return;
    }
  }
  const file = page && page.html;
  if (!file) {
    res.setHeader('Cache-Control', 'no-store');
    if (type === 'text/markdown') {
      send(404, 'text/markdown', '# 页面不存在\n\n请查看[课程索引](/llms.txt)、[站点地图](/sitemap.xml)或[课程目录](/catalog.html)。\n');
    } else if (type === 'text/html') {
      send(404, 'text/html', fs.readFileSync(path.join(siteRoot, '404.html'), 'utf8'));
    } else {
      problem(404, 'Not Found', 'resource_not_found', '请通过 /llms.txt 或 /sitemap.xml 查找公开资源。');
    }
    return;
  }

  if (!type) {
    problem(406, 'Not Acceptable', 'representation_not_supported', '请请求 text/html 或 text/markdown。');
    return;
  }

  try {
    if (type === 'text/markdown') {
      send(200, 'text/markdown', fs.readFileSync(path.join(siteRoot, page.markdown), 'utf8'));
      return;
    }
    send(200, 'text/html', fs.readFileSync(path.join(siteRoot, file), 'utf8'));
  } catch (_) {
    problem(503, 'Service Unavailable', 'content_unavailable', '页面内容暂不可用，请稍后重试。');
  }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
