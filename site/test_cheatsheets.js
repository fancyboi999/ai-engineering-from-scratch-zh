const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const sheets = require('./build-cheatsheets');

const root = path.resolve(__dirname, '..');

const TOPIC = [
  '---',
  'id: demo',
  'title: Demo Topic',
  'subtitle: A small topic for the tests.',
  'hue: 120',
  'sources: phases/demo/01-lesson',
  '---',
  '',
  '## Start a server',
  'type: task-table',
  'from: phases/demo/01-lesson/docs/zh.md',
  '',
  '| Task | Code |',
  '|---|---|',
  '| Start | `serve --port <port>` |',
  '| Probe | `GET /health` |',
  '',
  '## Run it',
  'type: annotated-code',
  'lang: bash',
  'from: phases/demo/01-lesson/docs/zh.md',
  '',
  '```bash',
  '# Start',
  'serve --port 30000 \\  # HTTP port',
  '  --enable-metrics      # turn on metrics',
  '```',
  '',
  '## Parts',
  'type: architecture',
  'from: phases/demo/01-lesson/docs/zh.md',
  '',
  '```arch',
  'node | api | 1,1 | HTTP server | tokenizer',
  'node | sched | 2,1 | Scheduler |',
  'edge | api | sched | ZMQ',
  '```',
  '',
  '## One request',
  'type: flow',
  'from: phases/demo/01-lesson/docs/zh.md',
  '',
  '1. **Client**: sends a request.',
  '2. **Scheduler**: admits it.',
  '',
  '## Defaults',
  'type: defaults',
  'from: phases/demo/01-lesson/docs/zh.md',
  '',
  '| Setting | Default | Note |',
  '|---|---|---|',
  '| `--port` | 30000 | HTTP port |',
  '',
].join('\n');

function fixtureRoot(lessonText) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-test-'));
  fs.mkdirSync(path.join(dir, 'phases', 'demo', '01-lesson', 'docs'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'phases', 'demo', '01-lesson', 'docs', 'zh.md'), lessonText);
  return dir;
}

test('a topic file parses into typed blocks', () => {
  const topic = sheets.parseTopic(TOPIC, 'cheatsheets/demo.md');
  assert.deepEqual(topic.errors, []);
  assert.equal(topic.id, 'demo');
  assert.equal(topic.hue, 120);
  assert.equal(topic.code, 'DT');
  assert.deepEqual(topic.blocks.map(block => [block.type, block.span]), [['task-table', 1], ['annotated-code', 2], ['architecture', 2], ['flow', 1], ['defaults', 2]]);
  assert.deepEqual(topic.blocks[0].rows[0], ['Start', '`serve --port <port>`']);
  assert.deepEqual(topic.blocks[2].nodes.map(node => node.id), ['api', 'sched']);
  assert.deepEqual(topic.blocks[2].edges, [{ from: 'api', to: 'sched', label: 'ZMQ' }]);
  assert.deepEqual(topic.blocks[3].items.map(item => item.lead), ['Client', 'Scheduler']);
});

test('bad blocks are reported', () => {
  const broken = TOPIC.replace('type: flow', 'type: story').replace('| Start | `serve --port <port>` |', '| Start |').replace('edge | api | sched | ZMQ', 'edge | api | nowhere | ZMQ');
  const errors = sheets.parseTopic(broken, 'cheatsheets/demo.md').errors.join('\n');
  assert.match(errors, /unknown type "story"/);
  assert.match(errors, /needs 2 cells/);
  assert.match(errors, /names a missing node/);
  assert.match(sheets.parseTopic(TOPIC, 'cheatsheets/other.md').errors.join('\n'), /must match the file name/);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-broken-'));
  fs.mkdirSync(path.join(root, 'cheatsheets'));
  fs.writeFileSync(path.join(root, 'cheatsheets', 'demo.md'), broken);
  assert.throws(() => sheets.buildCheatsheets({ root, edition: '2026-01-01' }), /cheatsheets\/demo\.md: .*unknown type "story"/s);
});

test('every flag, name and default must appear in the from files', () => {
  const grounded = fixtureRoot('Run serve --port 30000 --enable-metrics. GET /health.');
  const topic = sheets.parseTopic(TOPIC, path.join(grounded, 'cheatsheets', 'demo.md'));
  topic.file = 'cheatsheets/demo.md';
  assert.deepEqual(sheets.checkTopic(topic, grounded), []);
  const thin = fixtureRoot('Run serve --port 8080.');
  const problems = sheets.checkTopic(topic, thin).join('\n');
  assert.match(problems, /"--enable-metrics" is not in its from files/);
  assert.match(problems, /"30000" is not in its from files/);
  assert.doesNotMatch(problems, /<port>/);
});

