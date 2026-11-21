'use strict';

const zlib = require('node:zlib');
const { normalizeWhitespace } = require('./lesson-document');

const WIDTH = 1200;
const HEIGHT = 630;
const LEFT = 64;
const RIGHT = 1136;
const LEVELS = 15;
const COLORS = {
  paper: [250, 250, 245],
  ink: [26, 26, 26],
  mute: [122, 122, 120],
  blue: [53, 83, 255],
  dot: [160, 160, 156],
  cream: [250, 250, 245],
  haze: [196, 206, 255],
  tint: [228, 232, 255],
};
const DOMAIN = 'aieng-zh.cn';
const BRAND_LINE = '从零构建 AI 工程';
const DISPLAY_SIZES = [124, 104, 88, 74];
const DISPLAY_TRACKING = 0.02;
const LABEL_SIZE = 24;
const LABEL_TRACKING = LABEL_SIZE * 0.14;
const FOOT_SIZE = 20;
const FOOT_TRACKING = FOOT_SIZE * 0.04;
const BODY_SIZE = 30;
const BODY_GAP = 70;
const BLOCK_TOP = 118;
const BLOCK_HEIGHT = 352;
const SPELLED = {
  'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta', 'ε': 'epsilon', 'θ': 'theta',
  'λ': 'lambda', 'μ': 'mu', 'π': 'pi', 'σ': 'sigma', 'τ': 'tau', 'φ': 'phi', 'ω': 'omega',
  'Σ': 'Sigma', 'Δ': 'Delta', 'Ω': 'Omega', '∇': 'nabla', '∈': 'in', '∼': '~', '∏': 'prod',
  '→': '->', '←': '<-', '↔': '<->', '≈': '~', '≤': '<=', '≥': '>=', '≠': '!=', '√': 'sqrt', '∞': 'infinity',
};

const faces = new Map();
let chinese;
function chineseFace() {
  if (!chinese) {
    const data = require('./og-fonts/cjk.json');
    chinese = { ...data, bitmap: zlib.inflateSync(Buffer.from(data.bitmap, 'base64')) };
  }
  return chinese;
}

function face(name, size) {
  const key = `${name}:${size}`;
  if (!faces.has(key)) {
    const data = require(`./og-fonts/${name}.json`).sizes[size];
    if (!data) throw new Error(`No ${name} atlas at ${size}px`);
    const cjk = chineseFace();
    const scale = size / cjk.size;
    const glyphs = { ...data.glyphs };
    for (const [ch, glyph] of Object.entries(cjk.glyphs)) {
      if (!glyphs[ch]) glyphs[ch] = [glyph[0] * scale];
    }
    faces.set(key, { ...data, nativeGlyphs: data.glyphs, glyphs, cjk, size, capHeight: size * 0.88, bitmap: zlib.inflateSync(Buffer.from(data.bitmap, 'base64')) });
  }
  return faces.get(key);
}

function pitch(font) {
  return Math.round(font.size * 1.12);
}

function glyphText(font, text, upper) {
  const out = [];
  for (const ch of normalizeWhitespace(text).normalize('NFC').replace(/\p{M}/gu, '')) {
    let found = false;
    for (const option of [ch, SPELLED[ch] || '', ch.normalize('NFKD').replace(/\p{M}/gu, '')]) {
      const value = upper ? option.toLocaleUpperCase('en-US') : option;
      if (value && Array.from(value).every(c => font.glyphs[c])) {
        out.push(value);
        found = true;
        break;
      }
    }
    if (!found) throw new Error(`Missing OG glyph ${JSON.stringify(ch)}; rebuild with scripts/build-og-fonts.js`);
  }
  return normalizeWhitespace(out.join(''));
}

function measure(font, text, tracking = 0) {
  const chars = Array.from(text);
  return chars.reduce((width, ch, index) => width + font.glyphs[ch][0] + (font.kern[ch + (chars[index + 1] || '')] || 0) + (index < chars.length - 1 ? tracking : 0), 0);
}

