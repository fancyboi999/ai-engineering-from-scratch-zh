#!/usr/bin/env node
'use strict';

// 构建时只使用显式提供的 OFL 字体与临时 Chromium profile；运行时不需要浏览器。
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { spawn } = require('node:child_process');
const ROOT = path.join(__dirname, '..');
const SHA = '2c76254f6fc379fddfce0a7e84fb5385bb135d3e399294f6eeb6680d0365b74b';

function argument(name, fallback) {
  const at = process.argv.indexOf(name);
  return at < 0 ? fallback : process.argv[at + 1];
}

function collect(root) {
  const text = [fs.readFileSync(path.join(__dirname, '../lib/og-cards.js'), 'utf8'), '深度学习数学中文字体反向传播注意力机制从零构建工程开源独立社区备考'];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name === 'zh.md') {
        text.push(fs.readFileSync(file, 'utf8'));
      }
    }
  }
  for (const dir of ['phases', 'certifications', 'projects', 'manuals']) walk(path.join(root, dir));
  for (const file of ['site/data.js', 'site/og-cards.json', 'site/lesson-seo.json', 'site/certification-seo.json', 'site/projects-data.json', 'site/manuals-data.json']) {
    if (fs.existsSync(path.join(root, file))) text.push(fs.readFileSync(path.join(root, file), 'utf8'));
  }
  // 拉丁字母由三个上游 atlas 提供；汉字、标点及数学符号从 Noto 获取。
  return [...new Set(Array.from(text.join('')).filter(ch => /[\p{Script=Han}\p{Script=Greek}\u2000-\u303f\uff00-\uffef]/u.test(ch) && !/\p{Cf}/u.test(ch)))].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join('');
}

function supported(font) {
  const tableCount = font.readUInt16BE(4);
  let cmap;
  for (let i = 0; i < tableCount; i++) {
    const at = 12 + i * 16;
    if (font.toString('ascii', at, at + 4) === 'cmap') cmap = font.readUInt32BE(at + 8);
  }
  if (cmap === undefined) throw new Error('Font has no cmap');
  const ranges = [];
  for (let i = 0; i < font.readUInt16BE(cmap + 2); i++) {
    const at = cmap + font.readUInt32BE(cmap + 4 + i * 8 + 4);
    if (font.readUInt16BE(at) !== 12) continue;
    for (let j = 0; j < font.readUInt32BE(at + 12); j++) {
      const pos = at + 16 + j * 12;
      ranges.push([font.readUInt32BE(pos), font.readUInt32BE(pos + 4), font.readUInt32BE(pos + 8)]);
    }
  }
  if (!ranges.length) throw new Error('Font has no Unicode format-12 cmap');
  return ch => ranges.some(([lo, hi, glyph]) => ch.codePointAt(0) >= lo && ch.codePointAt(0) <= hi && glyph + ch.codePointAt(0) - lo !== 0);
}

function page(chars) {
  return `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:OGNoto;src:url(/font.otf)}</style><script>
const chars=${JSON.stringify(chars)};
async function run(){
 await document.fonts.load('96px OGNoto', chars); await document.fonts.ready;
 if(!document.fonts.check('96px OGNoto')) throw Error('Noto did not load');
 const canvas=document.createElement('canvas');canvas.width=canvas.height=240;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.font='96px OGNoto';ctx.textBaseline='alphabetic';
 const bytes=[],glyphs={};
 for(const ch of chars){
  ctx.clearRect(0,0,240,240);ctx.fillText(ch,48,144);
  const pixels=ctx.getImageData(0,0,240,240).data;
  let x0=240,y0=240,x1=-1,y1=-1;
  for(let y=0;y<240;y++)for(let x=0;x<240;x++)if(pixels[(y*240+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  if(x1<0){if(!/\\s/u.test(ch))throw Error('Empty glyph '+ch);glyphs[ch]=[ctx.measureText(ch).width,0,0,0,0,bytes.length];continue;}
  glyphs[ch]=[Math.round(ctx.measureText(ch).width*64)/64,x0-48,y0-144,x1-x0+1,y1-y0+1,bytes.length];
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)bytes.push(Math.round(pixels[(y*240+x)*4+3]*15/255));
 }
 const chunks=[];for(let i=0;i<bytes.length;i+=8192)chunks.push(String.fromCharCode(...bytes.slice(i,i+8192)));
 return {size:96,glyphs,bitmap:btoa(chunks.join(''))};
}
run().then(JSON.stringify,e=>'ERROR '+e.message).then(body=>fetch('/result',{method:'POST',body}));</script>`;
}

async function rasterize(chars, font) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'og-fonts-'));
  const server = http.createServer();
  let chrome, timer;
  try {
    return await new Promise((resolve, reject) => {
      server.on('request', (req, res) => {
        if (req.url === '/font.otf') { res.setHeader('Content-Type', 'font/otf'); res.end(font); return; }
        if (req.url !== '/result' || req.method !== 'POST') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page(chars)); return; }
        const chunks = [];
        req.on('data', part => chunks.push(part));
        req.on('end', () => {
          res.end();
          const value = Buffer.concat(chunks).toString();
          try { if (value.startsWith('ERROR')) throw Error(value); resolve(JSON.parse(value)); } catch (e) { reject(e); }
        });
        req.on('error', reject);
      });
      timer = setTimeout(() => reject(Error('Chromium rasterization timed out')), 180000);
      server.listen(0, '127.0.0.1', () => {
        chrome = spawn(process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
          '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
          '--disable-background-networking', `--user-data-dir=${profile}`, `http://127.0.0.1:${server.address().port}/`,
        ], { stdio: 'ignore' });
        chrome.on('error', reject);
      });
      server.on('error', reject);
    });
  } finally {
    clearTimeout(timer); server.closeAllConnections(); server.close();
    if (chrome && chrome.exitCode === null) { const exit = new Promise(resolve => chrome.once('exit', resolve)); chrome.kill(); await exit; }
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  }
}

async function main() {
  const filename = argument('--font', process.env.OG_FONT_PATH);
  if (!filename) throw Error('Supply --font /path/to/NotoSansCJKsc-Regular.otf (see lib/og-fonts/README.md)');
  const font = fs.readFileSync(filename);
  if (crypto.createHash('sha256').update(font).digest('hex') !== SHA) throw Error('Font SHA-256 does not match pinned Noto Sans CJK SC 2.004');
  const out = argument('--out', path.join(ROOT, 'lib/og-fonts'));
  const charsFile = argument('--chars', null);
  const raw = charsFile ? fs.readFileSync(charsFile, 'utf8').trimEnd() : collect(argument('--root', ROOT));
  const supports = supported(font);
  const missing = Array.from(raw).filter(ch => !supports(ch));
  if (charsFile && missing.length) throw Error(`Unsupported source glyphs: ${missing.join('')}`);
  if (missing.length) console.warn(`未加入 atlas 的符号：${missing.join('')}；仅 renderer 中明确的转换规则可回退，其他符号渲染时会报错`);
  const chars = Array.from(raw).filter(supports).join('');
  const data = await rasterize(chars, font);
  const bitmap = Buffer.from(data.bitmap, 'base64');
  data.bitmap = zlib.deflateSync(bitmap, { level: 9 }).toString('base64');
  data.sourceSha256 = SHA;
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'cjk.json'), JSON.stringify(data) + '\n');
  fs.writeFileSync(path.join(out, 'charset.txt'), chars + '\n');
  console.log(`${chars.length} glyphs; bitmap ${bitmap.length} bytes; atlas ${fs.statSync(path.join(out, 'cjk.json')).size} bytes`);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { collect, supported };
