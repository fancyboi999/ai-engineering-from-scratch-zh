const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const practice = require('./build-practice');

const root = path.resolve(__dirname, '..');
const built = practice.buildPractice();
const config = require('../vercel.json');

function page(href) {
  return built.pages.find(item => item.href === href);
}

test('every problem folder builds a page, a run file and a solution file', () => {
  assert.ok(built.problems.length >= 4, `only ${built.problems.length} problems`);
  for (const problem of built.problems) {
    assert.ok(page(problem.href), `${problem.id} has no page`);
    assert.ok(built.files.has(`data/${problem.id}.json`));
    assert.ok(built.files.has(`data/${problem.id}.solution.json`));
    const data = JSON.parse(built.files.get(`data/${problem.id}.json`));
    assert.equal(data.version, problem.version);
    assert.ok(data.hints.length >= 2 && data.hints.length <= 5);
    assert.ok(data.tests.includes('from practice_check import'));
    assert.deepEqual(Object.keys(JSON.parse(data.fixtures)).length > 0, true);
    assert.equal('solution' in data, false);
  }
});

test('no page and no run file shows the solution or the notes', () => {
  assert.deepEqual(practice.checkPractice(built), []);
  for (const problem of built.problems) {
    const html = page(problem.href).html;
    const solution = JSON.parse(built.files.get(`data/${problem.id}.solution.json`));
    assert.equal(html.includes(problem.files['solution.py'].trim()), false);
    assert.equal(html.includes('.solution.json'), false);
    assert.ok(solution.solution.length > 0 && solution.notes.length > 0);
  }
});

test('problem pages use Chinese metadata, the statement and the starter', () => {
  for (const problem of built.problems) {
    const html = page(problem.href).html;
    assert.match(html, new RegExp(`<link rel="canonical" href="https://aieng-zh.cn/practice/${problem.id}">`));
    assert.match(html, /<h2 id="task"/);
    assert.match(html, /data-editor-input/);
    assert.ok(html.includes(`/lesson?path=${encodeURIComponent(problem.meta.lesson)}`), `${problem.id} does not link its lesson`);
    if (problem.meta.cheatsheet) assert.ok(html.includes(`/cheatsheets/${problem.meta.cheatsheet}`));
    assert.match(html, /"@type":"LearningResource"/);
    assert.match(html, /data-pyodide="https:\/\/cdn\.jsdelivr\.net\/pyodide\/v314\.0\.7\/full\/"/);
    assert.match(html, /data-worker="\/practice-worker\.js\?v=[0-9a-f]{16}"/);
    assert.match(html, /\/practice\.js\?v=[0-9a-f]{16}/);
    assert.equal(/<script[^>]+pyodide/i.test(html), false, 'Pyodide must load only when the learner runs code');
  }
});

test('the list page has a row for each problem with the filter data', () => {
  const html = page('/practice').html;
  for (const problem of built.problems) {
    assert.ok(html.includes(`data-id="${problem.id}" data-kind="${problem.meta.kind}" data-difficulty="${problem.meta.difficulty}" data-phase="${problem.phase.number}"`), problem.id);
  }
  for (const name of ['q', 'kind', 'difficulty', 'status', 'phase', 'track', 'tag']) assert.match(html, new RegExp(`name="${name}"`));
  assert.match(html, /data-random/);
  assert.match(html, /data-continue/);
  assert.match(html, /"@type":"ItemList"/);
});

test('tracks come from problem metadata and each track page lists its problems in order', () => {
  const ids = JSON.parse(fs.readFileSync(path.join(root, 'practice', 'collections.json'), 'utf8')).map(item => item.id);
  assert.ok(built.tracks.length >= 3);
  for (const track of built.tracks) {
    assert.ok(ids.includes(track.id));
    const html = page(track.href).html;
    let last = -1;
    for (const problem of track.problems) {
      assert.ok(problem.meta.collections.includes(track.id));
      const at = html.indexOf(`data-id="${problem.id}"`);
      assert.ok(at > last, `${track.id} order`);
      last = at;
    }
  }
});

