(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LandscapeRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var REPO = 'fancyboi999/ai-engineering-from-scratch-zh';
  var BRANCH = 'main';
  var ENTRY_DIR = 'landscape/entries';
  var MAX_NAME = 60;
  var MAX_DESCRIPTION = 200;
  var MAX_LOGO_BYTES = 100 * 1024;
  var TOO_LARGE = 'Logo 文件不能超过 ' + (MAX_LOGO_BYTES / 1024) + ' KB';
  var MIN_PNG_SIDE = 48;
  var MAX_PNG_SIDE = 4096;
  var MIN_STARS = 2500;
  var PNG_CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  var PNG_DEPTHS = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
  var FIELDS = ['name', 'url', 'category', 'also', 'description', 'open_source', 'repo', 'x', 'logo', 'logo_url'];
  var MAX_ALSO = 3;
  var LOGO_TYPES = ['svg', 'png'];
  var X_HANDLE = /^[A-Za-z0-9_]{1,15}$/;
  var SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  var REPO_URL = /^https:\/\/(github\.com|gitlab\.com|codeberg\.org)\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
  var PROMOTIONAL = /\b(best|leading|world[- ]class|revolutionary|cutting[- ]edge|number one|blazing\w*|game[- ]chang\w*|next[- ]gen\w*|unmatched|ultimate|state[- ]of[- ]the[- ]art)\b|#1(?![0-9])|世界领先|行业领先|全球最佳|最强大|颠覆性|革命性|划时代|无与伦比|终极|排名第一/i;
  var CRYPTO = /\b(crypto(?:currenc\w*|wallet\w*|coin\w*|mining|asset\w*|trading|payment\w*)?|blockchain\w*|stablecoin\w*|web3|nfts?|on-?chain|defi|memecoin\w*|airdrop\w*|tokenomics|dao)\b|加密货币|区块链|稳定币|去中心化金融|代币经济|链上资产/i;
  var TEMPORARY_HOST = /(^|\.)(vercel\.app|netlify\.app|github\.io|pages\.dev|herokuapp\.com|ngrok\.io|ngrok-free\.app|trycloudflare\.com|bit\.ly|t\.co|tinyurl\.com)$/i;
  var IP_HOST = /^(\d{1,3}\.){3}\d{1,3}$|^\[|^localhost$/i;
  var SVG_BLOCKLIST = [
    [/<(?:[a-z0-9_-]+:)?script\b/i, '包含 <script> 元素'],
    [/<(?:[a-z0-9_-]+:)?foreignObject\b/i, '包含 <foreignObject> 元素'],
    [/<(?:[a-z0-9_-]+:)?(iframe|embed|object|image|audio|video)\b/i, '嵌入了外部元素'],
    [/\son[a-z]+\s*=/i, '包含事件处理属性'],
    [/javascript:/i, '包含 javascript: 链接'],
    [/<!ENTITY|<!DOCTYPE[^>]*\[/i, '声明了 XML 实体'],
    [/(?:[a-z0-9_-]+:)?href\s*=\s*["'](?!#)/i, '引用了外部资源'],
    [/@import|url\(\s*["']?(?!#)/i, '加载了外部样式资源']
  ];

  function slugify(name) {
    return String(name || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function parseHttps(value) {
    if (typeof value !== 'string') return null;
    var parsed;
    try { parsed = new URL(value); } catch (_) { return null; }
    if (parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    if (IP_HOST.test(parsed.hostname)) return null;
    if (parsed.hostname.indexOf('.') === -1) return null;
    return parsed;
  }

  function validateEntry(slug, entry, categoryIds) {
    var errors = [];
    if (!SLUG.test(String(slug))) errors.push('文件名只能包含小写字母、数字和连字符，例如 "my-tool.json"');
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return errors.concat('条目必须是 JSON 对象');

    Object.keys(entry).forEach(function (key) {
      if (FIELDS.indexOf(key) === -1) errors.push('未知字段 "' + key + '"，允许的字段：' + FIELDS.join(', '));
    });

    if (typeof entry.name !== 'string' || !entry.name.trim()) errors.push('"name" 为必填项');
    else if (entry.name.length > MAX_NAME) errors.push('"name" 不能超过 ' + MAX_NAME + ' 个字符');

    var site = parseHttps(entry.url);
    if (!site) errors.push('"url" 必须是公网 https:// 地址');

    if (categoryIds.indexOf(entry.category) === -1) errors.push('"category" 必须是有效分类 ID：' + categoryIds.join(', '));

    if (entry.also !== undefined) {
      var extra = Array.isArray(entry.also) ? entry.also : null;
      if (!extra || !extra.length || extra.length > MAX_ALSO) errors.push('"also" 必须包含 1 到 ' + MAX_ALSO + ' 个附加分类');
      else extra.forEach(function (id, index) {
        if (categoryIds.indexOf(id) === -1 || id === entry.category || extra.indexOf(id) !== index) errors.push('"also" 包含未知或重复的分类（"' + id + '"）');
      });
    }

    if (typeof entry.description !== 'string' || !entry.description.trim()) errors.push('"description" 为必填项');
    else {
      if (entry.description.length > MAX_DESCRIPTION) errors.push('"description" 不能超过 ' + MAX_DESCRIPTION + ' 个字符（当前 ' + entry.description.length + '）');
      if (/\n/.test(entry.description)) errors.push('"description" 必须为单行');
      if (!/[.。]$/.test(entry.description.trim())) errors.push('"description" 必须以句号（。或 .）结尾');
      if (CRYPTO.test(entry.description + ' ' + (entry.name || ''))) errors.push('该工具超出本工具全景的收录范围');
      var promo = entry.description.match(PROMOTIONAL);
      if (promo) errors.push('"description" 应客观说明工具功能，不能包含宣传用语（"' + promo[0] + '"）');
    }

    if (typeof entry.open_source !== 'boolean') errors.push('"open_source" 必须为 true 或 false');
    if (entry.open_source === true) {
      if (typeof entry.repo !== 'string' || !REPO_URL.test(entry.repo) || /\/\.{1,2}(\/|$)/.test(entry.repo)) errors.push('开源工具必须填写有效的 "repo"，例如 "https://github.com/owner/name"');
    } else if (entry.open_source === false) {
      if (entry.repo !== undefined) errors.push('"repo" 仅适用于开源工具');
      if (site && TEMPORARY_HOST.test(site.hostname)) errors.push('"url" 必须是产品自有域名，不能使用预览或共享托管域名（' + site.hostname + '）');
    }

    var hasLogo = entry.logo !== undefined;
    var hasLogoUrl = entry.logo_url !== undefined;
    if (hasLogo && hasLogoUrl) errors.push('"logo" 和 "logo_url" 只能二选一');
    if (!hasLogo && !hasLogoUrl) errors.push('必须提供 "logo_url"（SVG 或 PNG 链接）或 "logo"（提交到 site/logos/landscape/ 的文件名）');
    if (hasLogo && entry.logo !== slug + '.svg' && entry.logo !== slug + '.png') errors.push('"logo" 必须是 "' + slug + '.svg" 或 "' + slug + '.png"');
    if (hasLogoUrl) {
      var logo = parseHttps(entry.logo_url);
      if (!logo) errors.push('"logo_url" 必须是公网 https:// 地址');
      else if (!/\.(svg|png)$/i.test(logo.pathname)) errors.push('"logo_url" 必须指向 .svg 或 .png 文件');
    }

    if (entry.x !== undefined && (typeof entry.x !== 'string' || !X_HANDLE.test(entry.x))) errors.push('"x" 必须是不带 @ 的 X 账号名，例如 "acme"');

    return errors;
  }

  function utf8Length(text) {
    if (typeof Buffer === 'function' && typeof Buffer.byteLength === 'function') return Buffer.byteLength(text, 'utf8');
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(text).length;
    return unescape(encodeURIComponent(text)).length;
  }

  function svgErrors(text) {
    var errors = [];
    if (typeof text !== 'string' || !/^\s*(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(text)) return ['Logo 不是有效的 SVG 文件'];
    if (utf8Length(text) > MAX_LOGO_BYTES) errors.push(TOO_LARGE);
    var body = text.replace(/\sxmlns(:[a-z]+)?\s*=\s*["'][^"']*["']/gi, '');
    SVG_BLOCKLIST.forEach(function (rule) {
      if (rule[0].test(body)) errors.push('Logo ' + rule[1]);
    });
    return errors;
  }

  var CRC_TABLE = (function () {
    var table = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table.push(c >>> 0);
    }
    return table;
  })();

  function crc32(bytes, start, end) {
    var crc = 0xffffffff;
    for (var i = start; i < end; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function uint32(bytes, at) {
    return ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;
  }

  function readPng(bytes) {
    var signature = [137, 80, 78, 71, 13, 10, 26, 10];
    var notPng = { error: 'Logo 不是有效的 PNG 文件' };
    if (!bytes || bytes.length < 24) return notPng;
    for (var i = 0; i < signature.length; i++) {
      if (bytes[i] !== signature[i]) return notPng;
    }
    var at = 8;
    var header = null;
    var palette = false;
    var idat = [];
    while (at + 12 <= bytes.length) {
      var length = uint32(bytes, at);
      var type = String.fromCharCode(bytes[at + 4], bytes[at + 5], bytes[at + 6], bytes[at + 7]);
      var end = at + 8 + length;
      if (!/^[A-Za-z]{4}$/.test(type) || end + 4 > bytes.length) return { error: 'PNG Logo 文件被截断或已损坏' };
      if (crc32(bytes, at + 4, end) !== uint32(bytes, end)) return { error: 'PNG Logo 已损坏（' + type + ' 校验和不匹配）' };
      if (!header) {
        if (type !== 'IHDR' || length !== 13) return { error: 'PNG Logo 缺少图像头' };
        header = {
          width: uint32(bytes, at + 8),
          height: uint32(bytes, at + 12),
          bitDepth: bytes[at + 16],
          colorType: bytes[at + 17],
          interlace: bytes[at + 20]
        };
        var depths = PNG_DEPTHS[header.colorType];
        if (!depths || depths.indexOf(header.bitDepth) === -1 || bytes[at + 18] !== 0 || bytes[at + 19] !== 0 || header.interlace > 1) {
          return { error: 'PNG Logo 图像头格式不受支持' };
        }
      } else if (type === 'PLTE') {
        palette = true;
      } else if (type === 'IDAT') {
        idat.push(bytes.subarray ? bytes.subarray(at + 8, end) : bytes.slice(at + 8, end));
      } else if (type === 'IEND') {
        if (!idat.length) return { error: 'PNG Logo 缺少图像数据' };
        if (header.colorType === 3 && !palette) return { error: 'PNG Logo 缺少调色板' };
        return { header: header, idat: idat };
      }
      at = end + 4;
    }
    return { error: 'PNG Logo 文件被截断或已损坏' };
  }

  function pngDataLength(header) {
    var bits = PNG_CHANNELS[header.colorType] * header.bitDepth;
    var passes = header.interlace
      ? [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]]
      : [[0, 0, 1, 1]];
    var total = 0;
    passes.forEach(function (pass) {
      var width = header.width > pass[0] ? Math.ceil((header.width - pass[0]) / pass[2]) : 0;
      var height = header.height > pass[1] ? Math.ceil((header.height - pass[1]) / pass[3]) : 0;
      if (width && height) total += height * (1 + Math.ceil(width * bits / 8));
    });
    return total;
  }

  function pngErrors(bytes) {
    var png = readPng(bytes);
    if (png.error) return [png.error];
    var errors = [];
    if (bytes.length > MAX_LOGO_BYTES) errors.push(TOO_LARGE);
    var width = png.header.width;
    var height = png.header.height;
    if (width < MIN_PNG_SIDE || height < MIN_PNG_SIDE) errors.push('PNG Logo 宽高均不得小于 ' + MIN_PNG_SIDE + ' 像素（当前 ' + width + ' x ' + height + '）');
    if (width > MAX_PNG_SIDE || height > MAX_PNG_SIDE) errors.push('PNG Logo 宽高均不得大于 ' + MAX_PNG_SIDE + ' 像素（当前 ' + width + ' x ' + height + '）');
    return errors;
  }

  function normalizeUrl(value) {
    var text = String(value || '').trim();
    if (!text) return '';
    if (/^http:\/\//i.test(text)) return 'https://' + text.slice(7);
    if (/^https:/i.test(text)) return text;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return 'https://' + text.replace(/^\/+/, '');
    return text;
  }

  function normalizeRepo(value) {
    var text = normalizeUrl(value).replace(/[?#].*$/, '').replace(/^https:\/\/www\./i, 'https://');
    var page = /^(https:\/\/(?:github\.com|codeberg\.org)\/[^\/]+\/[^\/]+)\/(?:tree|blob|issues|pulls?|releases|wiki|actions|src|commits?)(?:\/.*)?$/i.exec(text);
    if (page) text = page[1];
    text = text.replace(/^(https:\/\/gitlab\.com\/.+?)\/-\/.*$/i, '$1');
    return text.replace(/\/+$/, '').replace(/\.git$/, '');
  }

  function buildEntry(form) {
    var entry = {
      name: String(form.name || '').trim(),
      url: normalizeUrl(form.url),
      category: String(form.category || ''),
      description: String(form.description || '').trim(),
      open_source: Boolean(form.open_source)
    };
    if (entry.open_source) entry.repo = normalizeRepo(form.repo);
    var handle = String(form.x || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '').replace(/\/+$/, '');
    if (handle) entry.x = handle;
    entry.logo_url = normalizeUrl(form.logo_url);
    return entry;
  }

  function entryJson(entry) {
    var ordered = {};
    FIELDS.forEach(function (key) {
      if (entry[key] !== undefined) ordered[key] = entry[key];
    });
    return JSON.stringify(ordered, null, 2) + '\n';
  }

  function entryPath(slug) {
    return ENTRY_DIR + '/' + slug + '.json';
  }

  function pullRequestUrl(slug, entry) {
    return 'https://github.com/' + REPO + '/new/' + BRANCH +
      '?filename=' + encodeURIComponent(entryPath(slug)) +
      '&value=' + encodeURIComponent(entryJson(entry));
  }

  return {
    REPO: REPO,
    ENTRY_DIR: ENTRY_DIR,
    FIELDS: FIELDS,
    MAX_DESCRIPTION: MAX_DESCRIPTION,
    MAX_LOGO_BYTES: MAX_LOGO_BYTES,
    MIN_STARS: MIN_STARS,
    LOGO_TYPES: LOGO_TYPES,
    slugify: slugify,
    parseHttps: parseHttps,
    validateEntry: validateEntry,
    svgErrors: svgErrors,
    pngErrors: pngErrors,
    readPng: readPng,
    pngDataLength: pngDataLength,
    buildEntry: buildEntry,
    entryJson: entryJson,
    entryPath: entryPath,
    pullRequestUrl: pullRequestUrl
  };
});
