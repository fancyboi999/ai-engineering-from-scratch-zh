#!/usr/bin/env node
/**
 * Build script for AI Engineering from Scratch website.
 * Parses README.md, ROADMAP.md, and glossary/terms.md from the repo root
 * and generates data.js with all phase/lesson/glossary data.
 *
 * Run: node site/build.js
 * Called automatically by GitHub Actions on every push.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const README_PATH = path.join(REPO_ROOT, 'README.md');
const ROADMAP_PATH = path.join(REPO_ROOT, 'ROADMAP.md');
const GLOSSARY_PATH = path.join(REPO_ROOT, 'glossary', 'terms.md');
const OUTPUT_PATH = path.join(__dirname, 'data.js');

const GITHUB_BASE = 'https://github.com/fancyboi999/ai-engineering-from-scratch-zh/tree/main/';
const SITE_ORIGIN = 'https://aieng-zh.cn';

// 与浏览器端同一份渲染器（从 lesson.html 抽出）；预渲染产物 = 运行时渲染产物
const mdRender = require('./md-render.js');

// GITHUB_BASE lesson url -> site path "phases/<phase>/<lesson>"
function lessonPath(url) {
  if (!url) return null;
  const m = url.match(/(phases\/[^/]+\/[^/]+)\/?$/);
  return m ? m[1] : null;
}

// 预渲染静态课程页的站内路径（与 lesson.html 的 lessonHref 同构，两边要一起改）
function lessonStaticHref(relPath) {
  return '/lessons/' + relPath.replace(/^phases\//, '') + '/';
}

// ─── Parse ROADMAP.md for lesson statuses ────────────────────────────
function parseRoadmap(content) {
  const statuses = {}; // { "Phase 0": { phaseStatus, lessons: { "Dev Environment": "complete" } } }
  let currentPhase = null;
  let currentPhaseStatus = null;

  for (const line of content.split(/\r?\n/)) {
    // Match phase headers like: ## Phase 0: Setup & Tooling — ✅
    const phaseMatch = line.match(/^##\s+Phase\s+(\d+).*?—\s*(✅|🚧|⬚)/);
    if (phaseMatch) {
      const phaseId = parseInt(phaseMatch[1]);
      const statusEmoji = phaseMatch[2];
      currentPhaseStatus = statusEmoji === '✅' ? 'complete' : statusEmoji === '🚧' ? 'in-progress' : 'planned';
      currentPhase = `Phase ${phaseId}`;
      statuses[currentPhase] = { phaseStatus: currentPhaseStatus, lessons: {} };
      continue;
    }

    // Match lesson rows like: | 01 | Dev Environment | ✅ |
    if (currentPhase) {
      const lessonMatch = line.match(/^\|\s*\d+\s*\|\s*(.+?)\s*\|\s*(✅|🚧|⬚)\s*\|/);
      if (lessonMatch) {
        const lessonName = lessonMatch[1].trim();
        const statusEmoji = lessonMatch[2];
        const status = statusEmoji === '✅' ? 'complete' : statusEmoji === '🚧' ? 'in-progress' : 'planned';
        statuses[currentPhase].lessons[lessonName] = status;
      }
    }
  }

  return statuses;
}

// ─── Parse README.md for phases and lessons ──────────────────────────
function parseReadme(content, roadmapStatuses) {
  const phases = [];

  // Split into phase blocks
  // Phase 0 is in a <table> block, phases 1-19 are in <details> blocks
  // We'll parse line by line to extract phase headers and lesson tables

  const lines = content.split(/\r?\n/);
  let currentPhase = null;
  let inLessonTable = false;
  let isCapstoneTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match Phase header - multiple formats supported:
    // Old: ### Phase 0: Setup & Tooling `12 lessons`
    // Old: <summary><strong>Phase 1: Math Foundations</strong> <code>22 lessons</code> ... <em>Description</em></summary>
    // New: ### ![](https://img.shields.io/badge/Phase_0-Setup_&_Tooling-95A5A6?style=for-the-badge) `12 lessons`
    // New: <summary><b>🟣 Phase 1 — Math Foundations</b> &nbsp;<code>22 lessons</code>&nbsp; <em>Description</em></summary>
    const phaseHeaderMatch =
      line.match(/###\s+Phase\s+(\d+):\s+(.+?)\s*`(\d+)\s+lessons?`/) ||
      line.match(/###\s+!\[\]\([^)]*?Phase[_\s]+(\d+)[-_]([^?)]+?)-[A-F0-9]{6}[^)]*\)\s*`(\d+)\s+lessons?`/i);
    const detailsHeaderMatch =
      line.match(/<summary><strong>Phase\s+(\d+):\s+(.+?)<\/strong>\s*<code>(\d+)\s+(?:lessons?|projects?)<\/code>.*?<em>(.*?)<\/em>/) ||
      line.match(/<summary>\s*<b>\s*(?:[^\w\s]+\s+)?Phase\s+(\d+)\s*[—\-:]\s*(.+?)<\/b>.*?<code>(\d+)\s+(?:lessons?|projects?)<\/code>.*?<em>(.*?)<\/em>/);

    if (phaseHeaderMatch) {
      const [, idStr, rawName] = phaseHeaderMatch;
      const id = parseInt(idStr);
      const name = rawName.replace(/_/g, ' ').trim();
      // Look for the description on the next line (blockquote)
      let desc = '';
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].startsWith('>')) {
          desc = lines[j].replace(/^>\s*/, '').trim();
          break;
        }
      }
      const roadmapKey = `Phase ${id}`;
      const phaseStatus = roadmapStatuses[roadmapKey]?.phaseStatus || 'planned';
      currentPhase = { id, name: name.trim(), status: phaseStatus, desc, lessons: [] };
      phases.push(currentPhase);
      inLessonTable = false;
      continue;
    }

    if (detailsHeaderMatch) {
      const [, idStr, name, , desc] = detailsHeaderMatch;
      const id = parseInt(idStr);
      const roadmapKey = `Phase ${id}`;
      const phaseStatus = roadmapStatuses[roadmapKey]?.phaseStatus || 'planned';
      currentPhase = { id, name: name.trim(), status: phaseStatus, desc: desc?.trim() || '', lessons: [] };
      phases.push(currentPhase);
      inLessonTable = false;
      continue;
    }

    // Detect start of lesson table
    if (currentPhase && line.match(/^\|\s*#\s*\|\s*Lesson/)) {
      inLessonTable = true;
      isCapstoneTable = false;
      continue;
    }

    // Skip table separator
    if (inLessonTable && line.match(/^\|[\s:|-]+\|$/)) {
      continue;
    }

    // Parse lesson rows
    if (inLessonTable && currentPhase && line.startsWith('|')) {
      // | 01 | [Dev Environment](phases/00-setup-and-tooling/01-dev-environment/) | Build | Python, Node, Rust |
      // | 02 | Multi-Layer Networks & Forward Pass | Build | Python |
      const cols = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
      if (cols.length >= 4) {
        const lessonCol = cols[1];
        const typeRaw = cols[2];
        const langRaw = cols[3];

        // Type may be plain ("Build") or a shield image: ![Build](https://...)
        const typeBadgeMatch = typeRaw.match(/!\[([^\]]+)\]/);
        const type = typeBadgeMatch ? typeBadgeMatch[1] : typeRaw;

        // Lang may be plain ("Python, Rust") or emoji flags (🐍 🟦 🦀 🟣 ⚛️)
        const EMOJI_LANG = {
          '🐍': 'Python',
          '🟦': 'TypeScript',
          '🦀': 'Rust',
          '🟣': 'Julia',
          '⚛️': 'React',
          '⚛': 'React',
        };
        let lang = langRaw;
        if (/[\uD800-\uDBFF\u2600-\u27BF\u1F300-\u1FAFF]/.test(langRaw) || /[🐍🟦🦀🟣⚛]/u.test(langRaw)) {
          const tokens = Array.from(langRaw)
            .map(ch => EMOJI_LANG[ch])
            .filter(Boolean);
          if (tokens.length) lang = [...new Set(tokens)].join(', ');
          else if (langRaw.trim() === '—' || langRaw.trim() === '-') lang = '';
        }
        if (lang === '—' || lang === '-') lang = '';

        // Check if lesson has a link (meaning it has content)
        const linkMatch = lessonCol.match(/\[(.+?)\]\((.+?)\)/);
        let lessonName, url;
        if (linkMatch) {
          lessonName = linkMatch[1];
          const relativePath = linkMatch[2];
          url = GITHUB_BASE + relativePath.replace(/^\//, '');
        } else {
          lessonName = lessonCol;
          url = null;
        }

        // Get status from roadmap
        const roadmapKey = `Phase ${currentPhase.id}`;
        const roadmapPhase = roadmapStatuses[roadmapKey];
        let status = 'planned';
        if (roadmapPhase) {
          // Try to find matching lesson by fuzzy match
          const lessonNameClean = lessonName.replace(/[-–—:]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
          for (const [rName, rStatus] of Object.entries(roadmapPhase.lessons)) {
            const rNameClean = rName.replace(/[-–—:]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
            if (rNameClean.includes(lessonNameClean) || lessonNameClean.includes(rNameClean) ||
                rNameClean.split(' ').slice(0, 3).join(' ') === lessonNameClean.split(' ').slice(0, 3).join(' ')) {
              status = rStatus;
              break;
            }
          }
        }

        // If it has a link, it's at least complete (override roadmap if needed)
        if (url && status === 'planned') {
          status = 'complete';
        }

        // Capstone tables use the middle column for prerequisite phase tokens
        // (e.g., "P11 P13 P14"), not a Build/Learn enum. Keep `type` on the
        // Build/Learn axis so CSS selectors (data-type="Build"/"Learn") stay
        // valid, and emit the prereq string in a dedicated `combines` field.
        const lessonEntry = {
          name: lessonName.trim(),
          status,
          type: isCapstoneTable ? 'Capstone' : type.trim(),
          lang: lang.trim() || '—',
          ...(isCapstoneTable && { combines: type.trim() }),
          ...(url && { url }),
        };
        currentPhase.lessons.push(lessonEntry);
      }
    }

    // End of table
    if (inLessonTable && (line.match(/<\/td>/) || line.match(/<\/details>/) || (line.trim() === '' && i + 1 < lines.length && !lines[i + 1].startsWith('|')))) {
      inLessonTable = false;
    }

    // Also detect capstone table format (# | Project | Combines | Lang)
    if (currentPhase && line.match(/^\|\s*#\s*\|\s*Project/)) {
      inLessonTable = true;
      isCapstoneTable = true;
      continue;
    }
  }

  return phases;
}

// ─── Extract lesson summary + keywords from docs/zh.md ───────────────
/**
 * Single-pass read of a lesson's docs/zh.md.
 *
 * Returns:
 *   summary  — first `> blockquote` line (the lesson's one-liner motto).
 *   keywords — all `### H3` heading texts joined by ' · '.
 *              H3 headings are the densest vocabulary in a lesson doc
 *              (e.g. "Scaled dot-product · Causal masking · KV cache"),
 *              so they extend search coverage without bloating data.js.
 *
 * Both fields are empty strings when the file is absent or has no
 * matching content — expected for planned lessons with no docs yet.
 */
function extractLessonMeta(relPath) {
  const docPath = path.join(REPO_ROOT, relPath, 'docs', 'zh.md');
  const result = { summary: '', keywords: '' };
  try {
    const lines = fs.readFileSync(docPath, 'utf8').split(/\r?\n/);
    const h3s = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (!result.summary && line.startsWith('> ') && line.length > 3) {
        const s = line.slice(2).trim();
        result.summary = s.length > 180 ? s.slice(0, 177) + '…' : s;
      }
      if (line.startsWith('### ')) {
        const heading = line.slice(4).trim();
        if (heading) h3s.push(heading);
      }
    }
    if (h3s.length) result.keywords = h3s.join(' · ');
  } catch (_) {
    // File absent or unreadable — expected for planned lessons.
  }
  return result;
}

// ─── Parse glossary/terms.md ──────────────────────────────────────────
function parseGlossary(content) {
  const terms = [];
  let currentTerm = null;

  for (const line of content.split(/\r?\n/)) {
    // Match term headers: ### Agent or ### Adam (Optimizer)
    const termMatch = line.match(/^###\s+(.+)/);
    if (termMatch) {
      if (currentTerm && currentTerm.says && currentTerm.means) {
        terms.push(currentTerm);
      }
      currentTerm = { term: termMatch[1].trim(), says: '', means: '' };
      continue;
    }

    if (!currentTerm) continue;

    // Match "What people say" line
    const saysMatch = line.match(/\*\*What people say:\*\*\s*"?(.+?)"?\s*$/);
    if (saysMatch) {
      currentTerm.says = saysMatch[1].replace(/^"/, '').replace(/"$/, '').trim();
      continue;
    }

    // Match "What it actually means" line
    const meansMatch = line.match(/\*\*What it actually means:\*\*\s*(.+)/);
    if (meansMatch) {
      currentTerm.means = meansMatch[1].trim();
      continue;
    }
  }

  // Push the last term
  if (currentTerm && currentTerm.says && currentTerm.means) {
    terms.push(currentTerm);
  }

  return terms;
}

// ─── Discover outputs/ artifacts (skills / prompts / agents) ──────────
function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 4);
  if (end === -1) return null;
  const block = text.slice(4, end);
  const result = {};
  for (const raw of block.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line || line.startsWith('#') || !line.includes(':')) continue;
    const idx = line.indexOf(':');
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      result[key] = inner
        ? inner.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
        : [];
    } else if ((value.startsWith('"') && value.endsWith('"')) ||
               (value.startsWith("'") && value.endsWith("'"))) {
      result[key] = value.slice(1, -1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function discoverArtifacts() {
  const artifacts = [];
  const phasesDir = path.join(REPO_ROOT, 'phases');
  if (!fs.existsSync(phasesDir)) return artifacts;
  const VALID_TYPES = ['skill', 'prompt', 'agent'];
  for (const phaseDirName of fs.readdirSync(phasesDir).sort()) {
    const phaseMatch = phaseDirName.match(/^([0-9]{2})-([a-z0-9-]+)$/);
    if (!phaseMatch) continue;
    const phaseId = parseInt(phaseMatch[1], 10);
    const phaseDir = path.join(phasesDir, phaseDirName);
    for (const lessonDirName of fs.readdirSync(phaseDir).sort()) {
      const lessonMatch = lessonDirName.match(/^([0-9]{2})-([a-z0-9-]+)$/);
      if (!lessonMatch) continue;
      const lessonId = parseInt(lessonMatch[1], 10);
      const lessonRel = `phases/${phaseDirName}/${lessonDirName}`;
      const outputsDir = path.join(phaseDir, lessonDirName, 'outputs');
      if (fs.existsSync(outputsDir)) {
        for (const file of fs.readdirSync(outputsDir).sort()) {
          if (!file.endsWith('.md')) continue;
          const stem = file.replace(/\.md$/, '');
          const type = VALID_TYPES.find(t => stem.startsWith(`${t}-`));
          if (!type) continue;
          let meta = {};
          try {
            meta = parseFrontmatter(fs.readFileSync(path.join(outputsDir, file), 'utf8')) || {};
          } catch (_) {}
          artifacts.push({
            kind: type,
            name: (meta.name || stem).trim(),
            description: (meta.description || '').trim(),
            tags: Array.isArray(meta.tags) ? meta.tags : [],
            phase: phaseId,
            lesson: lessonId,
            lessonPath: lessonRel,
            file: `${lessonRel}/outputs/${file}`,
          });
        }
      }
      const missionPath = path.join(phaseDir, lessonDirName, 'mission.md');
      if (fs.existsSync(missionPath)) {
        let firstLine = '';
        try {
          firstLine = fs.readFileSync(missionPath, 'utf8').split(/\r?\n/)[0].replace(/^#\s+/, '').trim();
        } catch (_) {}
        artifacts.push({
          kind: 'mission',
          name: firstLine || `${lessonDirName} mission`,
          description: '',
          tags: [],
          phase: phaseId,
          lesson: lessonId,
          lessonPath: lessonRel,
          file: `${lessonRel}/mission.md`,
        });
      }
    }
  }
  return artifacts;
}

// ─── Main build ──────────────────────────────────────────────────────
function build() {
  console.log('📖 Reading source files...');

  const readme = fs.readFileSync(README_PATH, 'utf8');
  const roadmap = fs.readFileSync(ROADMAP_PATH, 'utf8');
  const glossary = fs.readFileSync(GLOSSARY_PATH, 'utf8');

  console.log('🔍 Parsing ROADMAP.md...');
  const roadmapStatuses = parseRoadmap(roadmap);

  console.log('🔍 Parsing README.md...');
  const phases = parseReadme(readme, roadmapStatuses);

  console.log('🔍 Parsing glossary/terms.md...');
  const glossaryTerms = parseGlossary(glossary);

  console.log('🔍 Discovering outputs + Phase 14 missions...');
  const artifacts = discoverArtifacts();

  console.log('📚 Extracting lesson summaries + keywords from docs/zh.md...');
  let summarized = 0, withKeywords = 0;
  for (const phase of phases) {
    for (const lesson of phase.lessons) {
      if (lesson.url) {
        const relPath = lesson.url.replace(GITHUB_BASE, '').replace(/\/+$/, '');
        const meta = extractLessonMeta(relPath);
        if (meta.summary)  { lesson.summary  = meta.summary;  summarized++;   }
        if (meta.keywords) { lesson.keywords = meta.keywords; withKeywords++; }
      }
    }
  }

  // Stats
  let totalLessons = 0;
  let completeLessons = 0;
  phases.forEach(p => {
    totalLessons += p.lessons.length;
    completeLessons += p.lessons.filter(l => l.status === 'complete').length;
  });

  console.log(`\n📊 Stats:`);
  console.log(`   Phases: ${phases.length}`);
  console.log(`   Lessons: ${totalLessons}`);
  console.log(`   Complete: ${completeLessons}`);
  console.log(`   Summaries: ${summarized}, Keywords: ${withKeywords}`);
  console.log(`   Glossary terms: ${glossaryTerms.length}`);
  console.log(`   Artifacts: ${artifacts.length}`);

  // Generate data.js
  const output = `// Auto-generated by build.js — do not edit manually.
// Last built: ${new Date().toISOString()}

const PHASES = ${JSON.stringify(phases, null, 2)};

const GLOSSARY = ${JSON.stringify(glossaryTerms, null, 2)};

const ARTIFACTS = ${JSON.stringify(artifacts, null, 2)};
`;

  fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
  console.log(`\n✅ Generated ${OUTPUT_PATH}`);

  syncCounts(totalLessons, artifacts.length);
  writeSitemap(phases, glossaryTerms.length);
  writeLlms(phases, glossaryTerms.length, artifacts.length);
  writeLessonPages(phases);  // 必须在 syncCounts 之后：模板里的课数文案要先对齐
}

// ─── sitemap.xml：从站点渲染的同一份 PHASES 生成 ─────────────────────
function writeSitemap(phases, glossaryCount) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: '/', priority: '1.0', freq: 'weekly' },
    { loc: '/catalog.html', priority: '0.8', freq: 'weekly' },
    { loc: '/prereqs.html', priority: '0.7', freq: 'monthly' },
    { loc: '/about.html', priority: '0.5', freq: 'monthly' },
  ];
  if (glossaryCount > 0) urls.push({ loc: '/glossary.html', priority: '0.6', freq: 'monthly' });
  for (const phase of phases) {
    for (const l of phase.lessons) {
      const p = lessonPath(l.url);
      if (p) urls.push({ loc: lessonStaticHref(p), priority: '0.6', freq: 'monthly' });
    }
  }
  const body = urls.map(u =>
    `  <url>\n    <loc>${SITE_ORIGIN}${u.loc}</loc>\n` +
    `    <lastmod>${today}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n` +
    `    <priority>${u.priority}</priority>\n  </url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), xml, 'utf8');
  console.log(`   wrote sitemap.xml (${urls.length} URLs)`);
}

// ─── llms.txt：给 AI agent 的课程地图（链接丰富）─────────────────────
function writeLlms(phases, glossaryCount, artifactCount) {
  let total = 0;
  phases.forEach(p => { total += p.lessons.filter(l => lessonPath(l.url)).length; });
  let out = `# AI Engineering from Scratch · 简体中文版\n\n`;
  out += `> 一套免费、开源的 AI 工程课程，从零亲手实现每一个核心算法——${total} 节课，横跨 ${phases.length} 个阶段，从线性代数到自主 agent。Python、TypeScript、Rust、Julia。本站为简体中文翻译版。\n\n`;
  out += `Canonical site: ${SITE_ORIGIN}\n`;
  out += `Source: https://github.com/fancyboi999/ai-engineering-from-scratch-zh\n`;
  out += `Upstream: https://github.com/rohitg00/ai-engineering-from-scratch\n`;
  out += `Glossary terms: ${glossaryCount} · Reusable outputs (prompts/skills/agents): ${artifactCount}\n\n`;
  for (const phase of phases) {
    out += `## 阶段 ${phase.id}：${phase.name}\n`;
    if (phase.desc) out += `${phase.desc}\n`;
    out += `\n`;
    for (const l of phase.lessons) {
      const p = lessonPath(l.url);
      if (!p) continue;
      const note = l.summary ? ` — ${l.summary}` : '';
      out += `- [${l.name}](${SITE_ORIGIN}${lessonStaticHref(p)})${note}\n`;
    }
    out += `\n`;
  }
  out += `## 其它\n`;
  out += `- [课程表](${SITE_ORIGIN}/catalog.html) — 可搜索的完整课程索引\n`;
  out += `- [路线图](${SITE_ORIGIN}/prereqs.html) — 跨阶段的前置依赖顺序\n`;
  if (glossaryCount > 0) out += `- [术语表](${SITE_ORIGIN}/glossary.html) — ${glossaryCount} 个术语的通俗定义\n`;
  fs.writeFileSync(path.join(__dirname, 'llms.txt'), out, 'utf8');
  console.log(`   wrote llms.txt`);
}

// ─── 预渲染静态课程页：site/lessons/<phase>/<lesson>/index.html ──────
// 旧 lesson.html?path= 入口的正文靠浏览器运行时 fetch 渲染，爬虫拿到的是
// 503 个字节级相同的空壳（百度不执行跨域 fetch，Google 渲染预算对新站极少）。
// 这里用与浏览器同一份渲染器（md-render.js）在构建时把正文烤进 HTML：
// 每课独立 URL + 独立 title/description/canonical/JSON-LD。产物 gitignore，
// 与 sitemap/llms 同款策略——Vercel buildCommand 部署时生成。
// 旧 ?path= URL 保持可用（兼容外部旧链接），其 canonical 指向这些静态页。
function bottomNavHtml(flat, idx) {
  // 与 lesson.html 客户端 addBottomNav 同构：跳过不可读课程找前后邻居
  let prev = null, next = null;
  for (let pi = idx - 1; pi >= 0; pi--) {
    if (flat[pi].isReadable) { prev = flat[pi]; break; }
  }
  for (let ni = idx + 1; ni < flat.length; ni++) {
    if (flat[ni].isReadable) { next = flat[ni]; break; }
  }
  let nav = '<div class="lesson-nav-bottom">';
  if (prev) {
    nav += '<a class="lesson-nav-btn prev" href="' + lessonStaticHref(prev.rel) + '">';
    nav += '<span class="nav-label">&larr; 上一节</span>';
    nav += '<span class="nav-title">' + mdRender.escapeHtml(prev.name) + '</span>';
    nav += '</a>';
  } else {
    nav += '<div></div>';
  }
  if (next) {
    nav += '<a class="lesson-nav-btn next" href="' + lessonStaticHref(next.rel) + '">';
    nav += '<span class="nav-label">下一节 &rarr;</span>';
    nav += '<span class="nav-title">' + mdRender.escapeHtml(next.name) + '</span>';
    nav += '</a>';
  }
  nav += '</div>';
  return nav;
}

function lessonJsonLd(title, desc, url) {
  // 与 lesson.html 客户端 updateLessonSeo 的 JSON-LD 同构
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'LearningResource', name: title, description: desc, url: url,
        inLanguage: 'zh-CN', isAccessibleForFree: true,
        isPartOf: { '@type': 'Course', name: 'AI Engineering from Scratch 简体中文版', url: SITE_ORIGIN } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首页', item: SITE_ORIGIN },
        { '@type': 'ListItem', position: 2, name: '课程表', item: SITE_ORIGIN + '/catalog.html' },
        { '@type': 'ListItem', position: 3, name: title, item: url }
      ] }
    ]
  };
  // < 防止 title/desc 含 </script> 提前闭合标签
  return JSON.stringify(ld).replace(/</g, '\\u003c');
}