function fitLine(font, text, width, tracking = 0) {
  if (measure(font, text, tracking) <= width) return text;
  const words = /\p{Script=Han}/u.test(text) ? [text] : text.split(' ');
  while (words.length > 1) {
    words.pop();
    const candidate = words.join(' ').replace(/[\s,;:.·—–-]+$/, '') + '…';
    if (measure(font, candidate, tracking) <= width) return candidate;
  }
  const chars = Array.from(text);
  while (chars.length && measure(font, chars.join('') + '…', tracking) > width) chars.pop();
  return chars.join('') + '…';
}

function oneLine(font, text, width) {
  if (measure(font, text) <= width) return text;
  let line = '';
  // 切出的句子必须首尾相接覆盖全文：英文句号只在空白前断句（0.7、.gitignore 不断），中文句末标点连同后引号一起断。
  for (const part of text.split(/(?<=[.!?])(?=\s)|(?<=[。！？][”’"）)]*)(?![”’"）)])/u).filter(Boolean)) {
    const next = (line + part).trim();
    if (measure(font, next) > width) break;
    line = next;
  }
  return measure(font, line) >= width * 0.6 ? line : fitLine(font, text, width);
}

function tokens(text) {
  // 拉丁串在中文标点后可断行，例如「Fireworks、Together、Baseten」。
  return text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}][，。！？：；、）》”’]*|[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\s，。！？：；、]+[，。！？：；、）》”’]*|[，。！？：；、]+|\s+/gu) || [];
}

function wrap(font, text, width, tracking) {
  return wrapWords(font, tokens(text), width, tracking);
}

function wrapWords(font, words, width, tracking) {
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line + word;
    if (!line || measure(font, next.trimEnd(), tracking) <= width) line = next;
    else {
      lines.push(line.trim());
      line = word.trimStart();
    }
  }
  return line.trim() ? lines.concat(line.trim()) : lines;
}

function balance(font, text, width, tracking) {
  const count = wrap(font, text, width, tracking).length;
  let low = Math.max(0, ...tokens(text).map(word => measure(font, word, tracking)));
  let high = width;
  while (count > 1 && high - low > 2) {
    const middle = (low + high) / 2;
    if (wrap(font, text, middle, tracking).length === count) high = middle;
    else low = middle;
  }
  return wrap(font, text, high, tracking);
}

function splitWord(font, word, width, tracking) {
  const pieces = [];
  let piece = '';
  for (const ch of word) {
    if (piece && measure(font, piece + ch, tracking) > width) {
      pieces.push(piece);
      piece = '';
    }
    piece += ch;
  }
  return pieces.concat(piece);
}

function layoutTitle(text, width, maxLines, maxHeight) {
  for (const size of DISPLAY_SIZES) {
    const font = face('display', size);
    const tracking = size * DISPLAY_TRACKING;
    const value = glyphText(font, text, true);
    if (tokens(value).some(word => measure(font, word, tracking) > width)) continue;
    const lines = balance(font, value, width, tracking);
    if (lines.length <= maxLines && font.capHeight + (lines.length - 1) * pitch(font) <= maxHeight) return { font, tracking, lines };
  }
  const font = face('display', DISPLAY_SIZES[DISPLAY_SIZES.length - 1]);
  const tracking = font.size * DISPLAY_TRACKING;
  const words = tokens(glyphText(font, text, true)).flatMap(word => splitWord(font, word, width, tracking));
  const lines = wrapWords(font, words, width, tracking);
  if (lines.length > maxLines) lines.splice(maxLines - 1, lines.length, fitLine(font, lines.slice(maxLines - 1).join(' '), width, tracking));
  return { font, tracking, lines };
}

