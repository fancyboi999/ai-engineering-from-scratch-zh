'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SKILLS = path.join(ROOT, 'skills');
const ORIGIN = 'https://aieng-zh.cn';
const REPO = 'fancyboi999/ai-engineering-from-scratch-zh';
const GITHUB = `https://github.com/${REPO}`;
const AGENTS = 'Claude、Cursor、Codex、OpenClaw、Hermes，以及所有能读取 SKILL.md 的 agent';

const GROUPS = [
  {
    id: 'start',
    title: '开始学习',
    when: '首次学习这套课程时使用。',
    skills: {
      'start-learning': { line: '询问学习目标与可用时间，进行分级测验，并写出供其他技能使用的学习计划。', say: ['开始学习', '配置课程'], writes: 'LEARNING.md' },
      'find-your-level': { line: '用简短的自适应测验判断适合的起点，以及可以跳过的课程。', say: ['测测我的水平', '我该从哪里开始'], writes: '不写文件，只给出学习起点。' },
      'course-guide': { line: '提供主题、问题或报错，它会找出相应课程，并给出下一条运行命令。', say: ['哪节课讲 RAG', '注意力机制这里我卡住了'], writes: '不写文件，只给出课程链接。' },
    },
  },
  {
    id: 'learn',
    title: '学习与练习',
    when: '每次学习时使用，读取并更新你的计划。',
    skills: {
      learn: { line: '在终端中逐节讲解下一课，提问并记录学习进度。', say: ['/learn', '教我下一课'], writes: 'LEARNING.md' },
      'check-understanding': { line: '对一个阶段进行测验，指出继续之前需要复习的课程。', say: ['测验第 3 阶段', '检查我的理解'], writes: '不写文件，只输出得分与复习建议。' },
      'build-project': { line: '每次指导一个项目阶段，只给提示。你亲手写代码并运行阶段评分器。', say: ['做一个项目', '继续我的项目'], writes: 'PROJECTS-LEARNING.md' },
    },
  },
  {
    id: 'paths',
    title: '专项路径',
    when: '围绕一个主题逐课学习。',
    skills: {
      'learn-mcp': { line: '沿 Model Context Protocol 路径逐课学习客户端、服务器、传输、安全、网关与一致性。', say: ['教我 MCP', '继续 MCP 路径'], writes: 'MCP-LEARNING.md' },
      'learn-agent-skills': { line: '沿 Agent Skills 路径逐课学习技能的编写、发现、运行、安全、测试、打包与移植。', say: ['教我 agent 技能', '继续技能路径'], writes: 'AGENT-SKILLS-LEARNING.md' },
      'learn-reverse-engineering': { line: '沿逆向工程路径逐课学习：读取自己编译的程序，解码、提升表示、记录证据，并证明重建结果等价。', say: ['教我逆向工程', '继续逆向工程路径'], writes: 'REVERSE-ENGINEERING-LEARNING.md' },
    },
  },
  {
    id: 'certify',
    title: '认证备考',
    when: '通过课程、实验和限时练习准备考试。',
    skills: {
      'claude-certification': { line: '指导四条独立的 Claude 认证备考路线：选择路线、逐课学习、运行实验、参加模拟考试。', say: ['准备 Claude 认证', '继续我的认证备考'], writes: 'CLAUDE-CERTIFICATION.md' },
      'mcpa-certification': { line: '指导 Model Context Protocol Associate 考试备考，提供课程、实践实验和带反馈的练习题。', say: ['准备 MCPA', 'MCPA 模拟考试'], writes: 'MCPA-CERTIFICATION.md' },
    },
  },
  {
    id: 'make',
    title: '制作图表与手册',
    when: '制作符合本站风格的图表和手册。',
    skills: {
      'course-style': { line: '定义明暗主题配色、字体、图表标签和清晰的技术写作规则。本组其他技能会读取它。', say: ['使用课程风格', '检查这段技术文字是否清楚'], writes: '不写文件，供其他技能读取。' },
      'blueprint-figure': { line: '为课程、README 和手册制作静态 SVG 图表。提供九种图形、配色规则，以及标签字号和重叠检查。', say: ['画一张请求路径图', '为本课制作 FIG_012'], writes: '一个 SVG 文件' },
      'motion-figure': { line: '制作动画与交互图表：SVG 动画、滑块组件、带控件和计算结果的图表，以及本页顶部这样的抖色条带。', say: ['用动画解释这个概念', '展示这个系统如何工作'], writes: '课程图表、独立图表或抖色条带' },
      'isometric-explainer': { line: '用交互式等距机器逐步展示流程，由经过测试的状态模型驱动。用控件禁用部件，观察故障如何发生。', say: ['用机器解释缓存如何淘汰条目', '为本课制作等距交互讲解'], writes: '独立 HTML 页面及其源文件' },
      'write-manual': { line: '围绕一个工具的固定版本编写长篇手册，包含来源、目录、每个示例的离线运行记录、图表与审计。', say: ['为这个工具编写手册', '开始编写入门手册'], writes: '手册目录：manual.json、章节、图表、运行记录' },
    },
  },
];

