'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const markdown = require('./md-render');
const { phaseSlug } = require('../lib/hub-routes');
const { SITE_HEADER } = require('./build-hubs');
const { HEADER_ASSET_VERSION } = require('../lib/site-navigation');

const ORIGIN = 'https://aieng-zh.cn';
const REPO = 'https://github.com/fancyboi999/ai-engineering-from-scratch-zh';
const ISSUES_URL = `${REPO}/issues`;
const AUTHOR = 'Rohit Ghumare';
const LICENSE = 'MIT 许可证';
const REPO_ROOT = path.resolve(__dirname, '..');
const TOPIC_DIR = 'cheatsheets';
const OUTPUT_DIR = 'cheatsheets';
const BASE = '/cheatsheets';
const COLUMNS = 4;
const MAX_PAGES = 2;
const PAGE_BUDGETS = [870, 930];
const MAX_SUBTITLE = 120;
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=VT323&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=JetBrains+Mono:wght@400;500;700&display=swap';
const THEME_SCRIPT = "(function(){var r=document.documentElement,s='';try{s=localStorage.getItem('theme')||'';}catch(_){}r.setAttribute('data-theme',s||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));function i(){var e=document.getElementById('themeIcon');if(e)e.textContent=r.getAttribute('data-theme')==='light'?'N':'D';}document.addEventListener('DOMContentLoaded',function(){i();var b=document.getElementById('themeToggle');if(b)b.addEventListener('click',function(){var n=r.getAttribute('data-theme')==='light'?'dark':'light';r.setAttribute('data-theme',n);try{localStorage.setItem('theme',n);}catch(_){}i();});});})();";
const HEAD_ASSETS = '<link rel="stylesheet" href="/style.css">\n<link rel="stylesheet" href="/cheatsheets.css">';
const BODY_ASSETS = `<script src="/header.js?v=${HEADER_ASSET_VERSION}" defer></script>\n<script src="/cheatsheets.js" defer></script>`;

