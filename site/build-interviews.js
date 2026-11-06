'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const markdown = require('./lesson-markdown');
const code = require('./lib/code');
const bankLib = require('../scripts/interviews/validate');
const { SITE_HEADER } = require('./build-hubs');
const { versionHtml } = require('./version-assets');

const ORIGIN = 'https://aieng-zh.cn';
const REPO = 'https://github.com/fancyboi999/ai-engineering-from-scratch-zh';
const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = 'interviews';
const BASE = '/interviews';
const CARD = 'page/interviews';
const API_FILE = 'interviews.json';
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=VT323&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=JetBrains+Mono:wght@400;500;700&display=swap';
const THEME_SCRIPT = "(function(){var r=document.documentElement,s='';try{s=localStorage.getItem('theme')||'';}catch(_){}r.setAttribute('data-theme',s||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));function i(){var e=document.getElementById('themeIcon');if(e)e.textContent=r.getAttribute('data-theme')==='light'?'N':'D';}document.addEventListener('DOMContentLoaded',function(){i();var b=document.getElementById('themeToggle');if(b)b.addEventListener('click',function(){var n=r.getAttribute('data-theme')==='light'?'dark':'light';r.setAttribute('data-theme',n);try{localStorage.setItem('theme',n);}catch(_){}i();});});})();";
const HEAD_ASSETS = '<link rel="stylesheet" href="/style.css">\n<link rel="stylesheet" href="/code.css">\n<link rel="stylesheet" href="/interviews.css">';
const BODY_ASSETS = '<script src="/header.js" defer></script>\n<script src="/code-copy.js" defer></script>\n<script src="/interviews.js" defer></script>';
const FOOTER_LINKS = [['/interviews', '面试题库'], ['/practice', '编程练习'], ['/cheatsheets', '速查表'], ['/manuals', '技术手册'], ['/catalog', '课程目录'], ['/roadmap', '学习路线'], ['/glossary', '术语表'], ['/about', '关于']];
const ROUND_LABELS = { screen: '初筛', coding: '编程', 'take-home': '课后任务', 'system-design': '系统设计', 'design-review': '设计评审', debugging: '排障', 'ml-depth': '机器学习深度', 'ml-breadth': '机器学习广度', behavioral: '行为面试', customer: '客户场景' };
const { KIND_LABELS, LEVELS, SCENARIO_CARD } = bankLib;
const LEVEL_KEYS = [1, 2, 3, 4];

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function jsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function sha(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function renderCode(source, lang, opts) {
  return code.render(source, lang, opts);
}

function siteUrl(repoPath, anchor) {
  const clean = repoPath.replace(/\/+$/, '');
  const hash = anchor ? `#${anchor}` : '';
  let match = /^phases\/(\d\d-[a-z0-9-]+\/\d\d-[a-z0-9-]+)(?:\/.*)?$/.exec(clean);
  if (match) return `/lesson?path=${encodeURIComponent(`phases/${match[1]}`)}${hash}`;
  match = /^manuals\/([a-z0-9-]+)\/sections\/(.+)\.md$/.exec(clean);
  if (match) {
    const slug = match[2].replace(/^\d+-\d+-/, '').replace(/^r-\d+-/, 'ref-');
    return `/manual-${match[1]}/${slug}${anchor ? `#${bankLib.manualSectionAnchor(match[2], anchor)}` : ''}`;
  }
  match = /^manuals\/([a-z0-9-]+)$/.exec(clean);
  if (match) return `/manual-${match[1]}`;
  if (clean === 'interviews/README.md' || clean === 'interviews') return BASE;
  match = /^interviews\/questions\/([a-z0-9-]+)\/README\.md$/.exec(clean);
  if (match) return `${BASE}/${match[1]}`;
  match = /^interviews\/questions\/([a-z0-9-]+)\/([a-z0-9-]+)\.md$/.exec(clean);
  if (match) return `${BASE}/${match[1]}/${match[2]}`;
  if (clean === 'interviews/scenarios/README.md') return `${BASE}/${SCENARIO_CARD}`;
  match = /^interviews\/scenarios\/([a-z0-9-]+)(?:\/README\.md)?$/.exec(clean);
  if (match) return `${BASE}/${SCENARIO_CARD}/${match[1]}`;
  match = /^practice\/([a-z0-9-]+)\/?(?:meta\.json)?$/.exec(clean);
  if (match) return `/practice/${match[1]}`;
  match = /^cheatsheets\/([a-z0-9-]+)\.md$/.exec(clean);
  if (match) return `/cheatsheets/${match[1]}`;
  return `${REPO}/blob/main/${clean}${hash}`;
}

function rewriteLinks(md, file, root) {
  const dir = path.dirname(path.join(root, file));
  return md.replace(/\]\(([^)\s]+)\)/g, (whole, target) => {
    if (/^https:\/\/aiengineeringfromscratch\.com(?=\/|$)/.test(target)) return `](${target.replace('https://aiengineeringfromscratch.com', ORIGIN)})`;
    if (/^[a-z]+:/i.test(target)) return whole;
    const [rawPath, anchor] = target.split('#');
    const full = rawPath ? path.resolve(dir, rawPath) : path.join(root, file);
    const url = siteUrl(path.relative(root, full).split(path.sep).join('/'), anchor);
    return `](${url.startsWith('/') ? ORIGIN + url : url})`;
  });
}

function localizeLinks(html) {
  return html.replace(/<a href="https:\/\/aieng-zh\.cn(\/[^"]*)" target="_blank" rel="noopener">/g, '<a href="$1">');
}

function renderMarkdown(md, file, root) {
  return localizeLinks(markdown.parseMd(rewriteLinks(md, file, root), { renderCode }));
}