const LOADER = [
  { say: '测测我的水平', skill: 'find-your-level', refs: ['references/answer-key.md'] },
  { say: '教我 MCP', skill: 'learn-mcp', refs: [] },
  { say: '画一张请求路径图', skill: 'blueprint-figure', refs: ['references/kinds.md', 'references/grammar.md', 'references/checks.md'] },
  { say: '为这个工具编写手册', skill: 'write-manual', refs: ['references/manual-json.md', 'references/section-template.md', 'references/research-and-sources.md', 'references/prose-rules.md'] },
];

const tokens = (text) => Math.round(Buffer.byteLength(text, 'utf8') / 4);

function description(text) {
  const head = /^---\n([\s\S]*?)\n---/.exec(text)[1].split('\n');
  const start = head.findIndex((line) => /^description:/.test(line));
  if (start < 0) return '';
  const inline = head[start].replace(/^description:\s*/, '');
  if (inline && !/^[>|][-+]?$/.test(inline)) return inline.replace(/^["']|["']$/g, '');
  const lines = [];
  for (let i = start + 1; i < head.length && /^\s+\S/.test(head[i]); i++) lines.push(head[i].trim());
  return lines.join(' ');
}

function loaderData() {
  const order = GROUPS.flatMap((group) => Object.keys(group.skills));
  const skills = order.map((name) => {
    const text = fs.readFileSync(path.join(SKILLS, name, 'SKILL.md'), 'utf8');
    return { name, tokens: tokens(`name: ${name}\ndescription: ${description(text)}`) };
  });
  let full = 0;
  for (const name of order) {
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (entry.name.endsWith('.md')) full += tokens(fs.readFileSync(file, 'utf8'));
      }
    };
    walk(path.join(SKILLS, name));
  }
  const requests = LOADER.map((ask) => {
    const text = fs.readFileSync(path.join(SKILLS, ask.skill, 'SKILL.md'), 'utf8');
    const body = text.replace(/^---\n[\s\S]*?\n---\n?/, '');
    const files = [{ path: `${ask.skill}/SKILL.md`, tokens: tokens(body) }].concat(ask.refs.map((ref) => ({ path: ref, tokens: tokens(fs.readFileSync(path.join(SKILLS, ask.skill, ref), 'utf8')) })));
    return { say: ask.say, skill: ask.skill, files };
  });
  return { skills, requests, full };
}

