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
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '..');
const README_PATH = path.join(REPO_ROOT, 'README.md');
const ROADMAP_PATH = path.join(REPO_ROOT, 'ROADMAP.md');
const GLOSSARY_PATH = path.join(REPO_ROOT, 'glossary', 'terms.md');
const OUTPUT_PATH = path.join(__dirname, 'data.js');
const CERTIFICATIONS_PATH = path.join(REPO_ROOT, 'certifications');
const CERTIFICATION_OUTPUT_PATH = path.join(__dirname, 'certification-data.js');

// fork 部署可通过环境变量覆盖；默认始终指向中文站。
const GITHUB_BASE = process.env.GITHUB_BASE || 'https://github.com/fancyboi999/ai-engineering-from-scratch-zh/tree/main/';
const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://aieng-zh.cn';

// 浏览器与构建时共用同一份 Markdown 渲染器。
const mdRender = require('./md-render.js');

// GITHUB_BASE lesson url -> site path "phases/<phase>/<lesson>"
function lessonPath(url) {
  if (!url) return null;
  const m = url.match(/(phases\/[^/]+\/[^/]+)\/?$/);
  return m ? m[1] : null;
}

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

// ─── Parse the canonical phase dependency graph from README.md ───────
// The public Mermaid diagram under "The shape of the curriculum" owns the
// phase-level learning path. Keeping the website graph generated from it
// prevents the interactive roadmap from drifting into a second curriculum.
function parseCurriculumPrereqs(content, phases) {
  const section = content.match(/## (?:课程的结构|The shape of the curriculum)[\s\S]*?```mermaid\s*\r?\n([\s\S]*?)```/);
  if (!section) throw new Error('README.md 缺少课程依赖 Mermaid 图');

  const phaseIds = phases.map(phase => phase.id).sort((a, b) => a - b);
  const validIds = new Set(phaseIds);
  const prerequisites = {};
  const children = {};
  const seenEdges = new Set();
  for (const id of phaseIds) {
    prerequisites[id] = [];
    children[id] = [];
  }

  for (const line of section[1].split(/\r?\n/)) {
    const match = line.match(/^\s*P(\d+)(?:\[[^\]]*\])?\s*-->\s*P(\d+)/);
    if (!match) continue;
    const from = Number(match[1]);
    const to = Number(match[2]);
    if (!validIds.has(from) || !validIds.has(to)) {
      throw new Error(`Curriculum edge P${from} -> P${to} references an unknown phase`);
    }
    if (from === to) throw new Error(`Curriculum phase P${from} cannot depend on itself`);
    const key = `${from}-${to}`;
    if (seenEdges.has(key)) throw new Error(`Duplicate curriculum edge P${from} -> P${to}`);
    seenEdges.add(key);
    prerequisites[to].push(from);
    children[from].push(to);
  }

  if (!seenEdges.size) throw new Error('The canonical curriculum Mermaid graph contains no edges');

  const roots = phaseIds.filter(id => prerequisites[id].length === 0);
  if (roots.length !== 1 || roots[0] !== 0) {
    throw new Error(`Curriculum graph must have Phase 0 as its only root; found ${roots.join(', ') || 'none'}`);
  }

  const reached = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const id = queue.shift();
    for (const child of children[id]) {
      if (reached.has(child)) continue;
      reached.add(child);
      queue.push(child);
    }
  }
  const unreachable = phaseIds.filter(id => !reached.has(id));
  if (unreachable.length) {
    throw new Error(`Curriculum graph has unreachable phases: ${unreachable.join(', ')}`);
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) throw new Error(`Curriculum graph contains a cycle through Phase ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const child of children[id]) visit(child);
    visiting.delete(id);
    visited.add(id);
  }
  visit(0);

  return prerequisites;
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
  const docPath = safeRepoPath(path.join(relPath, 'docs', 'zh.md'));
  const result = { summary: '', keywords: '' };
  try {
    if (!docPath || fs.lstatSync(docPath).isSymbolicLink()) return result;
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

// ─── Certification programs, tracks, lessons, and assessments ─────────
// Certifications are a curated overlay, not another curriculum phase. They
// deliberately live in their own generated data file so PHASES, README counts,
// the core catalog, and roadmap behavior cannot change when a track is added.
function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`Could not read ${label || path.relative(REPO_ROOT, filePath)}: ${err.message}`);
  }
}

function safeRepoPath(relPath, baseDir) {
  if (!relPath || typeof relPath !== 'string') return null;
  const candidate = path.resolve(baseDir || REPO_ROOT, relPath);
  const rootWithSep = REPO_ROOT.endsWith(path.sep) ? REPO_ROOT : REPO_ROOT + path.sep;
  if (candidate !== REPO_ROOT && !candidate.startsWith(rootWithSep)) return null;
  if (fs.existsSync(candidate)) {
    const realRoot = fs.realpathSync(REPO_ROOT);
    const realCandidate = fs.realpathSync(candidate);
    const realRootWithSep = realRoot.endsWith(path.sep) ? realRoot : realRoot + path.sep;
    if (realCandidate !== realRoot && !realCandidate.startsWith(realRootWithSep)) return null;
  }
  return candidate;
}

function safeRepoFile(relPath, baseDir) {
  const candidate = safeRepoPath(relPath, baseDir);
  if (!candidate || !fs.existsSync(candidate)) return null;
  const stat = fs.lstatSync(candidate);
  return stat.isFile() && !stat.isSymbolicLink() ? candidate : null;
}

function safeRepoDirectory(relPath, baseDir) {
  const candidate = safeRepoPath(relPath, baseDir);
  if (!candidate || !fs.existsSync(candidate)) return null;
  const stat = fs.lstatSync(candidate);
  return stat.isDirectory() && !stat.isSymbolicLink() ? candidate : null;
}

function certificationDocMeta(markdown, fallbackName) {
  const result = {
    name: fallbackName || '',
    summary: '',
    keywords: '',
    type: 'Learn',
    languages: '',
    prerequisites: '',
    time: '',
  };
  const headings = [];
  for (const raw of String(markdown || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('# ') && !result.name) result.name = line.slice(2).trim();
    if (line.startsWith('# ')) result.name = line.slice(2).trim();
    if (!result.summary && line.startsWith('> ')) result.summary = line.slice(2).trim();
    if (line.startsWith('### ')) headings.push(line.slice(4).trim());
    const field = line.match(/^\*\*(Type|Languages|Prerequisites|Time|类型|语言|前置要求|预计时间)[：:]\*\*\s*(.+)$/i);
    if (field) {
      const key = ({ '类型': 'type', '语言': 'languages', '前置要求': 'prerequisites', '预计时间': 'time' })[field[1]] || field[1].toLowerCase();
      if (key === 'type') result.type = field[2].trim();
      else result[key] = field[2].trim();
    }
  }
  result.keywords = headings.filter(Boolean).join(' · ');
  if (result.summary.length > 180) result.summary = result.summary.slice(0, 177) + '…';
  return result;
}

function normalizeLessonRef(ref) {
  if (typeof ref === 'string') return { path: ref };
  if (!ref || typeof ref !== 'object') return null;
  return { ...ref };
}

function quizContentVersion(quiz) {
  if (!quiz) return null;
  return crypto.createHash('sha256').update(JSON.stringify(quiz)).digest('hex');
}

function trackDeclarationValue(declaration) {
  if (typeof declaration === 'string') return declaration;
  if (!declaration || typeof declaration !== 'object') return '';
  return declaration.id || declaration.slug || declaration.path || declaration.file || '';
}

function trackDeclarationIndex(program, track, file) {
  if (!Array.isArray(program.tracks)) return -1;
  return program.tracks.findIndex(declaration => {
    const value = trackDeclarationValue(declaration);
    if (!value) return false;
    const declaredFile = path.basename(value);
    const declaredSlug = path.basename(value, path.extname(value));
    return value === track.id ||
      value === track.slug ||
      declaredFile === file ||
      declaredSlug === track.slug;
  });
}

function assertCertificationTrackOrder(program, tracks) {
  const declaredTrackIds = Array.isArray(program.tracks) ? program.tracks : [];
  const emittedTrackIds = tracks.map(track => track.id);
  const matches = declaredTrackIds.length === emittedTrackIds.length &&
    declaredTrackIds.every((id, index) => id === emittedTrackIds[index]);
  if (!matches) {
    throw new Error(
      'Certification track order mismatch: program.json declares ' +
      JSON.stringify(declaredTrackIds) + ' but track manifests emit ' +
      JSON.stringify(emittedTrackIds)
    );
  }
}

function resolveAssessmentFile(programDir, assessmentPath) {
  if (!assessmentPath) return null;
  const fromRoot = safeRepoPath(assessmentPath, REPO_ROOT);
  if (fromRoot && fs.existsSync(fromRoot)) return fromRoot;
  const fromProgram = safeRepoPath(assessmentPath, programDir);
  if (fromProgram && fs.existsSync(fromProgram)) return fromProgram;
  return fromRoot || fromProgram;
}

function certificationLessonFiles(lessonDir, lessonRelPath, folderName) {
  const folderPath = safeRepoDirectory(folderName, lessonDir);
  if (!folderPath) return [];

  const files = [];
  function collectFiles(currentDir, relativeDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() && folderName === 'outputs') {
        collectFiles(fullPath, relativePath);
      } else if (entry.isFile()) {
        files.push({ fullPath, relativePath });
      }
    }
  }
  collectFiles(folderPath, '');

  return files.map(file => {
    const { fullPath, relativePath } = file;
    let description = '';
    if (folderName === 'outputs' && relativePath.endsWith('.md')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const meta = parseFrontmatter(content) || {};
        description = String(meta.description || '').trim();
        if (!description) {
          description = content.split(/\r?\n/)
            .map(line => line.trim())
            .find(line => line && !line.startsWith('#') && line !== '---') || '';
        }
      } catch (_) {}
    }
    return {
      name: relativePath,
      path: `${lessonRelPath}/${folderName}/${relativePath}`,
      size: fs.statSync(fullPath).size,
      description,
    };
  });
}

function parseCertifications() {
  const empty = { program: null, tracks: [], lessonsByPath: {}, assessmentsById: {} };
  if (!fs.existsSync(CERTIFICATIONS_PATH)) return empty;

  const programDirs = fs.readdirSync(CERTIFICATIONS_PATH, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(CERTIFICATIONS_PATH, entry.name))
    .filter(dir => fs.existsSync(path.join(dir, 'program.json')))
    .sort();
  if (!programDirs.length) return empty;

  // The site currently presents one certification program. Keep the generated
  // shape program-oriented so another provider can be added without touching
  // PHASES or changing reader behavior.
  const programDir = programDirs[0];
  const programPath = safeRepoFile('program.json', programDir);
  if (!programPath) throw new Error('Unsafe certification program path');
  const program = readJson(programPath, 'certification program');
  const programSlug = program.slug || program.id || path.basename(programDir);
  const tracksDir = safeRepoDirectory('tracks', programDir);
  const trackFiles = tracksDir
    ? fs.readdirSync(tracksDir).filter(file => file.endsWith('.json') && safeRepoFile(file, tracksDir)).sort()
    : [];
  const trackEntries = trackFiles.map(file => {
    const track = readJson(safeRepoFile(file, tracksDir), `certification track ${file}`);
    track.id = track.id || `${programSlug}-${track.slug || path.basename(file, '.json')}`;
    track.slug = track.slug || path.basename(file, '.json');
    track.lessons = Array.isArray(track.lessons)
      ? track.lessons.map(normalizeLessonRef).filter(Boolean)
      : [];
    track.assessments = Array.isArray(track.assessments) ? track.assessments : [];
    return { file, track };
  });
  trackEntries.sort((a, b) => {
    const aIndex = trackDeclarationIndex(program, a.track, a.file);
    const bIndex = trackDeclarationIndex(program, b.track, b.file);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      if (aIndex !== bIndex) return aIndex - bIndex;
    }
    return a.file.localeCompare(b.file);
  });
  const tracks = trackEntries.map(entry => entry.track);
  assertCertificationTrackOrder(program, tracks);

  const lessonsByPath = {};
  const lessonsDir = safeRepoDirectory('lessons', programDir);
  if (lessonsDir) {
    for (const entry of fs.readdirSync(lessonsDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) continue;
      const relPath = path.relative(REPO_ROOT, path.join(lessonsDir, entry.name)).split(path.sep).join('/');
      const lessonDir = path.join(lessonsDir, entry.name);
      const docPath = safeRepoFile('docs/zh.md', lessonDir);
      if (!docPath) continue;
      const markdown = fs.readFileSync(docPath, 'utf8');
      const declaredQuizPath = path.join(lessonDir, 'quiz.json');
      const quizPath = safeRepoFile('quiz.json', lessonDir);
      if (!quizPath && fs.existsSync(declaredQuizPath)) {
        throw new Error(`Unsafe certification quiz path: ${relPath}/quiz.json`);
      }
      const quiz = quizPath ? readJson(quizPath, `${relPath}/quiz.json`) : null;
      const meta = certificationDocMeta(markdown, entry.name.replace(/^\d+-/, '').replace(/-/g, ' '));
      lessonsByPath[relPath] = {
        path: relPath,
        slug: entry.name,
        name: meta.name,
        summary: meta.summary,
        keywords: meta.keywords,
        type: meta.type,
        languages: meta.languages,
        prerequisites: meta.prerequisites,
        time: meta.time,
        markdown,
        quiz,
        quizVersion: quizContentVersion(quiz),
        files: {
          code: certificationLessonFiles(lessonDir, relPath, 'code'),
          outputs: certificationLessonFiles(lessonDir, relPath, 'outputs'),
        },
        trackIds: [],
        domainsByTrack: {},
        rolesByTrack: {},
      };
    }
  }

  for (const track of tracks) {
    for (const ref of track.lessons) {
      const lesson = lessonsByPath[ref.path];
      if (!lesson) continue;
      if (!lesson.trackIds.includes(track.id)) lesson.trackIds.push(track.id);
      lesson.domainsByTrack[track.id] = Array.isArray(ref.domains) ? ref.domains : [];
      lesson.rolesByTrack[track.id] = ref.role || '';
    }
  }

  const assessmentsById = {};
  for (const track of tracks) {
    track.assessments = track.assessments.map((meta, index) => {
      const normalized = typeof meta === 'string' ? { path: meta } : { ...(meta || {}) };
      const assessmentLabel = normalized.id || normalized.title || `assessment ${index + 1}`;
      if (!normalized.path) {
        throw new Error(`Certification assessment "${assessmentLabel}" in track "${track.id}" must declare a source path`);
      }
      const resolvedAssessmentFile = resolveAssessmentFile(programDir, normalized.path);
      const assessmentFile = resolvedAssessmentFile
        ? safeRepoFile(path.relative(REPO_ROOT, resolvedAssessmentFile), REPO_ROOT)
        : null;
      if (!assessmentFile) {
        throw new Error(`Missing certification assessment source for "${assessmentLabel}" in track "${track.id}": ${normalized.path}`);
      }
      const data = readJson(assessmentFile, normalized.path);
      const id = normalized.id || data.id || `${track.id}-${normalized.kind || data.kind || `assessment-${index + 1}`}`;
      const merged = {
        ...data,
        ...normalized,
        id,
        track: normalized.track || data.track || track.id,
        kind: normalized.kind || data.kind || 'practice',
        title: normalized.title || data.title || 'Practice assessment',
        timeLimitMinutes: Number(normalized.timeLimitMinutes || data.timeLimitMinutes || 0),
      };
      assessmentsById[id] = merged;
      return {
        id,
        path: normalized.path || '',
        kind: merged.kind,
        title: merged.title,
        timeLimitMinutes: merged.timeLimitMinutes,
        questionCount: Array.isArray(merged.questions) ? merged.questions.length : 0,
      };
    });
  }

  return { program, tracks, lessonsByPath, assessmentsById };
}

function writeCertificationData(certifications) {
  const output = `// Auto-generated by build.js from certifications/ — do not edit manually.\n` +
    `// Last built: ${new Date().toISOString()}\n\n` +
    `const CERTIFICATIONS = ${JSON.stringify(certifications, null, 2)};\n`;
  fs.writeFileSync(CERTIFICATION_OUTPUT_PATH, output, 'utf8');
  console.log(`   wrote certification-data.js (${certifications.tracks.length} tracks)`);
}