function writeLessonPages(phases) {
  const template = fs.readFileSync(path.join(__dirname, 'lesson.html'), 'utf8');
  const lessonsRoot = path.join(__dirname, 'lessons');
  fs.rmSync(lessonsRoot, { recursive: true, force: true });  // 清掉改名课程的孤儿页

  // 模板相对路径 → 根绝对路径（生成页在两级子目录下，相对引用会断）。
  // 只改写以字母/数字开头的相对地址；协议地址、/、#、data: 和 JS 拼接串不动。
  const absolutized = template.replace(
    /\b(href|src)="(?!(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#))([A-Za-z0-9_][^"]*)"/g,
    '$1="/$2"'
  );

  const LOADING_BLOCK =
    '      <div class="lesson-content" id="lessonContent">\n' +
    '        <div class="lesson-loading" id="lessonLoading">\n' +
    '          <div class="spinner"></div>\n' +
    '          <div class="lesson-loading-text">课程加载中...</div>\n' +
    '        </div>\n' +
    '      </div>';
  // __PRERENDERED__ 注入锚点。注入丢失的后果不是降级而是更糟：boot 读不到
  // path 会 showError 把烤好的正文覆盖成错误页——所以锚点必须 fail-fast。
  const SCRIPT_ANCHOR = '  <script src="/md-render.js';
  // 模板锚点前置校验：任何一个没命中都中止构建，绝不静默生成坏页（审查发现：
  // string.replace 匹配不到时原样返回不报错，503 页会齐刷刷坏掉且无感知）
  const anchorErrors = [];
  if (absolutized.indexOf(LOADING_BLOCK) === -1) anchorErrors.push('加载占位块（lessonContent/spinner）');
  if (absolutized.indexOf(SCRIPT_ANCHOR) === -1) anchorErrors.push('md-render.js script 标签（__PRERENDERED__ 注入点）');
  if (absolutized.split('</head>').length - 1 !== 1) anchorErrors.push('</head> 不是恰好 1 处（JSON-LD 注入点）');
  if (anchorErrors.length) {
    console.error('❌ writeLessonPages：lesson.html 模板锚点失配（模板结构变了？），预渲染中止：');
    anchorErrors.forEach(e => console.error('   - ' + e));
    process.exit(1);
  }

  // 与 lesson.html 客户端 flatLessons 同序的扁平课表（prev/next 导航用）。
  // isReadable 比客户端（status complete || url）更严：只认「zh.md 真实存在 =
  // 静态页真的会生成」的课。登记了 README 但还没翻译的课如果进了导航，
  // 烤出来的链接就是 /lessons/ 404（审查发现）。
  const flat = [];
  for (const phase of phases) {
    for (const l of phase.lessons) {
      const rel = lessonPath(l.url);
      const hasDoc = !!rel && fs.existsSync(path.join(REPO_ROOT, rel, 'docs', 'zh.md'));
      flat.push({ name: l.name, rel, isReadable: hasDoc });
    }
  }

  let written = 0;
  const skipped = [];
  for (let i = 0; i < flat.length; i++) {
    const f = flat[i];
    if (!f.rel) continue;
    let md;
    try {
      md = fs.readFileSync(path.join(REPO_ROOT, f.rel, 'docs', 'zh.md'), 'utf8');
    } catch (_) {
      skipped.push(f.rel);  // 登记了 README 但还没有 zh.md 的课
      continue;
    }

    const title = mdRender.extractTitle(md);
    const desc = mdRender.lessonDescription(md);
    const url = SITE_ORIGIN + lessonStaticHref(f.rel);
    const docTitle = title + ' - AI Engineering from Scratch';
    const ogTitle = title + ' · AI Engineering from Scratch 简体中文版';

    // 正文结构与客户端 renderLesson 完全同构：parseMd + AI 面板占位 + 上下课导航
    let body = mdRender.parseMd(md);
    body += '<div class="ai-panels" id="aiPanels"></div>';
    body += bottomNavHtml(flat, i);
    const article =
      '      <div class="lesson-content" id="lessonContent"><article class="lesson-article">' +
      body + '</article></div>';

    let page = absolutized;
    page = page.replace('<html lang="en"', '<html lang="zh-CN"');
    page = page.replace(/<title>[^<]*<\/title>/, () => '<title>' + mdRender.escapeHtml(docTitle) + '</title>');
    const setMeta = (attr, name, value) => {
      const re = new RegExp('(<meta ' + attr + '="' + name + '" content=")[^"]*(")');
      page = page.replace(re, (m, p1, p2) => p1 + mdRender.escapeAttr(value) + p2);
    };
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', ogTitle);
    setMeta('property', 'og:description', desc);
    setMeta('name', 'twitter:title', ogTitle);
    setMeta('name', 'twitter:description', desc);
    page = page.replace(
      /<link rel="canonical" href="[^"]*">/,
      () => '<link rel="canonical" href="' + url + '">\n  <meta property="og:url" content="' + url + '">'
    );
    page = page.replace('</head>', () =>
      '  <script type="application/ld+json" id="lessonJsonLd">' + lessonJsonLd(title, desc, url) + '</script>\n</head>');
    page = page.replace(LOADING_BLOCK, () => article);
    // 注入预渲染标记：boot 据此跳过运行时 fetch，直接走 enhanceLesson + fetchQuiz
    page = page.replace(
      SCRIPT_ANCHOR,
      '  <script>window.__PRERENDERED__ = {path: ' + JSON.stringify(f.rel) + '};</script>\n' + SCRIPT_ANCHOR
    );
    // 注意：不能只查 '__PRERENDERED__'——内联 boot 脚本本身就含这个标识符
    if (page.indexOf('<script>window.__PRERENDERED__ = {path:') === -1) {
      console.error('❌ writeLessonPages：' + f.rel + ' 的 __PRERENDERED__ 注入失败，中止');
      process.exit(1);
    }

    const outDir = path.join(lessonsRoot, f.rel.replace(/^phases\//, ''));
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), page, 'utf8');
    written++;
  }

  console.log(`   wrote ${written} prerendered lesson pages under site/lessons/`);
  if (skipped.length) {
    console.warn(`⚠️  ${skipped.length} 课登记了但没有 docs/zh.md，未生成静态页：`);
    skipped.forEach(s => console.warn('   - ' + s));
  }
}

