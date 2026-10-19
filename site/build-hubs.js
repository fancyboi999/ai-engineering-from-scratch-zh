'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { plainMarkdown, truncateText, normalizeWhitespace, explanationUnits } = require('../lib/lesson-document');
const { phaseSlug, phasePath, phaseLabel, termPath, glossaryLookupKey } = require('../lib/hub-routes');

const ORIGIN = 'https://aieng-zh.cn';
const REPO_ROOT = path.resolve(__dirname, '..');
const GLOSSARY_SOURCE = 'https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/glossary/terms.md';
const MIN_TERM_UNITS = 70;
const MAX_COVERED_LESSONS = 8;
const CORE_TERMS = 20;
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=VT323&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=JetBrains+Mono:wght@400;500;700&display=swap';
const THEME_SCRIPT = "(function(){var r=document.documentElement,s='';try{s=localStorage.getItem('theme')||'';}catch(_){}r.setAttribute('data-theme',s||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));function i(){var e=document.getElementById('themeIcon');if(e)e.textContent=r.getAttribute('data-theme')==='light'?'N':'D';}document.addEventListener('DOMContentLoaded',function(){i();var b=document.getElementById('themeToggle');if(b)b.addEventListener('click',function(){var n=r.getAttribute('data-theme')==='light'?'dark':'light';r.setAttribute('data-theme',n);try{localStorage.setItem('theme',n);}catch(_){}i();});});})();";
const GITHUB_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>';
const SITE_HEADER = `<header class="site-header"><div class="header-inner"><a href="/" class="logo"><span class="logo-icon" aria-hidden="true"></span> AI / FROM SCRATCH</a><nav class="header-nav"><a href="/#contents">大纲</a><a href="/catalog">课程表</a><a href="/prereqs">路线图</a><a href="/glossary">术语表</a><a href="/about">关于</a><a href="https://github.com/fancyboi999/ai-engineering-from-scratch-zh" target="_blank" rel="noopener" class="header-github">${GITHUB_ICON}<span class="star-count" data-loading="true" aria-label="GitHub 星标数">…</span></a></nav><button class="theme-toggle" id="themeToggle" aria-label="切换主题" type="button"><span class="theme-icon" id="themeIcon">N</span></button></div></header>`;
const HEAD_ASSETS = '<link rel="stylesheet" href="/style.css">\n<link rel="stylesheet" href="/hubs.css">';
const BODY_ASSETS = '<script src="/header.js" defer></script>';
const EXPLORE_LINKS = [
  ['/catalog', '课程表'], ['/prereqs', '路线图'], ['/learning-paths', '学习路径'],
  ['/certifications', '认证备考'], ['/glossary', '术语表'], ['/about', '关于'], ['/developer', '开发者文档'],
];

const PHASE_HEADLINES = {
  'setup-and-tooling': '配置 AI 开发环境',
  'math-foundations': '学习机器学习所需的数学',
  'ml-fundamentals': '从零学习机器学习',
  'deep-learning-core': '从零学习深度学习',
  'computer-vision': '从零学习计算机视觉',
  'nlp-foundations-to-advanced': '从零学习自然语言处理',
  'speech-and-audio': '从零学习语音与音频 AI',
  'transformers-deep-dive': '深入学习 transformer',
  'generative-ai': '从零学习生成式 AI',
  'reinforcement-learning': '从零学习强化学习',
  'llms-from-scratch': '从零构建 LLM',
  'llm-engineering': '学习 LLM 工程',
  'multimodal-ai': '从零学习多模态 AI',
  'tools-and-protocols': '学习工具调用与 MCP',
  'agent-engineering': '从零构建 AI agent',
  'autonomous-systems': '学习自主 AI 系统',
  'multi-agent-and-swarms': '学习多 agent 系统',
  'infrastructure-and-production': '学习 LLM 服务与 AI 基础设施',
  'ethics-safety-alignment': '学习 AI 伦理、安全与对齐',
  'capstone-projects': 'AI 工程综合项目',
};

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonForHtml(value) {
  return JSON.stringify(value).replace(/&/g, '\\u0026').replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

function count(value, label) {
  return `${value} ${label}`;
}

function typeLabel(type) {
  return ({ Learn: '学习', Build: '构建', Reference: '参考', Project: '项目' })[type] || type;
}

function shortName(term) {
  return term.replace(/\s*\([^)]*\)/g, '').trim();
}

function categoryHref(category) {
  return `/glossary?category=${encodeURIComponent(category)}`;
}

function listText(items) {
  return items.join('、');
}

function phaseLinks(phases) {
  return {
    text: listText(phases.map(phase => phase.label)),
    html: listText(phases.map(phase => `<a href="${phase.href}">${escapeHtml(phase.label)}</a>`)),
  };
}

function clipSentences(text, max) {
  const value = normalizeWhitespace(text);
  if (value.length <= max) return value;
  let out = '';
  for (const sentence of value.split(/(?<=[.!?。！？])\s*/)) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > max) break;
    out = next;
  }
  return out.length >= max * 0.6 ? out : truncateText(value, max);
}