// ─── Parse glossary/terms.md ──────────────────────────────────────────
const GLOSSARY_CATEGORY_ORDER = [
  '数学与训练',
  '模型与推理',
  '数据与表示',
  '检索与生成',
  'Prompt 与上下文',
  'Agent 与工具',
  '评估与安全',
  'AI-native 开发',
  '基础设施与服务',
  '可靠性与运维',
  '安全与治理',
  '多模态系统',
];

const GLOSSARY_CATEGORIES = new Set(GLOSSARY_CATEGORY_ORDER);

const GLOSSARY_CATEGORY_ALIASES = new Map([
  ['Math & training', '数学与训练'],
  ['Models & inference', '模型与推理'],
  ['Data & representations', '数据与表示'],
  ['Retrieval & generation', '检索与生成'],
  ['Prompting & context', 'Prompt 与上下文'],
  ['Agents & tools', 'Agent 与工具'],
  ['Evaluation & safety', '评估与安全'],
  ['AI-native development', 'AI-native 开发'],
  ['Infrastructure & serving', '基础设施与服务'],
  ['Reliability & operations', '可靠性与运维'],
  ['Security & governance', '安全与治理'],
  ['Multimodal systems', '多模态系统'],
]);

const GLOSSARY_FIELD_KEYS = new Map([
  ['Category', 'category'],
  ['分类', 'category'],
  ['What people say', 'says'],
  ['常见说法', 'says'],
  ['What it actually means', 'means'],
  ['实际含义', 'means'],
  ['Why it matters', 'whyItMatters'],
  ['为什么重要', 'whyItMatters'],
  ['In practice', 'example'],
  ['实际使用', 'example'],
  ['Common confusion', 'confusion'],
  ['常见混淆', 'confusion'],
  ['Aliases', 'aliases'],
  ['别名', 'aliases'],
  ['Related terms', 'related'],
  ['相关术语', 'related'],
  ['Learn it', 'lessons'],
  ['学习课程', 'lessons'],
  ['Sources', 'sources'],
  ['来源', 'sources'],
  ["Why it's called that", 'whyCalled'],
  ['名称由来', 'whyCalled'],
]);