test('diagrams render from the block data', () => {
  const topic = sheets.parseTopic(TOPIC, 'cheatsheets/demo.md');
  const built = sheets.buildCheatsheets({ edition: '2026-01-01' });
  assert.ok(built.pages.length >= 1);
  const html = require('./build-cheatsheets').architectureSvg(topic.blocks[2]);
  assert.match(html, /<svg class="cs-arch cs-arch-wide" viewBox="0 0 614 \d+"/);
  assert.match(html, />HTTP server</);
  assert.match(html, />ZMQ</);
  const narrow = sheets.architectureSvg(topic.blocks[2], true);
  assert.match(narrow, /<svg class="cs-arch cs-arch-narrow" viewBox="0 0 300 \d+"/);
  const flow = sheets.flowSvg(topic.blocks[3]);
  assert.match(flow, />1</);
  assert.match(flow, />Scheduler</);
});

test('the real topics pass every check and fit two pages', () => {
  const topics = sheets.loadTopics(root);
  assert.ok(topics.length >= 3);
  const cache = new Map();
  for (const topic of topics) {
    assert.deepEqual(sheets.checkTopic(topic, root, cache), [], topic.file);
    assert.ok(sheets.layout(topic).pages <= 2, topic.file);
  }
});

test('the same topics give the same bytes and no broken links', () => {
  const first = sheets.buildCheatsheets({ edition: '2026-01-01' });
  const second = sheets.buildCheatsheets({ edition: '2026-01-01' });
  assert.equal(first.pages.length, first.topics.length + 1);
  for (let i = 0; i < first.pages.length; i++) assert.equal(first.pages[i].html, second.pages[i].html, first.pages[i].href);
  assert.equal(first.search, second.search);
  assert.deepEqual(sheets.checkLinks(first), []);
  const ids = [];
  for (const page of first.pages) {
    const found = [...page.html.matchAll(/ id="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(found).size, found.length, page.href);
    ids.push(...found);
  }
});

test('blocks are placed on the grid without overlap', () => {
  for (const topic of sheets.loadTopics(root)) {
    const { places } = sheets.layout(topic);
    const cells = new Set();
    for (const place of places) {
      for (let c = place.col; c < place.col + place.span; c++) {
        for (let r = place.row; r < place.row + place.rows; r++) {
          const key = `${place.page}:${c}:${r}`;
          assert.ok(!cells.has(key), `${topic.id} overlaps at ${key}`);
          cells.add(key);
        }
      }
      assert.ok(place.col + place.span - 1 <= 4);
    }
  }
});

test('lesson and phase pages learn which topics cover them', () => {
  const topics = sheets.loadTopics(root);
  const map = sheets.coverage(topics, root);
  const harness = topics.find(topic => topic.id === 'agent-harness');
  assert.ok(harness);
  assert.ok(map.lessons['phases/14-agent-engineering/01-the-agent-loop'].some(item => item.id === 'agent-harness'));
  assert.ok(map.phases['agent-engineering'].some(item => item.href === '/cheatsheets/agent-harness'));
  for (const lesson of Object.keys(map.lessons)) assert.ok(fs.existsSync(path.join(root, lesson, 'docs', 'zh.md')), lesson);
  const source = fs.readFileSync(path.join(root, 'api', 'lesson.js'), 'utf8');
  assert.match(source, /cheatsheet-map\.json/);
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const rewrites = new Map(vercel.rewrites.map(rule => [rule.source, rule.destination]));
  assert.equal(rewrites.get('/cheatsheets'), '/cheatsheets/index.html');
  assert.equal(rewrites.get('/cheatsheets/:topic([a-z0-9-]+)'), '/cheatsheets/:topic.html');
  assert.ok(vercel.functions && JSON.stringify(vercel.functions).includes('site/cheatsheet-map.json'));
});

test('the phase index displays the Chinese titles from phase READMEs', () => {
  const built = sheets.buildCheatsheets({ edition: '2026-01-01' });
  const index = built.pages.find(page => page.file === 'index.html').html;
  assert.match(index, /href="\/phase\/setup-and-tooling"[^>]*>[\s\S]*?环境与工具/);
  assert.match(index, /href="\/phase\/capstone-projects"[^>]*>[\s\S]*?综合项目/);
  assert.doesNotMatch(index, />00-setup-and-tooling<|>19-capstone-projects</);
});

test('search covers every table row and term', () => {
  const built = sheets.buildCheatsheets({ edition: '2026-01-01' });
  const index = JSON.parse(built.search);
  assert.equal(index.length, built.topics.length);
  for (const topic of built.topics) {
    const entry = index.find(item => item.i === topic.id);
    const rows = topic.blocks.filter(block => block.rows).reduce((sum, block) => sum + block.rows.length, 0);
    assert.ok(entry.r.length >= rows, topic.id);
    for (const row of entry.r) assert.ok(topic.blocks[row[2]] && entry.b[row[2]] === topic.blocks[row[2]].id);
  }
});

test('the Chinese full-text search index stays bounded and finds flags in long cells', () => {
  const built = sheets.buildCheatsheets({ edition: '2026-01-01' });
  const gzipped = require('node:zlib').gzipSync(built.search).length;
  // Chinese descriptions remain searchable; the full corpus currently compresses to about 273 kB.
  assert.ok(gzipped < 300000, `search.json is ${gzipped} bytes gzipped`);
  const index = JSON.parse(built.search);
  const sglang = index.find(item => item.i === 'sglang-serving');
  assert.ok(sglang.r.some(row => row.join(' ').includes('--mem-fraction-static')));
});

test('the print edition carries the attribution and renders math ahead of time', () => {
  const built = sheets.buildCheatsheets({ edition: '2026-10-01' });
  const html = sheets.printHtml(built);
  assert.match(html, /<meta name="author" content="Rohit Ghumare">/);
  assert.match(html, /<meta name="subject" content="[^"]+版本 2026-10-01">/);
  assert.match(html, /<meta name="keywords" content="[^"]+">/);
  assert.match(html, /class="cs-cover-copy">© 2026 Rohit Ghumare · MIT 许可证</);
  const printer = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'print_cheatsheets.js'), 'utf8');
  assert.match(printer, /querySelector\('\.cs-cover-copy'\)/);
  assert.match(html, /请一并保留本页和版权声明/);
  const fake = { renderToString: (tex, options) => `<span class="katex">${options.displayMode ? 'D' : 'I'}:${tex}</span>` };
  const rendered = sheets.prerenderMath('<head></head><span class="math-inline" data-math="inline">a &lt; b</span>', fake);
  assert.match(rendered, /katex\.min\.css/);
  assert.match(rendered, /data-math-rendered><span class="katex">I:a < b<\/span>/);
});