function inline(md, file, root) {
  return localizeLinks(markdown.inlineFormat(rewriteLinks(md, file, root)));
}

function plainText(md) {
  return md.replace(/```[\s\S]*?```/g, ' ').replace(/`([^`]*)`/g, '$1').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_#>|]/g, '').replace(/\s+/g, ' ').trim();
}

function firstSentence(text) {
  const flat = plainText(text);
  const match = /^(.+?(?:[。！？]|[.!?](?=\s|$)))/.exec(flat);
  return (match ? match[1] : flat).slice(0, 200);
}

function levelChip(level) {
  return `<span class="iv-level" data-level="${level}"><span class="iv-level-n">L${level}</span>${escapeHtml(LEVELS[level])}</span>`;
}

function kindChip(kind) {
  return `<span class="iv-kind">${escapeHtml(KIND_LABELS[kind])}</span>`;
}

function footer() {
  const links = FOOTER_LINKS.map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`).join('');
  return `<footer class="iv-site-foot"><nav class="footer-links" aria-label="站点导航">${links}</nav><p>每个答案均链接到对应课程或手册章节，数值均可追溯到仓库文件。</p></footer>`;
}

function shell({ title, description, href, main, jsonLd, type = 'article' }, assets) {
  const canonical = ORIGIN + href;
  const image = `${ORIGIN}/og/${CARD}.png`;
  const ld = jsonLd ? `\n<script type="application/ld+json">${jsonForHtml(jsonLd)}</script>` : '';
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
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="AI Engineering from Scratch">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${image}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONT_LINK}" rel="stylesheet">
${assets.head}
<script>${THEME_SCRIPT}</script>${ld}
</head>
<body class="iv-body">
<a href="${href}#main" class="skip-link">跳到正文</a>
${SITE_HEADER}
${main}
${footer()}
${assets.body}
</body>
</html>
`;
}

function crumbs(parts) {
  const items = parts.map(([href, label], index) => index === parts.length - 1 ? `<li aria-current="page">${escapeHtml(label)}</li>` : `<li><a href="${href}">${escapeHtml(label)}</a></li>`).join('');
  return `<nav class="iv-crumbs" aria-label="当前位置"><ol>${items}</ol></nav>`;
}

function levelMix(items) {
  const counts = LEVEL_KEYS.map(level => items.filter(item => item.data.level === level).length);
  const total = counts.reduce((sum, count) => sum + count, 0);
  const bar = total ? LEVEL_KEYS.map((level, index) => counts[index] ? `<span class="iv-mix-seg" data-level="${level}" style="flex-grow:${counts[index]}"></span>` : '').join('') : '<span class="iv-mix-seg iv-mix-empty"></span>';
  const label = LEVEL_KEYS.map((level, index) => `L${level} ${counts[index]}`).join(', ');
  return `<div class="iv-mix" role="img" aria-label="难度分布：${label}"><span class="iv-mix-bar">${bar}</span><span class="iv-mix-legend">${LEVEL_KEYS.map((level, index) => `<span data-level="${level}"${counts[index] ? '' : ' class="iv-zero"'}>L${level}&nbsp;${counts[index]}</span>`).join('')}</span></div>`;
}

function itemHref(item) {
  return `${BASE}/${item.card}/${item.id}`;
}

function itemSearch(item, card) {
  return [item.data.title, item.data.tags.join(' '), card.title, KIND_LABELS[item.data.kind]].join(' ').toLowerCase();
}

function itemRow(item, built, showCard) {
  const card = built.cardMap.get(item.card);
  const roles = item.data.roles.join(' ');
  return `<li class="iv-row" data-item data-card-id="${item.card}" data-level="${item.data.level}" data-roles="${escapeHtml(roles)}" data-search="${escapeHtml(itemSearch(item, card))}"><a class="iv-row-link" href="${itemHref(item)}"><span class="iv-row-title">${escapeHtml(item.data.title)}</span><span class="iv-row-meta">${levelChip(item.data.level)}${kindChip(item.data.kind)}${showCard ? `<span class="iv-row-card">${escapeHtml(card.title)}</span>` : ''}<span class="iv-row-min">${item.data.minutes} 分钟</span></span></a></li>`;
}

function cardTile(card, built) {
  const items = built.byCard.get(card.id);
  const group = built.groupMap.get(card.group);
  const roles = built.roles.filter(role => role.cards.includes(card.id)).map(role => role.id).join(' ');
  const search = [card.title, card.summary, group.title].concat(items.map(item => itemSearch(item, card))).join(' ').toLowerCase();
  const count = items.length;
  const name = count ? `<a href="${BASE}/${card.id}">${escapeHtml(card.title)}</a>` : escapeHtml(card.title);
  const state = count ? `${count} 题` : '即将推出';
  return `<li class="iv-card${count ? '' : ' iv-card-empty'}" data-card="${card.id}" data-group="${card.group}" data-roles="${escapeHtml(roles)}" data-search="${escapeHtml(search)}"><div class="iv-card-top"><span class="iv-kicker">${escapeHtml(group.title)}</span><span class="iv-card-count">${state}</span></div><h3 class="iv-card-name">${name}</h3><p class="iv-card-sum">${escapeHtml(card.summary)}</p>${levelMix(items)}<div class="iv-card-foot"><span class="iv-plan"><span class="iv-plan-bar" aria-hidden="true"><span style="width:${Math.min(100, Math.round((count / card.planned) * 100))}%"></span></span>已收录 ${count} 题，计划 ${card.planned} 题</span></div></li>`;
}

function roleChips(built) {
  const chips = built.roles.map(role => `<label class="iv-chip"><input type="radio" name="role" value="${role.id}"><span>${escapeHtml(role.title)}</span></label>`).join('');
  return `<fieldset class="iv-filter iv-filter-roles"><legend>岗位</legend><label class="iv-chip"><input type="radio" name="role" value="" checked><span>全部岗位</span></label>${chips}</fieldset>`;
}

function levelChips() {
  const chips = LEVEL_KEYS.map(level => `<label class="iv-chip"><input type="radio" name="level" value="${level}"><span>L${level} ${escapeHtml(LEVELS[level])}</span></label>`).join('');
  return `<fieldset class="iv-filter"><legend>难度</legend><label class="iv-chip"><input type="radio" name="level" value="" checked><span>全部</span></label>${chips}</fieldset>`;
}

function indexMain(built) {
  const total = built.items.length;
  const stats = [[String(built.questions.length), '道面试题'], [String(built.scenarios.length), '个排障场景'], [String(built.cards.length), '个主题卡片'], [String(built.roles.length), '条岗位路线']];
  const head = `<header class="iv-hero"><div class="iv-hero-copy"><p class="iv-kicker">从零构建 AI 工程</p><h1>面试题库与排障演练</h1><p class="iv-lede">针对真实工程指标、显存与系统架构的 AI 面试题库与故障排查场景。建议先独立思考并口头或书面作答，再展开参考解答。每道题目均关联对应的课程，每个数据指标均来自可复现的真实运行记录。</p></div><dl class="iv-stats">${stats.map(([value, label]) => `<div><dt>${escapeHtml(label)}</dt><dd>${value}</dd></div>`).join('')}</dl></header>`;
  const controls = `<form class="iv-controls" role="search" data-filters onsubmit="return false"><label class="iv-search"><span class="iv-visually-hidden">搜索题库</span><input type="search" name="q" autocomplete="off" spellcheck="false" placeholder="搜索题库：前缀缓存、Goodput、KV 池、显存量化"></label>${levelChips()}${roleChips(built)}<p class="iv-count" aria-live="polite" data-count>${total} 项内容分布在 ${built.cards.length} 张卡片中</p></form>`;
  const groups = built.groups.map(group => {
    const cards = built.cards.filter(card => card.group === group.id);
    return `<section class="iv-group" data-group-section="${group.id}" data-group="${group.id}" aria-labelledby="g-${group.id}"><div class="iv-group-head"><h2 id="g-${group.id}">${escapeHtml(group.title)}</h2><p>${escapeHtml(group.summary)}</p></div><ul class="iv-grid">${cards.map(card => cardTile(card, built)).join('')}</ul></section>`;
  }).join('');
  const list = `<section class="iv-all" aria-labelledby="all-items"><div class="iv-group-head"><h2 id="all-items">全部题目与场景</h2><p>每个项目均包含题干、速答、完整论证依据、逐级深度追问，以及面试官最常听到的典型错误解答。</p></div><ol class="iv-list" data-list>${built.items.map(item => itemRow(item, built, true)).join('')}</ol><p class="iv-empty" data-empty hidden>没有符合该筛选条件的题目。</p></section>`;
  const how = `<section class="iv-how" aria-labelledby="how"><h2 id="how">如何使用本题库</h2><ol><li>阅读题干，在草稿纸上或口头组织解答，不要急于展开答案。</li><li>先看速答，再展开完整技术论证。重点对比解题推导过程，而非仅仅比对结论。</li><li>逐一回答深度追问，追问的难度会逐级递增。</li><li>仔细辨析常见错误选项，每项都是听起来合理但在生产中致命的误区。</li><li>在现场故障排查中，逐一阅读监控与日志证据，在看解决方案前先定位根因。</li></ol><p>如需通过 Coding Agent 进行模拟面试辅导，在本地克隆仓库后使用 <code>/interview-prep</code> 技能即可开启实战。</p></section>`;
  return `<main id="main" class="iv-page iv-index" data-interviews-index>${head}${controls}<div data-groups>${groups}</div>${list}${how}</main>`;
}

function localizedLessonTitle(root, lesson) {
  const file = path.join(root, lesson, 'docs', 'zh.md');
  if (!fs.existsSync(file)) return bankLib.lessonTitle(root, lesson);
  const match = /^#\s+(.+?)\s*$/m.exec(fs.readFileSync(file, 'utf8'));
  return match ? match[1] : bankLib.lessonTitle(root, lesson);
}

function sourceLinks(card, root) {
  const lessons = card.lessons.map(lesson => `<li><a href="${siteUrl(lesson)}">${escapeHtml(localizedLessonTitle(root, lesson).replace(/\s+[\u2013\u2014-]\s+.*$/, '') || lesson)}</a></li>`).join('');
  const manuals = card.manuals.map(id => `<li><a href="/manual-${id}">${escapeHtml(JSON.parse(fs.readFileSync(path.join(root, 'manuals', id, 'manual.json'), 'utf8')).title)}</a></li>`).join('');
  return `<section class="iv-sources" aria-labelledby="sources"><h2 id="sources">对应课程</h2><p>本主题答案来自以下课程${manuals ? '与手册' : ''}。</p>${manuals ? `<ul class="iv-source-manuals">${manuals}</ul>` : ''}<ul class="iv-source-list">${lessons}</ul></section>`;
}

function cardMain(card, built) {
  const group = built.groupMap.get(card.group);
  const items = built.byCard.get(card.id);
  const roles = built.roles.filter(role => role.cards.includes(card.id)).map(role => `<span class="iv-role">${escapeHtml(role.title)}</span>`).join('');
  const head = `<header class="iv-card-head" data-group="${card.group}">${crumbs([[BASE, '面试题库'], [`${BASE}/${card.id}`, card.title]])}<p class="iv-kicker">${escapeHtml(group.title)}</p><h1>${escapeHtml(card.title)}</h1><p class="iv-lede">${escapeHtml(card.summary)}</p><div class="iv-card-facts"><span>已收录 ${items.length} 题，计划 ${card.planned} 题</span>${levelMix(items)}</div><p class="iv-roles"><span class="iv-roles-label">适用岗位</span>${roles}</p></header>`;
  const controls = `<form class="iv-controls iv-controls-slim" data-filters onsubmit="return false">${levelChips()}<p class="iv-count" aria-live="polite" data-count>${items.length} 题</p></form>`;
  const list = `<ol class="iv-list" data-list>${items.map(item => itemRow(item, built, false)).join('')}</ol><p class="iv-empty" data-empty hidden>没有符合此难度的题目。</p>`;
  return `<main id="main" class="iv-page iv-card-page" data-interviews-card="${card.id}">${head}${controls}${list}${sourceLinks(card, built.root)}</main>`;
}

function followUpHtml(item, root) {
  return `<ol class="iv-follow">${item.followUps.map(entry => `<li data-level="${entry.level}"><p class="iv-follow-q">${levelChip(entry.level)}<span>${inline(entry.question, item.file, root)}</span></p><details class="iv-answer iv-answer-small"><summary>查看参考答案</summary><div class="iv-answer-body"><p>${inline(entry.expected, item.file, root)}</p></div></details></li>`).join('')}</ol>`;
}

function wrongHtml(entries, item, root) {
  return `<ul class="iv-wrong">${entries.map(entry => `<li><p class="iv-wrong-a">“${inline(entry.answer, item.file, root)}”</p><p class="iv-wrong-r">${inline(entry.reason, item.file, root)}</p></li>`).join('')}</ul>`;
}

function metaRow(item) {
  const rounds = item.data.rounds.map(round => `<span class="iv-round">${escapeHtml(ROUND_LABELS[round])}</span>`).join('');
  return `<p class="iv-meta">${levelChip(item.data.level)}${kindChip(item.data.kind)}<span class="iv-min">${item.data.minutes} 分钟</span>${rounds}</p>`;
}

function relatedHtml(item, built) {
  const links = [];
  for (const ref of item.data.related) {
    const [cardId, id] = ref.split('/');
    const target = built.items.find(entry => entry.card === cardId && entry.id === id);
    if (target) links.push(`<li><a href="${itemHref(target)}">${escapeHtml(target.data.title)}</a></li>`);
  }
  for (const id of item.data.practice) links.push(`<li><a href="/practice/${id}">编程练习：${escapeHtml(id.replace(/-/g, ' '))}</a></li>`);
  for (const id of item.data.cheatsheet) links.push(`<li><a href="/cheatsheets/${id}">速查表：${escapeHtml(id.replace(/-/g, ' '))}</a></li>`);
  return links.length ? `<section class="iv-related" aria-labelledby="related"><h2 id="related">相关内容</h2><ul>${links.join('')}</ul></section>` : '';
}

function pager(item, built) {
  const list = built.byCard.get(item.card);
  const index = list.indexOf(item);
  const previous = list[index - 1];
  const next = list[index + 1];
  const card = built.cardMap.get(item.card);
  return `<nav class="iv-pager" aria-label="同主题题目导航">${previous ? `<a href="${itemHref(previous)}" rel="prev"><span>上一题</span>${escapeHtml(previous.data.title)}</a>` : '<span></span>'}<a class="iv-pager-up" href="${BASE}/${card.id}"><span>主题</span>${escapeHtml(card.title)}</a>${next ? `<a href="${itemHref(next)}" rel="next"><span>下一题</span>${escapeHtml(next.data.title)}</a>` : '<span></span>'}</nav>`;
}

function rolesLine(item, built) {
  const roles = item.data.roles.map(id => built.roles.find(role => role.id === id)).filter(Boolean).map(role => `<span class="iv-role">${escapeHtml(role.title)}</span>`).join('');
  return `<p class="iv-roles"><span class="iv-roles-label">适用岗位</span>${roles}</p>`;
}

function questionMain(item, built) {
  const root = built.root;
  const card = built.cardMap.get(item.card);
  const s = item.sections;
  const head = `<header class="iv-q-head" data-group="${card.group}">${crumbs([[BASE, '面试题库'], [`${BASE}/${card.id}`, card.title], [itemHref(item), item.data.title]])}<h1>${escapeHtml(item.data.title)}</h1>${metaRow(item)}${rolesLine(item, built)}</header>`;
  const prompt = `<section class="iv-prompt" aria-labelledby="prompt"><h2 id="prompt" class="iv-label">题目</h2><div class="iv-prompt-body">${renderMarkdown(item.parsed.preamble, item.file, root)}</div><p class="iv-try">先口头回答或写下思路，再展开答案。</p></section>`;
  const answer = `<section class="iv-answers" aria-labelledby="answer"><h2 id="answer" class="iv-label">答案</h2><details class="iv-answer" data-answer="short"><summary>查看简短答案</summary><div class="iv-answer-body">${renderMarkdown(s['Short answer'], item.file, root)}</div></details><details class="iv-answer" data-answer="full"><summary>查看完整答案</summary><div class="iv-answer-body iv-prose">${renderMarkdown(s['Full answer'], item.file, root)}</div></details></section>`;
  const follow = `<section class="iv-section" aria-labelledby="follow-ups"><h2 id="follow-ups" class="iv-label">追问</h2>${followUpHtml(item, root)}</section>`;
  const wrong = `<section class="iv-section" aria-labelledby="wrong"><h2 id="wrong" class="iv-label">常见错误答案</h2><details class="iv-answer"><summary>查看常见错误及原因</summary><div class="iv-answer-body">${wrongHtml(item.wrong, item, root)}</div></details></section>`;
  const taught = `<section class="iv-taught" aria-labelledby="taught"><h2 id="taught" class="iv-label">对应课程</h2><div>${renderMarkdown(s['Taught in'], item.file, root)}</div></section>`;
  return `<main id="main" class="iv-page iv-question" data-interviews-item="${item.card}/${item.id}"><article class="iv-article">${head}${prompt}${answer}${follow}${wrong}${taught}${relatedHtml(item, built)}</article>${pager(item, built)}</main>`;
}

function localizedDisplayText(value) {
  const translations = require('./lib/interviews-display.zh.json');
  const translated = translations[value];
  if (typeof translated !== 'string' || !translated.trim()) {
    throw new Error(`Missing Chinese interview display text: ${value}`);
  }
  return translated;
}

function evidenceHtml(item, built) {
  const total = item.evidenceOrder.length;
  return item.evidenceOrder.map((entry, index) => {
    const evidence = item.evidence.find(file => file.name === entry.name);
    const { header } = evidence;
    const anchor = header.lines ? `#L${header.lines.replace('-', '-L')}` : '';
    const source = `<a href="${REPO}/blob/main/${header.source}${anchor}">${escapeHtml(header.source)}${header.lines ? `，行号 ${escapeHtml(header.lines)}` : ''}</a>`;
    const wrap = evidence.listing.split('\n').some(line => line.length > 160) ? ' iv-ev-wrap' : '';
    return `<section class="iv-ev${wrap}" data-step="${index + 1}" aria-labelledby="ev-${index + 1}"><div class="iv-ev-head"><span class="iv-ev-n">${index + 1}<span>/${total}</span></span><div><h3 id="ev-${index + 1}">${escapeHtml(entry.label)}</h3><p class="iv-ev-note">${escapeHtml(localizedDisplayText(header.note))}</p></div></div>${renderCode(evidence.listing, header.lang, { label: `evidence/${entry.name}` })}<p class="iv-ev-src">来源：${source}</p></section>`;
  }).join('') + (total > 1 ? `<div class="iv-ev-next" data-ev-controls hidden><button class="iv-btn" type="button" data-ev-next>查看第 2/${total} 份证据</button><button class="iv-btn iv-btn-quiet" type="button" data-ev-all>显示全部</button></div>` : '');
}