function glossaryError(lineNumber, term, message) {
  const context = term ? ` (term "${term}")` : '';
  throw new Error(`glossary/terms.md:${lineNumber}${context}: ${message}`);
}

function glossarySlug(term) {
  return term
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function glossaryLookupKey(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .trim()
    .replace(/\s+/g, ' ');
}

function glossaryList(value) {
  return value.split(/[,;]/).map(item => item.trim()).filter(Boolean);
}

function glossaryLinks(value, fieldLabel, lineNumber, term) {
  const links = [];
  let cursor = 0;

  while (cursor < value.length) {
    while (cursor < value.length && /[\s,;]/.test(value[cursor])) cursor++;
    if (cursor >= value.length) break;

    if (value[cursor] === '[') {
      const closeLabel = value.indexOf(']', cursor + 1);
      if (closeLabel === -1 || value[closeLabel + 1] !== '(') {
        glossaryError(lineNumber, term, `${fieldLabel} contains a malformed Markdown link`);
      }
      const label = value.slice(cursor + 1, closeLabel).trim();
      let depth = 1;
      let closeUrl = closeLabel + 2;
      for (; closeUrl < value.length && depth > 0; closeUrl++) {
        if (value[closeUrl] === '\\') {
          closeUrl++;
          continue;
        }
        if (value[closeUrl] === '(') depth++;
        if (value[closeUrl] === ')') depth--;
      }
      if (depth !== 0) {
        glossaryError(lineNumber, term, `${fieldLabel} contains a malformed Markdown link`);
      }
      const url = value.slice(closeLabel + 2, closeUrl - 1).trim();
      if (!label || !url) {
        glossaryError(lineNumber, term, `${fieldLabel} links need both a label and a URL`);
      }
      links.push({ label, url });
      cursor = closeUrl;
    } else {
      const nextSeparator = value.slice(cursor).search(/[,;]/);
      const end = nextSeparator === -1 ? value.length : cursor + nextSeparator;
      const item = value.slice(cursor, end).trim();
      if (/[\[\]]/.test(item)) {
        glossaryError(lineNumber, term, `${fieldLabel} contains a malformed Markdown link`);
      }
      if (item) {
        const isUrl = /^(?:https?:\/\/|\/|\.\.?\/)/.test(item);
        links.push({ label: item, url: isUrl ? item : '' });
      }
      cursor = end;
    }

    while (cursor < value.length && /\s/.test(value[cursor])) cursor++;
    if (cursor < value.length && value[cursor] !== ',' && value[cursor] !== ';') {
      glossaryError(lineNumber, term, `${fieldLabel} items must be separated by a comma or semicolon`);
    }
  }

  return links;
}

function parseGlossary(content) {
  const terms = [];
  let currentTerm = null;
  const seenTerms = new Map();
  const seenSlugs = new Map();
  const lines = content.split(/\r?\n/);

  function finishEntry() {
    if (!currentTerm) return;
    if (!currentTerm.category) {
      glossaryError(currentTerm.headerLine, currentTerm.term, 'missing required field "Category"');
    }
    if (!currentTerm.means) {
      glossaryError(currentTerm.headerLine, currentTerm.term, 'missing required field "What it actually means"');
    }
    const { headerLine, fields, ...entry } = currentTerm;
    terms.push(entry);
    currentTerm = null;
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const lineNumber = index + 1;
    if (/^###\s*$/.test(line)) glossaryError(lineNumber, '', 'term heading cannot be empty');
    const termMatch = line.match(/^###\s+(.+?)\s*$/);
    if (termMatch) {
      finishEntry();
      const term = termMatch[1].trim();
      const normalizedTerm = term.toLocaleLowerCase('en-US');
      if (seenTerms.has(normalizedTerm)) {
        glossaryError(lineNumber, term, `duplicate term; first declared on line ${seenTerms.get(normalizedTerm)}`);
      }
      const slug = glossarySlug(term);
      if (!slug) glossaryError(lineNumber, term, 'term must contain at least one letter or number');
      if (seenSlugs.has(slug)) {
        const first = seenSlugs.get(slug);
        glossaryError(lineNumber, term, `duplicate slug "${slug}"; first used by "${first.term}" on line ${first.line}`);
      }
      seenTerms.set(normalizedTerm, lineNumber);
      seenSlugs.set(slug, { term, line: lineNumber });
      const firstCharacter = term.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]/i);
      currentTerm = {
        term,
        slug,
        letter: firstCharacter ? firstCharacter[0].toUpperCase() : '#',
        category: '',
        says: '',
        means: '',
        whyItMatters: '',
        example: '',
        confusion: '',
        aliases: [],
        related: [],
        lessons: [],
        sources: [],
        whyCalled: '',
        headerLine: lineNumber,
        fields: new Set(),
      };
      continue;
    }

    // Alphabet headings end the previous entry but are not glossary terms.
    if (/^#{1,2}\s+/.test(line)) {
      finishEntry();
      continue;
    }

    const fieldMatch = line.match(/^\s*-\s+\*\*([^*]+):\*\*\s*(.*?)\s*$/);
    if (!currentTerm) {
      if (fieldMatch) glossaryError(lineNumber, '', `field "${fieldMatch[1].trim()}" appears before a term heading`);
      continue;
    }

    if (fieldMatch) {
      const label = fieldMatch[1].trim();
      const value = fieldMatch[2].trim();
      const key = GLOSSARY_FIELD_KEYS.get(label);
      if (!key) glossaryError(lineNumber, currentTerm.term, `unknown field "${label}"`);
      if (currentTerm.fields.has(label)) glossaryError(lineNumber, currentTerm.term, `duplicate field "${label}"`);
      if (!value) glossaryError(lineNumber, currentTerm.term, `field "${label}" cannot be empty`);
      currentTerm.fields.add(label);

      if (key === 'category') {
        const category = GLOSSARY_CATEGORY_ALIASES.get(value) || value;
        if (!GLOSSARY_CATEGORIES.has(category)) {
          glossaryError(lineNumber, currentTerm.term, `unknown category "${value}"`);
        }
        currentTerm.category = category;
      } else if (key === 'aliases' || key === 'related') {
        const items = glossaryList(value);
        if (!items.length) glossaryError(lineNumber, currentTerm.term, `field "${label}" needs at least one item`);
        currentTerm[key] = items;
      } else if (key === 'lessons' || key === 'sources') {
        const links = glossaryLinks(value, label, lineNumber, currentTerm.term);
        if (!links.length) glossaryError(lineNumber, currentTerm.term, `field "${label}" needs at least one item`);
        if (links.some(link => !link.url)) {
          glossaryError(lineNumber, currentTerm.term, `field "${label}" requires a URL for every item`);
        }
        currentTerm[key] = links;
      } else if (key === 'says') {
        currentTerm.says = value.replace(/^"/, '').replace(/"$/, '').trim();
      } else {
        currentTerm[key] = value;
      }
      continue;
    }

    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('<!--')) {
      glossaryError(lineNumber, currentTerm.term, 'expected a canonical bullet field or the next term heading');
    }
  }

  finishEntry();

  const lookupOwners = new Map();
  for (const entry of terms) {
    const key = glossaryLookupKey(entry.term);
    const existing = lookupOwners.get(key);
    if (existing) {
      const entryLine = seenTerms.get(entry.term.toLocaleLowerCase('en-US')) || 1;
      glossaryError(
        entryLine,
        entry.term,
        `normalized term collides with canonical term "${existing.label}" on term "${existing.entry.term}"`
      );
    }
    lookupOwners.set(key, { entry, label: entry.term, kind: 'term' });
  }
  for (const entry of terms) {
    const entryLine = seenTerms.get(entry.term.toLocaleLowerCase('en-US')) || 1;
    for (const alias of entry.aliases) {
      const key = glossaryLookupKey(alias);
      const existing = lookupOwners.get(key);
      if (existing) {
        const ownership = existing.entry === entry
          ? `duplicates its ${existing.kind} "${existing.label}"`
          : `collides with ${existing.kind} "${existing.label}" on term "${existing.entry.term}"`;
        glossaryError(entryLine, entry.term, `alias "${alias}" ${ownership}`);
      }
      lookupOwners.set(key, { entry, label: alias, kind: 'alias' });
    }
  }
  for (const entry of terms) {
    const entryLine = seenTerms.get(entry.term.toLocaleLowerCase('en-US')) || 1;
    for (const related of entry.related) {
      if (!lookupOwners.has(glossaryLookupKey(related))) {
        glossaryError(entryLine, entry.term, `related term "${related}" does not resolve to a glossary entry or alias`);
      }
    }
    for (const lesson of entry.lessons) {
      if (/^https?:\/\//i.test(lesson.url)) continue;
      const localPath = path.resolve(path.dirname(GLOSSARY_PATH), lesson.url.split(/[?#]/)[0]);
      const rootWithSep = REPO_ROOT.endsWith(path.sep) ? REPO_ROOT : REPO_ROOT + path.sep;
      if (!localPath.startsWith(rootWithSep) || !fs.existsSync(localPath)) {
        glossaryError(entryLine, entry.term, `Learn it target "${lesson.url}" does not exist in the repository`);
      }
      const stats = fs.statSync(localPath);
      if (stats.isDirectory() && !fs.existsSync(path.join(localPath, 'docs', 'zh.md'))) {
        glossaryError(entryLine, entry.term, `Learn it target "${lesson.url}" is not a lesson with docs/zh.md`);
      }
    }
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
// Write the git ref this deploy was built from, so lesson.html fetches docs
// from the right branch (PR previews render their own edits, not main).
function resolveRef() {
  let ref = process.env.VERCEL_GIT_COMMIT_REF || '';
  if (!ref) {
    try {
      ref = require('child_process')
        .execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' })
        .trim();
    } catch (e) { ref = ''; }
  }
  if (!ref || ref === 'HEAD') ref = 'main';
  return ref;
}

function writeBuildMeta() {
  const ref = resolveRef();
  const js = '// Auto-generated by build.js on each deploy — do not edit.\n'
    + 'window.__AIFS_REF = ' + JSON.stringify(ref) + ';\n';
  fs.writeFileSync(path.join(__dirname, 'build-meta.js'), js, 'utf8');
  console.log('   wrote build-meta.js (ref: ' + ref + ')');
}

function build() {
  console.log('📖 Reading source files...');
  writeBuildMeta();

  const readme = fs.readFileSync(README_PATH, 'utf8');
  const roadmap = fs.readFileSync(ROADMAP_PATH, 'utf8');
  const glossary = fs.readFileSync(GLOSSARY_PATH, 'utf8');

  console.log('🔍 Parsing ROADMAP.md...');
  const roadmapStatuses = parseRoadmap(roadmap);

  console.log('🔍 Parsing README.md...');
  const phases = parseReadme(readme, roadmapStatuses);
  const roadmapPrereqs = parseCurriculumPrereqs(readme, phases);

  console.log('🔍 Parsing glossary/terms.md...');
  const glossaryTerms = parseGlossary(glossary);

  console.log('🔍 Discovering outputs + Phase 14 missions...');
  const artifacts = discoverArtifacts();

  console.log('🎓 Parsing certification programs...');
  const certifications = parseCertifications();
  writeCertificationData(certifications);

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
  console.log(`   Curriculum edges: ${Object.values(roadmapPrereqs).reduce((sum, ids) => sum + ids.length, 0)}`);
  console.log(`   Certification tracks: ${certifications.tracks.length}`);
  console.log(`   Certification lessons: ${Object.keys(certifications.lessonsByPath).length}`);
  console.log(`   Practice assessments: ${Object.keys(certifications.assessmentsById).length}`);

  // Generate data.js
const output = `// Auto-generated by build.js — do not edit manually.
// Last built: ${new Date().toISOString()}

const ROADMAP_PREREQS = ${JSON.stringify(roadmapPrereqs, null, 2)};

const PHASES = ${JSON.stringify(phases, null, 2)};

const GLOSSARY_CATEGORY_ORDER = ${JSON.stringify(GLOSSARY_CATEGORY_ORDER, null, 2)};

const GLOSSARY = ${JSON.stringify(glossaryTerms, null, 2)};

const ARTIFACTS = ${JSON.stringify(artifacts, null, 2)};
`;

  fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
  console.log(`\n✅ Generated ${OUTPUT_PATH}`);

  syncCounts(totalLessons, artifacts.length);
  writeSitemap(phases, glossaryTerms.length, certifications);
  writeLlms(phases, glossaryTerms.length, artifacts.length, certifications);
  writeLessonPages(phases);
}

// ─── sitemap.xml from the same PHASES the site renders ───────────────────
function writeSitemap(phases, glossaryCount, certifications) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: '/', priority: '1.0', freq: 'weekly' },
    { loc: '/catalog.html', priority: '0.8', freq: 'weekly' },
    { loc: '/prereqs.html', priority: '0.7', freq: 'monthly' },
    { loc: '/about.html', priority: '0.5', freq: 'monthly' },
  ];
  if (glossaryCount > 0) urls.push({ loc: '/glossary.html', priority: '0.6', freq: 'monthly' });
  if (certifications && certifications.program) {
    urls.push({ loc: '/certifications.html', priority: '0.9', freq: 'weekly' });
    for (const track of certifications.tracks) {
      urls.push({ loc: '/certification.html?id=' + encodeURIComponent(track.id), priority: '0.8', freq: 'monthly' });
    }
    for (const lesson of Object.values(certifications.lessonsByPath)) {
      const track = lesson.trackIds && lesson.trackIds[0];
      let loc = '/lesson.html?path=' + encodeURIComponent(lesson.path);
      if (track) loc += '&track=' + encodeURIComponent(track);
      urls.push({ loc, priority: '0.7', freq: 'monthly' });
    }
  }
  for (const phase of phases) {
    for (const l of phase.lessons) {
      const p = lessonPath(l.url);
      if (p) urls.push({ loc: lessonStaticHref(p), priority: '0.6', freq: 'monthly' });
    }
  }
  const body = urls.map(u =>
    `  <url>\n    <loc>${SITE_ORIGIN}${u.loc.replace(/&/g, '&amp;')}</loc>\n` +
    `    <lastmod>${today}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n` +
    `    <priority>${u.priority}</priority>\n  </url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), xml, 'utf8');
  console.log(`   wrote sitemap.xml (${urls.length} URLs)`);
}

// ─── llms.txt: a link-rich map of the curriculum for AI agents ───────────
function writeLlms(phases, glossaryCount, artifactCount, certifications) {
  const rawOrigin = 'https://raw.githubusercontent.com/fancyboi999/ai-engineering-from-scratch-zh/' + resolveRef();
  let total = 0;
  phases.forEach(p => { total += p.lessons.filter(l => lessonPath(l.url)).length; });
  let out = `# AI Engineering from Scratch · 简体中文版\n\n`;
  out += `> 一套免费、开源的 AI 工程课程，从零亲手实现核心算法——${total} 节课，横跨 ${phases.length} 个阶段，从线性代数到自主 agent。Python、TypeScript、Rust、Julia。\n\n`;
  out += `Canonical site: ${SITE_ORIGIN}\n`;
  out += `Source: https://github.com/fancyboi999/ai-engineering-from-scratch-zh\n`;
  out += `Upstream: https://github.com/rohitg00/ai-engineering-from-scratch\n`;
  out += `Glossary terms: ${glossaryCount} · Reusable outputs (prompts/skills/agents): ${artifactCount}\n\n`;
  out += `主课程页面在构建时预渲染；课程目录还可能包含可运行的 code/ 和 quiz.json。\n\n`;
  for (const phase of phases) {
    out += `## 阶段 ${phase.id}：${phase.name}\n`;
    if (phase.desc) out += `${phase.desc}\n`;
    out += `\n`;
    for (const l of phase.lessons) {
      const p = lessonPath(l.url);
      if (!p) continue;
      const note = l.summary ? ` — ${l.summary}` : '';
      out += `- [${l.name}](${SITE_ORIGIN}${lessonStaticHref(p)}) · [raw](${rawOrigin}/${p}/docs/zh.md)${note}\n`;
    }
    out += `\n`;
  }
  out += `## 其它\n`;
  out += `- [课程表](${SITE_ORIGIN}/catalog.html) — 可搜索的完整课程索引\n`;
  out += `- [路线图](${SITE_ORIGIN}/prereqs.html) — 跨阶段的前置依赖顺序\n`;
  if (glossaryCount > 0) out += `- [术语表](${SITE_ORIGIN}/glossary.html) — ${glossaryCount} 个术语的通俗定义\n`;
  if (certifications && certifications.program) {
    out += `\n## Claude 认证备考\n`;
    out += `这是独立、开源的练习材料，不隶属于 Anthropic，练习得分不是官方考试分数，完成课程也不保证通过认证。\n\n`;
    out += `- [Claude 认证学习指南](${rawOrigin}/certifications/claude/GETTING_STARTED.md)\n`;
    out += `- [Claude 认证导师契约](${rawOrigin}/skills/claude-certification/SKILL.md)\n`;
    out += `- [认证课程表](${SITE_ORIGIN}/certifications.html)\n`;
    for (const track of certifications.tracks) {
      out += `- [${track.credential || track.shortName || track.id}](${SITE_ORIGIN}/certification.html?id=${encodeURIComponent(track.id)})`;
      if (track.summary) out += ` — ${track.summary}`;
      out += `\n`;
    }
    for (const lesson of Object.values(certifications.lessonsByPath)) {
      out += `- [${lesson.name}](${SITE_ORIGIN}/lesson.html?path=${encodeURIComponent(lesson.path)}) · [raw](${rawOrigin}/${lesson.path}/docs/zh.md)`;
      if (lesson.summary) out += ` — ${lesson.summary}`;
      out += `\n`;
    }
  }
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
  // 后顾用 (?<![\w-]) 而非 \b：\b 在 data-src 的 '-'→'s' 处也算词边界，会把
  // data-src="r2"（视频源标识，非 URL）误改成 data-src="/r2" 破坏源切换按钮；
  // 排除连字符前缀，确保只命中独立的 href=/src= 属性。
  const absolutized = template.replace(
    /(?<![\w-])(href|src)="(?!(?:[a-z][a-z0-9+.-]*:|\/\/|\/|#))([A-Za-z0-9_][^"]*)"/g,
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
      const hasDoc = !!rel && !!safeRepoFile(path.join(rel, 'docs', 'zh.md'), REPO_ROOT);
      flat.push({ name: l.name, rel, isReadable: hasDoc });
    }
  }

  let written = 0;
  const skipped = [];
  for (let i = 0; i < flat.length; i++) {
    const f = flat[i];
    if (!f.rel) continue;
    let md;
    let quiz = null;
    try {
      const docPath = safeRepoFile(path.join(f.rel, 'docs', 'zh.md'), REPO_ROOT);
      if (!docPath) throw new Error('unsafe lesson document path');
      md = fs.readFileSync(docPath, 'utf8');
      const quizPath = safeRepoFile(path.join(f.rel, 'quiz.json'), REPO_ROOT);
      if (quizPath) {
        quiz = readJson(quizPath, `${f.rel}/quiz.json`);
      }
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
    // 社交卡图跟随 SITE_ORIGIN(模板里写死的 aieng 默认值会被覆盖),fork 部署即指向自己的图
    setMeta('property', 'og:image', SITE_ORIGIN + '/og-image.png?v=2');
    setMeta('name', 'twitter:image', SITE_ORIGIN + '/og-image.png?v=2');
    page = page.replace(
      /<link rel="canonical" href="[^"]*">/,
      () => '<link rel="canonical" href="' + url + '">\n  <meta property="og:url" content="' + url + '">'
    );
    page = page.replace('</head>', () =>
      '  <script type="application/ld+json" id="lessonJsonLd">' + lessonJsonLd(title, desc, url) + '</script>\n</head>');
    page = page.replace(LOADING_BLOCK, () => article);
    // 注入预渲染标记：boot 据此跳过运行时 fetch，直接走 enhanceLesson + fetchQuiz
    const prerenderedPayload = { path: f.rel, quiz };
    page = page.replace(
      SCRIPT_ANCHOR,
      '  <script>window.__PRERENDERED__ = ' + JSON.stringify(prerenderedPayload).replace(/</g, '\\u003c') + ';</script>\n' + SCRIPT_ANCHOR
    );
    // 注意：不能只查 '__PRERENDERED__'——内联 boot 脚本本身就含这个标识符
    if (page.indexOf('<script>window.__PRERENDERED__ = ') === -1) {
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

// ─── 自动同步站点文案里的课程数 / 产出数 ─────
function syncCounts(lessons, outputs) {
  const targets = ['index.html', 'catalog.html', 'prereqs.html', 'lesson.html', 'cmdpalette.js'];
  for (const f of targets) {
    const p = path.join(__dirname, f);
    if (!fs.existsSync(p)) continue;
    const before = fs.readFileSync(p, 'utf8');
    const after = before
      .replace(/\d+( 节课程)/g, lessons + '$1')
      .replace(/\d+ 节课(?!程)/g, lessons + ' 节课')
      .replace(/\d+( 节 AI 工程)/g, lessons + '$1')
      .replace(/\d+( lessons)\b/g, lessons + '$1')
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
// 硬编码 docs/zh.md + 英文 README 正则，对中文仓全不兼容（且是 B 类 1:1 同步资产，
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

function verifySiteCss() {
  const cssFiles = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.css'))
    .sort();
  const errors = [];

  for (const file of cssFiles) {
    const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
    let depth = 0;
    let line = 1;
    let quote = '';
    let inComment = false;
    let escaped = false;

    for (let i = 0; i < source.length; i++) {
      const char = source[i];
      const next = source[i + 1];
      if (char === '\n') line++;

      if (inComment) {
        if (char === '*' && next === '/') {
          inComment = false;
          i++;
        }
        continue;
      }

      if (quote) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === quote) quote = '';
        continue;
      }

      if (char === '/' && next === '*') {
        inComment = true;
        i++;
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth < 0) {
          errors.push(`${file}:${line}: 多余的 }`);
          depth = 0;
        }
      }
    }

    if (inComment) errors.push(`${file}:${line}: 注释未闭合`);
    if (quote) errors.push(`${file}:${line}: 字符串未闭合`);
    if (depth > 0) errors.push(`${file}: 缺少 ${depth} 个 }`);
  }

  if (errors.length) {
    console.error('\n❌ 站点 CSS 结构校验失败\n');
    errors.forEach(error => console.error('  ✗ ' + error));
    process.exit(1);
  }
  console.log(`✅ 站点 CSS 结构校验通过：${cssFiles.length} 个文件的括号、注释和字符串均已闭合`);
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

verifySiteCss();

if (process.argv.includes('--check')) {
  verifyCurriculum();
} else {
  build();
}
