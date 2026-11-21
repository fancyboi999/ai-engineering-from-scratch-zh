#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');
const { renderCard, renderPixels, layout, descriptionDrift } = require('../lib/og-render');
const { ORIGIN, cardPath, cardUrl, cardTags, cardVersion, lessonCard, socialCards, stampCards, trackCard } = require('../lib/og-cards');
const { createHandler } = require('../api/og');
const { buildOgCards, validateOgCards } = require('../site/og-cards');

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function decodePng(bytes) {
  assert.deepEqual(bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const idat = [];
  let width, height, palette, ended = false;
  for (let at = 8; at < bytes.length;) {
    const len = bytes.readUInt32BE(at), type = bytes.toString('ascii', at + 4, at + 8);
    const body = bytes.subarray(at + 8, at + 8 + len);
    assert.equal(crc32(bytes.subarray(at + 4, at + 8 + len)), bytes.readUInt32BE(at + 8 + len));
    if (type === 'IHDR') {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4);
      assert.deepEqual([...body.subarray(8)], [8, 3, 0, 0, 0]);
    }
    if (type === 'PLTE') palette = body;
    if (type === 'IDAT') idat.push(body);
    if (type === 'IEND') { assert.equal(len, 0); ended = true; }
    at += len + 12;
    assert.ok(at <= bytes.length);
  }
  assert.ok(ended && palette);
  assert.equal(width, 1200); assert.equal(height, 630);
  const rows = zlib.inflateSync(Buffer.concat(idat));
  assert.equal(rows.length, (width + 1) * height);
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    assert.equal(rows[y * (width + 1)], 0);
    for (let x = 0; x < width; x++) {
      const index = rows[y * (width + 1) + x + 1];
      assert.ok(index * 3 + 2 < palette.length);
      palette.copy(pixels, (y * width + x) * 3, index * 3, index * 3 + 3);
    }
  }
  return pixels;
}

