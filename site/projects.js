/*
 * 项目 section: the ladder catalog (projects.html) and the stage-by-stage
 * project workspace (project.html). Data comes from projects-data.js, built by
 * site/build-projects.js from projects/<id>/project.json. Stage lessons are the
 * markdown files in projects/<id>/stages/<stage>/docs/zh.md.
 */
(function () {
  'use strict';

  // 旧 URL (/project.html?id=...) 规范化：注入 canonical 并重定向到预渲染页
  // Google 把 JS 重定向当作信号，有助于合并重复索引
  (function redirectLegacyProjectUrl() {
    if (document.body.getAttribute('data-projects-page') !== 'project') return;
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    if (!id) return;
    var stage = params.get('stage');
    var canonicalPath = '/project/' + encodeURIComponent(id) + '/' + (stage ? encodeURIComponent(stage) + '/' : '');
    var canonicalUrl = window.location.origin + canonicalPath;
    // 注入 canonical 标签（爬虫可能不执行重定向但会读取 canonical）
    var link = document.createElement('link');
    link.rel = 'canonical';
    link.href = canonicalUrl;
    document.head.appendChild(link);
    // JS 重定向到预渲染页
    window.location.replace(canonicalPath);
  })();

  var DATA = window.AIFS_PROJECTS || { levels: [], projects: [], planned: [] };
  var root = document.documentElement;
  var PROGRESS_KEY = 'aifs.projects.progress.v1';
  var SOURCE_KEY = 'aifs.projects.source.v1';
  var scriptVersion = document.currentScript ? new URL(document.currentScript.src, window.location.href).searchParams.get('v') : '';

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatCount(value) {
    return (Number(value) || 0).toLocaleString('zh-CN');
  }

  function countLabel(value, singular, plural) {
    return formatCount(value) + ' ' + (Number(value) === 1 ? singular : plural);
  }

  function readStore(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function setTheme(preferred) {
    var stored = preferred || '';
    if (!stored) {
      try { stored = localStorage.getItem('theme') || ''; } catch (_) {}
    }
    var theme = stored || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    root.setAttribute('data-theme', theme);
    var icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = theme === 'light' ? 'N' : 'D';
  }

  function initTheme() {
    setTheme();
    var button = document.getElementById('themeToggle');
    if (!button) return;
    button.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('theme', next); } catch (_) {}
      setTheme(next);
    });
  }

  function progressFor(projectId) {
    var all = readStore(PROGRESS_KEY, {});
    return all[projectId] || {};
  }

  function setStageDone(projectId, stageId, done) {
    var all = readStore(PROGRESS_KEY, {});
    var entry = all[projectId] || {};
    if (done) entry[stageId] = new Date().toISOString().slice(0, 10);
    else delete entry[stageId];
    all[projectId] = entry;
    writeStore(PROGRESS_KEY, all);
  }

  function levelInfo(level) {
    for (var i = 0; i < DATA.levels.length; i++) if (DATA.levels[i].level === level) return DATA.levels[i];
    return { level: level, name: '级别 ' + level, summary: '' };
  }

  function repoFileUrl(path) {
    return (DATA.repo || 'https://github.com/fancyboi999/ai-engineering-from-scratch-zh') + '/blob/main/' + path;
  }

  function contentUrl(path) {
    return window.AIFSContentSource ? window.AIFSContentSource.repoUrl(path) : '../' + path;
  }

  function projectHref(id, stageId) {
    var href = '/project/' + encodeURIComponent(id) + '/' + (stageId ? encodeURIComponent(stageId) + '/' : '');
    return window.AIFSRouteLinks ? window.AIFSRouteLinks.adaptHref(href) : href;
  }

  function totalHours(project) {
    if (project.hours) return project.hours;
    return (project.stages || []).reduce(function (sum, s) { return sum + (s.hours || 0); }, 0);
  }

  function copyButton(text, label) {
    return '<button class="pj-copy" type="button" data-copy="' + esc(text) + '" aria-label="' + esc(label || '复制命令') + '">复制</button>';
  }

  function commandBlock(text, label, copyLabel) {
    return '<div class="pj-cmd-wrap"><div class="pj-cmd-toolbar"><span>' + esc(label || (text.charAt(0) === '/' ? 'Claude Code' : '终端')) + '</span>' +
      copyButton(text, copyLabel) + '</div><pre class="pj-cmd"><code>' + esc(text) + '</code></pre></div>';
  }

  function enhanceCommands() {
    document.querySelectorAll('pre.pj-cmd').forEach(function (pre) {
      if (pre.closest('.pj-cmd-wrap')) return;
      var code = pre.querySelector('code');
      if (code) pre.outerHTML = commandBlock(code.textContent, pre.getAttribute('data-command-label'), pre.getAttribute('data-copy-label'));
    });
  }

  function fallbackCopy(text) {
    var focused = document.activeElement;
    var field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(field);
    field.select();
    try {
      return document.execCommand('copy');
    } finally {
      field.remove();
      if (focused && focused.focus) focused.focus({ preventScroll: true });
    }
  }

  function bindCopy(scope) {
    scope.addEventListener('click', async function (event) {
      var button = event.target.closest('.pj-copy, .code-copy');
      if (!button || button.dataset.copyPending === 'true') return;
      var text = button.getAttribute('data-copy') || button.getAttribute('data-code');
      var block = button.closest('.pj-cmd-wrap, .pj-code, pre');
      var status = block.querySelector('.pj-copy-status');
      if (!status) {
        status = document.createElement('span');
        status.className = 'pj-copy-status';
        status.setAttribute('role', 'status');
        block.appendChild(status);
      }
      clearTimeout(button.copyTimer);
      status.textContent = '';
      button.dataset.copyPending = 'true';
      var copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          copied = true;
        }
      } catch (_) {}
      if (!copied) {
        try { copied = fallbackCopy(text); } catch (_) {}
      }
      delete button.dataset.copyPending;
      button.textContent = copied ? '已复制' : '复制';
      status.toggleAttribute('data-success', copied);
      status.textContent = copied ? '命令已复制。' : '无法自动复制，请选中命令手动复制。';
      button.copyTimer = setTimeout(function () {
        button.textContent = '复制';
        if (copied) status.textContent = '';
      }, 1800);
    });
  }

  function normalizePath(value) {
    var parts = [];
    value.split('/').forEach(function (part) {
      if (part === '..') parts.pop();
      else if (part && part !== '.') parts.push(part);
    });
    return parts.join('/');
  }

  function renderMarkdown(md, baseDir) {
    // 在交给共享渲染器前解析项目相对链接，不引入第二套 Markdown 解析器。
    var source = String(md).split(/(```[\s\S]*?```|`[^`\n]+`)/g).map(function (part, index) {
      if (index % 2) return part;
      return part.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (match, label, href) {
        if (/^(?:https?:|mailto:|#)/.test(href)) return match;
        var parts = (href.indexOf('phases/') === 0 ? href : baseDir + '/' + href).split('/');
        var normalized = [];
        parts.forEach(function (part) {
          if (part === '..') normalized.pop();
          else if (part && part !== '.') normalized.push(part);
        });
        var target = normalized.join('/');
        var url = target.indexOf('phases/') === 0
          ? 'https://aieng-zh.cn/lesson.html?path=' + target.replace(/\/$/, '')
          : repoFileUrl(target);
        return '[' + label + '](' + url + ')';
      });
    }).join('');
    var html = window.MDRender.parseMd(source).replace(/href="https:\/\/aieng-zh\.cn\/lesson\.html\?/g, 'href="lesson.html?');
    return { title: window.MDRender.extractTitle(source), html: html };
  }

  function sourceBadge(item) {
    if (item.source === 'community') {
      var handle = item.author && item.author.github ? '@' + item.author.github : '社区';
      return '<span class="pj-badge community">' + esc(handle) + '</span>';
    }
    return '<span class="pj-badge core">核心</span>';
  }

  function projectCard(project) {
    var done = project.stages.filter(function (stage) { return !!progressFor(project.id)[stage.id]; }).length;
    var total = project.stages.length;
    var pct = total ? Math.round((done / total) * 100) : 0;
    return '<a class="pj-card is-ready" href="' + projectHref(project.id) + '">' +
      '<div class="pj-card-top">' + sourceBadge(project) + '<span class="pj-card-meta">' + countLabel(total, '阶段', '阶段') + ' · ~' + formatCount(totalHours(project)) + '小时</span></div>' +
      '<h3>' + esc(project.title) + '</h3>' +
      '<p>' + esc(project.tagline || project.summary || '') + '</p>' +
      languageChips(project.languages) +
      '<div class="pj-card-foot"><div class="pj-bar" aria-hidden="true"><span style="width:' + pct + '%"></span></div>' +
      '<span>' + (done ? done + ' / ' + total + ' 已完成' : '开始') + '</span></div></a>';
  }

  function plannedCard(item) {
    return '<div class="pj-card is-planned">' +
      '<div class="pj-card-top"><span class="pj-badge planned">规划中</span>' + (item.ours ? '<span class="pj-badge ours">重建本仓库工具</span>' : '') + '</div>' +
      '<h3>' + esc(item.title) + '</h3><p>' + esc(item.tagline || '') + '</p>' +
      languageChips(item.languages) + '</div>';
  }

  function languageChips(languages) {
    if (!languages || !languages.length) return '';
    return '<div class="pj-langs">' + languages.map(function (l) {
      return '<span class="pj-lang" data-lang="' + esc(String(l).toLowerCase()) + '">' + esc(l) + '</span>';
    }).join('') + '</div>';
  }

  function difficultyLabel(value) {
    return { starter: '入门', builder: '构建', engineer: '工程', systems: '系统', frontier: '前沿', core: '核心' }[value] || value || '';
  }

  function stageLanguages(stage) {
    return String(stage.language || '').split('+').filter(Boolean).map(function (l) {
      var key = l.trim().toLowerCase();
      return key === 'typescript' ? 'TypeScript' : key.charAt(0).toUpperCase() + key.slice(1);
    });
  }

  function demoFigure(demo, baseDir) {
    function asset(file) { return baseDir.indexOf('project-content/') === 0 ? baseDir + '/' + file : contentUrl(normalizePath(baseDir + '/' + file)); }
    var media;
    var play = '';
    if (demo.video) {
      media = '<video controls preload="metadata"' + (demo.poster ? ' poster="' + esc(asset(demo.poster)) + '"' : '') + ' aria-label="' + esc(demo.title || '项目演示') + '"><source src="' + esc(asset(demo.video)) + '"></video>';
    } else {
      var src = asset(demo.gif);
      media = '<img src="' + esc(demo.poster ? asset(demo.poster) : src) + '" data-gif="' + esc(src) + '" alt="' + esc(demo.alt || demo.title || '项目演示') + '" loading="lazy">';
      if (demo.poster) play = '<button type="button" class="pj-chip pj-demo-play" data-poster="' + esc(asset(demo.poster)) + '">播放录制</button>';
    }
    return '<figure class="pj-demo"><div class="pj-demo-frame"><div class="pj-demo-bar"><span></span><span></span><span></span><em>' + esc(demo.title || '演示') + '</em></div>' + media + '</div>' + play +
      (demo.caption ? '<figcaption>' + esc(demo.caption) + '</figcaption>' : '') + '</figure>';
  }

  function mountFigures(root) {
    if (typeof window.mountLessonFigures === 'function') window.mountLessonFigures(root);
  }

  function renderCatalog() {
    var ladder = document.getElementById('pjLadder');
    var stats = document.getElementById('pjStats');
    var filter = document.getElementById('pjSourceFilter');
    var showPlanned = document.getElementById('pjShowPlanned');
    if (!ladder) return;

    var community = DATA.projects.filter(function (p) { return p.source === '社区'; }).length;
    stats.innerHTML = [
      [DATA.projects.length, '可开始构建'],
      [DATA.planned.length, '规划中'],
      [DATA.levels.length, '级别'],
      [community, '社区贡献'],
    ].map(function (s) { return '<div><strong>' + formatCount(s[0]) + '</strong><span>' + s[1] + '</span></div>'; }).join('');

    var first = DATA.projects[0];
    var start = document.getElementById('pjStartLink');
    if (first && start) start.href = projectHref(first.id);

    var sources = [['all', '全部'], ['core', '核心'], ['community', '社区']];
    var current = readStore(SOURCE_KEY, 'all');
    if (!sources.some(function (s) { return s[0] === current; })) current = 'all';

    function draw() {
      filter.innerHTML = sources.map(function (s) {
        return '<button type="button" class="pj-chip' + (s[0] === current ? ' is-active' : '') + '" data-source="' + s[0] + '" aria-pressed="' + (s[0] === current) + '">' + s[1] + '</button>';
      }).join('');
      var include = function (item) { return current === 'all' || item.source === current; };
      ladder.innerHTML = DATA.levels.map(function (level) {
        var ready = DATA.projects.filter(function (p) { return p.level === level.level && include(p); });
        var planned = showPlanned.checked ? DATA.planned.filter(function (p) { return p.level === level.level && include(p); }) : [];
        var cards = ready.map(projectCard).join('') + planned.map(plannedCard).join('');
        if (!cards) {
          cards = current === 'community'
            ? '<div class="pj-empty">本级别还没有社区项目。<a href="#submit">来做第一个。</a></div>'
            : '<div class="pj-empty">这里还没有项目。</div>';
        }
        return '<section class="pj-level" aria-label="级别 ' + level.level + '">' +
          '<header class="pj-level-head"><div class="pj-level-n">' + level.level + '</div><div><h3>' + esc(level.name) + '</h3><p>' + esc(level.summary) + '</p></div></header>' +
          '<div class="pj-level-cards">' + cards + '</div></section>';
      }).join('');
    }

    filter.addEventListener('click', function (event) {
      var button = event.target.closest('[data-source]');
      if (!button) return;
      current = button.getAttribute('data-source');
      writeStore(SOURCE_KEY, current);
      draw();
    });
    showPlanned.addEventListener('change', draw);
    draw();
  }

  function loadFigures(project) {
    var scripts = project.figureScripts || [];
    if (!scripts.length && project.figures) scripts = ['figures/projects/' + encodeURIComponent(project.id) + '.js'];
    return scripts.reduce(function (previous, source) {
      return previous.then(function () {
        return new Promise(function (resolve, reject) {
          var script = document.createElement('script');
          script.src = source + (scriptVersion ? (source.indexOf('?') === -1 ? '?' : '&') + 'v=' + encodeURIComponent(scriptVersion) : '');
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      });
    }, Promise.resolve());
  }

  function prerequisiteHtml(prerequisite) {
    if (typeof prerequisite === 'string') {
      return '<li>' + esc(prerequisite.trim() || '前置要求信息无效') + '</li>';
    }
    var title = prerequisite && typeof prerequisite.title === 'string' && prerequisite.title.trim()
      ? prerequisite.title : '前置要求信息无效';
    var coursePath = prerequisite && typeof prerequisite.path === 'string' ? prerequisite.path : '';
    var knownCourse = /^(phases\/[a-z0-9-]+\/[a-z0-9-]+)$/.test(coursePath) &&
      typeof PHASES !== 'undefined' && Array.isArray(PHASES) && PHASES.some(function (phase) {
        return (phase.lessons || []).some(function (lesson) {
          var match = /(?:^|\/)(phases\/[^/]+\/[^/]+)\/?$/.exec(lesson.url || '');
          return match && match[1] === coursePath;
        });
      });
    if (!knownCourse || title === '前置要求信息无效') return '<li>' + esc(title) + '</li>';
    return '<li><a href="/lessons/' + coursePath.replace(/^phases\//, '') + '/">' + esc(title) + '</a></li>';
  }

  function parseProjectUrl() {
    // 支持两种 URL 格式：
    // 旧：/project.html?id=foo&stage=bar
    // 新：/project/foo/bar/
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    var stage = params.get('stage');
    if (!id) {
      var match = window.location.pathname.match(/^\/project\/([^/]+)(?:\/([^/]+))?\/?$/);
      if (match) {
        id = decodeURIComponent(match[1]);
        stage = match[2] ? decodeURIComponent(match[2]) : null;
      }
    }
    return { id: id || '', stage: stage };
  }

  async function renderProject() {
    var parsed = parseProjectUrl();
    var id = parsed.id;
    var project = DATA.projects.filter(function (p) { return p.id === id; })[0];
    var hero = document.getElementById('pjProjectHero');
    if (!project) {
      hero.innerHTML = '<div class="pj-eyebrow">未找到项目</div><h1>从阶梯中选择一个项目。</h1><p><a class="pj-action" href="projects.html">全部项目</a></p>';
      return;
    }
    try { await loadFigures(project); } catch (_) { console.warn('项目图表加载失败'); }
    document.title = project.title + ' - 项目 - 从零开始学 AI 工程';
    document.getElementById('pjCrumb').textContent = project.title;
    var level = levelInfo(project.level);

    var prereqs = (project.prerequisites || []).map(prerequisiteHtml).join('');
    var why = project.languageWhy || {};
    (project.languageReasons || []).forEach(function (item) { why[item.language] = item.why; });
    var whyHtml = Object.keys(why).map(function (lang) {
      return '<li><span class="pj-lang" data-lang="' + esc(lang.toLowerCase()) + '">' + esc(lang) + '</span> ' + esc(why[lang]) + '</li>';
    }).join('');
    var useful = (project.usefulFor || []).map(function (u) { return '<li>' + esc(u) + '</li>'; }).join('');
    var skills = (project.skills || []).map(function (s) { return '<span class="pj-skill">' + esc(s) + '</span>'; }).join('');

    hero.innerHTML =
      '<div class="pj-hero-grid"><div>' +
        '<div class="pj-eyebrow">级别 ' + project.level + ' · ' + esc(level.name.toUpperCase()) + '</div>' +
        '<h1>' + esc(project.title) + '</h1>' +
        '<p class="pj-lede">' + esc(project.summary || project.tagline || '') + '</p>' +
        '<div class="pj-meta-row"><span>' + countLabel(project.stages.length, '阶段', '阶段') + '</span><span>~' + countLabel(totalHours(project), '小时', '小时') + '</span><span>' + esc((project.languages || []).join(', ')) + '</span>' + sourceBadge(project) + '</div>' +
        (skills ? '<div class="pj-skills">' + skills + '</div>' : '') +
      '</div><div class="pj-hero-side">' +
        (project.youWillBuild ? '<div class="pj-side-block"><div class="pj-eyebrow">最终产物</div><p>' + esc(project.youWillBuild) + '</p></div>' : '') +
        (useful ? '<div class="pj-side-block"><div class="pj-eyebrow">适用场景</div><ul>' + useful + '</ul></div>' : '') +
        (prereqs ? '<div class="pj-side-block"><div class="pj-eyebrow">先学这些</div><ul>' + prereqs + '</ul></div>' : '') +
        (whyHtml ? '<div class="pj-side-block"><div class="pj-eyebrow">为什么选这些语言</div><ul class="pj-why">' + whyHtml + '</ul></div>' : '') +
      '</div></div>';

    var overview = document.getElementById('pjOverview');
    var demos = (project.demos || []).map(function (d) { return demoFigure(d, project.contentBase || project.path); }).join('');
    if (overview && (project.overviewFigure || demos)) {
      overview.hidden = false;
      overview.innerHTML =
        '<details class="pj-context"><summary>项目概览与录制</summary><div class="pj-context-body">' +
        (project.overviewFigure ? '<div class="pj-overview-fig"><div class="pj-eyebrow">项目概览</div><p class="pj-small">这个示例介绍整个项目。当前课程另有自己的机制图。</p><div class="lesson-figure" data-figure="' + esc(project.overviewFigure) + '"></div></div>' : '') +
        (demos ? '<div class="pj-demos"><div class="pj-eyebrow">项目录制</div><div class="pj-demo-grid">' + demos + '</div></div>' : '') + '</div></details>';
      document.getElementById('pjWorkspace').insertAdjacentElement('afterend', overview);
      var context = overview.querySelector('details');
      context.addEventListener('toggle', function () { if (context.open) mountFigures(overview); });
    }

    document.getElementById('pjWorkspace').hidden = false;
    document.getElementById('pjTutorCard').innerHTML =
      '<div class="pj-eyebrow">跟随导师学习</div><p>在 Claude Code 中运行：</p>' +
      commandBlock('/build-project ' + project.id) +
      '<p class="pj-small">在 Codex 或其他兼容 agent 中，请它对本项目使用 build-project 技能。每次学习一个阶段：预测、构建、测试、反思。</p>';

    var certificateHost = document.getElementById('pjCertificate');
    if (certificateHost && window.AIFSProjectCertificates) window.AIFSProjectCertificates.mount(certificateHost, project);

    var requested = parsed.stage;
    var stageIndex = Math.max(0, project.stages.findIndex(function (s) { return s.id === requested; }));
    if (!requested) {
      var progress = progressFor(project.id);
      var next = project.stages.findIndex(function (s) { return !progress[s.id]; });
      stageIndex = next === -1 ? 0 : next;
    }

    function drawRail() {
      var progress = progressFor(project.id);
      var done = project.stages.filter(function (s) { return progress[s.id]; }).length;
      var pct = Math.round((done / project.stages.length) * 100);
      document.getElementById('pjProgress').innerHTML =
        '<div class="pj-progress-head"><span>你的进度</span><strong>' + done + ' / ' + project.stages.length + '</strong></div>' +
        '<div class="pj-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="width:' + pct + '%"></span></div>' +
        '<p class="pj-small">这是保存在本浏览器中的自报进度。要获取证书，请在下方导入评分证据。</p>';
      document.getElementById('pjStageList').innerHTML = project.stages.map(function (stage, index) {
        var isDone = !!progress[stage.id];
        return '<li><a href="' + projectHref(project.id, stage.id) + '" data-stage-index="' + index + '" class="pj-stage-link' +
          (index === stageIndex ? ' is-current' : '') + (isDone ? ' is-done' : '') + '"' + (index === stageIndex ? ' aria-current="step"' : '') + '>' +
          '<span class="pj-stage-n">' + (isDone ? '✓' : stage.number) + '</span>' +
          '<span class="pj-stage-text"><span class="pj-stage-title">' + esc(stage.title) + '</span>' +
          '<span class="pj-stage-sub">' + esc(difficultyLabel(stage.difficulty)) + (stage.hours ? ' · ~' + stage.hours + '小时' : '') + (stageLanguages(stage).length ? ' · ' + esc(stageLanguages(stage).join(' + ')) : '') + '</span></span></a></li>';
      }).join('');
    }

    var requestVersion = 0;
    function drawStage() {
      var version = ++requestVersion;
      var stage = project.stages[stageIndex];
      var mount = document.getElementById('pjStage');
      var baseDir = stage.doc.replace(/\/[^/]+$/, '');
      var prev = project.stages[stageIndex - 1];
      var next = project.stages[stageIndex + 1];
      var isDone = !!progressFor(project.id)[stage.id];
      var testCmd = 'python3 scripts/project_test.py ' + project.id + ' --stage ' + stage.number + ' --path my-' + project.id;

      if (window.AIFSFigureRuntime) window.AIFSFigureRuntime.disposeRoot(mount);
      mount.innerHTML =
        '<header class="pj-stage-head"><div class="pj-eyebrow">阶段 ' + stage.number + ' / ' + project.stages.length + ' · ' + esc(difficultyLabel(stage.difficulty)) + '</div>' +
        '<h2 id="pjStageTitle">' + esc(stage.title) + '</h2><p class="pj-lede">' + esc(stage.summary || '') + '</p>' +
        languageChips(stageLanguages(stage)) +
        ((stage.concepts || []).length ? '<div class="pj-skills">' + stage.concepts.map(function (c) { return '<span class="pj-skill">' + esc(c) + '</span>'; }).join('') + '</div>' : '') +
        '</header>' +
        '<div class="pj-run-card"><div><div class="pj-eyebrow">运行本阶段</div>' +
          (stage.number === 1 ? commandBlock('python3 scripts/project_test.py ' + project.id + ' --init my-' + project.id) : '') +
          commandBlock(testCmd) + '</div></div>' +
        '<div class="pj-doc" id="pjDoc"><p class="pj-loading">正在加载课程…</p></div>' +
        (stage.demo ? '<details class="pj-context pj-stage-recording"><summary>观看阶段 ' + stage.number + ' 录制</summary>' + demoFigure(stage.demo, project.contentBase || project.path) + '</details>' : '') +
        '<footer class="pj-stage-foot">' +
          '<button type="button" class="pj-action' + (isDone ? ' secondary' : '') + '" id="pjToggleDone">' + (isDone ? '标为未完成' : '标记阶段完成') + '</button>' +
          '<div class="pj-stage-nav">' +
            (prev ? '<a class="pj-action secondary" href="' + projectHref(project.id, prev.id) + '" data-stage-index="' + (stageIndex - 1) + '">← ' + esc(prev.title) + '</a>' : '') +
            (next ? '<a class="pj-action secondary" href="' + projectHref(project.id, next.id) + '" data-stage-index="' + (stageIndex + 1) + '">' + esc(next.title) + ' →</a>' : '') +
          '</div>' +
          '<a class="pj-source-link" href="' + esc(repoFileUrl(stage.doc)) + '" target="_blank" rel="noopener">在 GitHub 查看本课</a>' +
        '</footer>';

      document.getElementById('pjToggleDone').addEventListener('click', function () {
        setStageDone(project.id, stage.id, !progressFor(project.id)[stage.id]);
        drawRail();
        drawStage();
      });

      fetch(stage.contentUrl || contentUrl(stage.doc)).then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        return res.text();
      }).then(function (md) {
        if (version !== requestVersion) return;
        var rendered = renderMarkdown(md, baseDir);
        var docEl = document.getElementById('pjDoc');
        docEl.innerHTML = rendered.html;
        mountFigures(docEl);
      }).catch(function () {
        if (version !== requestVersion) return;
        document.getElementById('pjDoc').innerHTML = '<p>无法加载本课。 <a href="' + esc(repoFileUrl(stage.doc)) + '" target="_blank" rel="noopener">在 GitHub 阅读</a>.</p>';
      });
    }

    function go(index, push) {
      stageIndex = index;
      if (push) history.pushState({ stage: index }, '', projectHref(project.id, project.stages[index].id));
      drawRail();
      drawStage();
      var title = document.getElementById('pjStageTitle');
      if (push && title) title.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }

    document.getElementById('pjWorkspace').addEventListener('click', function (event) {
      var link = event.target.closest('[data-stage-index]');
      if (!link || event.metaKey || event.ctrlKey) return;
      event.preventDefault();
      go(Number(link.getAttribute('data-stage-index')), true);
    });
    window.addEventListener('popstate', function () {
      var parsed = parseProjectUrl();
      var idx = project.stages.findIndex(function (st) { return st.id === parsed.stage; });
      go(idx === -1 ? 0 : idx, false);
    });

    go(stageIndex, false);
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('.pj-demo-play');
    if (!button) return;
    var img = button.closest('figure').querySelector('img');
    var playing = button.getAttribute('aria-pressed') === 'true';
    img.src = playing ? button.getAttribute('data-poster') : img.getAttribute('data-gif');
    button.setAttribute('aria-pressed', String(!playing));
    button.textContent = playing ? '播放录制' : '停止播放';
  });

  enhanceCommands();
  bindCopy(document.getElementById('main'));
  initTheme();
  var page = document.body.getAttribute('data-projects-page');
  if (page === 'catalog') renderCatalog();
  if (page === 'project') renderProject();

  window.AIFSProjectsMarkdown = renderMarkdown;
})();
