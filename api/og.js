const fs = require('node:fs');
const path = require('node:path');
const { renderCard } = require('../lib/og-render');
const { STATIC_TYPES, cardPath, lessonCard, trackCard } = require('../lib/og-cards');

const SITE = path.join(__dirname, '..', 'site');
const ID = /^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*){0,3}$/;
const QUERY_NAMES = new Set(['type', 'id', 'lang', 'v']);
const IMMUTABLE = 'public, max-age=31536000, s-maxage=31536000, immutable';
const MOVED = 'public, max-age=0, s-maxage=300, must-revalidate';
const RENDERED_LIMIT = 64;

function own(object, key) {
  return object && typeof object === 'object' && Object.prototype.hasOwnProperty.call(object, key) ? object[key] : null;
}

function readSite(name) {
  return JSON.parse(fs.readFileSync(path.join(SITE, name), 'utf8'));
}

function findCard(type, id, lang, manifest) {
  if (type === 'lesson') {
    const entry = own(manifest('lesson-seo.json').lessons, id);
    if (!entry || !entry.title || lang !== 'zh') return null;
    return lessonCard(entry, lang);
  }
  if (lang !== 'zh') return null;
  if (type === 'track') {
    const entry = own(manifest('certification-seo.json').tracks, id);
    return entry && entry.title ? trackCard(entry) : null;
  }
  return STATIC_TYPES.includes(type) ? own(manifest('og-cards.json').cards, `${type}/${id}`) : null;
}

function cardRequest(req) {
  const url = new URL(req.url || '/', 'http://localhost');
  const query = name => {
    const direct = req.query && req.query[name];
    if (Array.isArray(direct) || url.searchParams.getAll(name).length > 1) return null;
    return typeof direct === 'string' ? direct : url.searchParams.get(name);
  };
  const match = /^\/og\/([a-z]+)\/(.+)\.png$/.exec(url.pathname);
  const names = new Set([...url.searchParams.keys(), ...Object.keys(req.query || {})]);
  return {
    type: match ? match[1] : query('type'),
    id: match ? match[2] : query('id'),
    lang: query('lang') || 'zh',
    version: query('v'),
    extra: query('lang') === 'zh' || [...names].some(name => !QUERY_NAMES.has(name)),
    invalid: [...names].some(name => Array.isArray(req.query && req.query[name]) || url.searchParams.getAll(name).length > 1),
  };
}

function send(res, method, status, cacheControl, body, type = 'text/plain; charset=utf-8') {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(`${body}\n`);
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Length', String(payload.length));
  res.end(method === 'HEAD' ? undefined : payload);
}

function createHandler({ manifest = readSite, render = renderCard } = {}) {
  const manifests = new Map();
  const rendered = new Map();
  const load = name => {
    if (!manifests.has(name)) manifests.set(name, manifest(name));
    return manifests.get(name);
  };
  return function ogHandler(req, res) {
    const method = String(req.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return send(res, method, 405, 'no-store', '不支持此方法');
    }
    let request;
    try { request = cardRequest(req); } catch (_) { return send(res, method, 404, 'no-store', '未找到卡片'); }
    if (request.invalid) return send(res, method, 404, 'no-store', '未找到卡片');
    let spec;
    try {
      spec = typeof request.type === 'string' && ID.test(request.id || '') ? findCard(request.type, request.id, request.lang, load) : null;
    } catch (_) {
      return send(res, method, 500, 'no-store', '卡片数据不可用');
    }
    if (!spec) return send(res, method, 404, 'no-store', '未找到卡片');
    const location = cardPath(request.type, request.id, spec, request.lang);
    if (!location.endsWith(`v=${request.version}`) || request.extra) {
      res.setHeader('Location', location);
      return send(res, method, 307, MOVED, location);
    }
    try {
      if (!rendered.has(location)) {
        if (rendered.size >= RENDERED_LIMIT) rendered.delete(rendered.keys().next().value);
        if (spec.image && spec.image !== "anatomy/inside-an-ai-agent-og.png") throw new Error("Unknown poster asset");
        rendered.set(location, spec.image ? fs.readFileSync(path.join(SITE, spec.image)) : render(spec));
      }
    } catch (_) {
      return send(res, method, 500, 'no-store', '无法渲染卡片');
    }
    return send(res, method, 200, IMMUTABLE, rendered.get(location), 'image/png');
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