test('the lesson map lists the practice problems of each lesson', () => {
  for (const problem of built.problems) {
    const items = built.map.lessons[problem.meta.lesson];
    assert.ok(items.some(item => item.id === problem.id && item.href === problem.href));
  }
});

test('the harness and each problem have the files that the validator needs', () => {
  assert.ok(built.files.get('practice_check.py').includes('def evaluate_json('));
  for (const problem of built.problems) {
    for (const name of ['problem.md', 'starter.py', 'solution.py', 'tests.py', 'hints.md', 'notes.md', 'fixtures.json']) {
      assert.ok(fs.existsSync(path.join(root, 'practice', problem.id, name)), `${problem.id}/${name}`);
    }
    const counts = practice.countChecks(problem.files['tests.py']);
    for (const layer of ['examples', 'properties', 'edge', 'reference']) assert.ok(counts[layer] > 0, `${problem.id} has no ${layer} check`);
  }
});

test('a broken problem folder stops the build with a clear message', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiefs-practice-'));
  try {
    fs.mkdirSync(path.join(temp, 'practice', '_harness'), { recursive: true });
    fs.writeFileSync(path.join(temp, 'practice', '_harness', 'practice_check.py'), 'def evaluate_json(): pass\n');
    fs.writeFileSync(path.join(temp, 'practice', 'collections.json'), '[]');
    fs.mkdirSync(path.join(temp, 'practice', 'demo'));
    fs.writeFileSync(path.join(temp, 'practice', 'demo', 'meta.json'), '{"id": "demo"}');
    assert.throws(() => practice.buildPractice({ root: temp }), /demo: missing problem\.md/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('hints split on level 2 headings', () => {
  assert.deepEqual(practice.hintList('## Hint 1\n\nOne.\n\n## Hint 2\n\nTwo.\n'), ['One.', 'Two.']);
});

test('two builds give the same bytes', () => {
  const again = practice.buildPractice();
  assert.deepEqual(Array.from(again.files.keys()), Array.from(built.files.keys()));
  for (const [file, body] of built.files) assert.equal(again.files.get(file), body, file);
});

test('clean URLs route to the practice pages and the run data is not indexed', () => {
  const rewrites = config.rewrites.map(rule => `${rule.source} ${rule.destination}`);
  assert.ok(rewrites.includes('/practice /practice/index.html'));
  assert.ok(rewrites.includes('/practice/:page([a-z0-9-]+) /practice/:page.html'));
  assert.ok(rewrites.includes('/practice/tracks/:page([a-z0-9-]+) /practice/tracks/:page.html'));
  const data = config.headers.find(rule => rule.source === '/practice/data/(.*)');
  assert.ok(data.headers.some(header => header.key === 'X-Robots-Tag' && header.value === 'noindex'));
  assert.ok(config.functions['api/lesson.js'].includeFiles.includes('site/practice-map.json'));
  const markdown = config.routes.filter(rule => rule.has && rule.src.startsWith('/practice'));
  assert.deepEqual(markdown.map(rule => rule.dest), [
    '/agent-pages/practice/index.md',
    '/agent-pages/practice/tracks/$1.md',
    '/agent-pages/practice/$1.md',
  ]);
});

test('the menu, the footers and the hub pages link to the practice pages', () => {
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'lib', 'site-navigation.js'), 'utf8'), /\{ href: 'practice', label: '编程练习' \}/);
  assert.match(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), /编程练习/);
  assert.match(fs.readFileSync(path.join(__dirname, 'build-hubs.js'), 'utf8'), /\['\/practice', '编程练习'\]/);
});

test('the worker loads Pyodide as a module from the pinned version', () => {
  const worker = fs.readFileSync(path.join(__dirname, 'practice-worker.js'), 'utf8');
  assert.match(worker, /import\(indexURL \+ 'pyodide\.mjs'\)/);
  assert.equal(/importScripts/.test(worker), false);
  assert.match(fs.readFileSync(path.join(__dirname, 'practice.js'), 'utf8'), /new Worker\(workerUrl, \{ type: 'module' \}\)/);
  assert.equal(practice.PYODIDE_VERSION, '314.0.7');
});