const lesson = { path: 'phases/03-deep-learning/01-backpropagation', title: '反向传播与注意力机制', description: '亲手构建神经网络，理解梯度、损失和 agent 循环。', context: { type: 'Build', languages: 'Python', phaseName: '深度学习' } };
const spec = lessonCard(lesson);
const stats = { lessons: 595, phases: 20, skills: 100, prompts: 20, terms: 20, tracks: 4 };
const cards = socialCards({ stats, projects: [{ id: 'example', level: 1, title: '从零构建 AI 项目', tagline: '分阶段实现，每一阶段都有测试。', stages: [{}], hours: 2 }], manuals: [{ id: 'docker', title: 'Docker 技术手册', subtitle: '固定版本的技术指南', edition: 1, pin: { version: '1.0' } }] });
const png = renderCard(spec);
assert.deepEqual(decodePng(png), Buffer.from(renderPixels(spec)));
assert.ok(png.length > 1000);
assert.match(spec.path, /^\/lessons\//);
assert.equal(ORIGIN, 'https://aieng-zh.cn');
assert.equal(cardVersion(spec).length, 12);
assert.notEqual(cardVersion(spec), cardVersion({ ...spec, description: '不同的摘要' }));
assert.equal(cardUrl('lesson', lesson.path, spec), ORIGIN + cardPath('lesson', lesson.path, spec));
assert.ok(!cardPath('lesson', lesson.path, spec).includes('lang='));
assert.throws(() => lessonCard(lesson, 'en'), /Only Chinese/);
assert.equal(lessonCard({ ...lesson, path: 'certifications/claude/lessons/01-intro', context: { kind: 'certification' } }).meta, '独立社区备考');
assert.match(trackCard({ id: 'test', title: '认证备考', lessons: [] }).path, /certification.html/);
assert.ok(!cards['page/sponsors']);
assert.equal(Object.keys(buildOgCards({ stats }).cards).length, Object.keys(socialCards({ stats })).length);
assert.ok(validateOgCards({ cards }, { [lesson.path]: lesson }, {}) > 10);

const atlas = JSON.parse(fs.readFileSync(path.join(__dirname, '../lib/og-fonts/cjk.json')));
const bitmap = zlib.inflateSync(Buffer.from(atlas.bitmap, 'base64'));
for (const ch of '反向传播注意力机制中文字体神经网络梯度损失') {
  const record = atlas.glyphs[ch];
  assert.ok(record, `Missing ${ch}`);
  assert.ok(record[3] > 0 && record[4] > 0);
  assert.ok(bitmap.subarray(record[5], record[5] + record[3] * record[4]).some(x => x > 0));
}
const glyphBitmap = ch => { const g = atlas.glyphs[ch]; return bitmap.subarray(g[5], g[5] + g[3] * g[4]); };
assert.notDeepEqual(glyphBitmap('中'), glyphBitmap('文'));
assert.notDeepEqual(glyphBitmap('反'), glyphBitmap('传'));
assert.throws(() => layout({ ...spec, title: '𠀀' }), /Missing OG glyph/);
assert.doesNotThrow(() => layout({ ...spec, title: 'Â 梯度' }));
const chineseLines = layout({ ...spec, title: '反向传播注意力机制神经网络梯度损失从零构建工程' }).title.lines;
assert.ok(chineseLines.length > 1);
assert.ok(!chineseLines.join('').includes(' '));
assert.ok(layout(spec).title.lines.join('').includes('反向传播'));
// 副标题折成一行时只能截掉句尾：版本号里的点、.gitignore、中文句末加后引号都不能让开头丢失。
for (const description of [
  '用 LangChain 1.5、LangGraph 1.2 和 Deep Agents 0.7 构建、运行、持久化并调试 agent，每项决策都有一份录制的实测答案',
  '版本控制不是可选项，你在这里做的每一次实验都要提交。配置 .gitignore，把模型 checkpoint 和大型二进制文件排除在仓库之外，再推送到远程。',
  '实体链接与消歧：NER 找到了 "Paris"。实体链接来定夺：是法国巴黎，还是一个人名？',
]) {
  const card = { ...spec, description };
  assert.equal(descriptionDrift(card), null, layout(card).description);
}
assert.equal(layout({ ...spec, description: '开发环境：你的工具塑造你的思维。一次配置到位，就配置对。从零搭建 Python、Node 与 GPU 驱动的完整环境，并在每一步验证结果是否可用。' }).description, '开发环境：你的工具塑造你的思维。一次配置到位，就配置对。');

// 蓝底页面卡与居中首页卡的文字必须全部落在四角标记框内，框外保持纯背景色。
for (const [name, card] of [['home', cards['page/home']], ['lesson', { ...spec, title: '反向传播与注意力机制'.repeat(6), description: '亲手构建神经网络，理解梯度、损失和 agent 循环。'.repeat(4) }]]) {
  const pixels = renderPixels(card);
  const background = card.kind === 'home' ? [250, 250, 245] : [53, 83, 255];
  let stray = null;
  for (let at = 0; at < pixels.length && !stray; at += 3) {
    const x = (at / 3) % 1200, y = Math.floor(at / 3600);
    const inside = x >= 24 && x < 1176 && y >= 24 && y < 606;
    if (!inside && (pixels[at] !== background[0] || pixels[at + 1] !== background[1] || pixels[at + 2] !== background[2])) stray = `${x},${y}`;
  }
  assert.equal(stray, null, `${name} card paints outside the frame`);
}

const html = `<head>\n  <meta property="og:image" content="${ORIGIN}/og/page/home.png">\n</head>`;
const stamped = stampCards(html, cards);
assert.match(stamped, /home\.png\?v=[a-f0-9]{12}/);
assert.equal((stamped.match(/twitter:card/g) || []).length, 1);
assert.equal(stampCards(stamped, cards), stamped);
assert.throws(() => stampCards(html, {}), /No social card/);
assert.ok(cardTags('https://aieng-zh.cn/og?x="&', { title: '标题"<>' }).join('\n').includes('&quot;&lt;&gt;'));

// Renderer and atlas changes both invalidate immutable card URLs in a fresh process.
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'og-version-'));
try {
  fs.cpSync(path.join(__dirname, '../lib'), path.join(temp, 'lib'), { recursive: true });
  const version = () => {
    const result = spawnSync(process.execPath, ['-e', `console.log(require(${JSON.stringify(path.join(temp, 'lib/og-cards.js'))}).cardVersion(${JSON.stringify(spec)}))`], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
  };
  const first = version();
  fs.appendFileSync(path.join(temp, 'lib/og-render.js'), '\n// cache-test\n');
  const second = version(); assert.notEqual(first, second);
  fs.appendFileSync(path.join(temp, 'lib/og-fonts/cjk.json'), ' ');
  assert.notEqual(second, version());
} finally { fs.rmSync(temp, { recursive: true, force: true }); }

let rendered = 0, reads = 0;
const handler = createHandler({ manifest(name) {
  reads++;
  if (name === 'lesson-seo.json') return { lessons: { [lesson.path]: lesson } };
  if (name === 'certification-seo.json') return { tracks: { test: { id: 'test', title: '认证备考', lessons: [] } } };
  return { cards };
}, render(value) { rendered++; return renderCard(value); } });
function request(url, method = 'GET', selected = handler, query) {
  const res = { headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(body) { this.body = body; } };
  selected({ url, method, query }, res); return res;
}
const initial = request(`/og/lesson/${lesson.path}.png`);
assert.equal(initial.statusCode, 307);
const movedHead = request(`/og/lesson/${lesson.path}.png`, 'HEAD');
assert.equal(movedHead.statusCode, 307); assert.equal(movedHead.body, undefined);
const canonical = initial.headers.Location;
const get = request(canonical);
assert.equal(get.statusCode, 200);
assert.equal(get.headers['Content-Type'], 'image/png');
assert.match(get.headers['Cache-Control'], /immutable/);
assert.equal(get.headers['X-Content-Type-Options'], 'nosniff');
assert.equal(Number(get.headers['Content-Length']), get.body.length);
decodePng(get.body);
const head = request(canonical, 'HEAD');
assert.equal(head.statusCode, 200); assert.equal(head.body, undefined);
assert.equal(head.headers['Content-Length'], get.headers['Content-Length']);
assert.equal(rendered, 1); assert.equal(reads, 1);
for (const url of [canonical.replace(/v=.+$/, 'v=deadbeef'), canonical + '&lang=zh', canonical + '&extra=x']) assert.equal(request(url).statusCode, 307);
assert.equal(request(canonical, 'GET', handler, { type: 'lesson', id: lesson.path }).statusCode, 200);
assert.equal(request('/api/og?type=lesson&id=' + lesson.path + '&v=' + cardVersion(spec)).statusCode, 200);
for (const url of ['/og/page/missing.png', '/og/unknown/home.png', '/og/page/__proto__.png', '/og/page/constructor.png', '/api/og?type=page&id=../../etc/passwd', '/og/page/%2e%2e%2fhome.png', '/og/page/home.png?lang=en', canonical + '&lang=en&lang=zh', canonical + '&v=123', '/og/page/home.png?type=page&type=page']) assert.equal(request(url).statusCode, 404, url);
const missingHead = request('/og/page/missing.png', 'HEAD');
assert.equal(missingHead.statusCode, 404); assert.equal(missingHead.body, undefined);
for (const method of ['POST', 'OPTIONS', 'PUT', 'DELETE']) {
  const result = request(canonical, method); assert.equal(result.statusCode, 405); assert.equal(result.headers.Allow, 'GET, HEAD'); assert.equal(result.headers['Cache-Control'], 'no-store');
}
const absent = createHandler({ manifest() { throw Error('missing manifest'); } });
assert.equal(request('/og/page/home.png', 'GET', absent).statusCode, 500);
assert.equal(request('/og/page/home.png', 'HEAD', absent).body, undefined);
const broken = createHandler({ manifest() { return { cards }; }, render() { throw Error('render failure'); } });
assert.equal(request(cardPath('page', 'home', cards['page/home']), 'GET', broken).statusCode, 500);

const outAt = process.argv.indexOf('--artifacts');
if (outAt >= 0) {
  const out = process.argv[outAt + 1]; fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'chinese-lesson.png'), png);
  fs.writeFileSync(path.join(out, 'chinese-home.png'), renderCard(cards['page/home']));
  fs.writeFileSync(path.join(out, 'chinese-project.png'), renderCard(cards['project/example']));
}
console.log('OG: PNG decode/CRC/pixels, 1200x630, CJK glyphs/wrap, metadata/stamping/version, API cache/HEAD/methods/path/errors passed');