function scenarioMain(item, built) {
  const root = built.root;
  const card = built.cardMap.get(item.card);
  const s = item.sections;
  const sys = item.data.system;
  const spec = `<dl class="iv-spec"><div><dt>引擎</dt><dd>${escapeHtml(localizedDisplayText(sys.version))}</dd></div><div><dt>模型</dt><dd>${escapeHtml(localizedDisplayText(sys.model))}</dd></div><div><dt>硬件</dt><dd>${escapeHtml(localizedDisplayText(sys.hardware))}</dd></div></dl>`;
  const head = `<header class="iv-q-head" data-group="${card.group}">${crumbs([[BASE, '面试题库'], [`${BASE}/${card.id}`, card.title], [itemHref(item), item.data.title]])}<p class="iv-kicker">排障场景</p><h1>${escapeHtml(item.data.title)}</h1>${metaRow(item)}${rolesLine(item, built)}${spec}</header>`;
  const situation = `<section class="iv-prompt" aria-labelledby="situation"><h2 id="situation" class="iv-label">故障背景</h2><div class="iv-prompt-body">${renderMarkdown(s.Situation, item.file, root)}</div></section>`;
  const questions = `<section class="iv-section" aria-labelledby="questions"><h2 id="questions" class="iv-label">排查问题</h2><ol class="iv-questions">${item.questions.map(question => `<li>${inline(question, item.file, root)}</li>`).join('')}</ol><p class="iv-try">每读一份证据，先写下原因判断，再查看下一份。</p></section>`;
  const evidence = `<section class="iv-section iv-evidence" aria-labelledby="evidence" data-evidence><h2 id="evidence" class="iv-label">证据</h2>${evidenceHtml(item, built)}</section>`;
  const fold = (id, label, body) => `<details class="iv-answer" data-answer="${id}"><summary>${label}</summary><div class="iv-answer-body iv-prose">${body}</div></details>`;
  const answers = `<section class="iv-answers" aria-labelledby="answer"><h2 id="answer" class="iv-label">答案</h2>${fold('walkthrough', '查看排查过程', renderMarkdown(s.Walkthrough, item.file, root))}${fold('resolution', '查看解决方案', renderMarkdown(s.Resolution, item.file, root))}${fold('wrong', '查看错误排查方向', wrongHtml(item.wrong, item, root))}${fold('generalize', '查看通用规律', renderMarkdown(s.Generalize, item.file, root))}</section>`;
  const taught = `<section class="iv-taught" aria-labelledby="taught"><h2 id="taught" class="iv-label">对应课程</h2><div>${renderMarkdown(s['Taught in'], item.file, root)}</div></section>`;
  return `<main id="main" class="iv-page iv-question iv-scenario" data-interviews-item="${item.card}/${item.id}"><article class="iv-article">${head}${situation}${questions}${evidence}${answers}${taught}${relatedHtml(item, built)}</article>${pager(item, built)}</main>`;
}