function hoursText(minutes) {
  return minutes < 90 ? `约 ${minutes} 分钟` : `约 ${Math.round(minutes / 60)} 小时`;
}

function markdownBlocks(markdown) {
  const blocks = [];
  let lines = [];
  let fenced = false;
  const flush = () => {
    if (lines.length) blocks.push(lines.join('\n'));
    lines = [];
  };
  for (const line of String(markdown).split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      if (!fenced) flush();
      lines.push(line);
      if (fenced) flush();
      fenced = !fenced;
    } else if (fenced || line.trim()) {
      lines.push(line);
    } else {
      flush();
    }
  }
  flush();
  return blocks;
}

function standaloneText(markdown) {
  return plainMarkdown(markdown).split(/(?<=[.!?。！？])\s*/).filter(sentence => !/\b(?:below|above)\b|下文|上文/i.test(sentence)).join(' ');
}

function phaseGuide(directory, root) {
  const guide = { lede: '', intro: [], prerequisites: '', start: null, command: '', record: '' };
  let markdown;
  try {
    markdown = fs.readFileSync(path.join(root, 'phases', directory, 'README.md'), 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return guide;
  }
  let section = 'intro';
  for (const block of markdownBlocks(markdown)) {
    if (/^#\s/.test(block) || block.startsWith('|')) continue;
    if (/^##\s/.test(block)) {
      section = /start this phase|开始本阶段/i.test(block) ? 'start' : 'other';
      continue;
    }
    if (block.startsWith('>')) {
      if (!guide.lede) guide.lede = plainMarkdown(block.replace(/^>\s?/gm, ''));
      continue;
    }
    if (block.startsWith('```')) {
      if (section === 'start' && !guide.command) guide.command = block.replace(/^\s*```[^\n]*\n?/, '').replace(/\n?\s*```\s*$/, '').trim();
      continue;
    }
    const label = /^\*\*([^*]+?)[:：]\*\*\s*/.exec(block);
    if (section === 'intro') {
      const paragraph = standaloneText(block);
      if (!label && paragraph) guide.intro.push(paragraph);
    } else if (section === 'start' && label && /^(?:prerequisites|前置要求)$/i.test(label[1])) {
      guide.prerequisites = standaloneText(block.slice(label[0].length));
    } else if (section === 'start' && label && !guide.start) {
      const link = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(block);
      if (link && !/^[a-z]+:/i.test(link[2])) {
        guide.start = { label: label[1], path: `phases/${directory}/${link[2].replace(/^\.\//, '').replace(/\/+$/, '')}` };
      }
    } else if (section === 'start' && /^(?:Keep\b|记录)/.test(block)) {
      guide.record = plainMarkdown(block);
    }
  }
  return guide;
}

function buildPhaseModels(phases, prerequisites, lessonManifest, minutes, root) {
  const models = [];
  for (const phase of phases) {
    const label = phaseLabel(phase.id, phase.name);
    const lessons = [];
    let directory = '';
    for (const lesson of phase.lessons) {
      const match = /(phases\/([^/]+)\/([^/]+))\/?$/.exec(lesson.url || '');
      const entry = match && lessonManifest.lessons[match[1]];
      if (!match || !entry || entry.context?.kind !== 'course') {
        throw new Error(`阶段 ${phase.id} 的课程缺少 SEO 条目：${lesson.url}`);
      }
      const expectedCanonical = `${ORIGIN}/lessons/${match[2]}/${match[3]}/`;
      if (entry.canonicalUrl !== expectedCanonical) {
        throw new Error(`课程 canonical 不匹配：${match[1]}，应为 ${expectedCanonical}`);
      }
      if (directory && directory !== match[2]) throw new Error(`阶段 ${phase.id} 混用了课程目录`);
      directory = match[2];
      lessons.push({
        path: match[1],
        url: entry.canonicalUrl,
        href: entry.canonicalUrl.slice(ORIGIN.length),
        number: (/^(\d+)-/.exec(match[3]) || [])[1] || String(lessons.length + 1).padStart(2, '0'),
        title: entry.title,
        summary: clipSentences(entry.excerpt || lesson.summary || entry.description, 200),
        headings: lesson.keywords || '',
        type: lesson.type || '',
        languages: String(lesson.lang || '').split(',').map(value => value.trim()).filter(value => value && value !== '—'),
        minutes: minutes[match[1]] || 0,
        phaseId: phase.id,
        phaseLabel: label,
      });
    }
    if (!lessons.length) continue;
    const slug = phaseSlug(directory);
    const guide = phaseGuide(directory, root);
    const start = guide.start && lessons.find(lesson => lesson.path === guide.start.path);
    if (guide.start && !start) throw new Error(`阶段指南起始课程不存在：${guide.start.path}`);
    guide.start = start ? { label: guide.start.label, lesson: start } : null;
    const total = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
    models.push({
      id: phase.id,
      name: phase.name,
      label,
      number: label.split('：')[0],
      lede: guide.lede || phase.desc || '',
      slug,
      href: phasePath(slug),
      headline: `${PHASE_HEADLINES[slug] || `学习${phase.name}`}：${count(lessons.length, '节免费课程')}`,
      lessons,
      minutes: total,
      hours: total ? Math.max(1, Math.round(total / 60)) : 0,
      guide,
      prerequisiteIds: (prerequisites && prerequisites[phase.id]) || [],
      terms: [],
    });
  }
  const byId = new Map(models.map(model => [model.id, model]));
  if (byId.size !== models.length) throw new Error('阶段编号重复');
  if (new Set(models.map(model => model.slug)).size !== models.length) throw new Error('阶段 slug 重复');
  models.forEach((model, index) => {
    model.before = model.prerequisiteIds.map(id => {
      if (!byId.has(id)) throw new Error(`阶段 ${model.id} 引用了不存在的前置阶段 ${id}`);
      return byId.get(id);
    });
    model.after = models.filter(other => other.prerequisiteIds.includes(model.id));
    model.previous = models[index - 1] || null;
    model.next = models[index + 1] || null;
  });
  return models;
}

function isAcronym(name) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name) && (name.match(/[A-Z]/g) || []).length >= 2;
}