test('Chinese posters use the shared renderer and retain localized navigation', () => {
  const built = sheets.buildCheatsheets({ edition: '2026-10-19' });
  const rag = built.pages.find(page => page.href === '/cheatsheets/rag');
  assert.match(rag.html, /<html lang="zh-CN"/);
  assert.match(rag.html, /https:\/\/aieng-zh\.cn\/cheatsheets\/rag/);
  assert.match(rag.html, /github\.com\/fancyboi999\/ai-engineering-from-scratch-zh/);
  assert.match(rag.html, /href="\/lessons\/11-llm-engineering\/06-rag\/"/);
  assert.match(rag.html, /aria-label="复制代码">复制/);
  assert.match(rag.html, /class="math-inline"/);
  assert.doesNotMatch(rag.html, /docs\/en\.md|aiengineeringfromscratch\.com/);
  const topic = sheets.loadTopics(root).find(item => item.id === 'rag');
  assert.equal(topic.blocks.find(block => block.type === 'flow').items[0].text.startsWith('：'), false);
});

test('Chinese default descriptions still require their numeric facts in the source', () => {
  const grounded = fixtureRoot('Run serve --port 30000 --enable-metrics. GET /health.');
  const topic = sheets.parseTopic(TOPIC.replace('| `--port` | 30000 | HTTP port |', '| `--port` | 30000 毫秒 | HTTP 端口 |'));
  assert.deepEqual(sheets.checkTopic(topic, grounded), []);
  const thin = fixtureRoot('Run serve --port 8080 --enable-metrics. GET /health.');
  assert.match(sheets.checkTopic(topic, thin).join('\n'), /"30000" is not in its from files/);
});

// Segment/rectangle clipping is independent of the renderer's pathfinder.
// Insets ignore sub-pixel rounding at a box border, not interior crossings.
function crossesNode(start, end, box) {
  let enter = 0, leave = 1;
  for (const [position, delta, low, high] of [
    [start[0], end[0] - start[0], box.x + 0.5, box.x + box.width - 0.5],
    [start[1], end[1] - start[1], box.y + 0.5, box.y + box.height - 0.5],
  ]) {
    if (delta === 0) { if (position < low || position > high) return false; }
    else {
      const bounds = [(low - position) / delta, (high - position) / delta].sort((a, b) => a - b);
      enter = Math.max(enter, bounds[0]);
      leave = Math.min(leave, bounds[1]);
      if (enter > leave) return false;
    }
  }
  return leave > 0 && enter < 1;
}