function questionJsonLd(item, built) {
  const card = built.cardMap.get(item.card);
  const s = item.sections;
  const accepted = item.kind === 'scenario' ? plainText(s.Resolution) : plainText(s['Short answer']);
  return {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: item.data.title,
    url: ORIGIN + itemHref(item),
    educationalLevel: LEVELS[item.data.level],
    learningResourceType: item.kind === 'scenario' ? '排障场景' : '面试题',
    timeRequired: `PT${item.data.minutes}M`,
    keywords: item.data.tags.join(', '),
    inLanguage: 'zh-CN',
    isAccessibleForFree: true,
    about: card.title,
    hasPart: [{ '@type': 'Question', name: plainText(item.kind === 'scenario' ? s.Situation : item.parsed.preamble).slice(0, 500), acceptedAnswer: { '@type': 'Answer', text: accepted } }],
    isPartOf: { '@type': 'Course', name: 'AI Engineering from Scratch', url: ORIGIN },
  };
}

const SECTION_LABELS = {'Short answer':'简短答案','Full answer':'完整答案','Follow-ups':'追问','Wrong answers':'常见错误答案','Taught in':'对应课程',Situation:'故障背景',Evidence:'证据',Questions:'排查问题',Walkthrough:'排查过程',Resolution:'解决方案','Wrong turns':'错误排查方向',Generalize:'通用规律'};