function namePatterns(term, isOtherTerm) {
  const names = new Set();
  const inner = (/\(([^)]+)\)/.exec(term.term) || [])[1];
  for (const name of [shortName(term.term), isOtherTerm(inner) ? '' : inner, ...term.aliases]) {
    const value = String(name || '').trim();
    if (value.length > 2 || /[\p{Script=Han}]/u.test(value)) names.add(value);
  }
  return [...names].map(name => {
    const source = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return new RegExp(`(?:^|[^A-Za-z0-9-])${source}(?:e?s)?(?![A-Za-z0-9-])`, isAcronym(name) ? '' : 'i');
  });
}

function termSkipReason(term) {
  if (!term.whyItMatters && !term.example && !term.confusion) {
    return '仅有定义，缺少“为什么重要”“实际使用”或“常见混淆”字段';
  }
  const units = explanationUnits([term.means, term.whyItMatters, term.example, term.confusion, term.whyCalled].join(' '));
  return units < MIN_TERM_UNITS ? `说明长度 ${units} 单位；独立页至少需要 ${MIN_TERM_UNITS} 单位（CJK 字符计 1，其他语言词语计 2）` : '';
}

function buildTermModels(glossary, phaseModels) {
  const lessons = phaseModels.flatMap(phase => phase.lessons);
  const lessonByPath = new Map(lessons.map(lesson => [lesson.path, lesson]));
  const phaseById = new Map(phaseModels.map(phase => [phase.id, phase]));
  const slugs = new Set();
  const models = glossary.map(term => {
    termPath(term.slug);
    if (slugs.has(term.slug)) throw new Error(`术语 slug 重复：${term.slug}`);
    slugs.add(term.slug);
    const skipReason = termSkipReason(term);
    return {
      term,
      slug: term.slug,
      page: !skipReason,
      skipReason,
      href: skipReason ? `/glossary#${term.slug}` : termPath(term.slug),
      blurb: clipSentences(term.means, 140),
      learn: [],
      titled: [],
      mentioned: [],
      related: [],
      phases: [],
      taughtIn: [],
      coveredIn: [],
    };
  });
  const byKey = new Map();
  for (const model of models) {
    byKey.set(glossaryLookupKey(model.term.term), model);
    for (const alias of model.term.aliases) byKey.set(glossaryLookupKey(alias), model);
  }
  for (const model of models) {
    for (const link of model.term.lessons) {
      const match = /phases\/[^/?#]+\/[^/?#]+/.exec(link.url);
      const lesson = match && lessonByPath.get(match[0]);
      if (!lesson) throw new Error(`术语 ${model.term.term} 引用了不存在的课程：${link.url}`);
      if (!model.learn.includes(lesson)) model.learn.push(lesson);
    }
    const patterns = namePatterns(model.term, name => byKey.has(glossaryLookupKey(name)) && byKey.get(glossaryLookupKey(name)) !== model);
    const names = field => lessons.filter(lesson => !model.learn.includes(lesson) && patterns.some(pattern => pattern.test(lesson[field])));
    model.titled = names('title');
    model.mentioned = names('headings').filter(lesson => !model.titled.includes(lesson));
    for (const name of model.term.related) {
      const related = byKey.get(glossaryLookupKey(name));
      if (!related) throw new Error(`术语“${model.term.term}”引用了不存在的相关术语“${name}”`);
      if (related !== model && !model.related.includes(related)) model.related.push(related);
    }
    const phasesOf = list => [...new Set(list.map(lesson => lesson.phaseId))].map(id => phaseById.get(id)).sort((a, b) => a.id - b.id);
    model.taughtIn = phasesOf(model.learn);
    model.coveredIn = phasesOf(model.titled.concat(model.mentioned)).filter(phase => !model.taughtIn.includes(phase));
    model.phases = model.taughtIn.concat(model.coveredIn).sort((a, b) => a.id - b.id);
    for (const phase of model.phases) phase.terms.push(model);
  }
  for (const model of models) {
    for (const other of model.related) if (!other.related.includes(model)) other.related.push(model);
  }
  for (const phase of phaseModels) phase.terms.sort((a, b) => a.term.term.localeCompare(b.term.term, 'zh-CN'));
  return models;
}

function lessonTermMap(termModels) {
  const map = {};
  for (const model of termModels) {
    for (const lesson of model.learn.concat(model.titled)) {
      (map[lesson.path] = map[lesson.path] || []).push({ term: model.term.term, href: model.href });
    }
  }
  for (const list of Object.values(map)) list.sort((a, b) => a.term.localeCompare(b.term, 'zh-CN'));
  return map;
}

function termTitle(term) {
  const suffixes = [];
  if (term.example && term.confusion) suffixes.push('定义、示例与常见混淆');
  if (term.example) suffixes.push('定义与示例');
  if (term.confusion) suffixes.push('定义与常见混淆');
  suffixes.push('定义');
  for (const name of [term.term, shortName(term.term)]) {
    for (const suffix of suffixes) {
      const title = `${name}：${suffix}`;
      if (title.length <= 60) return title;
    }
  }
  return truncateText(`${shortName(term.term)}：定义`, 60);
}

function termQuestions(term) {
  const questions = [{ id: 'definition', question: `什么是 ${term.term}？`, answer: term.means }];
  if (term.whyItMatters) questions.push({ id: 'why-it-matters', question: `${term.term} 为什么重要？`, answer: term.whyItMatters });
  if (term.confusion) questions.push({ id: 'common-confusion', question: `${term.term} 有哪些常见混淆？`, answer: term.confusion });
  return questions;
}

function faqJsonLd(questions) {
  return {
    '@type': 'FAQPage',
    inLanguage: 'zh-CN',
    mainEntity: questions.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

function breadcrumbJsonLd(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: ORIGIN + item.href })),
  };
}