function assertArchitectureRoutes(block, narrow, name) {
  const svg = sheets.architectureSvg(block, narrow);
  const [, width, height] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg).map(Number);
  const nodes = [...svg.matchAll(/<rect class="cs-arch-node" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)]
    .map((match, i) => ({ id: block.nodes[i].id, x: +match[1], y: +match[2], width: +match[3], height: +match[4] }));
  const edges = [...svg.matchAll(/<polyline class="cs-arch-edge" data-from="([^"]+)" data-to="([^"]+)" points="([^"]+)"/g)];
  assert.equal(nodes.length, block.nodes.length);
  assert.equal(edges.length, block.edges.length);
  for (const [index, line] of edges.entries()) {
    const edge = block.edges[index];
    assert.equal(line[1], edge.from);
    assert.equal(line[2], edge.to);
    const points = line[3].split(' ').map(point => point.split(',').map(Number));
    assert.ok(points.length >= 2);
    for (const [x, y] of points) assert.ok(Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= width && y >= 0 && y <= height,
      `${name}: connector point ${x},${y} outside viewBox`);
    for (const [point, id] of [[points[0], edge.from], [points.at(-1), edge.to]]) {
      const box = nodes.find(node => node.id === id);
      const [x, y] = point;
      const atVerticalSide = Math.min(Math.abs(x - box.x), Math.abs(x - box.x - box.width)) <= 0.2 && y >= box.y - 0.2 && y <= box.y + box.height + 0.2;
      const atHorizontalSide = Math.min(Math.abs(y - box.y), Math.abs(y - box.y - box.height)) <= 0.2 && x >= box.x - 0.2 && x <= box.x + box.width + 0.2;
      assert.ok(atVerticalSide || atHorizontalSide, `${name}: ${id} endpoint is not on its node border`);
    }
    for (let i = 1; i < points.length; i++) for (const node of nodes) {
      assert.equal(crossesNode(points[i - 1], points[i], node), false,
        `${name} ${narrow ? 'narrow' : 'wide'}: ${edge.from} -> ${edge.to} segment ${i} crosses ${node.id}`);
    }
  }
  return edges;
}

test('architecture connectors avoid unrelated nodes in both poster orientations', () => {
  let checked = 0;
  for (const topic of sheets.loadTopics(root)) for (const block of topic.blocks.filter(block => block.type === 'architecture')) {
    for (const narrow of [false, true]) {
      assertArchitectureRoutes(block, narrow, topic.id);
      checked++;
    }
  }
  assert.ok(checked >= 50, 'expected both orientations of all architecture diagrams');
});

test('architecture routes detour around horizontal, vertical and diagonal blockers', () => {
  for (const [name, coordinates] of [
    ['horizontal', [[1, 1], [3, 1], [2, 1]]],
    ['vertical', [[1, 1], [1, 3], [1, 2]]],
    ['diagonal', [[1, 1], [3, 3], [2, 2]]],
    ['multiple', [[1, 2], [4, 2], [2, 2], [3, 2], [2, 1], [3, 3]]],
  ]) {
    const block = {
      id: name, title: '中文架构与较长标签', span: 2,
      nodes: coordinates.map(([col, row], i) => ({ id: `n${i}`, col, row, label: '中文节点', sub: '多行说明文字' })),
      edges: [{ from: 'n0', to: 'n1', label: '往返请求' }, { from: 'n1', to: 'n0', label: '返回结果' }],
    };
    for (const narrow of [false, true]) for (const edge of assertArchitectureRoutes(block, narrow, name)) {
      assert.ok(edge[3].split(' ').length > 2, `${name}: blocked connector needs a detour`);
    }
  }
});

test('architecture self-loops leave and return on different node faces', () => {
  const block = {
    id: 'self-loop', title: '重试循环', span: 2,
    nodes: [{ id: 'worker', col: 1, row: 1, label: 'worker', sub: '重试请求' }],
    edges: [{ from: 'worker', to: 'worker', label: 'retry' }],
  };
  for (const narrow of [false, true]) assertArchitectureRoutes(block, narrow, block.id);
});

test('search retains API names, status codes and terms from omitted table columns', () => {
  const index = JSON.parse(sheets.buildCheatsheets({ edition: '2026-01-01' }).search);
  const rows = index.flatMap(topic => topic.r.map(row => (row[0] + ' ' + row[1] + ' ' + (row[3] || '') + ' ' + topic.t).toLowerCase()));
  for (const query of ['CreateTaskPushNotificationConfig', 'FAILED_PRECONDITION', 'INVALID_ARGUMENT', 'AlphaZero']) {
    assert.ok(rows.some(text => text.includes(query.toLowerCase())), `missing searchable term: ${query}`);
  }
});
