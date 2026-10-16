'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeWhitespace } = require('./lesson-document');

const ORIGIN = 'https://aieng-zh.cn';
const BRAND = '开源 · MIT';
const INDEPENDENT = '独立社区备考';
const STATIC_TYPES = ['page', 'project', 'manual', 'term', 'phase'];
const CARD_URL = new RegExp(`(${ORIGIN.replace(/\./g, '\\.')}/og/(${STATIC_TYPES.join('|')})/([a-z0-9-]+)\\.png)(?:\\?v=[0-9a-f]+)?`, 'g');
const CARD_TAG = new RegExp(`([ \\t]*)<meta property="og:image" content="${CARD_URL.source}">`, 'g');
const COMPANION_TAG = /[ \t]*<meta (?:property="og:image:(?:width|height|alt)"|name="twitter:(?:card|image|image:alt)") content="[^"]*">\r?\n?/g;
const LEVEL_NAMES = { 1: '入门', 2: '构建', 3: '工程', 4: '系统', 5: '前沿' };
const PAGES = {
  about: ['关于课程', '关于这套课程', '课程的目标、维护者和站点构建方式。', '/about.html'],
  catalog: ['课程目录 · {lessons} 节课', '课程目录', '搜索和筛选 {phases} 个阶段的全部课程。', '/catalog.html'],
  glossary: ['术语表 · {terms} 个术语', 'AI 工程术语表', '准确的定义、实例、概念辨析和相关课程。', '/glossary.html'],
  prereqs: ['路线图 · {phases} 个阶段', '学习路线图', '梳理前置要求，找到下一阶段。', '/prereqs.html'],
  'learning-paths': ['学习路径', 'AI 工程学习路径', '围绕实际课程组织的核心路径与职业路线。', '/learning-paths.html'],
  blogs: ['文章与指南', 'AI 工程文章与指南', '深入理解 agent、推理和 RAG 的实践指南。', '/blogs.html'],
  developer: ['开发者', 'API 与 MCP 文档', '课程搜索、Markdown、OpenAPI 和托管 MCP 服务。', '/developer.html'],
  contact: ['联系', '联系维护者', '通过项目公开渠道联系维护者与贡献者。', '/contact.html'],
  privacy: ['隐私', '隐私政策', '课程网站如何处理数据。', '/privacy.html'],
  certifications: ['认证备考 · {tracks} 条路线', '认证备考', '独立社区课程，不隶属于 Anthropic，不颁发证书，不保证通过。', '/certifications.html'],
  assessment: ['练习评估', '练习评估', '原创限时练习，按考试领域提供反馈；练习成绩不是官方分数。', '/assessment.html'],
  projects: ['项目 · {projects} 个', '实战项目', '从简单到进阶，分阶段构建真实 AI 项目并运行测试。', '/projects.html'],
  project: ['项目', '构建真实 AI 项目', '分阶段实现，每一阶段都有测试。', '/projects.html'],
  manuals: ['手册 · {manuals} 本', '技术手册', '围绕明确版本深入讲解一个主题。', '/manuals.html'],
};

let renderer;

function card(label, meta, title, description, page) {
  return { label: normalizeWhitespace(label), meta: normalizeWhitespace(meta), title: normalizeWhitespace(title), description: normalizeWhitespace(description), path: page };
}

function summary(title, description) {
  const value = normalizeWhitespace(description);
  const prefix = `${normalizeWhitespace(title)}: `;
  return value.toLowerCase().startsWith(prefix.toLowerCase()) ? value.slice(prefix.length) : value;
}

function pageCard(id, stats) {
  if (id === 'home') {
    return {
      kind: 'home',
      label: 'FIG_000 · 核心课程',
      meta: BRAND,
      title: '从零构建 AI 工程',
      description: '亲手写出反向传播、分词器、注意力机制和 agent 循环。再读论文时，理论就建立在你已经运行过的代码上。',
      stats: [`${stats.lessons} 节课`, `${stats.phases} 个阶段`, `${stats.skills} 个技能`, `${stats.prompts} 个 prompt`],
    };
  }
  const fill = template => template.replace(/\{(\w+)\}/g, (_, key) => String(stats[key]));
  const [label, title, description, page] = PAGES[id];
  return card(fill(label), BRAND, title, fill(description), page);
}

function lessonCard(entry, lang = 'zh') {
  if (lang !== 'zh') throw new Error('Only Chinese social cards are published');
  const context = entry.context || {};
  const match = /^phases\/(\d+)-[^/]+\/(\d+)-/.exec(entry.path) || /\/lessons\/(\d+)-/.exec(entry.path) || [];
  const certification = context.kind === 'certification';
  const label = certification
    ? `${context.programName || '认证备考'} · 第 ${match[1] || ''} 课`
    : `第 ${match.slice(1).join('.')} 课 · ${context.phaseName || '从零构建 AI 工程'}`;
  const languages = String(context.languages || '').split(',').map(normalizeWhitespace).filter(value => value && value !== '—').join(', ');
  const types = { Learn: '学习', Build: '构建', Reference: '参考' };
  const meta = certification ? INDEPENDENT : [types[context.type] || context.type, languages].filter(Boolean).join(' · ');
  const page = /^phases\/[^/]+\/[^/]+$/.test(entry.path)
    ? `/lessons/${entry.path.slice(7)}/`
    : `/lesson.html?path=${entry.path}`;
  return card(label, meta, entry.title, summary(entry.title, entry.description), page);
}