function breadcrumbHtml(items) {
  return `<nav class="hub-breadcrumb" aria-label="面包屑导航"><ol>${items.map((item, index) => index === items.length - 1
    ? `<li><span aria-current="page">${escapeHtml(item.name)}</span></li>`
    : `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.name)}</a></li>`).join('')}</ol></nav>`;
}

function coreTerms(termModels) {
  const degree = model => model.related.length * 2 + model.learn.length + model.titled.length + model.mentioned.length;
  return termModels.filter(model => model.page)
    .sort((a, b) => degree(b) - degree(a) || a.term.term.localeCompare(b.term.term, 'zh-CN'))
    .slice(0, CORE_TERMS)
    .sort((a, b) => a.term.term.localeCompare(b.term.term, 'zh-CN'));
}

function siteFooter(phaseModels, termModels, categories) {
  const column = (title, links) => `<nav class="hub-footer-column" aria-label="${escapeHtml(title)}"><p class="hub-label">${escapeHtml(title)}</p>`
    + `<ul>${links.map(([href, label]) => `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`).join('')}</ul></nav>`;
  return '<footer class="site-footer hub-footer"><div class="container"><div class="hub-footer-grid">'
    + column('课程阶段', phaseModels.map(phase => [phase.href, phase.label]))
    + column('核心术语', coreTerms(termModels).map(model => [model.href, model.term.term]))
    + column('按学习领域查阅术语', categories.map(category => [categoryHref(category), category]))
    + column('探索', EXPLORE_LINKS)
    + '</div><div class="footer-inner"><p>AI 工程从零开始 · 开源 · 免费学习。</p>'
    + '<div class="footer-links"><a href="https://github.com/fancyboi999/ai-engineering-from-scratch-zh" target="_blank" rel="noopener">GitHub</a></div></div></div></footer>';
}

function pagerHtml(label, previous, next) {
  const links = [
    previous && `<a href="${escapeHtml(previous.href)}" rel="prev">← ${escapeHtml(previous.text)}</a>`,
    next && `<a href="${escapeHtml(next.href)}" rel="next">${escapeHtml(next.text)} →</a>`,
  ].filter(Boolean).join('');
  return links ? `<nav class="hub-pager" aria-label="${escapeHtml(label)}">${links}</nav>` : '';
}

function lessonItemHtml(lesson, withPhase) {
  const meta = withPhase
    ? [lesson.phaseLabel]
    : [typeLabel(lesson.type), lesson.languages.join(', '), lesson.minutes ? `约 ${lesson.minutes} 分钟` : ''].filter(Boolean);
  return `<li>${withPhase ? '' : `<span class="hub-num" aria-hidden="true">${escapeHtml(lesson.number)}</span>`}<div><a href="${lesson.href}">${escapeHtml(lesson.title)}</a>`
    + `${lesson.summary ? `<p>${escapeHtml(lesson.summary)}</p>` : ''}<p class="hub-meta">${escapeHtml(meta.join(' · '))}</p></div></li>`;
}

function termItemHtml(model) {
  return `<li><a href="${escapeHtml(model.href)}">${escapeHtml(model.term.term)}</a><span>${escapeHtml(model.blurb)}</span></li>`;
}