// ─── 自动同步站点文案里的课程数 / 产出数（单一真相 = 本次构建）─────
// 每次同步新课只需在 README 表格补行 + 跑 build，站点这些散落的数字
// 会自动对齐，不必手动逐个改（435 漂了好几个月、489 项产出过时都因此）。
// 只处理站点模板文件，不碰 README——README 每个 phase 标题有
// `<code>N lessons</code>` 单 phase 课数，全局替换会误伤成全局总数。
function syncCounts(lessons, outputs) {
  const targets = ['index.html', 'catalog.html', 'prereqs.html', 'lesson.html', 'cmdpalette.js'];
  for (const f of targets) {
    const p = path.join(__dirname, f);
    if (!fs.existsSync(p)) continue;
    const before = fs.readFileSync(p, 'utf8');
    const after = before
      .replace(/\d+( 节课程)/g, lessons + '$1')        // 节课程 先于 节课，避免误伤
      .replace(/\d+ 节课(?!程)/g, lessons + ' 节课')   // 节课（后面不是「程」）
      .replace(/\d+( 节 AI 工程)/g, lessons + '$1')
      .replace(/\d+( lessons)\b/g, lessons + '$1')      // 英文 og/meta
      .replace(/\d+( 项产出)/g, outputs + '$1');
    if (after !== before) {
      fs.writeFileSync(p, after, 'utf8');
      console.log(`   synced counts in ${f}`);
    }
  }
}

