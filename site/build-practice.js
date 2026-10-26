'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const markdown = require('./md-render');
const { phaseSlug } = require('../lib/hub-routes');
const { SITE_HEADER } = require('./build-hubs');

const ORIGIN = 'https://aieng-zh.cn';
const REPO = 'https://github.com/fancyboi999/ai-engineering-from-scratch-zh';
const REPO_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = 'practice';
const OUTPUT_DIR = 'practice';
const BASE = '/practice';
const TRACKS = `${BASE}/tracks`;
const CARD = 'page/practice';
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABELS = { easy: '入门', medium: '进阶', hard: '挑战' };
const TARGET_METRIC_LABELS = {
  'held-out accuracy': '留出集准确率',
  'held-out log loss': '留出集对数损失',
  'held-out mean negative log-likelihood (nats per character)': '留出集平均负对数似然（nat/字符）',
  'held-out mean squared error': '留出集均方误差',
};
const targetMetricLabel = metric => TARGET_METRIC_LABELS[metric] || metric;
const LAYERS = ['examples', 'properties', 'edge', 'reference'];
const KINDS = ['implement', 'research', 'train', 'lab'];
const KIND_LABELS = { implement: '代码实现', research: '论文复现', train: '模型训练', lab: '实验探究' };
const KIND_TYPES = { implement: '代码练习', research: '论文方法实现练习', train: '模型训练练习', lab: '实验练习' };
const TAG_LABELS = {
  "actor-critic": "Actor Critic",
  "adam": "Adam",
  "advantages": "优势函数",
  "agents": "Agent",
  "alignment": "对齐",
  "attention": "注意力",
  "backpropagation": "反向传播",
  "batch-norm": "BatchNorm",
  "beam-search": "Beam Search",
  "benchmarking": "基准测试",
  "bias-variance": "偏差与方差",
  "bigram": "二元语言模型",
  "bm25": "BM25",
  "bpe": "BPE",
  "chain-rule": "链式法则",
  "class-imbalance": "类别不平衡",
  "classification": "分类",
  "clip": "CLIP",
  "clustering": "聚类",
  "contrastive-learning": "对比学习",
  "cosine-similarity": "余弦相似度",
  "cross-entropy": "交叉熵",
  "ddpm": "DDPM",
  "decision-trees": "决策树",
  "decoding": "解码",
  "diffusion": "扩散模型",
  "distances": "距离",
  "dpo": "DPO",
  "dropout": "Dropout",
  "eigenvalues": "特征值",
  "embeddings": "Embedding",
  "entropy": "熵",
  "exploration": "探索",
  "fine-tuning": "微调",
  "flash-attention": "FlashAttention",
  "flow-matching": "流匹配",
  "focal-loss": "Focal Loss",
  "generative-models": "生成模型",
  "gini-impurity": "基尼不纯度",
  "goodput": "有效吞吐量",
  "gqa": "分组查询注意力",
  "gradient-descent": "梯度下降",
  "gradients": "梯度",
  "grpo": "GRPO",
  "hybrid-retrieval": "混合检索",
  "inference": "推理",
  "information-retrieval": "信息检索",
  "int8": "INT8",
  "json-schema": "JSON Schema",
  "k-means": "K-Means",
  "kl-divergence": "KL 散度",
  "kv-cache": "KV Cache",
  "language-model": "语言模型",
  "layer-norm": "LayerNorm",
  "learning-rate": "学习率",
  "linear-algebra": "线性代数",
  "linear-regression": "线性回归",
  "llm-inference": "LLM 推理",
  "load-balancing": "负载均衡",
  "log-loss": "对数损失",
  "logistic-regression": "逻辑回归",
  "lora": "LoRA",
  "loss-functions": "损失函数",
  "masking": "掩码",
  "mini-batch": "小批次",
  "mixture-of-experts": "专家混合",
  "mlp": "MLP",
  "model-selection": "模型选择",
  "momentum": "动量",
  "mse": "均方误差",
  "multi-head-attention": "多头注意力",
  "noise-schedule": "噪声调度",
  "normalization": "归一化",
  "numerical-stability": "数值稳定性",
  "ode-solvers": "常微分方程求解器",
  "optimization": "优化",
  "optimizers": "优化器",
  "outliers": "离群点",
  "overfitting": "过拟合",
  "parsing": "解析",
  "policy-gradient": "策略梯度",
  "policy-gradients": "策略梯度",
  "positional-encoding": "位置编码",
  "power-iteration": "幂迭代",
  "ppo": "PPO",
  "probability": "概率",
  "q-learning": "Q-learning",
  "quantization": "量化",
  "rank-fusion": "排序融合",
  "ranking": "排序",
  "rectified-flow": "Rectified Flow",
  "regression": "回归",
  "regularization": "正则化",
  "reinforcement-learning": "强化学习",
  "reshape": "形状变换",
  "retrieval": "检索",
  "returns": "回报",
  "rms-norm": "RMSNorm",
  "rope": "RoPE",
  "routing": "路由",
  "sampling": "采样",
  "sarsa": "SARSA",
  "search": "搜索",
  "seq2seq": "序列到序列",
  "serving": "模型服务",
  "softmax": "Softmax",
  "sparse-retrieval": "稀疏检索",
  "speculative-decoding": "推测解码",
  "subword": "子词",
  "svd": "奇异值分解",
  "tanh": "Tanh",
  "temperature": "温度",
  "tokenization": "分词",
  "tool-calling": "工具调用",
  "top-p": "Top-p",
  "transformers": "Transformer",
  "unsupervised-learning": "无监督学习",
  "vector-search": "向量检索",
  "vectorization": "向量化",
  "weight-decay": "权重衰减",
  "xor": "XOR"
};
const KIND_SUMMARIES = {
  implement: '亲手实现课程中逐步构建的函数。检查会覆盖示例、性质、边界情况和参考输出。',
  research: '实现论文中的核心方法，并用公式与论文给出的性质验证结果。',
  train: '在浏览器里训练一个小模型，在限定步数内达到目标分数。检查会用留出数据评估模型。',
  lab: '运行短实验，测量一个变量的影响，再用数值回答问题。检查会将答案与参考结果对比。',
};
const ARXIV = /^https:\/\/arxiv\.org\/abs\/\d{4}\.\d{4,5}$/;
const PYODIDE_VERSION = '314.0.7';
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const FILES = ['meta.json', 'problem.md', 'starter.py', 'solution.py', 'tests.py', 'hints.md', 'notes.md', 'fixtures.json'];
const META_KEYS = ['id', 'title', 'kind', 'summary', 'difficulty', 'tags', 'lesson', 'cheatsheet', 'minutes', 'entry', 'collections', 'time_limit_s', 'mutants'];
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=VT323&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=JetBrains+Mono:wght@400;500;700&display=swap';
const THEME_SCRIPT = "(function(){var r=document.documentElement,s='';try{s=localStorage.getItem('theme')||'';}catch(_){}r.setAttribute('data-theme',s||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));function i(){var e=document.getElementById('themeIcon');if(e)e.textContent=r.getAttribute('data-theme')==='light'?'N':'D';}document.addEventListener('DOMContentLoaded',function(){i();var b=document.getElementById('themeToggle');if(b)b.addEventListener('click',function(){var n=r.getAttribute('data-theme')==='light'?'dark':'light';r.setAttribute('data-theme',n);try{localStorage.setItem('theme',n);}catch(_){}i();});});})();";
const HEAD_ASSETS = '<link rel="stylesheet" href="/style.css">\n<link rel="stylesheet" href="/practice.css">';
const BODY_ASSETS = '<script src="/header.js" defer></script>\n<script src="/md-render.js" defer></script>\n<script src="/practice-store.js" defer></script>\n<script src="/practice.js" defer></script>';
const FOOTER_LINKS = [['/practice', '练习'], ['/catalog', '课程目录'], ['/prereqs', '路线图'], ['/glossary', '术语表'], ['/about', '关于本站']];

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function jsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function sha(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function versionPracticeAssets(html, siteDir, versionShared = value => value) {
  let output = versionShared(html, siteDir);
  for (const [file, attribute] of [['practice.css', 'href'], ['practice-store.js', 'src'], ['practice.js', 'src']]) {
    const digest = sha(read(path.join(siteDir, file)));
    const pattern = new RegExp(`(${attribute}=["']\\/?${file.replace('.', '\\.')})(?:\\?[^"']*)?(["'])`, 'g');
    output = output.replace(pattern, `$1?v=${digest}$2`);
  }
  return output;
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function renderMarkdown(md) {
  return markdown.parseMd(md);
}

function renderProblemStatement(md) {
  const html = renderMarkdown(md);
  const ids = { '任务': 'task', '输入和输出': 'input-output', '约束': 'constraints', '示例': 'examples' };
  const headings = [];
  let fenced = false;
  for (const line of String(md).split(/\r?\n/)) {
    if (/^\s*```/.test(line)) { fenced = !fenced; continue; }
    if (!fenced && /^## /.test(line)) headings.push(line.replace(/^## /, '').trim());
  }
  let index = 0;
  return html.replace(/<h2 id="[^"]*"([^>]*)>/g, (match, attributes) => {
    const id = ids[headings[index]];
    index += 1;
    return id ? `<h2 id="${id}"${attributes}>` : match;
  });
}

function hintList(md) {
  const parts = md.replace(/\r\n/g, '\n').split(/^## .+$/m);
  return parts.slice(1).map(part => part.trim()).filter(Boolean);
}

function lessonTitle(root, lesson) {
  const file = path.join(root, lesson, 'docs', 'zh.md');
  if (!fs.existsSync(file)) return '';
  const match = /^#\s+(.+?)\s*$/m.exec(read(file));
  return match ? match[1] : '';
}

function phaseOf(root, lesson) {
  const dir = lesson.split('/')[1] || '';
  const number = Number((/^(\d+)-/.exec(dir) || [])[1]);
  const readme = path.join(root, 'phases', dir, 'README.md');
  const title = fs.existsSync(readme) ? /^#\s+阶段\s*\d+\s*[：:]\s*(.+?)\s*$/m.exec(read(readme)) : null;
  return { number, slug: phaseSlug(dir), name: title ? title[1] : dir.replace(/^\d+-/, '').replace(/-/g, ' ') };
}

function metaErrors(meta, id) {
  const errors = [];
  for (const key of META_KEYS) if (!(key in meta)) errors.push(`${id}: meta.json has no ${key}`);
  if (errors.length) return errors;
  if (meta.id !== id) errors.push(`${id}: meta.json id is ${meta.id}`);
  if (!ID.test(meta.id)) errors.push(`${id}: the id must be lower case words joined by hyphens`);
  if (!DIFFICULTIES.includes(meta.difficulty)) errors.push(`${id}: unknown difficulty ${meta.difficulty}`);
  if (!KINDS.includes(meta.kind)) errors.push(`${id}: unknown kind ${meta.kind}`);
  if (meta.kind === 'research' && !(meta.paper && ARXIV.test(meta.paper.url || '') && meta.paper.title)) errors.push(`${id}: a research problem needs a paper with an arXiv abstract url`);
  if (!Array.isArray(meta.tags) || !meta.tags.every(tag => ID.test(tag))) errors.push(`${id}: tags must be lower case hyphenated words`);
  if (!Array.isArray(meta.collections)) errors.push(`${id}: collections must be a list`);
  if (!/^phases\/\d\d-[a-z0-9-]+\/\d\d-[a-z0-9-]+$/.test(meta.lesson)) errors.push(`${id}: lesson must be phases/NN-phase/MM-lesson`);
  if (!Number.isInteger(meta.minutes) || !Number.isFinite(meta.time_limit_s)) errors.push(`${id}: minutes and time_limit_s must be numbers`);
  if (meta.kind === 'train' && !(meta.budget && Number.isInteger(meta.budget.steps) && meta.target && Number.isFinite(meta.target.value))) errors.push(`${id}: a train task needs budget.steps and target.value numbers`);
  if (meta.kind === 'research' && meta.paper && !Number.isInteger(meta.paper.year)) errors.push(`${id}: paper.year must be a number`);
  return errors;
}

function problemDirs(root) {
  const dir = path.join(root, SOURCE_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('_') && fs.existsSync(path.join(dir, entry.name, 'meta.json')))
    .map(entry => entry.name)
    .sort();
}

function loadCollections(root) {
  const file = path.join(root, SOURCE_DIR, 'collections.json');
  return fs.existsSync(file) ? JSON.parse(read(file)) : [];
}

function loadProblem(root, id) {
  const dir = path.join(root, SOURCE_DIR, id);
  const missing = FILES.filter(name => !fs.existsSync(path.join(dir, name)));
  if (missing.length) return { id, errors: missing.map(name => `${id}: missing ${name}`) };
  const meta = JSON.parse(read(path.join(dir, 'meta.json')));
  const errors = metaErrors(meta, id);
  if (errors.length) return { id, errors };
  if (!fs.existsSync(path.join(root, meta.lesson, 'docs', 'zh.md'))) errors.push(`${id}: 找不到关联课程 ${meta.lesson}/docs/zh.md`);
  if (meta.cheatsheet && !fs.existsSync(path.join(root, 'cheatsheets', `${meta.cheatsheet}.md`))) errors.push(`${id}: cheat sheet ${meta.cheatsheet} does not exist`);
  const files = {};
  for (const name of FILES) files[name] = read(path.join(dir, name));
  files['support.py'] = fs.existsSync(path.join(dir, 'support.py')) ? read(path.join(dir, 'support.py')) : '';
  const hints = hintList(files['hints.md']);
  return {
    id,
    meta,
    errors,
    files,
    href: `${BASE}/${id}`,
    phase: phaseOf(root, meta.lesson),
    lessonTitle: lessonTitle(root, meta.lesson) || meta.lesson,
    statementHtml: renderProblemStatement(files['problem.md']),
    hintsHtml: hints.map(renderMarkdown),
    notesHtml: renderMarkdown(files['notes.md']),
    version: sha(FILES.filter(name => name !== 'solution.py').concat('support.py').map(name => files[name]).join('\u0000')),
    checks: countChecks(files['tests.py']),
  };
}

function countChecks(tests) {
  const counts = { examples: 0, properties: 0, edge: 0, reference: 0 };
  for (const match of tests.matchAll(/^@check\(\s*"(examples|properties|edge|reference)"/gm)) counts[match[1]] += 1;
  return counts;
}

function loadPractice(root = REPO_ROOT) {
  const collections = loadCollections(root);
  const problems = problemDirs(root).map(id => loadProblem(root, id));
  const errors = problems.flatMap(problem => problem.errors);
  const known = new Set(collections.map(item => item.id));
  for (const item of collections) if (!ID.test(item.id || '')) errors.push(`collection id ${JSON.stringify(item.id)} must be lower case words joined by hyphens`);
  for (const problem of problems) {
    if (!problem.meta) continue;
    for (const name of problem.meta.collections) if (!known.has(name)) errors.push(`${problem.id}: unknown collection ${name}`);
  }
  const order = { easy: 0, medium: 1, hard: 2 };
  const ready = problems.filter(problem => problem.meta).sort((a, b) => a.phase.number - b.phase.number || a.meta.lesson.localeCompare(b.meta.lesson) || order[a.meta.difficulty] - order[b.meta.difficulty] || a.id.localeCompare(b.id));
  const tracks = collections.map(item => ({
    ...item,
    href: `${TRACKS}/${item.id}`,
    problems: ready.filter(problem => problem.meta.collections.includes(item.id))
      .sort((a, b) => order[a.meta.difficulty] - order[b.meta.difficulty] || a.phase.number - b.phase.number || a.meta.minutes - b.meta.minutes || a.id.localeCompare(b.id)),
  })).filter(item => item.problems.length);
  return { problems: ready, tracks, errors };
}

function difficultyBadge(difficulty) {
  return `<span class="pr-diff pr-diff-${difficulty}">${DIFFICULTY_LABELS[difficulty]}</span>`;
}

function kindBadge(kind) {
  return `<span class="pr-kind pr-kind-${kind}">${KIND_LABELS[kind]}</span>`;
}

function citationHtml(paper) {
  return `<p class="pr-cite"><span>论文来源：</span><a href="${escapeHtml(paper.url)}" rel="nofollow noopener external" target="_blank">${escapeHtml(paper.title)}</a>，${escapeHtml(paper.authors)}，${paper.year} 年。</p>`;
}

function lessonHref(lesson) {
  return `/lesson?path=${encodeURIComponent(lesson)}`;
}

function footer() {
  const links = FOOTER_LINKS.map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`).join('');
  return `<footer class="pr-site-foot"><nav class="footer-links" aria-label="站点导航">${links}</nav><p>练习在浏览器本地运行。代码和进度保存在当前设备中。</p></footer>`;
}

function shell({ title, description, href, main, bodyClass, jsonLd, robots }, assets) {
  const canonical = ORIGIN + href;
  const image = `${ORIGIN}/og/${CARD}.png`;
  const ld = jsonLd ? `\n<script type="application/ld+json">${jsonForHtml(jsonLd)}</script>` : '';
  const robotsTag = robots ? `\n<meta name="robots" content="${robots}">` : '';
  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<base href="/">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">${robotsTag}
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="从零开始的 AI 工程">
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
<body class="${bodyClass}">
<a href="${href}#main" class="skip-link">跳转到正文</a>
${SITE_HEADER}
${main}
${footer()}
${assets.body}
</body>
</html>
`;
}

function rowHtml(problem) {
  const { meta, phase } = problem;
  const search = [meta.title, meta.summary, meta.tags.join(' '), problem.lessonTitle, phase.name].join(' ').toLowerCase();
  const tags = meta.tags.map(tag => `<span class="pr-tag">${escapeHtml(TAG_LABELS[tag] || tag)}</span>`).join('');
  return `<li class="pr-row" data-id="${meta.id}" data-kind="${meta.kind}" data-difficulty="${meta.difficulty}" data-phase="${phase.number}" data-tags="${escapeHtml(meta.tags.join(' '))}" data-tracks="${escapeHtml(meta.collections.join(' '))}" data-search="${escapeHtml(search)}"><span class="pr-status" data-status-for="${meta.id}" aria-label="未开始"></span><div class="pr-row-main"><a class="pr-row-title" href="${problem.href}">${escapeHtml(meta.title)}</a><p class="pr-row-sum">${escapeHtml(meta.summary)}</p><p class="pr-row-tags">${tags}</p></div><div class="pr-row-side">${kindBadge(meta.kind)}${difficultyBadge(meta.difficulty)}<span class="pr-row-phase">第 ${String(phase.number).padStart(2, '0')} 阶段</span><span class="pr-row-min">${meta.minutes} 分钟</span></div></li>`;
}

function optionList(values, all) {
  return `<option value="">${escapeHtml(all)}</option>${values.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('')}`;
}

function indexMain(built) {
  const { problems, tracks } = built;
  const phases = Array.from(new Map(problems.map(problem => [problem.phase.number, problem.phase])).values()).sort((a, b) => a.number - b.number);
  const tags = Array.from(new Set(problems.flatMap(problem => problem.meta.tags))).sort();
  const counts = DIFFICULTIES.map(level => [level, problems.filter(problem => problem.meta.difficulty === level).length]);
  const ids = problems.map(problem => problem.id);
  const head = `<header class="pr-index-head"><p class="pr-kicker">从零开始的 AI 工程</p><h1>动手练习</h1><p class="pr-lede">把 AI 工程知识用起来：实现课程中的代码和论文方法，训练小模型，或通过实验回答问题。练习在浏览器本地运行 Python 和 NumPy。检查会指出问题及原因，每道练习也会链接到对应课程。</p><ul class="pr-kinds">${KINDS.map(kind => `<li><a href="${BASE}?kind=${kind}">${kindBadge(kind)}<span class="pr-kinds-n">${problems.filter(problem => problem.meta.kind === kind).length} 题</span></a><p>${escapeHtml(KIND_SUMMARIES[kind])}</p></li>`).join('')}</ul><dl class="pr-stats" data-practice-stats data-ids="${escapeHtml(ids.join(' '))}"><div><dt>已完成</dt><dd data-stat="solved">0 / ${problems.length}</dd></div><div><dt>已尝试</dt><dd data-stat="attempted">0</dd></div><div><dt>连续练习</dt><dd data-stat="streak">0 天</dd></div>${counts.map(([level, count]) => `<div><dt>${DIFFICULTY_LABELS[level]}</dt><dd data-stat="${level}">0 / ${count}</dd></div>`).join('')}</dl><p class="pr-actions"><a class="pr-btn pr-btn-primary" href="${problems[0] ? problems[0].href : BASE}" data-continue hidden>继续练习</a><button class="pr-btn" type="button" data-random>随机开始未完成练习</button></p></header>`;
  const filters = `<form class="pr-filters" role="search" data-filters onsubmit="return false"><label class="pr-field pr-field-q"><span>搜索</span><input type="search" name="q" autocomplete="off" spellcheck="false" placeholder="注意力、Adam、BM25"></label><fieldset class="pr-field pr-chips"><legend>练习类型</legend><label><input type="radio" name="kind" value="" checked><span>全部</span></label>${KINDS.map(kind => `<label><input type="radio" name="kind" value="${kind}"><span>${KIND_LABELS[kind]}</span></label>`).join('')}</fieldset><fieldset class="pr-field pr-chips"><legend>难度</legend><label><input type="radio" name="difficulty" value="" checked><span>全部</span></label>${DIFFICULTIES.map(level => `<label><input type="radio" name="difficulty" value="${level}"><span>${DIFFICULTY_LABELS[level]}</span></label>`).join('')}</fieldset><label class="pr-field"><span>完成状态</span><select name="status">${optionList([['unsolved', '未完成'], ['attempted', '已尝试'], ['solved', '已完成']], '全部状态')}</select></label><label class="pr-field"><span>阶段</span><select name="phase">${optionList(phases.map(phase => [String(phase.number), `阶段 ${String(phase.number).padStart(2, '0')}：${phase.name}`]), '全部阶段')}</select></label><label class="pr-field"><span>练习路径</span><select name="track">${optionList(tracks.map(track => [track.id, track.title]), '全部路径')}</select></label><label class="pr-field"><span>标签</span><select name="tag">${optionList(tags.map(tag => [tag, TAG_LABELS[tag] || tag]), '全部标签')}</select></label><button class="pr-btn pr-btn-quiet" type="reset">清除筛选</button></form>`;
  const list = `<section class="pr-section" aria-labelledby="problems"><div class="pr-section-head"><h2 id="problems">练习题</h2><p class="pr-count" aria-live="polite" data-count>${problems.length} 题</p></div><ol class="pr-list" data-list>${problems.map(rowHtml).join('')}</ol><p class="pr-empty" data-empty hidden>没有符合这些筛选条件的练习。</p></section>`;
  const trackCards = tracks.map(track => `<li class="pr-track" data-track="${track.id}" data-ids="${escapeHtml(track.problems.map(problem => problem.id).join(' '))}"><a href="${track.href}"><span class="pr-track-name">${escapeHtml(track.title)}</span><span class="pr-track-sum">${escapeHtml(track.summary)}</span><span class="pr-track-meta"><span data-track-progress>0 / ${track.problems.length} 题已完成</span><span class="pr-meter" aria-hidden="true"><span data-track-meter></span></span></span></a></li>`).join('');
  const trackSection = `<section class="pr-section" aria-labelledby="tracks"><div class="pr-section-head"><h2 id="tracks">练习路径</h2><p class="pr-count">${tracks.length} 条路径</p></div><ol class="pr-tracks">${trackCards}</ol></section>`;
  const how = `<section class="pr-section pr-how" aria-labelledby="how"><h2 id="how">练习流程</h2><ul><li><strong>运行示例</strong>：检查代码是否符合题目中的示例。</li><li><strong>提交答案</strong>：运行全部检查，包括示例、正确答案应满足的性质、隐藏边界情况和参考输出对比。</li><li><strong>训练练习</strong>：边训练边绘制损失曲线，再用留出数据评估模型。<strong>实验练习</strong>：把答案与参考实验数据对比。</li><li>检查失败时，会展示预期值、实际值和检查说明。</li><li>提示逐条开放。通过全部检查后，才能查看参考实现和说明。</li><li>Python 通过 Pyodide 在浏览器中运行。首次运行会下载约 15 MB 的运行时，之后由浏览器缓存。代码和进度保存在当前设备中，无需注册账号。</li><li>离线练习可克隆仓库并运行 <code>python3 scripts/practice/run.py &lt;id&gt; my_answer.py</code>。</li></ul></section>`;
  return `<main id="main" class="pr-page pr-index" data-practice-index>${head}${filters}${list}${trackSection}${how}</main>`;
}

function trackMain(track, built) {
  const items = track.problems.map((problem, index) => `<li class="pr-track-step" data-id="${problem.id}"><span class="pr-step-n">${String(index + 1).padStart(2, '0')}</span><span class="pr-status" data-status-for="${problem.id}" aria-label="未开始"></span><div class="pr-row-main"><a class="pr-row-title" href="${problem.href}">${escapeHtml(problem.meta.title)}</a><p class="pr-row-sum">${escapeHtml(problem.meta.summary)}</p><p class="pr-row-lesson">对应课程：<a href="${lessonHref(problem.meta.lesson)}">${escapeHtml(problem.lessonTitle)}</a></p></div><div class="pr-row-side">${kindBadge(problem.meta.kind)}${difficultyBadge(problem.meta.difficulty)}<span class="pr-row-min">${problem.meta.minutes} 分钟</span></div></li>`).join('');
  const minutes = track.problems.reduce((sum, problem) => sum + problem.meta.minutes, 0);
  const others = built.tracks.filter(item => item.id !== track.id).map(item => `<a href="${item.href}">${escapeHtml(item.title)}</a>`).join('');
  return `<main id="main" class="pr-page pr-track-page" data-practice-track="${track.id}"><nav class="pr-crumbs" aria-label="面包屑"><ol><li><a href="${BASE}">练习</a></li><li>练习路径</li><li aria-current="page">${escapeHtml(track.title)}</li></ol></nav><header class="pr-index-head"><p class="pr-kicker">练习路径</p><h1>${escapeHtml(track.title)}</h1><p class="pr-lede">${escapeHtml(track.summary)} 共 ${track.problems.length} 题，预计 ${minutes} 分钟。建议按顺序完成，后面的练习会用到前面的知识。</p><p class="pr-track-meta pr-track-meta-wide" data-track="${track.id}" data-ids="${escapeHtml(track.problems.map(problem => problem.id).join(' '))}"><span data-track-progress>0 / ${track.problems.length} 题已完成</span><span class="pr-meter" aria-hidden="true"><span data-track-meter></span></span></p></header><ol class="pr-list pr-steps">${items}</ol><nav class="pr-other" aria-label="其他练习路径"><span>其他路径</span>${others}</nav></main>`;
}

function problemMain(problem, built, assets) {
  const { meta, phase } = problem;
  const index = built.problems.indexOf(problem);
  const previous = built.problems[index - 1];
  const next = built.problems[index + 1];
  const tracks = built.tracks.filter(track => meta.collections.includes(track.id));
  const checks = LAYERS.map(layer => problem.checks[layer]).reduce((sum, count) => sum + count, 0);
  const crumbs = `<nav class="pr-crumbs" aria-label="面包屑"><ol><li><a href="${BASE}">练习</a></li><li><a href="/phase/${phase.slug}">阶段 ${String(phase.number).padStart(2, '0')}</a></li><li aria-current="page">${escapeHtml(meta.title)}</li></ol></nav>`;
  const tags = meta.tags.map(tag => `<a class="pr-tag" href="${BASE}?tag=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`).join('');
  const links = [`<a href="${lessonHref(meta.lesson)}">课程：${escapeHtml(problem.lessonTitle)}</a>`];
  if (meta.cheatsheet) links.push(`<a href="/cheatsheets/${meta.cheatsheet}">速查表</a>`);
  for (const track of tracks) links.push(`<a href="${track.href}">路径：${escapeHtml(track.title)}</a>`);
  const head = `<header class="pr-prob-head">${crumbs}<h1>${escapeHtml(meta.title)}</h1><p class="pr-prob-meta">${kindBadge(meta.kind)}${difficultyBadge(meta.difficulty)}<span>${meta.minutes} 分钟</span><span>${checks} 项检查</span>${meta.kind === 'train' ? `<span>训练步数上限：${meta.budget.steps}</span><span>目标：${escapeHtml(targetMetricLabel(meta.target.metric))} ${escapeHtml(String(meta.target.value))}</span>` : ''}<span class="pr-status pr-status-wide" data-status-for="${meta.id}" aria-label="未开始"></span></p><p class="pr-prob-tags">${tags}</p><p class="pr-prob-links">${links.join('')}</p></header>`;
  const statement = `<section class="pr-statement" aria-labelledby="statement"><h2 id="statement" class="pr-visually-hidden">题目说明</h2>${problem.statementHtml}${meta.kind === 'research' ? citationHtml(meta.paper) : ''}</section>`;
  const hints = `<section class="pr-panel pr-hints" aria-labelledby="hints"><div class="pr-panel-head"><h2 id="hints">提示</h2><span class="pr-panel-count" data-hint-count>${problem.hintsHtml.length} 条提示</span></div><ol class="pr-hint-list" data-hints></ol><button class="pr-btn" type="button" data-hint-next>显示第 1 条提示（共 ${problem.hintsHtml.length} 条）</button></section>`;
  const solution = `<section class="pr-panel pr-solution" aria-labelledby="solution"><div class="pr-panel-head"><h2 id="solution">参考实现与说明</h2><span class="pr-lock" data-lock>尚未解锁</span></div><p class="pr-locked-note" data-locked-note>提交答案并通过全部检查后，即可查看参考实现与说明。</p><div data-solution hidden></div></section>`;
  const support = problem.files['support.py'] ? `<details class="pr-panel pr-support"><summary>辅助代码：support.py</summary><p>你的代码和检查会通过 <code>from support import ...</code> 导入此模块。请勿修改。</p><pre class="pr-support-code"><code>${markdown.highlightSyntax(problem.files['support.py'].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'), 'python')}</code></pre></details>` : '';
  const local = `<details class="pr-panel pr-local"><summary>在本机运行</summary><p>克隆仓库、安装 NumPy，然后在终端运行相同的检查：</p><pre><code>python3 scripts/practice/run.py ${meta.id} my_answer.py\npython3 scripts/practice/run.py ${meta.id} my_answer.py --examples</code></pre><p>请从 <a href="${REPO}/blob/main/practice/${meta.id}/starter.py">starter.py</a> 开始编写 <code>my_answer.py</code>。</p></details>`;
  const pager = `<nav class="pr-pager" aria-label="练习题导航">${previous ? `<a href="${previous.href}" rel="prev">← ${escapeHtml(previous.meta.title)}</a>` : '<span></span>'}<a href="${BASE}">全部练习</a>${next ? `<a href="${next.href}" rel="next">${escapeHtml(next.meta.title)} →</a>` : '<span></span>'}</nav>`;
  const shortcuts = '<details class="pr-keys"><summary>键盘快捷键</summary><dl><dt><kbd>Ctrl</kbd> <kbd>Enter</kbd></dt><dd>运行示例</dd><dt><kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>Enter</kbd></dt><dd>提交答案</dd><dt><kbd>Tab</kbd> / <kbd>Shift</kbd> <kbd>Tab</kbd></dt><dd>增加或减少缩进</dd><dt><kbd>Esc</kbd> 后按 <kbd>Tab</kbd></dt><dd>将焦点移出编辑器</dd><dt><kbd>Alt</kbd> <kbd>H</kbd></dt><dd>显示下一条提示</dd></dl><p>Mac 上请用 <kbd>Cmd</kbd> 替代 <kbd>Ctrl</kbd>。</p></details>';
  const editor = `<section class="pr-work" aria-labelledby="editor-title"><div class="pr-toolbar"><h2 id="editor-title" class="pr-toolbar-title">编写代码</h2><span class="pr-runtime" data-runtime aria-live="polite">首次运行时加载 Python</span><div class="pr-toolbar-actions"><button class="pr-btn" type="button" data-reset title="将代码恢复为起始模板">重置</button><button class="pr-btn" type="button" data-run title="运行示例（Ctrl + Enter）">运行示例</button><button class="pr-btn pr-btn-primary" type="button" data-submit title="运行全部检查（Ctrl + Shift + Enter）">提交答案</button></div></div><div class="pr-editor" data-editor><pre class="pr-editor-view" aria-hidden="true"><code data-editor-view></code></pre><textarea class="pr-editor-input" data-editor-input spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="Python 代码编辑器" aria-describedby="editor-help">${escapeHtml(problem.files['starter.py'])}</textarea></div><p class="pr-editor-help" id="editor-help">编辑时会自动保存代码。<span class="pr-mobile-note">手机上可以阅读和编辑代码；建议在电脑上运行检查。</span></p>${shortcuts}${meta.kind === 'train' ? `<figure class="pr-curve" data-curve hidden><figcaption><span>训练损失曲线</span><span data-curve-label></span></figcaption><svg viewBox="0 0 400 120" preserveAspectRatio="none" role="img" aria-label="训练损失曲线"><polyline data-curve-line points="" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"></polyline></svg></figure>` : ''}<div class="pr-results" data-results aria-live="polite"><p class="pr-results-empty">选择“运行示例”检查示例，或提交答案运行全部检查。</p></div></section>`;
  const page = `<div class="pr-layout"><div class="pr-left">${statement}${support}${hints}${solution}${local}</div><div class="pr-right">${editor}</div></div>`;
  const data = `${BASE}/data/${meta.id}.json?v=${problem.version}`;
  return `<main id="main" class="pr-page pr-problem" data-practice-problem="${meta.id}" data-version="${problem.version}" data-data="${data}" data-harness="${built.harnessHref}" data-worker="${assets.worker}" data-pyodide="${PYODIDE_BASE}" data-limit="${meta.time_limit_s}" data-kind="${meta.kind}"${meta.kind === 'train' ? ` data-budget="${meta.budget.steps}"` : ''} data-hints-total="${problem.hintsHtml.length}">${head}${page}${pager}</main>`;
}

function problemJsonLd(problem) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: problem.meta.title,
    description: problem.meta.summary,
    url: ORIGIN + problem.href,
    learningResourceType: KIND_TYPES[problem.meta.kind],
    educationalLevel: DIFFICULTY_LABELS[problem.meta.difficulty],
    teaches: [problem.meta.title].concat(problem.meta.tags.map(tag => TAG_LABELS[tag] || tag)),
    interactivityType: 'active',
    programmingLanguage: 'Python',
    timeRequired: `PT${problem.meta.minutes}M`,
    keywords: problem.meta.tags.join(', '),
    inLanguage: 'zh-CN',
    isAccessibleForFree: true,
    isBasedOn: { '@type': 'LearningResource', name: problem.lessonTitle, url: `${ORIGIN}${lessonHref(problem.meta.lesson)}` },
    isPartOf: { '@type': 'Course', name: '从零开始的 AI 工程', url: ORIGIN },
    ...(problem.meta.kind === 'research' ? { citation: { '@type': 'ScholarlyArticle', name: problem.meta.paper.title, author: problem.meta.paper.authors, datePublished: String(problem.meta.paper.year), url: problem.meta.paper.url } } : {}),
  };
}

function arxivId(url) {
  return url.replace('https://arxiv.org/abs/', '');
}

function problemMarkdown(problem) {
  const { meta } = problem;
  const facts = [`类型：${KIND_LABELS[meta.kind]}`, `难度：${DIFFICULTY_LABELS[meta.difficulty]}`, `预计用时：${meta.minutes} 分钟`];
  if (meta.kind === 'train') facts.push(`训练步数上限：${meta.budget.steps}`, `目标：${targetMetricLabel(meta.target.metric)} ${meta.target.value}`);
  const lines = [`# ${meta.title}`, '', `规范页面：${ORIGIN}${problem.href}`, '', `${meta.summary}`, '', facts.join(' · '), '', `相关课程：[${problem.lessonTitle}](${ORIGIN}${lessonHref(meta.lesson)})。`, '', problem.files['problem.md'].trim()];
  if (meta.kind === 'research') lines.push('', `论文来源：${meta.paper.title}，${meta.paper.authors}，${meta.paper.year} 年，arXiv ${arxivId(meta.paper.url)}。`);
  lines.push('', '## 起始代码', '', '```python', problem.files['starter.py'].trim(), '```');
  lines.push('', '## 检查答案', '', `访问 ${ORIGIN}${problem.href} 在浏览器中运行检查，或克隆仓库后在本地运行：`, '', '```bash', `python3 scripts/practice/run.py ${meta.id} my_answer.py`, '```', '', '检查分为四层：示例、正确答案应满足的性质、隐藏边界情况，以及与参考输出的对比。');
  lines.push('', `[全部练习](${ORIGIN}${BASE}) | [课程索引](${ORIGIN}/llms.txt)`, '');
  return lines.join('\n');
}

function indexMarkdown(built) {
  const lines = ['# AI 工程动手练习', '', `规范页面：${ORIGIN}${BASE}`, '', `本练习集来自《从零开始的 AI 工程》课程，共 ${built.problems.length} 题。每道题都可以在浏览器中运行 Python 和 NumPy，检查分为四层，并链接到对应课程。`];
  for (const kind of KINDS) {
    const list = built.problems.filter(problem => problem.meta.kind === kind);
    if (!list.length) continue;
    lines.push('', `## ${KIND_LABELS[kind]}（${list.length} 题）`, '', KIND_SUMMARIES[kind], '');
    for (const problem of list) lines.push(`- [${problem.meta.title}](${ORIGIN}${problem.href}) (${problem.meta.difficulty}): ${problem.meta.summary}`);
  }
  lines.push('', '## 练习路径', '');
  for (const track of built.tracks) lines.push(`- [${track.title}](${ORIGIN}${track.href})：${track.summary}，共 ${track.problems.length} 题。`);
  lines.push('', `[课程索引](${ORIGIN}/llms.txt)`, '');
  return lines.join('\n');
}

function trackMarkdown(track) {
  const lines = [`# ${track.title}`, '', `规范页面：${ORIGIN}${track.href}`, '', track.summary, ''];
  track.problems.forEach((problem, index) => lines.push(`${index + 1}. [${problem.meta.title}](${ORIGIN}${problem.href})（${KIND_LABELS[problem.meta.kind]}，${DIFFICULTY_LABELS[problem.meta.difficulty]}）：${problem.meta.summary}`));
  lines.push('', `[全部练习](${ORIGIN}${BASE})`, '');
  return lines.join('\n');
}

function problemData(problem) {
  return {
    id: problem.id,
    version: problem.version,
    title: problem.meta.title,
    entry: problem.meta.entry,
    limit: problem.meta.time_limit_s,
    starter: problem.files['starter.py'],
    tests: problem.files['tests.py'],
    fixtures: problem.files['fixtures.json'],
    hints: problem.hintsHtml,
    layers: problem.checks,
    kind: problem.meta.kind,
    support: problem.files['support.py'],
  };
}

function solutionData(problem) {
  return { id: problem.id, version: problem.version, solution: problem.files['solution.py'], notes: problem.notesHtml };
}

function practiceMap(built) {
  const lessons = {};
  for (const problem of built.problems) {
    (lessons[problem.meta.lesson] = lessons[problem.meta.lesson] || []).push({ id: problem.id, title: problem.meta.title, href: problem.href, difficulty: problem.meta.difficulty });
  }
  return { lessons };
}

function buildPractice({ root = REPO_ROOT, siteDir = __dirname, versionHtml = html => html } = {}) {
  const built = loadPractice(root);
  if (built.errors.length) throw new Error(`练习内容存在错误。运行 python3 scripts/practice/validate.py 查看完整报告。\n${built.errors.join('\n')}`);
  const harness = read(path.join(root, SOURCE_DIR, '_harness', 'practice_check.py'));
  built.harness = harness;
  built.harnessHref = `${BASE}/practice_check.py?v=${sha(harness)}`;
  const worker = `/practice-worker.js?v=${sha(read(path.join(siteDir, 'practice-worker.js')))}`;
  const assets = { head: versionPracticeAssets(HEAD_ASSETS, siteDir, versionHtml), body: versionPracticeAssets(BODY_ASSETS, siteDir, versionHtml), worker };
  const pages = [{
    file: 'index.html',
    href: BASE,
    html: shell({ title: 'AI 工程动手练习 - 从零开始的 AI 工程', description: `来自课程的 ${built.problems.length} 道 AI 工程练习题，可在浏览器中运行 Python 代码并查看分层检查结果。`, href: BASE, main: indexMain(built), bodyClass: 'pr-body', jsonLd: { '@context': 'https://schema.org', '@type': 'ItemList', name: 'AI 工程动手练习', inLanguage: 'zh-CN', itemListElement: built.problems.map((problem, index) => ({ '@type': 'ListItem', position: index + 1, url: ORIGIN + problem.href, name: problem.meta.title })) } }, assets),
  }];
  for (const track of built.tracks) {
    pages.push({ file: `tracks/${track.id}.html`, href: track.href, html: shell({ title: `${track.title} - 练习路径`, description: `${track.summary} 共 ${track.problems.length} 题，可在浏览器中练习。`, href: track.href, main: trackMain(track, built), bodyClass: 'pr-body' }, assets) });
  }
  for (const problem of built.problems) {
    pages.push({ file: `${problem.id}.html`, href: problem.href, html: shell({ title: `${problem.meta.title} - 动手练习`, description: `${problem.meta.summary} 难度：${DIFFICULTY_LABELS[problem.meta.difficulty]}。对应课程：${problem.lessonTitle}。`, href: problem.href, main: problemMain(problem, built, assets), bodyClass: 'pr-body pr-body-problem', jsonLd: problemJsonLd(problem) }, assets) });
  }
  const files = new Map(pages.map(page => [page.file, page.html]));
  files.set('practice_check.py', harness);
  for (const problem of built.problems) {
    files.set(`data/${problem.id}.json`, `${JSON.stringify(problemData(problem))}\n`);
    files.set(`data/${problem.id}.solution.json`, `${JSON.stringify(solutionData(problem))}\n`);
  }
  built.pages = pages;
  built.files = files;
  built.markdown = new Map([['index.md', indexMarkdown(built)]].concat(built.tracks.map(track => [`tracks/${track.id}.md`, trackMarkdown(track)]), built.problems.map(problem => [`${problem.id}.md`, problemMarkdown(problem)])));
  built.map = practiceMap(built);
  return built;
}

function writePractice({ root = REPO_ROOT, siteDir = __dirname, versionHtml = html => html } = {}) {
  const built = buildPractice({ root, siteDir, versionHtml });
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
  fs.writeFileSync(path.join(siteDir, 'practice-map.json'), `${JSON.stringify(built.map)}\n`, 'utf8');
  return built;
}

function solutionLines(problem) {
  return problem.files['solution.py'].split('\n').map(line => line.trim()).filter(line => line.length >= 18 && !/^(?:def |import |from |raise NotImplementedError)/.test(line));
}

function checkPractice(built) {
  const problems = [];
  for (const problem of built.problems) {
    const page = built.pages.find(item => item.href === problem.href);
    const starter = new Set(problem.files['starter.py'].split('\n').map(line => line.trim()));
    const lines = solutionLines(problem).filter(line => !starter.has(line));
    for (const line of lines) {
      if (page.html.includes(line) || page.html.includes(escapeHtml(line))) problems.push(`${problem.href}: the page HTML shows a solution line: ${line}`);
    }
    const shipped = [problem.files['tests.py'], problem.files['hints.md']].join('\n').split('\n').map(line => line.trim());
    for (let i = 0; i + 2 < lines.length; i++) {
      const at = shipped.indexOf(lines[i]);
      if (at >= 0 && shipped[at + 1] === lines[i + 1] && shipped[at + 2] === lines[i + 2]) problems.push(`${problem.id}: tests.py or hints.md holds three solution lines in a row: ${lines[i]}`);
    }
    if (problem.notesHtml.length > 40 && page.html.includes(problem.notesHtml)) problems.push(`${problem.href}: the page HTML shows the notes`);
  }
  return problems;
}

function main(argv) {
  if (argv.includes('--check')) {
    const built = buildPractice();
    const second = buildPractice();
    const digest = value => sha(Array.from(value.files).map(([file, body]) => `${file}\n${body}`).join('\n'));
    const problems = checkPractice(built);
    if (digest(built) !== digest(second)) problems.push('two builds of the same input gave different bytes');
    console.log(`Checked ${built.problems.length} practice problems and ${built.tracks.length} tracks.`);
    for (const problem of problems) console.error(`  ${problem}`);
    return problems.length ? 1 : 0;
  }
  const built = writePractice();
  console.log(`Wrote ${built.problems.length} practice problems and ${built.tracks.length} tracks to site/${OUTPUT_DIR}/`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { loadPractice, buildPractice, writePractice, checkPractice, practiceMap, hintList, countChecks, PYODIDE_VERSION, PYODIDE_BASE, BASE };