function loaderFigure() {
  const data = loaderData();
  const always = data.skills.reduce((sum, skill) => sum + skill.tokens, 0);
  const asks = data.requests.map((ask, i) => `<button type="button" class="sl-ask" data-ask="${i}" aria-pressed="${i === 0}">${escape(ask.say)}</button>`).join('');
  const rows = data.skills.map((skill) => `<li data-skill="${skill.name}"><span>${skill.name}</span><b>${skill.tokens}</b></li>`).join('');
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<div class="sk-example sk-example--live"><figure class="sl" data-skill-loader>
            <div class="sl-head"><span>技能加载器 · 一次 agent 会话</span><button type="button" class="sl-replay" >重播</button></div>
            <p class="sl-note">选择一个请求。agent 始终保留所有技能的名称和描述。请求匹配时，才读取完整 SKILL.md，再按需读取其中列出的参考文件。</p>
            <div class="sl-asks" role="group" aria-label="请求">${asks}</div>
            <div class="sl-pane"><h4><span>始终加载</span><span>${data.skills.length} 条描述 · ${always.toLocaleString('en-US')} tokens</span></h4><ol class="sl-always">${rows}</ol></div>
            <div class="sl-pane"><h4><span>本次请求加载</span><span data-loaded-total></span></h4><ol class="sl-loaded" data-loaded></ol></div>
            <div class="sl-meter"><p><span>已用上下文</span><span data-meter-label></span></p><div class="sl-track"><i data-meter></i></div></div>
            <p class="sl-verdict" data-verdict aria-live="polite"></p>
            <script type="application/json" class="sl-data">${json}</script>
          </figure><span>交互演示：选择请求。token 数按实际技能文件的字节数除以 4 估算。</span></div>`;
}

const EXAMPLES = {
  'isometric-explainer': () => `<a class="sk-example" href="inside-an-ai-agent.html"><img class="sk-light" src="anatomy/inside-an-ai-agent-machine.png" width="2400" height="1260" loading="lazy" decoding="async" alt="一台等距卡片处理机器，展示 AI agent 处理一次请求的过程。"><img class="sk-dark" src="anatomy/inside-an-ai-agent-machine-dark.png" width="2400" height="1260" loading="lazy" decoding="async" alt=""><span>制作示例：AI agent 内部机制 →</span></a>`,
  'blueprint-figure': () => {
    const svg = fs.readFileSync(path.join(ROOT, 'manuals', 'a2a-101', 'figures', 'fig-four-parts.svg'), 'utf8').replace(/<\?xml[^>]*>/, '');
    return `<a class="sk-example sk-example--svg" href="manuals.html">${svg}<span>制作示例：A2A 101 手册图表 →</span></a>`;
  },
  'motion-figure': loaderFigure,
  'write-manual': () => `<a class="sk-example sk-example--text" href="manuals.html"><strong >技术手册</strong><span>每本手册对应一个固定版本。阅读手册 →</span></a>`,
  'course-style': () => `<div class="sk-example sk-swatches" aria-label="课程配色"><i style="background:var(--bg)"></i><i style="background:var(--bg-surface)"></i><i style="background:var(--ink)"></i><i style="background:var(--blueprint)"></i><i style="background:var(--warn)"></i><span>纸张、表面、墨色、蓝图色和警告色，均支持明暗主题。</span></div>`,
};

const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function frontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!match) throw new Error(`${file}: no frontmatter`);
  const name = /^name:\s*(.+)$/m.exec(match[1]);
  const version = /^version:\s*(.+)$/m.exec(match[1]);
  return { name: name ? name[1].trim() : '', version: version ? version[1].trim() : '' };
}

function loadSkills() {
  const folders = fs.readdirSync(SKILLS).filter((name) => fs.existsSync(path.join(SKILLS, name, 'SKILL.md'))).sort();
  const listed = new Set(GROUPS.flatMap((group) => Object.keys(group.skills)));
  const missing = folders.filter((name) => !listed.has(name));
  const extra = [...listed].filter((name) => !folders.includes(name));
  if (missing.length || extra.length) throw new Error(`skills page out of sync. No card: ${missing.join(', ') || 'none'}. No folder: ${extra.join(', ') || 'none'}`);
  const meta = {};
  for (const name of folders) {
    const fm = frontmatter(path.join(SKILLS, name, 'SKILL.md'));
    if (fm.name !== name) throw new Error(`skills/${name}/SKILL.md: name is "${fm.name}"`);
    meta[name] = fm;
  }
  return meta;
}

function countArtifacts() {
  let skills = 0;
  let prompts = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (path.basename(path.dirname(full)) === 'outputs') {
        if (/^skill-.*\.md$/.test(entry.name)) skills += 1;
        if (/^prompt-.*\.md$/.test(entry.name)) prompts += 1;
      }
    }
  };
  walk(path.join(ROOT, 'phases'));
  return { skills, prompts };
}

function card(name, info, meta) {
  const install = `npx skills add ${REPO} --skill ${name}`;
  const example = EXAMPLES[name] ? EXAMPLES[name]() : '';
  return `<article class="sk-card${example ? ' sk-card--example' : ''}" id="${name}">
          <header><h3><code>/${name}</code></h3><span class="sk-version">v${escape(meta.version || '1.0.0')}</span></header>
          <p class="sk-line">${escape(info.line)}</p>
          <dl>
            <dt >你可以说</dt><dd>${info.say.map((phrase) => `<q>${escape(phrase)}</q>`).join(' ')}</dd>
            <dt >写入产物</dt><dd>${escape(info.writes)}</dd>
          </dl>
          ${example}
          <footer>
            <button type="button" class="sk-copy" data-copy="${escape(install)}" aria-label="复制安装命令： ${name}">复制安装命令</button>
            <a href="${GITHUB}/blob/main/skills/${name}/SKILL.md" target="_blank" rel="noopener">阅读 SKILL.md ↗</a>
          </footer>
        </article>`;
}

function build({ siteDir = __dirname } = {}) {
  const meta = loadSkills();
  const total = Object.keys(meta).length;
  const artifacts = countArtifacts();
  const install = `npx skills add ${REPO}`;
  const nav = GROUPS.map((group, i) => `<a href="#${group.id}"><span>${String(i + 1).padStart(2, '0')}</span>${group.title}</a>`).join('') + `<a href="#artifacts"><span>${String(GROUPS.length + 1).padStart(2, '0')}</span>课程产物</a>`;
  const sections = GROUPS.map((group, i) => `
      <section class="sk-group" id="${group.id}" aria-labelledby="${group.id}-title">
        <div class="sk-group-head">
          <span class="sk-num">${String(i + 1).padStart(2, '0')}</span>
          <div><h2 id="${group.id}-title">${group.title}</h2><p>${group.when}</p></div>
        </div>
        <div class="sk-cards">
        ${Object.entries(group.skills).map(([name, info]) => card(name, info, meta[name])).join('\n        ')}
        </div>
      </section>`).join('');

  const html = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>技能 - 从零开始学 AI 工程</title>
  <link rel="icon" href="/favicon.ico?v=20260831a" sizes="32x32">
  <link rel="icon" href="/favicon.svg?v=20260831a" type="image/svg+xml">
  <meta name="description" content="从零开始学 AI 工程的编程 agent 技能：开始学习、讲解课程、认证备考，以及制作图表和手册。">
  <link rel="canonical" href="${ORIGIN}/skills.html">
  <link rel="alternate" type="text/markdown" href="${ORIGIN}/skills.md">
  <meta property="og:title" content="技能 · 从零开始学 AI 工程">
  <meta property="og:description" content="${total} 个编程 agent 技能：课程辅导、水平测验、认证备考，以及图表和手册工具。">
  <meta property="og:image" content="${ORIGIN}/og/page/skills.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="编程 agent 技能 - 从零开始学 AI 工程">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${ORIGIN}/og/page/skills.png">
  <meta name="twitter:image:alt" content="编程 agent 技能 - 从零开始学 AI 工程">
  <meta property="og:url" content="${ORIGIN}/skills.html">
  <meta property="og:type" content="website">
  <meta name="twitter:title" content="技能 · 从零开始学 AI 工程">
  <meta name="twitter:description" content="${total} 个编程 agent 技能：课程辅导、水平测验、认证备考，以及图表和手册工具。">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=VT323&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css?v=20261015a">
  <script>
    (function () {
      var root = document.documentElement;
      var stored = '';
      try { stored = localStorage.getItem('theme') || ''; } catch (_) {}
      root.setAttribute('data-theme', stored || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    })();
  </script>
  <style>${fs.readFileSync(path.join(ROOT, 'manuals', '_shared', 'tokens.css'), 'utf8')}${fs.readFileSync(path.join(__dirname, 'skills.css'), 'utf8')}</style>
</head>
<body>
  <a href="#main" class="skip-link">跳到正文</a>
  <header class="site-header">
    <div class="header-inner">
      <a href="index.html" class="logo"><span class="logo-icon" aria-hidden="true"></span> AI / FROM SCRATCH</a>
      <nav class="header-nav">
        <a href="index.html#contents">课程目录</a>
        <a href="catalog.html">课程表</a>
        <a href="skills.html" >技能</a>
        <a href="prereqs.html">路线图</a>
        <a href="glossary.html">术语表</a>
        <a href="about.html">关于</a>
        <a href="${GITHUB}" target="_blank" rel="noopener" class="header-github">GitHub <span class="star-count" data-loading="true" aria-label="GitHub stars">…</span></a>
      </nav>
      <button class="theme-toggle" id="themeToggle" aria-label="切换主题" type="button"><span class="theme-icon" id="themeIcon">N</span></button>
    </div>
  </header>

  <main id="main" class="sk">
    <section class="sk-hero container">
      <div class="dither sk-band" data-seed="skills" data-label="${total} 个技能 · 供 agent 使用" aria-hidden="true"></div>
      <p class="sk-eyebrow">FIG_SKL · 编程 agent 技能</p>
      <h1 >技能</h1>
      <p class="sk-lede">技能是一份简短的指令文件。请求匹配某个技能时，agent 会读取文件并按步骤执行。这 ${total} 个技能用于课程辅导、水平测验，以及图表和手册制作。</p>
      <div class="sk-install">
        <div class="sk-install-bar"><span>安装全部 ${total} 个</span><button type="button" class="sk-copy" data-copy="${escape(install)}" >复制</button></div>
        <pre><code>${escape(install)}</code></pre>
        <p>安装单个技能时加 <code>--skill &lt;name&gt;</code>。先列出技能时加 <code>--list</code>。支持 ${AGENTS}。</p>
      </div>
      <nav class="sk-index" aria-label="技能分组">${nav}</nav>
    </section>

    <div class="container">${sections}

      <section class="sk-group" id="artifacts" aria-labelledby="artifacts-title">
        <div class="sk-group-head">
          <span class="sk-num">${String(GROUPS.length + 1).padStart(2, '0')}</span>
          <div><h2 id="artifacts-title">课程产物</h2><p>许多课程最后会提供技能或 prompt 文件。可以按阶段或标签安装。</p></div>
        </div>
        <div class="sk-artifacts">
          <p><strong>${artifacts.skills} 个技能与 ${artifacts.prompts} 个 prompt</strong> 位于对应课程的 <code>phases/**/outputs/</code> 目录。克隆仓库后，将需要的文件复制到 agent 的项目技能目录。</p>
          <pre><code>python3 scripts/install_skills.py ./.claude/skills --phase 14
python3 scripts/install_skills.py ./.cursor/skills --tag rag
python3 scripts/install_skills.py .skills --type all --dry-run</code></pre>
          <p><a href="catalog.html">浏览课程表 →</a></p>
        </div>
      </section>

      <section class="sk-how" aria-labelledby="how-title">
        <h2 id="how-title">请求制作图表</h2>
        <p>告诉技能读者需要理解什么，以及图表用于课程、README、手册还是独立页面。有真实数据就提供数据，图表会根据这些数值计算结果。</p>
        <p>例如：<q>为技能课程画一张图，展示 agent 如何加载技能。使用真实文件大小。</q></p>
      </section>

      <section class="sk-cta">
        <p>agent 如何发现和加载技能</p>
        <a class="sk-btn sk-btn--primary" href="lesson?path=phases%2F13-tools-and-protocols%2F22-skills-and-agent-sdks">阅读课程</a>
        <a class="sk-btn" href="${GITHUB}/tree/main/skills" target="_blank" rel="noopener">查看 GitHub 上的全部技能 ↗</a>
      </section>
    </div>
  </main>

  <footer class="site-footer">
    <div class="container footer-inner">
      <p>© 2026 · 开源 · 永久免费</p>
      <div class="footer-links">
        <a href="${GITHUB}" target="_blank" rel="noopener">GitHub</a>
        <a href="about.html">关于</a>
        <a href="catalog.html">课程表</a>
        <a href="skills.html" >技能</a>
        <a href="glossary.html">术语表</a>
        <a href="${GITHUB}/issues/new/choose" target="_blank" rel="noopener">报告问题</a>
        <a href="sponsors.html">支持本站</a>
      </div>
    </div>
  </footer>
  <script>
    (function () {
      var root = document.documentElement;
      var icon = document.getElementById('themeIcon');
      var sync = function () { if (icon) icon.textContent = root.getAttribute('data-theme') === 'light' ? 'N' : 'D'; };
      sync();
      document.getElementById('themeToggle').addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (_) {}
        sync();
      });
      document.addEventListener('click', function (event) {
        var button = event.target.closest('[data-copy]');
        if (!button) return;
        var done = function () { var label = button.textContent; button.textContent = '已复制'; setTimeout(function () { button.textContent = label; }, 1400); };
        if (navigator.clipboard) navigator.clipboard.writeText(button.getAttribute('data-copy')).then(done, function () {});
      });
    })();
  </script>
  <script src="header.js?v=20261015b" defer></script>
  <script src="dither.js?v=20261013a" defer></script>
  <script src="skills-demo.js?v=20261013a" defer></script>
</body>
</html>
`;
  fs.mkdirSync(siteDir, { recursive: true });
  fs.writeFileSync(path.join(siteDir, 'skills.html'), html.replace(/^[ \t]+$/gm, ''));
  fs.writeFileSync(path.join(siteDir, 'skills.md'), markdown(meta, artifacts));
  return { total, artifacts };
}