// ─── 课程数一致性校验（node site/build.js --check）──────────────────
// 防 README/ROADMAP 课数漂移（曾踩 435 / 498 vs 503）。CI 跑，不一致就 fail。
// 设计取舍：上游有 scripts/audit_lessons.py + check_readme_counts.py，但它们
// 硬编码 docs/en.md + 英文 README 正则，对中文仓全不兼容（且是 B 类 1:1 同步资产，
// 改了会和上游冲突）。所以这里用 build.js 自己的解析做等价校验——认 zh.md、匹配
// 中文文案，不碰上游 Python 脚本。真相 = 文件系统课程目录数。
function countLessonDirs() {
  const phasesDir = path.join(REPO_ROOT, 'phases');
  const DIR_RE = /^[0-9]{2}-[a-z0-9][a-z0-9-]*[a-z0-9]$/;  // NN-slug，与 audit_lessons.py 一致
  const result = { count: 0, skipped: [] };  // skipped：不符 NN-slug 的目录，fail-loud 暴露
  if (!fs.existsSync(phasesDir)) return result;
  for (const phaseDir of fs.readdirSync(phasesDir).sort()) {
    const pDir = path.join(phasesDir, phaseDir);
    if (!fs.statSync(pDir).isDirectory()) continue;
    if (!DIR_RE.test(phaseDir)) { result.skipped.push(`${phaseDir}/ (phase 目录名不规范)`); continue; }
    for (const lessonDir of fs.readdirSync(pDir)) {
      const full = path.join(pDir, lessonDir);
      if (!fs.statSync(full).isDirectory()) continue;
      if (!DIR_RE.test(lessonDir)) { result.skipped.push(`${phaseDir}/${lessonDir}`); continue; }
      result.count++;
    }
  }
  return result;
}