function trackCard(entry) {
  const lessons = Array.isArray(entry.lessons) ? entry.lessons.length : 0;
  return card(`认证路线 · ${lessons} 节课`, INDEPENDENT, entry.title, summary(entry.title, entry.description), `/certification.html?id=${entry.id}`);
}

function projectCard(project) {
  const stages = Array.isArray(project.stages) ? project.stages.length : 0;
  return card(`项目 · 级别 ${project.level} ${LEVEL_NAMES[project.level] || ''}`, `${stages} 个阶段 · ${project.hours} 小时`, project.title, project.tagline, `/project/${project.id}/`);
}

function projectStageCard(project, stage) {
  const difficulty = { starter: '入门', builder: '构建', engineer: '工程', systems: '系统', frontier: '前沿', core: '核心' }[stage.difficulty] || stage.difficulty || '';
  const languages = String(stage.language || '').split('+').filter(Boolean).map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(' + ');
  const meta = [difficulty, languages, stage.hours ? `${stage.hours} 小时` : ''].filter(Boolean).join(' · ');
  return card(`阶段 ${stage.number}/${project.stages.length} · ${project.title}`, meta, stage.title, stage.summary, `/project/${project.id}/${stage.id}/`);
}

function manualCard(manual) {
  const pin = manual.pin || {};
  return card(`手册 · 第 ${manual.edition} 版`, pin.version ? `固定版本 · ${pin.version}` : '', manual.title, manual.subtitle || manual.summary, `/manual-${manual.id}`);
}

function termCard(term) {
  return card(`术语 · ${term.category || 'AI 工程'}`, BRAND, term.term, term.means, `/glossary/${term.slug}`);
}

function phaseCard(phase) {
  return card(`阶段 ${String(phase.id).padStart(2, '0')} · ${phase.lessons} 节课`, BRAND, phase.name, phase.description, `/phase/${phase.slug}`);
}

function socialCards({ stats, projects = [], manuals = [], terms = [], phases = [] }) {
  const counts = { ...stats, projects: projects.length, manuals: manuals.length };
  const cards = {};
  for (const id of ['home'].concat(Object.keys(PAGES))) cards[`page/${id}`] = pageCard(id, counts);
  for (const project of projects) cards[`project/${project.id}`] = projectCard(project);
  for (const manual of manuals) cards[`manual/${manual.id}`] = manualCard(manual);
  for (const term of terms) cards[`term/${term.slug}`] = termCard(term);
  for (const phase of phases) cards[`phase/${phase.slug}`] = phaseCard(phase);
  return cards;
}

function rendererVersion() {
  if (!renderer) {
    const fonts = path.join(__dirname, 'og-fonts');
    const files = fs.readdirSync(fonts).filter(name => name.endsWith('.json')).sort().map(name => path.join(fonts, name));
    const hash = crypto.createHash('sha256');
    for (const file of [path.join(__dirname, 'og-render.js')].concat(files)) hash.update(fs.readFileSync(file));
    renderer = hash.digest('hex');
  }
  return renderer;
}

function cardVersion(spec) {
  return crypto.createHash('sha256').update(rendererVersion()).update(JSON.stringify(spec)).digest('hex').slice(0, 12);
}

function cardPath(type, id, spec, lang = 'zh') {
  return `/og/${type}/${id}.png?${lang === 'zh' ? '' : `lang=${lang}&`}v=${cardVersion(spec)}`;
}

function cardUrl(type, id, spec, lang) {
  return ORIGIN + cardPath(type, id, spec, lang);
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cardTags(url, spec) {
  const image = escapeAttribute(url);
  const alt = escapeAttribute(spec.kind === 'home' ? spec.title : `${spec.title} - 从零构建 AI 工程`);
  return [
    `<meta property="og:image" content="${image}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${alt}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:image" content="${image}">`,
    `<meta name="twitter:image:alt" content="${alt}">`,
  ];
}

function stampCards(html, cards) {
  const spec = (type, id) => {
    const found = cards && Object.prototype.hasOwnProperty.call(cards, `${type}/${id}`) ? cards[`${type}/${id}`] : null;
    if (!found) throw new Error(`No social card for ${type}/${id}; run site/build.js first`);
    return found;
  };
  const tagged = html.match(CARD_TAG)
    ? html.replace(COMPANION_TAG, '').replace(CARD_TAG, (match, indent, url, type, id) => cardTags(url, spec(type, id)).map(tag => indent + tag).join('\n'))
    : html;
  return tagged.replace(CARD_URL, (match, url, type, id) => `${url}?v=${cardVersion(spec(type, id))}`);
}

module.exports = {
  ORIGIN,
  PAGES,
  STATIC_TYPES,
  cardPath,
  cardTags,
  cardUrl,
  cardVersion,
  lessonCard,
  pageCard,
  projectCard,
  projectStageCard,
  socialCards,
  stampCards,
  trackCard,
};