function pageShell({ title, description, href, card, ogType, jsonLd, main }, context) {
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
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="AI 工程从零开始">
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
${context.headAssets}
<script>${THEME_SCRIPT}</script>
<script type="application/ld+json">${jsonForHtml({ '@context': 'https://schema.org', '@graph': jsonLd })}</script>
</head>
<body>
<a href="${href}#main" class="skip-link">跳转到正文</a>
${SITE_HEADER}
${main}
${context.footer}
${context.bodyAssets}
</body>
</html>
`;
}

function termPage(model, context) {
  const { term } = model;
  const href = termPath(model.slug);
  const canonical = ORIGIN + href;
  const crumbs = [{ name: '首页', href: '/' }, { name: '术语表', href: '/glossary' }, { name: term.term, href }];
  const questions = termQuestions(term);
  const answer = id => questions.find(item => item.id === id);
  const neighbor = offset => {
    const other = context.alphabetical[context.alphabetical.indexOf(model) + offset];
    return other && { href: other.href, text: other.term.term };
  };
  const sections = [];
  const section = (id, heading, body) => sections.push(`<section class="hub-section" aria-labelledby="${id}"><h2 id="${id}">${escapeHtml(heading)}</h2>${body}</section>`);
  if (answer('why-it-matters')) section('why-it-matters', answer('why-it-matters').question, `<p>${escapeHtml(term.whyItMatters)}</p>`);
  if (term.example) section('in-practice', `${term.term} 的实际使用`, `<p>${escapeHtml(term.example)}</p>`);
  if (answer('common-confusion')) section('common-confusion', answer('common-confusion').question, `<p>${escapeHtml(term.confusion)}</p>`);
  if (term.whyCalled) section('name', `为什么叫 ${term.term}？`, `<p>${escapeHtml(term.whyCalled)}</p>`);

  const learn = [];
  if (model.learn.length) learn.push(`<p class="hub-label">从这些课开始</p><ul class="hub-lessons">${model.learn.map(lesson => lessonItemHtml(lesson, true)).join('')}</ul>`);
  const covered = model.titled.concat(model.mentioned);
  if (covered.length) {
    learn.push(`<p class="hub-label">标题或章节中提到 ${escapeHtml(term.term)} 的课程</p><ul class="hub-lessons">${covered.slice(0, MAX_COVERED_LESSONS).map(lesson => lessonItemHtml(lesson, true)).join('')}</ul>`);
  }
  if (model.taughtIn.length) learn.push(`<p>对应教学阶段：${phaseLinks(model.taughtIn).html}。</p>`);
  if (model.coveredIn.length) learn.push(`<p>${model.taughtIn.length ? '也涉及' : '涉及'}的阶段：${phaseLinks(model.coveredIn).html}。</p>`);
  if (!model.phases.length) {
    learn.push(`<p>目前没有课程直接链接到这个术语。可以到<a href="/catalog?q=${encodeURIComponent(shortName(term.term))}">课程表</a>搜索。</p>`);
  }
  section('learn', `学习 ${term.term} 的课程`, learn.join(''));
  if (model.related.length) section('related', '相关术语', `<ul class="hub-terms">${model.related.map(termItemHtml).join('')}</ul>`);
  if (term.sources.length) {
    section('sources', '来源', `<ul class="hub-sources">${term.sources.map(source => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.label)}</a></li>`).join('')}</ul>`);
  }
  const peers = context.termModels.filter(other => other !== model && other.term.category === term.category);
  if (peers.length) {
    section('category', `${term.category}的更多术语`, `<ul class="hub-columns">${peers.map(peer => `<li><a href="${escapeHtml(peer.href)}">${escapeHtml(peer.term.term)}</a></li>`).join('')}</ul><p><a href="${categoryHref(term.category)}">在术语表中浏览${escapeHtml(term.category)}分类</a></p>`);
  }

  const main = `<main id="main" class="hub-page"><div class="container hub-wrap">${breadcrumbHtml(crumbs)}`
    + `<header class="hub-hero"><p class="hub-kicker"><a href="${categoryHref(term.category)}">${escapeHtml(term.category)}</a> · 术语</p>`
    + `<h1>${escapeHtml(questions[0].question)}</h1><p class="hub-lede">${escapeHtml(term.means)}</p>`
    + `${term.aliases.length ? `<p class="hub-aliases">别名：${escapeHtml(listText(term.aliases))}。</p>` : ''}`
    + `${term.says ? `<figure class="hub-says"><figcaption>常见说法</figcaption><blockquote><p>“${escapeHtml(term.says)}”</p></blockquote></figure>` : ''}</header>`
    + sections.join('')
    + pagerHtml('上一个和下一个术语', neighbor(-1), neighbor(1))
    + `<p class="hub-source">本词条来自 GitHub 上的 <a href="${GLOSSARY_SOURCE}" target="_blank" rel="noopener">glossary/terms.md</a>。<a href="/glossary">浏览全部 ${context.termModels.length} 个术语</a>。</p>`
    + '</div></main>';

  return pageShell({
    title: termTitle(term),
    description: clipSentences(term.means, 160),
    href,
    card: `term/${model.slug}`,
    ogType: 'article',
    jsonLd: [
      {
        '@type': 'DefinedTerm',
        inLanguage: 'zh-CN',
        '@id': `${canonical}#term`,
        name: term.term,
        ...(term.aliases.length ? { alternateName: term.aliases } : {}),
        description: term.means,
        url: canonical,
        inDefinedTermSet: { '@type': 'DefinedTermSet', '@id': `${ORIGIN}/glossary#terms`, name: 'AI 工程术语表', url: `${ORIGIN}/glossary` },
      },
      breadcrumbJsonLd(crumbs),
      faqJsonLd(questions),
    ],
    main,
  }, context);
}