const TYPES = {
  concepts: { group: 'know', label: '概念' },
  glossary: { group: 'know', label: '概念' },
  'task-table': { group: 'do', label: '操作' },
  'command-table': { group: 'do', label: '操作' },
  'annotated-code': { group: 'code', label: '代码' },
  flow: { group: 'see', label: '图解' },
  architecture: { group: 'see', label: '图解' },
  defaults: { group: 'numbers', label: '参数' },
  troubleshooting: { group: 'fix', label: '排错' },
  qa: { group: 'recall', label: '回顾' },
  tips: { group: 'recall', label: '回顾' },
};
const GROUPS = [
  ['know', '概念与术语'],
  ['do', '任务与命令'],
  ['code', '代码注解'],
  ['see', '图解'],
  ['numbers', '默认值与数值'],
  ['fix', '故障排查'],
  ['recall', '问答与提示'],
];
const TABLE_SHAPES = {
  'task-table': 2,
  'command-table': 2,
  defaults: 3,
  troubleshooting: 3,
};
const SOURCE_EXTENSIONS = /\.(?:md|py|ts|js|mjs|rs|jl|go|sh|txt|log|json|jsonl|yaml|yml|toml|csv)$/;
const COMMENT = { bash: /\s{2,}#\s/, sh: /\s{2,}#\s/, python: /\s{2,}#\s/, py: /\s{2,}#\s/, yaml: /\s{2,}#\s/, text: /\s{2,}#\s/, typescript: /\s{2,}\/\/\s/, ts: /\s{2,}\/\/\s/, javascript: /\s{2,}\/\/\s/, js: /\s{2,}\/\/\s/, rust: /\s{2,}\/\/\s/ };
const FULL_COMMENT = /^\s*(?:#|\/\/)\s?/;

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sha(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function slugOf(text) {
  return String(text).toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'block';
}

function inline(text) {
  return markdown.inlineFormat(String(text));
}

function plain(text) {
  return String(text).replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/`([^`]*)`/g, '$1').replace(/\*\*?([^*]+)\*\*?/g, '$1').replace(/\s+/g, ' ').trim();
}

function placeholders(html) {
  return html.replace(/&lt;([a-z][a-z0-9_ -]*)&gt;/gi, '<span class="cs-ph">&lt;$1&gt;</span>');
}

function codeSpan(code) {
  return `<code class="cs-cmd" tabindex="0" title="点击复制">${placeholders(escapeHtml(code)).replace(/([=,/])(?![^<]*>)/g, '$1<wbr>')}</code>`;
}

function cellHtml(cell) {
  const whole = /^`([^`]+)`$/.exec(cell.trim());
  if (whole) return codeSpan(whole[1]);
  return placeholders(inline(cell));
}

function parseFrontMatter(lines, errors) {
  const meta = {};
  if (lines[0] !== '---') {
    errors.push('the file must start with a front matter block');
    return { meta, end: 0 };
  }
  let end = 1;
  for (; end < lines.length && lines[end] !== '---'; end++) {
    const match = /^([a-z]+):\s*(.*)$/.exec(lines[end]);
    if (match) meta[match[1]] = match[2].trim();
    else if (lines[end].trim()) errors.push(`front matter line ${end + 1} is not "key: value"`);
  }
  return { meta, end: end + 1 };
}

function splitList(value) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function parseTable(lines) {
  const rows = [];
  for (const line of lines) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = markdown.splitTableRow(line.trim());
    if (cells.every(cell => /^:?-{2,}:?$/.test(cell))) continue;
    rows.push(cells);
  }
  return { header: rows[0] || [], rows: rows.slice(1) };
}

function parseBullets(lines) {
  const items = [];
  for (const line of lines) {
    const match = /^(?:[-*]|\d+[.)])\s+(.+)$/.exec(line);
    if (match) items.push(match[1].trim());
    else if (items.length && /^\s{2,}\S/.test(line)) items[items.length - 1] += ` ${line.trim()}`;
  }
  return items.map(item => {
    const lead = /^\*\*(.+?)\*\*\s*[:：]?\s*(.*)$/.exec(item);
    return lead ? { lead: lead[1].replace(/:$/, ''), text: lead[2] } : { lead: '', text: item };
  });
}

function parseFence(lines) {
  const start = lines.findIndex(line => /^\s*(?:`{3,}|~{3,})/.test(line));
  if (start < 0) return null;
  const open = /^\s*(`{3,}|~{3,})\s*(.*)$/.exec(lines[start]);
  const marker = open[1];
  const lang = open[2].trim().toLowerCase();
  const end = lines.findIndex((line, index) => {
    if (index <= start) return false;
    const close = /^\s*(`{3,}|~{3,})\s*$/.exec(line);
    return Boolean(close) && close[1][0] === marker[0] && close[1].length >= marker.length;
  });
  return { lang, code: lines.slice(start + 1, end < 0 ? undefined : end) };
}

const NODE_KINDS = {
  client: 'M1,1 h12 v8 h-12 z M5,12 h4 M7,9 v3',
  process: 'M1,2 h12 v10 h-12 z M1,5 h12 M3,3.5 h1 M5,3.5 h1',
  store: 'M1,3 a6,2 0 1,0 12,0 a6,2 0 1,0 -12,0 v8 a6,2 0 0,0 12,0 v-8',
  queue: 'M1,2 h12 v3 h-12 z M1,6 h12 v3 h-12 z M1,10 h12 v3 h-12 z',
  gpu: 'M3,3 h8 v8 h-8 z M5,5 h4 v4 h-4 z M5,1 v2 M9,1 v2 M5,11 v2 M9,11 v2 M1,5 h2 M1,9 h2 M11,5 h2 M11,9 h2',
  model: 'M7,1 l6,3.5 v6 l-6,3.5 l-6,-3.5 v-6 z M7,1 v13 M1,4.5 l6,3.5 l6,-3.5',
};

function parseArchitecture(lines, errors, where) {
  const fence = parseFence(lines);
  const nodes = [];
  const edges = [];
  if (!fence || fence.lang !== 'arch') {
    errors.push(`${where}: an architecture block needs a fenced arch block`);
    return { nodes, edges };
  }
  for (const line of fence.code) {
    if (!line.trim()) continue;
    const parts = line.split('|').map(part => part.trim());
    if (parts[0] === 'node') {
      const at = /^(\d+),(\d+)$/.exec(parts[2] || '');
      if (!parts[1] || !at || !parts[3]) errors.push(`${where}: bad node line "${line.trim()}"`);
      else if (parts[5] && !NODE_KINDS[parts[5]]) errors.push(`${where}: node kind "${parts[5]}" must be one of ${Object.keys(NODE_KINDS).join(', ')}`);
      else nodes.push({ id: parts[1], col: Number(at[1]), row: Number(at[2]), label: parts[3], sub: parts[4] || '', kind: parts[5] || '' });
    } else if (parts[0] === 'edge') {
      if (!parts[1] || !parts[2]) errors.push(`${where}: bad edge line "${line.trim()}"`);
      else edges.push({ from: parts[1], to: parts[2], label: parts[3] || '' });
    } else {
      errors.push(`${where}: unknown arch line "${line.trim()}"`);
    }
  }
  const ids = new Set(nodes.map(node => node.id));
  for (const edge of edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) errors.push(`${where}: edge ${edge.from} -> ${edge.to} names a missing node`);
  }
  const cells = new Set();
  for (const node of nodes) {
    const key = `${node.col},${node.row}`;
    if (cells.has(key)) errors.push(`${where}: two nodes share cell ${key}`);
    cells.add(key);
  }
  return { nodes, edges };
}

function parseTopic(text, file = '') {
  const errors = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const { meta, end } = parseFrontMatter(lines, errors);
  for (const key of ['id', 'title', 'subtitle', 'hue', 'sources']) {
    if (!meta[key]) errors.push(`front matter needs "${key}"`);
  }
  if (meta.id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.id)) errors.push(`id "${meta.id}" must be lower case with hyphens`);
  if (file && meta.id && path.basename(file, '.md') !== meta.id) errors.push(`id "${meta.id}" must match the file name`);
  const hue = Number(meta.hue);
  if (!(hue >= 0 && hue < 360)) errors.push('hue must be a number from 0 to 359');
  const blocks = [];
  let current = null;
  for (let i = end; i < lines.length; i++) {
    const heading = /^##\s+(.+?)\s*$/.exec(lines[i]);
    if (heading) {
      current = { title: heading[1], meta: {}, body: [], line: i + 1 };
      blocks.push(current);
      let j = i + 1;
      for (; j < lines.length && lines[j].trim(); j++) {
        const match = /^([a-z]+):\s*(.*)$/.exec(lines[j]);
        if (!match) break;
        current.meta[match[1]] = match[2].trim();
      }
      i = j - 1;
      continue;
    }
    if (current) current.body.push(lines[i]);
  }
  const ids = new Set();
  const parsed = blocks.map(block => {
    const where = `block "${block.title}" (line ${block.line})`;
    const type = block.meta.type;
    if (!TYPES[type]) errors.push(`${where}: unknown type "${type}"`);
    const from = splitList(block.meta.from);
    if (!from.length) errors.push(`${where}: needs a from line`);
    let id = slugOf(block.title);
    while (ids.has(id)) id += '-2';
    ids.add(id);
    const col = block.meta.col ? Number(block.meta.col) : 0;
    if (block.meta.col && !(col >= 1 && col <= COLUMNS)) errors.push(`${where}: col must be 1 to ${COLUMNS}`);
    const defaultSpan = ['annotated-code', 'architecture', 'troubleshooting', 'defaults'].includes(type) ? 2 : 1;
    const span = block.meta.span ? Number(block.meta.span) : defaultSpan;
    if (!(span >= 1 && span <= COLUMNS)) errors.push(`${where}: span must be 1 to ${COLUMNS}`);
    if (col && col + span - 1 > COLUMNS) errors.push(`${where}: col ${col} with span ${span} runs past column ${COLUMNS}`);
    const out = { id, title: block.title, type, from, col, span, lang: block.meta.lang || '', line: block.line };
    if (TABLE_SHAPES[type]) {
      const table = parseTable(block.body);
      if (!table.rows.length) errors.push(`${where}: the table has no rows`);
      for (const row of table.rows) {
        if (row.length !== TABLE_SHAPES[type]) errors.push(`${where}: row "${row.join(' | ')}" needs ${TABLE_SHAPES[type]} cells`);
      }
      out.header = table.header;
      out.rows = table.rows;
    } else if (type === 'annotated-code') {
      const fence = parseFence(block.body);
      if (!fence) errors.push(`${where}: needs one fenced code block`);
      out.lang = (fence && fence.lang) || out.lang || 'text';
      out.code = fence ? fence.code : [];
    } else if (type === 'architecture') {
      Object.assign(out, parseArchitecture(block.body, errors, where));
    } else if (type === 'flow') {
      out.items = parseBullets(block.body);
      if (!out.items.length) errors.push(`${where}: the flow has no steps`);
    } else if (TYPES[type]) {
      out.items = parseBullets(block.body);
      if (!out.items.length) errors.push(`${where}: no bullets`);
    }
    return out;
  });
  if (!parsed.length) errors.push('the topic has no blocks');
  return {
    id: meta.id || '',
    title: meta.title || '',
    subtitle: meta.subtitle || '',
    hue: Number.isFinite(hue) ? hue : 222,
    code: meta.code || initials(meta.title || ''),
    sources: splitList(meta.sources),
    blocks: parsed,
    errors,
    hash: sha(text).slice(0, 12),
  };
}

function initials(title) {
  const words = title.replace(/[^A-Za-z0-9 ]+/g, ' ').split(/\s+/).filter(word => word && !/^(?:and|with|the|of|for|to|a)$/i.test(word));
  return ((words[0] || 'X')[0] + ((words[1] || words[0] || 'X')[words[1] ? 0 : 1] || 'X')).toUpperCase();
}

function textWidth(text, size) {
  return Array.from(String(text)).reduce((width, char) => width + (/[^\x00-\xff]/.test(char) ? size : size * 0.6), 0);
}

function wrap(text, size, width) {
  const words = String(text).match(/[\u2e80-\u9fff]|[^\s\u2e80-\u9fff]+/g) || [];
  const lines = [];
  let line = '';
  for (const word of words) {
    // SVG text has no CSS line wrapping. Split identifiers/URLs that cannot
    // fit even on an empty line, retaining every character and the ARIA name.
    if (textWidth(word, size) > width) {
      if (line) lines.push(line);
      line = '';
      for (const char of Array.from(word)) {
        if (line && textWidth(line + char, size) > width) {
          lines.push(line);
          line = '';
        }
        line += char;
      }
      continue;
    }
    const separator = /[\u2e80-\u9fff]$/.test(line) || /^[\u2e80-\u9fff]/.test(word) ? '' : ' ';
    const next = line ? `${line}${separator}${word}` : word;
    if (line && textWidth(next, size) > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function svgText(lines, x, y, size, className, anchor = 'middle') {
  return lines.map((line, index) => `<text class="${className}" x="${x}" y="${y + index * size * 1.25}" font-size="${size}" text-anchor="${anchor}">${escapeHtml(line)}</text>`).join('');
}

function architectureSvg(source, narrow = false) {
  const block = narrow ? { ...source, span: 1, id: `${source.id}-n`, nodes: source.nodes.map(node => ({ ...node, col: node.row, row: node.col })) } : source;
  const width = 300 * (block.span || 1) + 14 * ((block.span || 1) - 1);
  const cols = Math.max(...block.nodes.map(node => node.col));
  const rows = Math.max(...block.nodes.map(node => node.row));
  const rowOf = new Map(block.nodes.map(node => [node.id, node]));
  const sideLabels = block.edges.filter(edge => rowOf.get(edge.from) && rowOf.get(edge.to) && rowOf.get(edge.from).row === rowOf.get(edge.to).row && edge.label);
  const wantGap = Math.max(28, ...sideLabels.map(edge => textWidth(edge.label, 8.5) + 12));
  const gapX = cols > 1 ? Math.min(wantGap, (width * 0.36) / (cols - 1)) : 0;
  const nodeW = (width - 2 - gapX * (cols - 1)) / cols;
  const labelSize = 10.5;
  const subSize = 9;
  const laid = block.nodes.map(node => ({ ...node, labelLines: wrap(node.label, labelSize, nodeW - 10), subLines: node.sub ? wrap(node.sub, subSize, nodeW - 10) : [] }));
  const nodeH = Math.max(...laid.map(node => 10 + node.labelLines.length * labelSize * 1.25 + node.subLines.length * subSize * 1.25 + 4));
  const gapY = 34;
  const height = rows * nodeH + (rows - 1) * gapY + 2;
  const box = node => ({ x: 1 + (node.col - 1) * (nodeW + gapX), y: 1 + (node.row - 1) * (nodeH + gapY), w: nodeW, h: nodeH });
  const byId = new Map(laid.map(node => [node.id, node]));
  const parts = [];
  for (const edge of block.edges) {
    const a = box(byId.get(edge.from));
    const b = box(byId.get(edge.to));
    const ax = a.x + a.w / 2;
    const ay = a.y + a.h / 2;
    const bx = b.x + b.w / 2;
    const by = b.y + b.h / 2;
    const clip = (r, dx, dy) => {
      const tx = dx ? (r.w / 2) / Math.abs(dx) : Infinity;
      const ty = dy ? (r.h / 2) / Math.abs(dy) : Infinity;
      const t = Math.min(tx, ty);
      return t;
    };
    const dx = bx - ax;
    const dy = by - ay;
    const t1 = clip(a, dx, dy);
    const t2 = clip(b, dx, dy);
    const x1 = ax + dx * t1;
    const y1 = ay + dy * t1;
    const x2 = bx - dx * t2;
    const y2 = by - dy * t2;
    const round = value => Math.round(value * 10) / 10;
    parts.push(`<line class="cs-arch-edge" x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" marker-end="url(#cs-arrow-${block.id})"/>`);
    if (edge.label) {
      const mx = round((x1 + x2) / 2);
      const my = round((y1 + y2) / 2);
      const lw = textWidth(edge.label, 8.5) + 6;
      if (Math.abs(dy) < 1) {
        parts.push(svgText([edge.label], mx, round(my - 4), 8.5, 'cs-arch-elabel'));
      } else if (Math.abs(dx) < 1) {
        parts.push(svgText([edge.label], round(mx + 5), round(my + 3), 8.5, 'cs-arch-elabel', 'start'));
      } else {
        parts.push(`<rect class="cs-arch-knock" x="${round(mx - lw / 2)}" y="${round(my - 6.5)}" width="${round(lw)}" height="12"/>`);
        parts.push(svgText([edge.label], mx, round(my + 2.5), 8.5, 'cs-arch-elabel'));
      }
    }
  }
  for (const node of laid) {
    const r = box(node);
    const round = value => Math.round(value * 10) / 10;
    parts.push(`<rect class="cs-arch-node" x="${round(r.x)}" y="${round(r.y)}" width="${round(r.w)}" height="${round(r.h)}" rx="2"/>`);
    if (node.kind) parts.push(`<path class="cs-arch-kind" transform="translate(${round(r.x + 4)} ${round(r.y + 4)}) scale(0.8)" d="${NODE_KINDS[node.kind]}"><title>${node.kind}</title></path>`);
    const top = r.y + (r.h - (node.labelLines.length * labelSize * 1.25 + node.subLines.length * subSize * 1.25)) / 2 + labelSize;
    parts.push(svgText(node.labelLines, round(r.x + r.w / 2), round(top), labelSize, 'cs-arch-label'));
    if (node.subLines.length) parts.push(svgText(node.subLines, round(r.x + r.w / 2), round(top + node.labelLines.length * labelSize * 1.25), subSize, 'cs-arch-sub'));
  }
  const marker = `<defs><marker id="cs-arrow-${block.id}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="cs-arch-head" d="M0,0 L8,4 L0,8 z"/></marker></defs>`;
  const title = `${block.title}: ${block.nodes.map(node => node.label).join(', ')}`;
  return `<svg class="cs-arch${narrow ? ' cs-arch-narrow' : ' cs-arch-wide'}" viewBox="0 0 ${width} ${Math.round(height)}" role="img" aria-label="${escapeHtml(title)}">${marker}${parts.join('')}</svg>`;
}

function flowSvg(block) {
  const width = 300 * (block.span || 1) + 14 * ((block.span || 1) - 1);
  const size = 9.5;
  const left = 30;
  const textW = width - left - 8;
  let y = 2;
  const parts = [];
  const steps = block.items.map((item, index) => {
    const lead = plain(item.lead);
    const body = plain(item.text);
    const leadLines = lead ? wrap(lead, size, textW) : [];
    const bodyLines = wrap(body, size * 0.95, textW);
    const h = 8 + leadLines.length * size * 1.3 + bodyLines.length * size * 0.95 * 1.3 + 4;
    const step = { index, leadLines, bodyLines, y, h };
    y += h + 12;
    return step;
  });
  const round = value => Math.round(value * 10) / 10;
  for (const step of steps) {
    if (step.index < steps.length - 1) parts.push(`<line class="cs-flow-link" x1="12" y1="${round(step.y + 22)}" x2="12" y2="${round(step.y + step.h + 12)}"/>`);
    parts.push(`<rect class="cs-flow-box" x="${left - 4}" y="${round(step.y)}" width="${width - left + 3}" height="${round(step.h)}" rx="2"/>`);
    parts.push(`<circle class="cs-flow-dot" cx="12" cy="${round(step.y + 11)}" r="10"/>`);
    parts.push(svgText([String(step.index + 1)], 12, round(step.y + 14.5), 10, 'cs-flow-num'));
    let ty = step.y + 6 + size;
    if (step.leadLines.length) {
      parts.push(svgText(step.leadLines, left + 2, round(ty), size, 'cs-flow-lead', 'start'));
      ty += step.leadLines.length * size * 1.3;
    }
    parts.push(svgText(step.bodyLines, left + 2, round(ty), size * 0.95, 'cs-flow-text', 'start'));
  }
  const title = `${block.title}: ${block.items.map((item, index) => `${index + 1} ${plain(item.lead || item.text)}`).join(', ')}`;
  return `<svg class="cs-flow" viewBox="0 0 ${width} ${Math.round(y - 10)}" role="img" aria-label="${escapeHtml(title)}">${parts.join('')}</svg>`;
}

function annotatedHtml(block) {
  const pattern = COMMENT[block.lang] || COMMENT.bash;
  const rows = block.code.map(line => {
    if (!line.trim()) return '<div class="cs-ann-gap"></div>';
    if (FULL_COMMENT.test(line) && !/^\s*#!/.test(line)) return `<div class="cs-ann-head">${escapeHtml(line.replace(FULL_COMMENT, ''))}</div>`;
    const match = pattern.exec(line);
    const code = match ? line.slice(0, match.index) : line;
    const note = match ? line.slice(match.index + match[0].length) : '';
    const highlighted = placeholders(markdown.highlightSyntax(code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'), block.lang));
    return `<div class="cs-ann-row"><code>${highlighted}</code><span>${escapeHtml(note)}</span></div>`;
  });
  const copy = block.code.filter(line => line.trim() && !(FULL_COMMENT.test(line) && !/^\s*#!/.test(line))).map(line => {
    const match = pattern.exec(line);
    return (match ? line.slice(0, match.index) : line).replace(/\s+$/, '');
  }).join('\n');
  return `<div class="cs-ann" data-lang="${escapeHtml(block.lang)}"><button type="button" class="cs-copy" data-copy="${escapeHtml(copy)}" aria-label="复制代码">复制</button>${rows.join('')}</div>`;
}

function tableHtml(block) {
  const head = block.header.length ? `<thead><tr>${block.header.map(cell => `<th scope="col">${inline(cell)}</th>`).join('')}</tr></thead>` : '';
  const body = block.rows.map(row => `<tr>${row.map((cell, index) => (index === 0 ? `<th scope="row">${cellHtml(cell)}</th>` : `<td>${cellHtml(cell)}</td>`)).join('')}</tr>`).join('');
  return `<table class="cs-table cs-cols-${block.rows[0] ? block.rows[0].length : 2}">${head}<tbody>${body}</tbody></table>`;
}

function listHtml(block) {
  if (block.type === 'concepts' || block.type === 'glossary') {
    return `<dl class="cs-defs">${block.items.map(item => `<div><dt>${placeholders(inline(item.lead || ''))}</dt><dd>${placeholders(inline(item.text))}</dd></div>`).join('')}</dl>`;
  }
  if (block.type === 'qa') {
    return `<dl class="cs-qa">${block.items.map(item => `<div><dt>${inline(item.lead || '')}</dt><dd>${placeholders(inline(item.text))}</dd></div>`).join('')}</dl>`;
  }
  return `<ul class="cs-tips">${block.items.map(item => `<li>${item.lead ? `<strong>${inline(item.lead)}</strong> ` : ''}${placeholders(inline(item.text))}</li>`).join('')}</ul>`;
}

function sourceLink(source) {
  const lesson = /^phases\/(\d+)-[^/]+\/(\d+)-[^/]+(?:\/(.*))?$/.exec(source);
  const lessonDir = /^(phases\/[^/]+\/[^/]+)/.exec(source);
  if (lesson && (!lesson[3] || lesson[3] === 'docs/zh.md')) return { href: `/lessons/${lessonDir[1].replace(/^phases\//, '')}/`, label: `课程 ${lesson[1]}.${lesson[2]}` };
  if (lesson) return { href: `${REPO}/blob/main/${source}`, label: `${lesson[1]}.${lesson[2]} ${lesson[3]}` };
  const section = /^manuals\/([^/]+)\/sections\/((?:r-)?\d+(?:-\d+)?)-[^/]+\.md$/.exec(source);
  if (section) {
    const file = path.basename(source, '.md');
    const anchor = `s-${file.replace(/^\d+-\d+-/, '').replace(/^r-\d+-/, 'ref-')}`;
    const number = section[2].startsWith('r-') ? `R${section[2].slice(2)}` : section[2].replace('-', '.');
    return { href: `/manual-${section[1]}#${anchor}`, label: `${section[1]} §${number}` };
  }
  const manualRoot = /^manuals\/([^/]+)\/?$/.exec(source);
  if (manualRoot) return { href: `/manual-${manualRoot[1]}`, label: manualRoot[1] };
  const manualFile = /^manuals\/([^/]+)\/(.+)$/.exec(source);
  if (manualFile) return { href: `${REPO}/blob/main/${source}`, label: `${manualFile[1]} ${manualFile[2].replace(/^capture\/out\//, '捕获记录：').replace(/^capture\//, '捕获记录：')}` };
  return { href: `${REPO}/blob/main/${source}`, label: source.split('/').slice(-2).join('/') };
}

function blockBody(block) {
  if (TABLE_SHAPES[block.type]) return tableHtml(block);
  if (block.type === 'annotated-code') return annotatedHtml(block);
  if (block.type === 'architecture') return architectureSvg(block) + architectureSvg(block, true);
  if (block.type === 'flow') return flowSvg(block);
  return listHtml(block);
}

function blockHtml(block, place, href = '') {
  const group = TYPES[block.type] ? TYPES[block.type].group : 'know';
  const from = block.from.map(source => {
    const link = sourceLink(source);
    return `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`;
  }).join(', ');
  const style = place ? ` style="grid-column:${place.col} / span ${place.span};grid-row:${place.row} / span ${place.rows}"` : '';
  const wide = place && place.span > 1 ? ' cs-wide' : '';
  return `<section class="cs-block cs-g-${group} cs-t-${block.type}${wide}" id="${block.id}"${style}><h2 class="cs-bar"><span>${placeholders(inline(block.title))}</span><a class="cs-anchor" href="${href}#${block.id}" aria-label="链接到此区块">#</a></h2><div class="cs-bb">${blockBody(block)}</div><p class="cs-from">来源 ${from}</p></section>`;
}

function displayLength(text) {
  return textWidth(text, 1) / 0.6;
}

function textLength(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, 'x').length;
}

function estimateBlock(block) {
  const scale = block.span || 1;
  let h = 34;
  if (TABLE_SHAPES[block.type]) {
    const widths = block.type === 'troubleshooting' ? [14, 16, 20] : block.type === 'defaults' ? [12, 12, 16] : [18, 22];
    h += 16;
    for (const row of block.rows) h += 6 + 17 * Math.max(...row.map((cell, index) => Math.ceil(displayLength(plain(cell)) / (widths[index] * scale)) || 1));
  } else if (block.type === 'annotated-code') {
    h += 18 + block.code.reduce((sum, line) => sum + (line.trim() ? 17 * Math.max(1, Math.ceil(line.length / (34 * scale))) : 6), 0);
  } else if (block.type === 'architecture' || block.type === 'flow') {
    const svg = block.type === 'architecture' ? architectureSvg(block) : flowSvg(block);
    const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
    h += viewBox ? Number(viewBox[2]) * (330 * scale) / Number(viewBox[1]) : 200;
  } else {
    for (const item of block.items) {
      if (block.type === 'qa') h += 8 + 18 * (Math.ceil(displayLength(plain(item.lead)) / (40 * scale)) + Math.ceil(displayLength(plain(item.text)) / (44 * scale)));
      else h += 6 + 18 * Math.ceil((displayLength(plain(item.lead)) + displayLength(plain(item.text)) + 2) / (44 * scale));
    }
  }
  return h + 16;
}

const ROW_UNIT = 8;
const STRETCH_ROWS = 40;
const BLOCK_GAP = 12;

function layout(topic) {
  const heights = topic.blocks.map(estimateBlock);
  const pages = [];
  const newPage = () => {
    const budget = Math.floor((PAGE_BUDGETS[pages.length] || PAGE_BUDGETS[PAGE_BUDGETS.length - 1]) / ROW_UNIT);
    const page = { budget, taken: Array.from({ length: COLUMNS }, () => []) };
    pages.push(page);
    return page;
  };
  newPage();
  const fit = (page, block, rows) => {
    const span = Math.min(block.span || 1, COLUMNS);
    const free = (col, start) => start + rows <= page.budget && page.taken[col].every(([a, b]) => start + rows <= a || start >= b);
    const columns = block.col ? [block.col - 1] : Array.from({ length: COLUMNS - span + 1 }, (_, c) => c);
    let best = null;
    for (const col of columns) {
      const starts = [0].concat(...Array.from({ length: span }, (_, k) => page.taken[col + k].map(([, b]) => b))).sort((a, b) => a - b);
      for (const start of starts) {
        let ok = true;
        for (let k = 0; k < span && ok; k++) ok = free(col + k, start);
        if (ok) {
          if (!best || start < best.start || (start === best.start && col < best.col)) best = { col, start };
          break;
        }
      }
    }
    return best && { ...best, span };
  };
  const places = topic.blocks.map((block, index) => {
    const rows = Math.ceil((heights[index] + BLOCK_GAP) / ROW_UNIT);
    let pageIndex = 0;
    let spot = null;
    for (; pageIndex < pages.length && !spot; pageIndex++) spot = fit(pages[pageIndex], block, rows);
    if (spot) pageIndex--;
    else {
      const page = newPage();
      pageIndex = pages.length - 1;
      spot = fit(page, block, Math.min(rows, page.budget)) || { col: 0, start: 0, span: Math.min(block.span || 1, COLUMNS) };
    }
    for (let k = 0; k < spot.span; k++) pages[pageIndex].taken[spot.col + k].push([spot.start, spot.start + rows]);
    return { page: pageIndex, col: spot.col + 1, span: spot.span, row: spot.start + 1, rows };
  });
  const used = pages.map(page => Math.max(0, ...page.taken.flat().map(([, b]) => b)) * ROW_UNIT);
  for (const place of places) {
    const page = pages[place.page];
    const start = place.row - 1;
    const end = start + place.rows;
    let limit = page.budget;
    for (let c = place.col - 1; c < place.col - 1 + place.span; c++) {
      for (const [a] of page.taken[c]) if (a >= end && a < limit) limit = a;
    }
    const lastRow = Math.max(0, ...page.taken.flat().map(([, b]) => b));
    if (limit === page.budget) limit = Math.min(limit, lastRow);
    if (limit > end && limit - end <= STRETCH_ROWS) place.rows = limit - start;
  }
  return { places, heights, used, pages: pages.length };
}

function legendHtml(topic) {
  const used = new Set(topic.blocks.map(block => TYPES[block.type] && TYPES[block.type].group));
  return `<ul class="cs-legend" aria-label="颜色图例">${GROUPS.filter(([group]) => used.has(group)).map(([group, label]) => `<li class="cs-g-${group}"><span aria-hidden="true"></span>${label}</li>`).join('')}</ul>`;
}

function copyLine(year) {
  return `© ${year} ${AUTHOR} · ${LICENSE}`;
}

function posterMain(topic, year, neighbours) {
  const { places, pages } = layout(topic);
  const cols = Array.from({ length: pages }, (_, page) => `<div class="cs-grid cs-sheet-page" data-page="${page + 1}">${topic.blocks.map((block, index) => (places[index].page === page ? blockHtml(block, places[index], topic.href) : '')).join('')}</div>`).join('');
  const sources = topic.sources.map(source => {
    const link = sourceLink(source);
    return `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`;
  }).join('');
  const head = `<header class="cs-poster-head"><div class="cs-title-block"><span class="cs-code" aria-hidden="true">${escapeHtml(topic.code)}</span><div><p class="cs-kicker"><a href="${BASE}">速查表</a></p><h1>${escapeHtml(topic.title)}</h1><p class="cs-sub">${placeholders(inline(topic.subtitle))}</p></div></div><div class="cs-head-side">${legendHtml(topic)}<p class="cs-actions"><button type="button" class="cs-print" data-print>打印</button><a href="${REPO}/blob/main/${TOPIC_DIR}/${topic.id}.md">源文件</a></p></div></header>`;
  const pager = [neighbours.previous && `<a href="${neighbours.previous.href}" rel="prev">← ${escapeHtml(neighbours.previous.title)}</a>`, `<a href="${BASE}">全部速查表</a>`, neighbours.next && `<a href="${neighbours.next.href}" rel="next">${escapeHtml(neighbours.next.title)} →</a>`].filter(Boolean).join('');
  const foot = `<footer class="cs-foot"><p class="cs-covers"><span>相关课程</span>${sources}</p><nav class="cs-pager" aria-label="速查表导航">${pager}</nav><p class="cs-stamp"><span>aieng-zh.cn${BASE}/${topic.id}</span><span>${copyLine(year)}</span><span>源文件 ${topic.hash}</span></p></footer>`;
  return `<main id="main" class="cs-page cs-poster">${head}${cols}${foot}</main>`;
}

function topicCounts(topic) {
  const rows = topic.blocks.filter(block => TABLE_SHAPES[block.type]).reduce((sum, block) => sum + block.rows.length, 0);
  const diagrams = topic.blocks.filter(block => block.type === 'flow' || block.type === 'architecture').length;
  return { blocks: topic.blocks.length, rows, diagrams };
}

function indexMain(topics, year, phases) {
  const search = `<div class="cs-search" role="search"><label for="cs-q" class="cs-kicker">搜索任务、命令与术语</label><input id="cs-q" type="search" autocomplete="off" spellcheck="false" placeholder="显存比例、因果掩码、预算" data-index="${BASE}/search.json"><p class="cs-search-count" aria-live="polite"></p><ol class="cs-results" hidden></ol></div>`;
  const tiles = topics.map(topic => {
    const counts = topicCounts(topic);
    return `<li class="cs-tile" style="--h:${topic.hue}"><a href="${topic.href}"><span class="cs-code" aria-hidden="true">${escapeHtml(topic.code)}</span><span class="cs-tile-name">${escapeHtml(topic.title)}</span><span class="cs-tile-sub">${escapeHtml(plain(topic.subtitle))}</span><span class="cs-tile-meta">${counts.rows} 行 · ${counts.diagrams} 张图 · ${counts.blocks} 个区块</span></a></li>`;
  }).join('');
  const byPhase = phases.filter(phase => phase.topics.length).map(phase => `<li id="p-${phase.slug}"><a href="/phase/${phase.slug}">${escapeHtml(phase.label)}</a><span>${phase.topics.map(topic => `<a href="${topic.href}">${escapeHtml(topic.title)}</a>`).join(', ')}</span></li>`).join('');
  const head = `<header class="cs-index-head"><p class="cs-kicker">AI Engineering from Scratch</p><h1>速查表</h1><p class="cs-sub">每个主题一张海报，汇集工作中常用的任务、命令、代码、图解、默认值和排错方法。全部内容均来自本课程的课程正文或技术手册。</p>${search}</header>`;
  const list = `<section class="cs-index-section" aria-labelledby="topics"><h2 id="topics">主题</h2><ol class="cs-tiles">${tiles}</ol></section>`;
  const phaseList = byPhase ? `<section class="cs-index-section" aria-labelledby="by-phase"><h2 id="by-phase">按阶段浏览</h2><ul class="cs-by-phase">${byPhase}</ul></section>` : '';
  const how = '<section class="cs-index-section" aria-labelledby="how"><h2 id="how">使用方法</h2><ul class="cs-tips"><li>颜色表示区块类型：蓝色为任务与命令，红色为排错方法。每张海报顶部都有图例。</li><li>点击命令即可复制。请替换尖括号中的占位值，例如 <code>&lt;model&gt;</code>.</li><li>每个区块都标明了来源课程或手册章节，需要了解原理时可直接打开。</li><li>每张海报可打印为一至两页横向页面，适配 A4 和 Letter 纸张。</li></ul></section>';
  return `<main id="main" class="cs-page cs-index">${head}${list}${phaseList}${how}<footer class="cs-foot"><p class="cs-stamp"><span>aieng-zh.cn${BASE}</span><span>${copyLine(year)}</span></p></footer></main>`;
}

function shell({ title, description, href, card, main, bodyClass, hue = 222 }, assets) {
  const canonical = ORIGIN + href;
  const image = `${ORIGIN}/og/${card}.png`;
  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<base href="/">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="AI Engineering from Scratch">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${image}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONT_LINK}" rel="stylesheet">
${assets.head}
<script>${THEME_SCRIPT}</script>
</head>
<body class="${bodyClass}" style="--h:${hue}">
<a href="${href}#main" class="skip-link">跳到正文</a>
${SITE_HEADER}
${main}
${assets.body}
</body>
</html>
`;
}

function editionDate(root) {
  const epoch = Number(process.env.SOURCE_DATE_EPOCH);
  if (epoch > 0) return new Date(epoch * 1000).toISOString().slice(0, 10);
  try {
    const date = execFileSync('git', ['log', '-1', '--format=%cs'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  } catch (_) {}
  return new Date().toISOString().slice(0, 10);
}

function topicFiles(root) {
  const dir = path.join(root, TOPIC_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(name => name.endsWith('.md') && name !== 'AUTHORING.md' && name !== 'README.md').sort().map(name => path.join(dir, name));
}

function loadTopics(root = REPO_ROOT) {
  return topicFiles(root).map(file => {
    const topic = parseTopic(fs.readFileSync(file, 'utf8'), file);
    topic.file = path.relative(root, file);
    topic.href = `${BASE}/${topic.id}`;
    return topic;
  });
}

function coveredLessons(topic, root = REPO_ROOT) {
  const lessons = new Set();
  for (const source of topic.sources.concat(topic.blocks.flatMap(block => block.from))) {
    const lesson = /^phases\/([^/]+)\/([^/]+)/.exec(source);
    if (lesson) {
      lessons.add(`phases/${lesson[1]}/${lesson[2]}`);
      continue;
    }
    const phase = /^phases\/([^/]+)\/?$/.exec(source);
    if (phase && fs.existsSync(path.join(root, source))) {
      for (const name of fs.readdirSync(path.join(root, source)).sort()) {
        if (fs.existsSync(path.join(root, source, name, 'docs', 'zh.md'))) lessons.add(`phases/${phase[1]}/${name}`);
      }
    }
  }
  return Array.from(lessons).sort();
}

function coverage(topics, root = REPO_ROOT) {
  const lessons = {};
  const phases = {};
  for (const topic of topics) {
    for (const lesson of coveredLessons(topic, root)) {
      (lessons[lesson] = lessons[lesson] || []).push({ id: topic.id, title: topic.title, href: topic.href });
      const slug = phaseSlug(lesson.split('/')[1]);
      phases[slug] = phases[slug] || [];
      if (!phases[slug].some(item => item.id === topic.id)) phases[slug].push({ id: topic.id, title: topic.title, href: topic.href });
    }
  }
  return { lessons, phases };
}

function phaseList(root, map) {
  const dir = path.join(root, 'phases');
  return fs.readdirSync(dir).filter(name => /^\d+-/.test(name)).sort().map(name => {
    const readme = path.join(dir, name, 'README.md');
    const text = fs.existsSync(readme) ? fs.readFileSync(readme, 'utf8') : '';
    const title = /^#\s+(Phase\s+\d+\s*:\s*.+?)\s*$/m.exec(text);
    const slug = phaseSlug(name);
    return { slug, label: title ? title[1] : name, topics: map.phases[slug] || [] };
  });
}

function searchIndex(topics) {
  return topics.map(topic => ({
    i: topic.id,
    t: topic.title,
    c: topic.code,
    h: topic.hue,
    r: topic.blocks.flatMap(block => {
      if (TABLE_SHAPES[block.type]) return block.rows.map(row => [plain(row[0]), plain(row[1]), block.id]);
      if (block.type === 'concepts' || block.type === 'glossary') return block.items.map(item => [plain(item.lead), plain(item.text), block.id]);
      return [[plain(block.title), '', block.id]];
    }),
  }));
}

function topicErrors(topics) {
  return topics.flatMap(topic => topic.errors.map(error => `${topic.file}: ${error}`));
}

function buildCheatsheets({ root = REPO_ROOT, siteDir = __dirname, edition, versionHtml = html => html } = {}) {
  const topics = loadTopics(root);
  const invalid = topicErrors(topics);
  if (invalid.length) throw new Error(`Cheat sheet topics have errors. Run node site/build-cheatsheets.js --check for the full report.\n${invalid.join('\n')}`);
  const assets = { head: versionHtml(HEAD_ASSETS, siteDir), body: versionHtml(BODY_ASSETS, siteDir) };
  const date = edition || editionDate(root);
  const year = date.slice(0, 4);
  const map = coverage(topics, root);
  const phases = phaseList(root, map);
  const pages = [{
    file: 'index.html',
    href: BASE,
    html: shell({ title: '速查表 - AI 工程从零开始', description: 'AI 工程中文速查表：按主题整理任务、命令、代码注解、图解、默认值与排错方法，支持打印。', href: BASE, card: 'page/home', main: indexMain(topics, year, phases), bodyClass: 'cs-body' }, assets),
  }];
  topics.forEach((topic, index) => {
    const neighbours = { previous: topics[index - 1], next: topics[index + 1] };
    pages.push({
      file: `${topic.id}.html`,
      href: topic.href,
      html: shell({ title: `${topic.title}速查表 - AI 工程从零开始`, description: `${topic.title}速查表。${plain(topic.subtitle)}`, href: topic.href, card: 'page/home', main: posterMain(topic, year, neighbours), bodyClass: 'cs-body', hue: topic.hue }, assets),
    });
  });
  return { topics, pages, date, map, search: JSON.stringify(searchIndex(topics)) };
}

function readSources(sources, root, cache) {
  return sources.map(source => {
    if (cache.has(source)) return cache.get(source);
    const full = path.join(root, source);
    let text = '';
    const walk = target => {
      const stat = fs.statSync(target);
      if (stat.isDirectory()) {
        for (const name of fs.readdirSync(target).sort()) {
          if (name.startsWith('.') || name === 'node_modules' || name === '__pycache__') continue;
          walk(path.join(target, name));
        }
      } else if (SOURCE_EXTENSIONS.test(target) && stat.size < 2000000) {
        text += `\n${fs.readFileSync(target, 'utf8')}`;
      }
    };
    if (fs.existsSync(full)) walk(full);
    cache.set(source, text);
    return text;
  }).join('\n');
}

function factTokens(text) {
  const cleaned = String(text).replace(/<[a-z][a-z0-9_ -]*>/gi, ' ');
  const tokens = new Set();
  for (const match of cleaned.matchAll(/(?:^|[\s`(=])(--[a-z][a-z0-9-]*)/g)) tokens.add(match[1]);
  for (const match of cleaned.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+\b/g)) {
    if (!/^(?:e\.g|i\.e)$/i.test(match[0]) && !/\.(?:md|py|ts|js|json|txt|log|yaml|sh)$/.test(match[0])) tokens.add(match[0]);
  }
  for (const match of cleaned.matchAll(/\b[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]+\b/g)) tokens.add(match[0]);
  for (const match of cleaned.matchAll(/\b([A-Za-z_][A-Za-z0-9_]{2,})\(/g)) tokens.add(match[1]);
  return Array.from(tokens);
}

function blockFacts(block) {
  const facts = [];
  if (TABLE_SHAPES[block.type]) {
    for (const row of block.rows) {
      const codeCells = row.filter(cell => /`/.test(cell)).map(cell => (cell.match(/`([^`]+)`/g) || []).map(span => span.slice(1, -1)).join(' '));
      for (const token of factTokens(codeCells.join(' '))) facts.push(token);
      if (block.type === 'defaults') {
        const value = row[1].replace(/`/g, '').trim();
        if (/[\u2e80-\u9fff]/.test(value)) {
          // 中文说明没有逐字对照；数值仍必须在来源中出现。
          facts.push(...(value.match(/\d[\d,.]*(?:-\d[\d,.]*)?%?/g) || []));
        } else if (value && !/^(?:none|off|on|yes|no|true|false)$/i.test(value)) facts.push(value);
      }
    }
  } else if (block.type === 'annotated-code') {
    const pattern = COMMENT[block.lang] || COMMENT.bash;
    for (const line of block.code) {
      if (FULL_COMMENT.test(line)) continue;
      const match = pattern.exec(line);
      for (const token of factTokens(match ? line.slice(0, match.index) : line)) facts.push(token);
    }
  } else if (block.type === 'architecture') {
    for (const node of block.nodes) for (const token of factTokens(`${node.label} ${node.sub}`)) facts.push(token);
  } else if (block.items) {
    for (const item of block.items) {
      const spans = (`${item.lead} ${item.text}`.match(/`([^`]+)`/g) || []).map(span => span.slice(1, -1)).join(' ');
      for (const token of factTokens(spans)) facts.push(token);
    }
  }
  return Array.from(new Set(facts));
}

function checkTopic(topic, root = REPO_ROOT, cache = new Map()) {
  const problems = topic.errors.map(error => `${topic.file}: ${error}`);
  if (problems.length) return problems;
  for (const source of topic.sources) {
    if (!fs.existsSync(path.join(root, source))) problems.push(`${topic.file}: source ${source} does not exist`);
  }
  for (const block of topic.blocks) {
    const missing = block.from.filter(source => !fs.existsSync(path.join(root, source)));
    for (const source of missing) problems.push(`${topic.file}: block "${block.title}" names ${source}, which does not exist`);
    if (missing.length) continue;
    const text = readSources(block.from, root, cache).replace(/`/g, '');
    for (const fact of blockFacts(block)) {
      if (!text.includes(fact)) problems.push(`${topic.file}: block "${block.title}": "${fact}" is not in its from files`);
    }
  }
  if (topic.subtitle.length > MAX_SUBTITLE) problems.push(`${topic.file}: the subtitle has ${topic.subtitle.length} characters, the limit is ${MAX_SUBTITLE}`);
  const { pages } = layout(topic);
  if (pages > MAX_PAGES) problems.push(`${topic.file}: the poster needs ${pages} pages, the limit is ${MAX_PAGES}`);
  return problems;
}

function checkLinks(built, root = REPO_ROOT) {
  const known = new Set(built.pages.map(page => page.href));
  const fixed = new Set(['/', '/catalog', '/roadmap', '/prereqs', '/glossary', '/about', BASE]);
  const broken = [];
  const manuals = new Set(fs.existsSync(path.join(root, 'manuals')) ? fs.readdirSync(path.join(root, 'manuals')) : []);
  for (const page of built.pages) {
    for (const match of page.html.matchAll(/\shref="([^"]+)"/g)) {
      const href = match[1].replace(/&amp;/g, '&');
      if (/^https:\/\/fonts\.(?:googleapis|gstatic)\.com/.test(href) || href.startsWith('#')) continue;
      const asset = /^\/([a-z0-9./-]+\.(?:css|js|ico|svg|png))(?:\?.*)?$/.exec(href);
      if (asset) {
        if (!fs.existsSync(path.join(root, 'site', asset[1]))) broken.push({ page: page.href, href });
        continue;
      }
      if (href.startsWith(`${REPO}/blob/main/`)) {
        if (!fs.existsSync(path.join(root, href.slice(`${REPO}/blob/main/`.length).split('#')[0]))) broken.push({ page: page.href, href });
        continue;
      }
      if (/^https?:/.test(href)) continue;
      const target = href.split('#')[0];
      if (!target || known.has(target) || fixed.has(target)) continue;
      const staticPage = /^\/([a-z0-9-]+\.html)$/.exec(target);
      if (staticPage && fs.existsSync(path.join(root, 'site', staticPage[1]))) continue;
      const lesson = /^\/lessons\/([a-z0-9-]+\/[a-z0-9-]+)\/$/.exec(target);
      if (lesson && fs.existsSync(path.join(root, 'phases', lesson[1], 'docs', 'zh.md'))) continue;
      const phase = /^\/phase\/([a-z0-9-]+)$/.exec(target);
      if (phase) continue;
      const manual = /^\/manual-([a-z0-9-]+)$/.exec(target);
      if (manual && manuals.has(manual[1])) continue;
      broken.push({ page: page.href, href });
    }
  }
  return broken;
}

function writeCheatsheets({ root = REPO_ROOT, siteDir = __dirname, edition, versionHtml = html => html } = {}) {
  const built = buildCheatsheets({ root, siteDir, edition, versionHtml });
  const outDir = path.join(siteDir, OUTPUT_DIR);
  const files = new Map(built.pages.map(page => [path.join(outDir, page.file), page.html]));
  files.set(path.join(outDir, 'search.json'), `${built.search}\n`);
  if (fs.existsSync(outDir)) {
    const walk = dir => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          if (!fs.readdirSync(full).length) fs.rmdirSync(full);
        } else if (!files.has(full)) {
          fs.unlinkSync(full);
        }
      }
    };
    walk(outDir);
  }
  for (const [file, body] of files) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  }
  fs.writeFileSync(path.join(siteDir, 'cheatsheet-map.json'), `${JSON.stringify(built.map)}\n`, 'utf8');
  return built;
}

function printHtml(built) {
  const year = built.date.slice(0, 4);
  const cover = `<section class="cs-cover"><div class="cs-cover-stamp"><span>AI 工程从零开始 · 速查表</span><span class="cs-cover-copy">${copyLine(year)}</span></div><h1>速查表</h1><p class="cs-sub">${built.topics.length} 张主题海报，涵盖任务、命令、代码注解、图解、默认值与排错方法。</p><ol class="cs-cover-list">${built.topics.map(topic => `<li style="--h:${topic.hue}"><span class="cs-code">${escapeHtml(topic.code)}</span>${escapeHtml(topic.title)}</li>`).join('')}</ol><div class="cs-cover-edition"><p>版本日期：${escapeHtml(built.date)}。最新版本见下方链接。</p><p><a href="${ORIGIN}${BASE}">aieng-zh.cn${BASE}</a> · <a href="${REPO}">GitHub 源文件</a></p></div></section>`;
  const posters = built.topics.map((topic, index) => `<section class="cs-print-topic" style="--h:${topic.hue}">${posterMain(topic, year, { previous: built.topics[index - 1], next: built.topics[index + 1] })}</section>`).join('');
  const colophon = `<section class="cs-colophon"><p class="cs-kicker">关于本版</p><p>本速查表版本日期为 ${escapeHtml(built.date)}，原作者为 ${AUTHOR}，由中文社区翻译维护。速查表属于开源课程 AI 工程从零开始，课程网站为 <a href="${ORIGIN}">aieng-zh.cn</a>. 最新版本见 <a href="${ORIGIN}${BASE}">aieng-zh.cn${BASE}</a>.</p><p>每张海报对应仓库 <code>cheatsheets/</code> 目录中的一个源文件。每个区块都标明其内容所在的课程和手册章节。构建时会检查命令选项、函数名和默认值是否出现在这些来源文件中。</p><p>${copyLine(year)}. 你可以复制和分享这些速查表。请一并保留本页和版权声明。报告错误请前往 <a href="${ISSUES_URL}">${ISSUES_URL.replace('https://', '')}</a>.</p></section>`;
  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="UTF-8">
<title>速查表 - AI 工程从零开始</title>
<meta name="author" content="${AUTHOR}">
<meta name="subject" content="AI 工程从零开始速查表，版本 ${escapeHtml(built.date)}">
<meta name="keywords" content="AI 工程, 速查表, LLM 服务, agent, transformer">
<link href="${FONT_LINK}" rel="stylesheet">
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="cheatsheets.css">
<link rel="stylesheet" href="cheatsheets-print.css">
</head>
<body class="cs-body cs-print-edition">
${cover}${posters}${colophon}
<script src="cheatsheets.js"></script>
</body>
</html>
`;
}

function unescapeHtml(value) {
  return value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function prerenderMath(html, katex) {
  const katexCss = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.47/dist/katex.min.css" crossorigin="anonymous">';
  return html
    .replace('</head>', `${katexCss}\n</head>`)
    .replace(/<(div|span) class="(math-display|math-inline)" data-math="(display|inline)">([\s\S]*?)<\/\1>/g, (match, tag, kind, mode, tex) => {
      try {
        const rendered = katex.renderToString(unescapeHtml(tex), { displayMode: mode === 'display', throwOnError: true, strict: 'ignore', trust: false });
        return `<${tag} class="${kind}" data-math="${mode}" data-math-rendered>${rendered}</${tag}>`;
      } catch (_) {
        return match;
      }
    });
}

function writePrint(outDir, options = {}) {
  const built = buildCheatsheets(options);
  fs.mkdirSync(outDir, { recursive: true });
  const html = printHtml(built);
  fs.writeFileSync(path.join(outDir, 'print.html'), options.katex ? prerenderMath(html, options.katex) : html, 'utf8');
  for (const name of ['style.css', 'cheatsheets.css', 'cheatsheets-print.css', 'cheatsheets.js']) {
    fs.copyFileSync(path.join(__dirname, name), path.join(outDir, name));
  }
  return built;
}

function main(argv) {
  const flag = name => argv.includes(name);
  const value = name => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : '';
  };
  if (flag('--check-topic')) {
    const file = path.resolve(value('--check-topic'));
    const topic = parseTopic(fs.readFileSync(file, 'utf8'), file);
    topic.file = path.relative(REPO_ROOT, file);
    const problems = checkTopic(topic);
    if (topic.errors.length) {
      for (const problem of problems) console.error(`  ${problem}`);
      return 1;
    }
    const { pages, used } = layout(topic);
    console.log(`${topic.file}: ${topic.blocks.length} blocks on ${pages} page(s). Height used per page: ${used.map((value, index) => `${value} of ${PAGE_BUDGETS[index] || PAGE_BUDGETS[PAGE_BUDGETS.length - 1]}px`).join(', ')}.`);
    for (const problem of problems) console.error(`  ${problem}`);
    return problems.length ? 1 : 0;
  }
  if (flag('--print')) {
    const katexPath = value('--katex');
    const katex = katexPath ? require(path.resolve(katexPath)) : null;
    const built = writePrint(path.resolve(value('--print')), { edition: value('--edition') || undefined, katex });
    console.log(`Wrote the print edition of ${built.topics.length} topic posters to ${value('--print')}/print.html`);
    return 0;
  }
  if (flag('--check')) {
    const invalid = topicErrors(loadTopics());
    if (invalid.length) {
      for (const problem of invalid) console.error(`  ${problem}`);
      return 1;
    }
    const first = buildCheatsheets({ edition: '2026-01-01' });
    const second = buildCheatsheets({ edition: '2026-01-01' });
    const problems = [];
    const digest = built => sha(built.pages.map(page => `${page.file}\n${page.html}`).join('\n') + built.search);
    if (digest(first) !== digest(second)) problems.push('two builds of the same input gave different bytes');
    const cache = new Map();
    for (const topic of first.topics) problems.push(...checkTopic(topic, REPO_ROOT, cache));
    const ids = first.topics.map(topic => topic.id);
    if (new Set(ids).size !== ids.length) problems.push('two topics share an id');
    const codes = first.topics.map(topic => topic.code);
    if (new Set(codes).size !== codes.length) problems.push('two topics share a code');
    for (const item of checkLinks(first)) problems.push(`broken link on ${item.page}: ${item.href}`);
    console.log(`Checked ${first.topics.length} cheat sheet topics (${first.topics.reduce((sum, topic) => sum + topic.blocks.length, 0)} blocks).`);
    for (const problem of problems) console.error(`  ${problem}`);
    return problems.length ? 1 : 0;
  }
  const built = writeCheatsheets({ edition: value('--edition') || undefined });
  console.log(`Wrote ${built.topics.length} cheat sheet posters to site/${OUTPUT_DIR}/`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { parseTopic, loadTopics, buildCheatsheets, writeCheatsheets, writePrint, printHtml, prerenderMath, checkTopic, checkLinks, coverage, layout, factTokens, blockFacts, architectureSvg, flowSvg, TYPES };