function layoutHeader(label, meta) {
  const font = face('mono', LABEL_SIZE);
  const left = glyphText(font, label, true);
  const room = RIGHT - LEFT - Math.min(measure(font, left, LABEL_TRACKING), RIGHT - LEFT) - 48;
  const right = meta && room >= 120 ? fitLine(font, glyphText(font, meta, true), room, LABEL_TRACKING) : '';
  return { right, left: fitLine(font, left, RIGHT - LEFT - (right ? measure(font, right, LABEL_TRACKING) + 48 : 0), LABEL_TRACKING) };
}

function centered(font, text, tracking = 0) {
  return Math.round((WIDTH - measure(font, text, tracking)) / 2);
}

// 中文按词宽折行会把「AI 系统」这类词组拆到两行；两句各自放得下时，一句一行。
function homeBody(serif, description) {
  const text = glyphText(serif, description, false);
  const sentences = text.split(/(?<=[。！？])/).map(part => part.trim()).filter(Boolean);
  if (sentences.length === 2 && sentences.every(sentence => measure(serif, sentence) <= 740)) return sentences;
  return balance(serif, text, 740, 0).slice(0, 2);
}

function layoutHome(spec) {
  const serif = face('serif', BODY_SIZE);
  const label = face('mono', FOOT_SIZE);
  return {
    header: layoutHeader(spec.label, spec.meta),
    title: layoutTitle(spec.title, RIGHT - LEFT, 2, 220),
    body: homeBody(serif, spec.description),
    stats: fitLine(label, glyphText(label, spec.stats.join(' · '), true), 740, FOOT_TRACKING),
    kicker: glyphText(label, spec.kicker, true),
    cta: glyphText(face('mono', LABEL_SIZE), spec.cta, true),
  };
}

function layoutPage(spec) {
  const serif = face('serif', BODY_SIZE);
  const description = oneLine(serif, glyphText(serif, spec.description, false), RIGHT - LEFT);
  return {
    header: layoutHeader(spec.label, spec.meta),
    title: layoutTitle(spec.title, RIGHT - LEFT, 3, BLOCK_HEIGHT - (description ? BODY_GAP : 0)),
    description,
  };
}

function layout(spec) {
  return spec.kind === 'home' ? layoutHome(spec) : layoutPage(spec);
}

function createCanvas(background = COLORS.paper) {
  const canvas = new Uint8Array(WIDTH * HEIGHT * 3);
  canvas.set(background);
  for (let filled = 3; filled < canvas.length; filled *= 2) canvas.copyWithin(filled, 0, Math.min(filled, canvas.length - filled));
  return canvas;
}