function verifyCurriculum() {
  const readme = fs.readFileSync(README_PATH, 'utf8');
  const roadmap = fs.readFileSync(ROADMAP_PATH, 'utf8');
  const phases = parseReadme(readme, parseRoadmap(roadmap));
  const tableLessons = phases.reduce((s, p) => s + p.lessons.length, 0);
  const fsResult = countLessonDirs();
  const fsLessons = fsResult.count;
  const phaseCount = phases.length;

  const errors = [];
  const grab = (text, re) => { const m = text.match(re); return m ? parseInt(m[1]) : null; };
  const check = (label, found, expected) => {
    if (found === null) errors.push(`${label}: 文案没匹配到 —— README/ROADMAP 结构可能变了，需同步更新 verifyCurriculum 的正则`);
    else if (found !== expected) errors.push(`${label}: 文案写 ${found}，实际应为 ${expected}`);
  };

  // ① README 表格解析数 == 文件系统课程目录数（防漏登记/多登记，498 vs 503 那类）
  if (tableLessons !== fsLessons)
    errors.push(`README 表格课数 ${tableLessons} ≠ 文件系统课程目录数 ${fsLessons}（README 漏登记或多登记了课程行）`);

  // ② README lessons badge + 散文 == 文件系统数
  check('README lessons badge URL',  grab(readme, /lessons-(\d+)-3553ff/),     fsLessons);
  check('README lessons badge alt',  grab(readme, /alt="(\d+) lessons"/),       fsLessons);
  check('README hero 散文课数',       grab(readme, /^> (\d+) 节课，/m),          fsLessons);
  check('README spine 散文课数',      grab(readme, /个阶段，(\d+) 节课，/),       fsLessons);

  // ③ README phases badge + 散文 == 实际 phase 数
  check('README phases badge URL',   grab(readme, /phases-(\d+)-3553ff/),       phaseCount);
  check('README phases badge alt',   grab(readme, /alt="(\d+) phases"/),         phaseCount);
  check('README hero 阶段数',         grab(readme, /^> \d+ 节课，(\d+) 个阶段/m), phaseCount);
  check('README spine 阶段数',        grab(readme, /(\d+) 个阶段，\d+ 节课，/),    phaseCount);

  // ④ ROADMAP 总计 == 文件系统数 / phase 数
  check('ROADMAP 总计课数',           grab(roadmap, /\*\*总计：\d+ 个阶段，(\d+) 节课/), fsLessons);
  check('ROADMAP 总计阶段数',         grab(roadmap, /\*\*总计：(\d+) 个阶段/),           phaseCount);

  // ⑤ 每个 phase 标题声称的课数 == 该 phase 表格行数（防单 phase 标题漂移——
  //    syncCounts 故意不碰这些单 phase 数，所以它们最容易在补课时漏改）。
  //    标题两种格式：### Phase 0: ... `12 lessons` ／ <summary>…<code>22 lessons</code>
  const declaredByPhase = {};
  for (const line of readme.split(/\r?\n/)) {
    const m = line.match(/Phase\s+(\d+)[:\s—-].*?`(\d+)\s+lessons?`/)
           || line.match(/Phase\s+(\d+)\b.*?<code>(\d+)\s+(?:lessons?|projects?)<\/code>/);
    if (m && declaredByPhase[parseInt(m[1])] === undefined) declaredByPhase[parseInt(m[1])] = parseInt(m[2]);
  }
  for (const p of phases) {
    const declared = declaredByPhase[p.id];
    if (declared === undefined)
      errors.push(`Phase ${p.id} 标题课数: 没在 README 标题里匹配到声称课数（标题格式可能变了）`);
    else if (declared !== p.lessons.length)
      errors.push(`Phase ${p.id} 标题课数: 标题写 ${declared}，该 phase 表格实际 ${p.lessons.length} 课`);
  }

  // skipped 目录 fail-loud：不符 NN-slug、未计入课数的目录，提示出来（不直接判错）
  if (fsResult.skipped.length) {
    console.warn(`⚠️  phases/ 下有 ${fsResult.skipped.length} 个不符 NN-slug 的目录被跳过、未计入课数：`);
    fsResult.skipped.forEach(s => console.warn('   - ' + s));
  }

  if (errors.length) {
    console.error(`\n❌ 课程数一致性校验失败（真相：文件系统 ${fsLessons} 课 / ${phaseCount} 阶段）\n`);
    errors.forEach(e => console.error('  ✗ ' + e));
    console.error(`\n修法：把上述文案改成与文件系统一致；新课记得在 README + ROADMAP 表格补行、并更新该 phase 标题的课数。`);
    console.error(`（站点模板里的课数由 build 时 syncCounts 自动同步，无需手改；README/ROADMAP 是手动维护、本校验把守。）`);
    process.exit(1);
  }
  console.log(`✅ 课程数一致性校验通过：${fsLessons} 课 / ${phaseCount} 阶段（文件系统 = README 表格 = badge/散文 = ROADMAP 总计 = 各 phase 标题课数）`);
}

if (process.argv.includes('--check')) {
  verifyCurriculum();
} else {
  build();
}