function phaseFacts(phase) {
  const types = new Map();
  const languages = new Map();
  for (const lesson of phase.lessons) {
    if (lesson.type) types.set(lesson.type, (types.get(lesson.type) || 0) + 1);
    for (const language of lesson.languages) languages.set(language, (languages.get(language) || 0) + 1);
  }
  return {
    types: [...types].sort((a, b) => b[1] - a[1]),
    languages: [...languages].sort((a, b) => b[1] - a[1]).map(([language]) => language),
  };
}

function phaseQuestions(phase, facts) {
  const total = phase.lessons.length;
  const typeText = facts.types.length ? `课程类型：${listText(facts.types.map(([type, value]) => `${value} 节${typeLabel(type)}课`))}。` : '';
  const languageText = facts.languages.length ? `课程代码使用 ${listText(facts.languages.slice(0, 4))}。` : '';
  const plain = text => ({ answer: text, html: escapeHtml(text) });
  const questions = [{ question: `${phase.label}有多少节课？`, ...plain(`${phase.number}共 ${total} 节课。${typeText}${languageText}`) }];
  const guide = phase.guide.prerequisites ? `阶段指南的前置要求：${phase.guide.prerequisites}` : '';
  let prerequisites = plain(guide || '不要求先完成其他阶段。从第一课开始即可。');
  if (phase.before.length) {
    const lead = guide ? `${guide} ` : '';
    const before = phaseLinks(phase.before);
    prerequisites = {
      answer: `${lead}根据课程路线图，本阶段建立在${before.text}的基础上。`,
      html: `${escapeHtml(lead)}根据课程路线图，本阶段建立在${before.html}的基础上。`,
    };
  }
  questions.push({ question: `开始${phase.number}前需要掌握什么？`, ...prerequisites });
  questions.push({ question: `${phase.number}免费吗？`, ...plain(`是的。这 ${total} 节课都可以在本站免费阅读，无需账号。课程代码以 MIT 许可证开源。`) });
  if (phase.minutes) questions.push({ question: `${phase.number}需要多长时间？`, ...plain(`全部 ${total} 节课的预计学习时间合计${hoursText(phase.minutes)}。`) });
  if (phase.after.length) {
    const after = phaseLinks(phase.after);
    questions.push({ question: `${phase.number}之后学什么？`, answer: `${after.text}建立在本阶段的基础上。`, html: `${after.html}建立在本阶段的基础上。` });
  }
  return questions;
}

function phaseDescription(phase) {
  const lessons = count(phase.lessons.length, '节免费课程');
  const first = phase.lessons[0].title;
  const last = phase.lessons[phase.lessons.length - 1].title;
  const candidates = [`${phase.lede} ${lessons}，从${first}到${last}。`, `${phase.lede} ${lessons}，从${first}开始。`, `${phase.lede} ${lessons}。`];
  return candidates.find(candidate => candidate.length <= 160) || clipSentences(candidates[2], 160);
}