function blend(canvas, x, y, color, level) {
  if (level <= 0 || x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const index = (y * WIDTH + x) * 3;
  for (let channel = 0; channel < 3; channel++) {
    canvas[index + channel] = Math.round(canvas[index + channel] + (color[channel] - canvas[index + channel]) * level / LEVELS);
  }
}

function fillRect(canvas, x, y, width, height, color) {
  for (let row = y; row < y + height; row++) for (let column = x; column < x + width; column++) blend(canvas, column, row, color, LEVELS);
}

function drawText(canvas, font, text, x, y, color, tracking = 0) {
  const chars = Array.from(text);
  let pen = x;
  chars.forEach((ch, index) => {
    if (!Object.prototype.hasOwnProperty.call(font.nativeGlyphs, ch)) {
      const [advance, gx, gy, width, height, offset] = font.cjk.glyphs[ch];
      const scale = font.size / font.cjk.size;
      const w = Math.round(width * scale), h = Math.round(height * scale);
      for (let row = 0; row < h; row++) for (let col = 0; col < w; col++) {
        const level = font.cjk.bitmap[offset + Math.min(height - 1, Math.floor(row / scale)) * width + Math.min(width - 1, Math.floor(col / scale))];
        blend(canvas, Math.round(pen + gx * scale) + col, Math.round(y + gy * scale) + row, color, level);
      }
      pen += advance * scale + tracking;
      return;
    }
    const glyph = font.glyphs[ch];
    const whole = Math.floor(pen);
    const step = Math.round((pen - whole) * font.phases);
    const phase = step % font.phases;
    const [gx, gy, width, height, offset] = glyph.slice(1 + phase * 5, 6 + phase * 5);
    const left = whole + (step === font.phases ? 1 : 0) + gx;
    for (let row = 0; row < height; row++) {
      for (let column = 0; column < width; column++) blend(canvas, left + column, y + gy + row, color, font.bitmap[offset + row * width + column]);
    }
    pen += glyph[0] + (font.kern[ch + (chars[index + 1] || '')] || 0) + tracking;
  });
  return pen - tracking;
}

function drawSegments(canvas, font, text, x, y, colors, tracking) {
  const split = text.indexOf(' · ');
  if (split < 0) return drawText(canvas, font, text, x, y, colors[0], tracking);
  const end = drawText(canvas, font, text.slice(0, split), x, y, colors[0], tracking);
  return drawText(canvas, font, text.slice(split), end + tracking, y, colors[1], tracking);
}

function drawHeader(canvas, { left, right }, colors = [COLORS.blue, COLORS.mute, COLORS.mute]) {
  const font = face('mono', LABEL_SIZE);
  drawSegments(canvas, font, left, LEFT, 82, colors.slice(0, 2), LABEL_TRACKING);
  if (right) drawText(canvas, font, right, RIGHT - measure(font, right, LABEL_TRACKING), 82, colors[2], LABEL_TRACKING);
}

function drawTitle(canvas, { font, tracking, lines }, baseline, color = COLORS.blue, center = false) {
  lines.forEach((line, index) => {
    const x = center ? centered(font, line, tracking) : LEFT;
    drawText(canvas, font, line, x, baseline + index * pitch(font), color, tracking);
  });
}

function corners(canvas, color) {
  const arm = 34;
  const weight = 3;
  [[24, 24, 1, 1], [WIDTH - 24, 24, -1, 1], [24, HEIGHT - 24, 1, -1], [WIDTH - 24, HEIGHT - 24, -1, -1]].forEach(([x, y, dx, dy]) => {
    fillRect(canvas, dx > 0 ? x : x - arm, dy > 0 ? y : y - weight, arm, weight, color);
    fillRect(canvas, dx > 0 ? x : x - weight, dy > 0 ? y : y - arm, weight, arm, color);
  });
}

function paperDots(canvas) {
  for (let y = 48; y < HEIGHT - 24; y += 24) for (let x = 48; x < WIDTH - 24; x += 24) blend(canvas, x, y, COLORS.dot, 6);
}

function drawHome(canvas, card) {
  paperDots(canvas);
  corners(canvas, COLORS.blue);
  const label = face('mono', FOOT_SIZE);
  const top = card.kicker;
  drawText(canvas, label, top, centered(label, top, FOOT_TRACKING * 4), 92, COLORS.blue, FOOT_TRACKING * 4);
  drawTitle(canvas, card.title, 236, COLORS.blue, true);
  const serif = face('serif', BODY_SIZE);
  const bodyTop = 236 + (card.title.lines.length - 1) * pitch(card.title.font) + 70;
  card.body.forEach((line, index) => drawText(canvas, serif, line, centered(serif, line), bodyTop + index * 40, COLORS.ink));
  const button = face('mono', LABEL_SIZE);
  const cta = card.cta;
  const ctaWidth = Math.round(measure(button, cta, LABEL_TRACKING)) + 64;
  const ctaTop = bodyTop + (card.body.length - 1) * 40 + 40;
  const ctaLeft = Math.round((WIDTH - ctaWidth) / 2);
  fillRect(canvas, ctaLeft + 5, ctaTop + 5, ctaWidth, 58, COLORS.tint);
  fillRect(canvas, ctaLeft, ctaTop, ctaWidth, 58, COLORS.ink);
  drawText(canvas, button, cta, ctaLeft + 32, ctaTop + 37, COLORS.cream, LABEL_TRACKING);
  drawText(canvas, label, card.stats, centered(label, card.stats, FOOT_TRACKING), ctaTop + 104, COLORS.mute, FOOT_TRACKING);
}

function drawPage(canvas, card) {
  corners(canvas, COLORS.cream);
  drawHeader(canvas, card.header, [COLORS.cream, COLORS.haze, COLORS.haze]);
  const { font, lines } = card.title;
  const cap = Math.round(font.capHeight);
  const block = cap + (lines.length - 1) * pitch(font) + (card.description ? BODY_GAP : 0);
  const baseline = Math.round(BLOCK_TOP + Math.max(0, (BLOCK_HEIGHT - block) / 2)) + cap;
  drawTitle(canvas, card.title, baseline, COLORS.cream);
  if (card.description) drawText(canvas, face('serif', BODY_SIZE), card.description, LEFT, baseline + (lines.length - 1) * pitch(font) + BODY_GAP, COLORS.haze);
  fillRect(canvas, LEFT, 528, RIGHT - LEFT, 2, COLORS.haze);
  const mark = face('mono', LABEL_SIZE);
  fillRect(canvas, LEFT, 556, 18, 18, COLORS.cream);
  drawText(canvas, mark, glyphText(mark, BRAND_LINE, true), LEFT + 32, 574, COLORS.cream, LABEL_TRACKING);
  const small = face('mono', FOOT_SIZE);
  drawText(canvas, small, DOMAIN, RIGHT - measure(small, DOMAIN, FOOT_TRACKING), 572, COLORS.haze, FOOT_TRACKING);
}

function renderPixels(spec) {
  const home = spec.kind === 'home';
  const canvas = createCanvas(home ? COLORS.paper : COLORS.blue);
  if (home) drawHome(canvas, layout(spec));
  else drawPage(canvas, layout(spec));
  return canvas;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, body) {
  const out = Buffer.alloc(body.length + 12);
  out.writeUInt32BE(body.length, 0);
  out.write(type, 4, 'ascii');
  body.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, body.length + 8)), body.length + 8);
  return out;
}