function itemMarkdown(item, built) {
  const card = built.cardMap.get(item.card);
  const s = item.sections;
  const facts = [`难度 L${item.data.level}（${LEVELS[item.data.level]}）`, KIND_LABELS[item.data.kind], `约 ${item.data.minutes} 分钟`, `主题：${card.title}`];
  const abs = text => rewriteLinks(text, item.file, built.root).replace(/\]\((\/[^)]*)\)/g, `](${ORIGIN}$1)`);
  const lines = [`# ${item.data.title}`, '', `规范页面：${ORIGIN}${itemHref(item)}`, '', facts.join(' · '), ''];
  if (item.kind === 'scenario') {
    const sys = item.data.system;
    lines.push(`系统：${localizedDisplayText(sys.version)}，${localizedDisplayText(sys.model)}，${localizedDisplayText(sys.hardware)}。`, '');
    for (const title of bankLib.SCENARIO_SECTIONS) {
      if (title === 'Evidence') {
        lines.push('## 证据', '');
        item.evidenceOrder.forEach((entry, index) => {
          const evidence = item.evidence.find(file => file.name === entry.name);
          lines.push(`### ${index + 1}. ${entry.label}`, '', `${localizedDisplayText(evidence.header.note)} 来源：${evidence.header.source}${evidence.header.lines ? `，行号 ${evidence.header.lines}` : ''}.`, '', `\`\`\`${evidence.header.lang}`, evidence.listing, '```', '');
        });
        continue;
      }
      lines.push(`## ${SECTION_LABELS[title] || title}`, '', abs(s[title]), '');
    }
  } else {
    lines.push(abs(item.parsed.preamble), '');
    for (const title of bankLib.QUESTION_SECTIONS) lines.push(`## ${SECTION_LABELS[title] || title}`, '', abs(s[title]), '');
  }
  lines.push(`[全部面试主题](${ORIGIN}${BASE}) | [课程索引](${ORIGIN}/llms.txt)`, '');
  return lines.join('\n');
}