function phasePage(phase, context) {
  const canonical = ORIGIN + phase.href;
  const crumbs = [{ name: '首页', href: '/' }, { name: '课程表', href: '/catalog' }, { name: phase.label, href: phase.href }];
  const facts = phaseFacts(phase);
  const questions = phaseQuestions(phase, facts);
  const description = phaseDescription(phase);
  const stats = [`<li><strong>${phase.lessons.length}</strong> 节课</li>`]
    .concat(facts.types.length > 1 ? facts.types.map(([type, total]) => `<li><strong>${total}</strong> ${escapeHtml(typeLabel(type))}</li>`) : [])
    .concat(phase.hours ? [`<li><strong>~${phase.hours}</strong> 小时</li>`] : [])
    .concat(facts.languages.length ? [`<li>${escapeHtml(facts.languages.slice(0, 4).join(', '))}</li>`] : []);
  const { start, command, record, intro } = phase.guide;
  const startHtml = start
    ? `<section class="hub-section" aria-labelledby="start"><h2 id="start">开始${phase.number}</h2><p><span class="hub-label">${escapeHtml(start.label)}</span> <a href="${start.lesson.href}">${escapeHtml(start.lesson.title)}</a></p>`
      + `${command ? `<p>从仓库根目录运行：</p><pre class="hub-code"><code>${escapeHtml(command)}</code></pre>` : ''}`
      + `${record ? `<p>${escapeHtml(record)}</p>` : ''}</section>`
    : '';
  const termsHtml = phase.terms.length
    ? `<section class="hub-section" aria-labelledby="terms"><h2 id="terms">本阶段的术语</h2><ul class="hub-terms">${phase.terms.map(termItemHtml).join('')}</ul></section>`
    : '';
  const neighbor = other => other && { href: other.href, text: other.label };

  const main = `<main id="main" class="hub-page"><div class="container hub-wrap">${breadcrumbHtml(crumbs)}`
    + `<header class="hub-hero"><p class="hub-kicker">${escapeHtml(phase.number)} · ${escapeHtml(phase.name)}</p><h1>${escapeHtml(phase.headline)}</h1>`
    + `<p class="hub-lede">${escapeHtml(phase.lede)}</p><ul class="hub-stats">${stats.join('')}</ul>`
    + (phase.sheets.length ? `<p class="hub-sheet">速查表：${phase.sheets.map(sheet => `<a href="${escapeHtml(sheet.href)}">${escapeHtml(sheet.title)}</a>`).join('、')}</p>` : '')
    + `${intro.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</header>`
    + startHtml
    + `<section class="hub-section" aria-labelledby="lessons"><h2 id="lessons">${escapeHtml(phase.number)}的全部 ${count(phase.lessons.length, '节课')}</h2><ol class="hub-lessons">${phase.lessons.map(lesson => lessonItemHtml(lesson, false)).join('')}</ol></section>`
    + termsHtml
    + `<section class="hub-section hub-faq" aria-labelledby="faq"><h2 id="faq">常见问题</h2>${questions.map(item => `<h3>${escapeHtml(item.question)}</h3><p>${item.html}</p>`).join('')}</section>`
    + pagerHtml('上一个和下一个阶段', neighbor(phase.previous), neighbor(phase.next))
    + '</div></main>';

  return pageShell({
    title: phase.headline,
    description,
    href: phase.href,
    card: `phase/${phase.slug}`,
    ogType: 'website',
    jsonLd: [
      {
        '@type': 'Course',
        '@id': `${canonical}#course`,
        name: phase.label,
        description,
        url: canonical,
        inLanguage: 'zh-CN',
        isAccessibleForFree: true,
        ...(phase.hours ? { timeRequired: `PT${phase.hours}H` } : {}),
        ...(phase.before.length ? { coursePrerequisites: phase.before.map(other => ({ '@type': 'Course', name: other.label, url: ORIGIN + other.href })) } : {}),
        isPartOf: { '@type': 'Course', name: 'AI 工程从零开始', url: ORIGIN },
        hasPart: phase.lessons.map(lesson => ({ '@type': 'LearningResource', name: lesson.title, url: lesson.url })),
      },
      breadcrumbJsonLd(crumbs),
      faqJsonLd(questions),
    ],
    main,
  }, context);
}

function termMarkdown(model) {
  const { term } = model;
  const questions = termQuestions(term);
  const lines = [`# ${questions[0].question}`, '', `规范页面： ${ORIGIN}${termPath(model.slug)}`, `分类： ${term.category}`];
  if (term.aliases.length) lines.push(`别名： ${term.aliases.join(', ')}`);
  lines.push('', term.means);
  if (term.says) lines.push('', `常见说法： "${term.says}"`);
  for (const item of questions.slice(1)) lines.push('', `## ${item.question}`, '', item.answer);
  if (term.example) lines.push('', `## ${term.term} 的实际使用`, '', term.example);
  if (term.whyCalled) lines.push('', `## 为什么叫 ${term.term}？`, '', term.whyCalled);
  const lessons = model.learn.concat(model.titled.concat(model.mentioned).slice(0, MAX_COVERED_LESSONS));
  if (lessons.length) {
    lines.push('', '## 课程', '');
    for (const lesson of lessons) lines.push(`- [${lesson.title}](${lesson.url}) (${lesson.phaseLabel})`);
  }
  if (model.related.length) {
    lines.push('', '## 相关术语', '');
    for (const related of model.related) lines.push(`- [${related.term.term}](${ORIGIN}${related.href})`);
  }
  if (term.sources.length) {
    lines.push('', '## 来源', '');
    for (const source of term.sources) lines.push(`- [${source.label}](${source.url})`);
  }
  lines.push('', `[术语表](${ORIGIN}/glossary) | [课程索引](${ORIGIN}/llms.txt)`, '');
  return lines.join('\n');
}

function phaseMarkdown(phase) {
  const lines = [`# ${phase.headline}`, '', `规范页面： ${ORIGIN}${phase.href}`, '', phase.lede];
  for (const paragraph of phase.guide.intro) lines.push('', paragraph);
  lines.push('', `## ${phase.label}的课程`, '');
  for (const lesson of phase.lessons) {
    const meta = [typeLabel(lesson.type), lesson.languages.join(', '), lesson.minutes ? `约 ${lesson.minutes} 分钟` : ''].filter(Boolean).join(', ');
    lines.push(`${lesson.number}. [${lesson.title}](${lesson.url})${lesson.summary ? `: ${lesson.summary}` : ''}${meta ? ` (${meta})` : ''}`);
  }
  if (phase.guide.command) lines.push('', '## 开始学习', '', '从仓库根目录运行：', '', '```bash', phase.guide.command, '```');
  if (phase.terms.length) {
    lines.push('', '## 本阶段的术语', '');
    for (const model of phase.terms) lines.push(`- [${model.term.term}](${ORIGIN}${model.href})`);
  }
  lines.push('', '## 常见问题');
  for (const item of phaseQuestions(phase, phaseFacts(phase))) lines.push('', `### ${item.question}`, '', item.answer);
  lines.push('', `[课程表](${ORIGIN}/catalog) | [课程索引](${ORIGIN}/llms.txt)`, '');
  return lines.join('\n');
}