function markdown(meta, artifacts) {
  const lines = ['# 技能 · 从零开始学 AI 工程', '', `规范页面： ${ORIGIN}/skills.html`, '', `安装全部技能： \`npx skills add ${REPO}\`. 安装单个技能时加 \`--skill <name>\`. 支持 ${AGENTS}。`, ''];
  GROUPS.forEach((group, i) => {
    lines.push(`## ${String(i + 1).padStart(2, '0')} ${group.title}`, '', group.when, '');
    for (const [name, info] of Object.entries(group.skills)) {
      lines.push(`### ${name} (v${meta[name].version || '1.0.0'})`, '', info.line, '', `- 你可以说： ${info.say.map((phrase) => `"${phrase}"`).join(', ')}`, `- 写入产物： ${info.writes}`, `- 安装： \`npx skills add ${REPO} --skill ${name}\``, `- 源文件： ${GITHUB}/blob/main/skills/${name}/SKILL.md`, '');
    }
  });
  lines.push(`## ${String(GROUPS.length + 1).padStart(2, '0')} 课程产物`, '', `${artifacts.skills} 个技能与 ${artifacts.prompts} 个 prompt 位于 \`phases/**/outputs/\`。安装命令为 \`python3 scripts/install_skills.py <target> --phase <n>\` 或 \`--tag <tag>\`。`, '');
  return lines.join('\n');
}

if (require.main === module) {
  const result = build();
  console.log(`Wrote skills.html and skills.md: ${result.total} skills, ${result.artifacts.skills} lesson skills, ${result.artifacts.prompts} prompts.`);
}

module.exports = { GROUPS, LOADER, build, loadSkills, loaderData };