function cardMarkdown(card, built) {
  const items = built.byCard.get(card.id);
  const lines = [`# ${card.title}`, '', `规范页面：${ORIGIN}${BASE}/${card.id}`, '', card.summary, '', `已收录 ${items.length} 题，计划 ${card.planned} 题。`, ''];
  for (const item of items) lines.push(`- [${item.data.title}](${ORIGIN}${itemHref(item)}) （难度 L${item.data.level}， ${KIND_LABELS[item.data.kind].toLowerCase()}, ${item.data.minutes} 分钟）`);
  lines.push('', `[全部面试主题](${ORIGIN}${BASE})`, '');
  return lines.join('\n');
}

function indexMarkdown(built) {
  const lines = ['# AI 工程面试题与排障场景', '', `规范页面：${ORIGIN}${BASE}`, '', `${built.cards.length} 个主题包含 ${built.questions.length} 道题与 ${built.scenarios.length} 个场景。答案链接到对应课程或手册章节，数值来自仓库中的实测记录。请求头发送 Accept: text/markdown 时，详情页返回包含答案的 Markdown。`];
  for (const group of built.groups) {
    lines.push('', `## ${group.title}`, '', group.summary, '');
    for (const card of built.cards.filter(entry => entry.group === group.id)) {
      const count = built.byCard.get(card.id).length;
      lines.push(count ? `- [${card.title}](${ORIGIN}${BASE}/${card.id}): 已收录 ${count} 题，计划 ${card.planned} 题。${card.summary}` : `- ${card.title}: 即将推出，计划 ${card.planned} 题。 ${card.summary}`);
    }
  }
  lines.push('', '## 适用岗位', '');
  for (const role of built.roles) lines.push(`- ${role.title}: ${role.cards.map(id => built.cardMap.get(id).title).join(', ')}.`);
  lines.push('', `[课程索引](${ORIGIN}/llms.txt)`, '');
  return lines.join('\n');
}

function apiJson(built) {
  return {
    version: 1,
    cards: built.cards.map(card => ({ id: card.id, title: card.title, group: card.group, summary: card.summary, planned: card.planned, count: built.byCard.get(card.id).length, url: built.byCard.get(card.id).length ? ORIGIN + `${BASE}/${card.id}` : null })),
    groups: built.groups.map(group => ({ id: group.id, title: group.title })),
    roles: built.roles.map(role => ({ id: role.id, title: role.title, path: role.path, cards: role.cards })),
    items: built.items.map(item => ({ id: item.id, card: item.card, type: item.kind, kind: item.data.kind, level: item.data.level, title: item.data.title, minutes: item.data.minutes, roles: item.data.roles, rounds: item.data.rounds, tags: item.data.tags, lessons: item.data.lessons, manuals: item.data.manuals, url: ORIGIN + itemHref(item), markdown: `${ORIGIN}/agent-pages${itemHref(item)}.md` })),
  };
}