function encodePng(canvas) {
  const palette = new Map();
  const rows = Buffer.alloc((WIDTH + 1) * HEIGHT);
  for (let y = 0, at = 0, out = 0; y < HEIGHT; y++) {
    out++;
    for (let x = 0; x < WIDTH; x++, at += 3) {
      const key = canvas[at] << 16 | canvas[at + 1] << 8 | canvas[at + 2];
      let index = palette.get(key);
      if (index === undefined) palette.set(key, index = palette.size);
      rows[out++] = index;
    }
  }
  if (palette.size > 256) throw new Error(`Card needs ${palette.size} colors; a palette PNG holds 256`);
  const header = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 8, 3, 0, 0, 0]);
  header.writeUInt32BE(WIDTH, 0);
  header.writeUInt32BE(HEIGHT, 4);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('PLTE', Buffer.from([...palette.keys()].flatMap(key => [key >> 16, key >> 8 & 255, key & 255]))),
    chunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function renderCard(spec) {
  return encodePng(renderPixels(spec));
}

// 返回第一行宽度超出内容区的标题；全部放得下时返回 null。供构建期逐卡检查使用。
function titleOverflow(spec) {
  const { title } = layout(spec);
  return title.lines.find(line => measure(title.font, line, title.tracking) > RIGHT - LEFT) || null;
}

// 返回与原文开头对不上的副标题：折成一行时只能截掉句尾，不能丢掉开头。对得上时返回 null。
function descriptionDrift(spec) {
  if (spec.kind === 'home' || !spec.description) return null;
  const source = glyphText(face('serif', BODY_SIZE), spec.description, false);
  const shown = layoutPage(spec).description.replace(/…$/, '');
  return source.startsWith(shown) ? null : shown;
}

module.exports = { LEVELS, layout, renderCard, renderPixels, titleOverflow, descriptionDrift };