test('each kind of task is present and every page carries its kind', () => {
  const kinds = new Set(built.problems.map(problem => problem.meta.kind));
  for (const kind of ['implement', 'research', 'train', 'lab']) assert.ok(kinds.has(kind), kind);
  for (const problem of built.problems) {
    const html = page(problem.href).html;
    assert.ok(html.includes(`data-kind="${problem.meta.kind}"`), problem.id);
    if (problem.meta.kind === 'train') assert.match(html, /data-curve/);
  }
});

test('only research pages link out, once, with nofollow and below the statement', () => {
  const allowed = /^https:\/\/(?:aieng-zh\.cn\/|github\.com\/fancyboi999\/ai-engineering-from-scratch-zh(?:\/|$)|fonts\.googleapis\.com\/)/;
  for (const item of built.pages) {
    const outbound = Array.from(item.html.matchAll(/<a\b[^>]*href="(https?:[^"]+)"[^>]*>/g)).filter(match => !allowed.test(match[1]));
    const problem = built.problems.find(entry => entry.href === item.href);
    if (!problem || problem.meta.kind !== 'research') {
      assert.deepEqual(outbound.map(match => match[1]), [], item.href);
      continue;
    }
    assert.equal(outbound.length, 1, item.href);
    assert.match(outbound[0][1], /^https:\/\/arxiv\.org\/abs\/\d{4}\.\d{4,5}$/);
    assert.match(outbound[0][0], /rel="nofollow noopener external"/);
    const statementEnd = item.html.indexOf('</section>', item.html.indexOf('class="pr-statement"'));
    assert.ok(item.html.indexOf(outbound[0][0]) > item.html.indexOf('<h2 id="task"') && item.html.indexOf(outbound[0][0]) < statementEnd, item.href);
    const head = item.html.slice(0, item.html.indexOf('</head>'));
    assert.equal(head.includes('arxiv.org'), item.html.includes('"citation"'), 'only the JSON-LD citation may name the paper url in the head');
    assert.equal(/<title>[^<]*arxiv/i.test(head) || /name="description" content="[^"]*arxiv/i.test(head), false);
  }
});

test('structured data describes each task and the list', () => {
  for (const problem of built.problems) {
    const ld = JSON.parse(page(problem.href).html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
    assert.equal(ld['@type'], 'LearningResource');
    assert.ok(ld.educationalLevel && Array.isArray(ld.teaches) && ld.teaches.length > 0, problem.id);
    assert.equal(ld.url, `https://aieng-zh.cn${problem.href}`);
    assert.equal(Boolean(ld.citation), problem.meta.kind === 'research');
  }
  const list = JSON.parse(page('/practice').html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
  assert.equal(list['@type'], 'ItemList');
  assert.equal(list.itemListElement.length, built.problems.length);
});

test('answer engines get a Markdown page for the list, each track and each task, without the solution', () => {
  assert.ok(built.markdown.get('index.md').includes('## 论文复现'));
  for (const track of built.tracks) assert.ok(built.markdown.has(`tracks/${track.id}.md`));
  for (const problem of built.problems) {
    const md = built.markdown.get(`${problem.id}.md`);
    assert.ok(md.startsWith(`# ${problem.meta.title}\n\n规范页面：https://aieng-zh.cn${problem.href}`), problem.id);
    assert.ok(md.includes('## 任务'));
    assert.equal(md.includes(problem.files['solution.py'].trim()), false);
    assert.equal(/\]\(https?:\/\/(?!aieng-zh\.cn)/.test(md), false, `${problem.id} links out`);
  }
  const markdownRule = config.routes.find(rule => rule.src === '/practice/([a-z0-9-]+)' && rule.has);
  assert.equal(markdownRule.dest, '/agent-pages/practice/$1.md');
});