function loadBuilt(root) {
  const bank = bankLib.loadBank(root, { upstreamEvidence: false });
  const problems = bank.errors;
  if (problems.length) throw new Error(`The interview bank has errors. Run node scripts/interviews/validate.js for the full report.\n${problems.join('\n')}`);
  const order = (a, b) => a.data.level - b.data.level || a.data.title.localeCompare(b.data.title);
  const questions = bank.questions.slice().sort(order);
  const scenarios = bank.scenarios.slice().sort(order);
  const items = bank.cards.flatMap(card => questions.concat(scenarios).filter(item => item.card === card.id));
  const byCard = new Map(bank.cards.map(card => [card.id, items.filter(item => item.card === card.id)]));
  return { root, groups: bank.groups, cards: bank.cards, roles: bank.roles, questions, scenarios, items, byCard, cardMap: new Map(bank.cards.map(card => [card.id, card])), groupMap: new Map(bank.groups.map(group => [group.id, group])) };
}

function buildInterviews({ root = REPO_ROOT, siteDir = __dirname } = {}) {
  const built = loadBuilt(root);
  const assets = { head: versionHtml(HEAD_ASSETS, siteDir), body: versionHtml(BODY_ASSETS, siteDir) };
  const pages = [{
    file: 'index.html',
    href: BASE,
    html: shell({ title: '面试题与排障场景 - AI 工程从零开始', description: `${built.questions.length} 道 AI 工程面试题、${built.scenarios.length} 个实测排障场景，分属 ${built.cards.length} 个主题，答案关联对应课程。`, href: BASE, type: 'website', main: indexMain(built), jsonLd: { '@context': 'https://schema.org', '@type': 'ItemList', name: '面试题与排障场景', itemListElement: built.items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, url: ORIGIN + itemHref(item), name: item.data.title })) } }, assets),
  }];
  for (const card of built.cards) {
    const items = built.byCard.get(card.id);
    if (!items.length) continue;
    pages.push({ file: `${card.id}.html`, href: `${BASE}/${card.id}`, html: shell({ title: `${card.title} 面试题 - AI 工程从零开始`, description: `${card.summary} ${items.length} 题，含答案、追问和对应课程。`, href: `${BASE}/${card.id}`, type: 'website', main: cardMain(card, built), jsonLd: { '@context': 'https://schema.org', '@type': 'ItemList', name: `${card.title} 面试题`, itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, url: ORIGIN + itemHref(item), name: item.data.title })) } }, assets) });
  }
  for (const item of built.items) {
    const card = built.cardMap.get(item.card);
    const main = item.kind === 'scenario' ? scenarioMain(item, built) : questionMain(item, built);
    const lead = item.kind === 'scenario' ? `关于 ${localizedDisplayText(item.data.system.version)} 的 L${item.data.level} 排障场景` : `${card.title} 的 L${item.data.level} ${KIND_LABELS[item.data.kind]}题`;
    const description = `${lead}。${firstSentence(item.kind === 'scenario' ? item.sections.Situation : item.parsed.preamble)}`.slice(0, 300);
    pages.push({ file: `${item.card}/${item.id}.html`, href: itemHref(item), html: shell({ title: `${item.data.title} - 面试题库 - AI 工程从零开始`, description, href: itemHref(item), main, jsonLd: questionJsonLd(item, built) }, assets) });
  }
  built.pages = pages;
  built.files = new Map(pages.map(page => [page.file, page.html]));
  const markdownPages = [['index.md', indexMarkdown(built)]];
  for (const card of built.cards) if (built.byCard.get(card.id).length) markdownPages.push([`${card.id}.md`, cardMarkdown(card, built)]);
  for (const item of built.items) markdownPages.push([`${item.card}/${item.id}.md`, itemMarkdown(item, built)]);
  built.markdown = new Map(markdownPages);
  built.api = `${JSON.stringify(apiJson(built))}\n`;
  return built;
}

function writeInterviews({ root = REPO_ROOT, siteDir = __dirname } = {}) {
  const built = buildInterviews({ root, siteDir });
  const outDir = path.join(siteDir, OUTPUT_DIR);
  const markdownDir = path.join(siteDir, 'agent-pages', OUTPUT_DIR);
  const targets = new Map(Array.from(built.files, ([file, body]) => [path.join(outDir, file), body]).concat(Array.from(built.markdown, ([file, body]) => [path.join(markdownDir, file), body])));
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        if (!fs.readdirSync(full).length) fs.rmdirSync(full);
      } else if (!targets.has(full)) {
        fs.unlinkSync(full);
      }
    }
  };
  for (const dir of [outDir, markdownDir]) if (fs.existsSync(dir)) walk(dir);
  for (const [file, body] of targets) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  }
  fs.writeFileSync(path.join(siteDir, API_FILE), built.api);
  return built;
}