function glossaryJsonLd(termModels) {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    '@id': `${ORIGIN}/glossary#terms`,
    name: 'AI 工程术语表',
    url: `${ORIGIN}/glossary`,
    inLanguage: 'zh-CN',
    hasDefinedTerm: termModels.map(model => ({ '@type': 'DefinedTerm', name: model.term.term, url: ORIGIN + model.href })),
  };
}

function glossaryIndexHtml(termModels, categories) {
  const groups = categories.map(category => {
    const members = termModels.filter(model => model.term.category === category)
      .sort((a, b) => a.term.term.localeCompare(b.term.term, 'zh-CN'));
    if (!members.length) return '';
    const links = members.map(model => (model.page
      ? `<li><a href="${model.href}" data-term-page="${model.slug}">${escapeHtml(model.term.term)}</a></li>`
      : `<li><a href="#${model.slug}">${escapeHtml(model.term.term)}</a></li>`)).join('');
    return `            <section aria-label="${escapeHtml(category)}"><h3>${escapeHtml(category)}</h3><ul>${links}</ul></section>`;
  }).filter(Boolean);
  const pages = termModels.filter(model => model.page).length;
  return `          <section class="glossary-index" aria-labelledby="glossaryIndexTitle" data-generated-discovery="glossary">\n`
    + `            <h2 id="glossaryIndexTitle">按学习领域浏览全部 ${termModels.length} 个术语</h2>\n`
    + `            <p>${pages} 个术语拥有独立页面，包含定义、重要性、常见混淆和课程链接。</p>\n`
    + `            <div class="glossary-index-groups">\n${groups.join('\n')}\n            </div>\n`
    + '          </section>';
}

function writeFiles(directory, files, extension) {
  fs.mkdirSync(directory, { recursive: true });
  const keep = new Set(files.map(file => file.name + extension));
  for (const name of fs.readdirSync(directory)) {
    if (name.endsWith(extension) && !keep.has(name)) fs.unlinkSync(path.join(directory, name));
  }
  for (const file of files) fs.writeFileSync(path.join(directory, file.name + extension), file.body, 'utf8');
}

function buildHubs({ phases, prerequisites, glossary, categories, lessonManifest, minutes = {}, root = REPO_ROOT, siteDir = __dirname, versionHtml = html => html, cheatsheets = {} }) {
  const phaseModels = buildPhaseModels(phases, prerequisites, lessonManifest, minutes, root);
  for (const phase of phaseModels) phase.sheets = cheatsheets[phase.slug] || [];
  const termModels = buildTermModels(glossary, phaseModels);
  const context = {
    phaseModels,
    termModels,
    alphabetical: termModels.slice().sort((a, b) => a.term.term.localeCompare(b.term.term, 'zh-CN')),
    footer: siteFooter(phaseModels, termModels, categories),
    headAssets: versionHtml(HEAD_ASSETS, siteDir),
    bodyAssets: versionHtml(BODY_ASSETS, siteDir),
  };
  const pages = termModels.filter(model => model.page);
  return {
    phaseModels,
    termModels,
    termPages: pages.map(model => ({ name: model.slug, href: model.href, html: termPage(model, context), markdown: termMarkdown(model) })),
    phasePages: phaseModels.map(phase => ({ name: phase.slug, href: phase.href, html: phasePage(phase, context), markdown: phaseMarkdown(phase) })),
    lessonTerms: lessonTermMap(termModels),
    glossaryJsonLd: `  <script type="application/ld+json">${jsonForHtml(glossaryJsonLd(termModels))}</script>`,
    glossaryIndex: glossaryIndexHtml(termModels, categories),
    skipped: termModels.filter(model => !model.page).map(model => ({ term: model.term.term, reason: model.skipReason })),
  };
}

function writeHubs(options, siteDir = __dirname) {
  const hubs = buildHubs({ ...options, siteDir });
  for (const [kind, list] of [['glossary', hubs.termPages], ['phase', hubs.phasePages]]) {
    writeFiles(path.join(siteDir, 'hubs', kind), list.map(page => ({ name: page.name, body: page.html })), '.html');
    writeFiles(path.join(siteDir, 'agent-pages', kind), list.map(page => ({ name: page.name, body: page.markdown })), '.md');
  }
  fs.writeFileSync(path.join(siteDir, 'lesson-terms.json'), JSON.stringify({ lessons: hubs.lessonTerms }) + '\n', 'utf8');
  console.log(`   已生成 ${hubs.termPages.length} 个术语独立页（${hubs.skipped.length} 个短条目保留在 /glossary）和 ${hubs.phasePages.length} 个阶段 Hub`);
  return hubs;
}

module.exports = { buildHubs, writeHubs, SITE_HEADER };