function visibleText(html) {
  return html.replace(/<details\b[\s\S]*?<\/details>/g, ' ').replace(/<script\b[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function answerText(item) {
  const s = item.sections;
  if (item.kind === 'scenario') return [s.Walkthrough, s.Resolution].join('\n');
  return [s['Short answer'], s['Full answer']].concat(item.followUps.map(entry => entry.expected)).join('\n');
}

function checkInterviews(built) {
  const problems = [];
  const listPages = built.pages.filter(page => !built.items.some(item => itemHref(item) === page.href));
  const listGrams = new Map();
  listPages.forEach((list, idx) => {
    const text = visibleText(list.html).toLowerCase();
    for (let j = 0; j + 24 <= text.length; j++) {
      const gram = text.slice(j, j + 24);
      let set = listGrams.get(gram);
      if (!set) { set = new Set(); listGrams.set(gram, set); }
      set.add(idx);
    }
  });

  const lowerApi = built.api.toLowerCase();
  const apiGrams = new Set();
  for (let j = 0; j + 24 <= lowerApi.length; j++) {
    apiGrams.add(lowerApi.slice(j, j + 24));
  }

  for (const item of built.items) {
    const answers = answerText(item);
    const lowerAns = answers.toLowerCase();
    const page = built.pages.find(entry => entry.href === itemHref(item));
    const head = page.html.slice(0, page.html.indexOf('<body'));
    const shown = visibleText(page.html.slice(page.html.indexOf('<body')).replace(/<section class="iv-ev[ "][\s\S]*?<\/section>/g, ' '));
    const leaks = bankLib.sharedSpans(answers, shown);
    if (leaks.length) problems.push(`${page.href}: an answer shows outside a folded answer: "${leaks[0]}"`);
    const headLeaks = bankLib.sharedSpans(answers, visibleText(head.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')));
    if (headLeaks.length) problems.push(`${page.href}: the title or the description shows an answer: "${headLeaks[0]}"`);
    const short = item.kind === 'scenario' ? item.sections.Resolution : item.sections['Short answer'];
    const expectedAnswer = visibleText(renderMarkdown(short, item.file, built.root)).replace(/\s+/g, '');
    if (!expectedAnswer || !visibleText(page.html.replace(/<details\b[^>]*>|<\/details>/g, ' ')).replace(/\s+/g, '').includes(expectedAnswer)) problems.push(`${page.href}: the folded answer is missing from the HTML`);

    const hitLists = new Set();
    let apiCandidate = false;
    for (let at = 0; at + 24 <= lowerAns.length; at++) {
      const gram = lowerAns.slice(at, at + 24);
      const set = listGrams.get(gram);
      if (set) for (const idx of set) hitLists.add(idx);
      if (!apiCandidate && apiGrams.has(gram)) apiCandidate = true;
    }
    for (const idx of hitLists) {
      const list = listPages[idx];
      const listLeaks = bankLib.sharedSpans(answers, visibleText(list.html));
      if (listLeaks.length) problems.push(`${list.href}: shows an answer of ${item.card}/${item.id}: "${listLeaks[0]}"`);
    }
    if (apiCandidate) {
      const apiLeaks = bankLib.sharedSpans(answers, built.api);
      if (apiLeaks.length) problems.push(`${API_FILE}: shows an answer of ${item.card}/${item.id}: "${apiLeaks[0]}"`);
    }
  }

  const records = searchRecords(built);
  const recordGrams = new Map();
  records.forEach((record, idx) => {
    const text = `${record.meta.title}\n${record.content}`.toLowerCase();
    for (let j = 0; j + 24 <= text.length; j++) {
      const gram = text.slice(j, j + 24);
      let list = recordGrams.get(gram);
      if (!list) { list = []; recordGrams.set(gram, list); }
      list.push(idx);
    }
  });

  for (const item of built.items) {
    const answers = answerText(item);
    const lowerAns = answers.toLowerCase();
    const candidateIdxs = new Set();
    for (let at = 0; at + 24 <= lowerAns.length; at++) {
      const list = recordGrams.get(lowerAns.slice(at, at + 24));
      if (list) for (const idx of list) candidateIdxs.add(idx);
    }
    for (const idx of candidateIdxs) {
      const record = records[idx];
      const recordLeaks = bankLib.sharedSpans(answers, `${record.meta.title}\n${record.content}`);
      if (recordLeaks.length) problems.push(`search record ${record.url}: shows an answer of ${item.card}/${item.id}: "${recordLeaks[0]}"`);
    }
  }
  return problems;
}

function searchRecords(built) {
  const { interviewRecord } = require('./build-search');
  return built.items.map(item => interviewRecord({
    url: itemHref(item),
    title: item.data.title,
    content: plainText(item.kind === 'scenario' ? item.sections.Situation : item.parsed.preamble),
    topic: built.cardMap.get(item.card).title,
    level: String(item.data.level),
    role: item.data.roles.map(id => built.roles.find(role => role.id === id).title),
  }));
}

function interviewSearchRecords(root = REPO_ROOT) {
  return searchRecords(loadBuilt(root));
}

async function main(argv) {
  await code.init();
  if (argv.includes('--check')) {
    const built = buildInterviews();
    const second = buildInterviews();
    const digest = value => sha(Array.from(value.files).concat(Array.from(value.markdown)).map(([file, body]) => `${file}\n${body}`).join('\n') + value.api);
    const problems = checkInterviews(built);
    if (digest(built) !== digest(second)) problems.push('two builds of the same input gave different bytes');
    console.log(`Checked ${built.pages.length} interview pages.`);
    for (const problem of problems) console.error(`  ${problem}`);
    return problems.length ? 1 : 0;
  }
  const built = writeInterviews();
  console.log(`Wrote ${built.pages.length} interview pages to site/${OUTPUT_DIR}/`);
  return 0;
}

if (require.main === module) {
  main(process.argv.slice(2)).then(status => { process.exitCode = status; }, error => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { buildInterviews, writeInterviews, checkInterviews, searchRecords, interviewSearchRecords, renderCode, renderMarkdown, siteUrl, visibleText, answerText, BASE, API_FILE };
