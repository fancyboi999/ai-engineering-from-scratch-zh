'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const MDRender = require('../site/md-render');
const { readLessonMarkdown } = require('../site/lesson-markdown');
const root = path.join(__dirname, '..');

function contentSource(local = true) {
  const window = { location: { hostname: local ? 'localhost' : 'aieng-zh.cn', pathname: '/site/lesson.html', href: 'http://localhost/site/lesson.html' } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'site/content-source.js'), 'utf8'), { window, URL });
  return window.AIFSContentSource;
}

function sourceFixture(t, lessonPath = 'phases/01-math/01-vectors') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aieng-reader-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, lessonPath, 'docs/zh.md');
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, '# 中文正文\n\n> 保持源文件的字节与语义。\n');
  return { directory, filename, lessonPath, manifest: { lessons: { [lessonPath]: { path: lessonPath } } } };
}

test('lesson-markdown delegates to the sole Node and browser MDRender implementation', () => {
  assert.equal(require('../site/lesson-markdown').parseMd, MDRender.parseMd);
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'site/md-render.js'), 'utf8'), { window });
  const markdown = '# 中文课\n\n> 一句话摘要。\n\n## 核心概念\n\n`x_t = W x` 与中文标点。\n\n## 动手构建\n\n```python\nprint("中文 & <标签>")\n```\n\n| 术语 | 含义 |\n| --- | --- |\n| 向量 | 方向与长度 |\n';
  assert.equal(window.MDRender.parseMd(markdown), MDRender.parseMd(markdown));
  assert.match(MDRender.parseMd(markdown), /核心概念<\/h2>/);
  assert.match(MDRender.parseMd(markdown), /动手构建<\/h2>/);
  assert.match(MDRender.parseMd(markdown), /复制<\/button>/);
});

test('MDRender restores nested syntax tokens without changing quoted URLs, fragments or comments', () => {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'site/md-render.js'), 'utf8'), { window });
  const cases = [
    ['json', '{"uri":"file:///workspace","name":"Workspace"}'],
    ['javascript', 'const uri = "https://example.test/path"; // keep this comment\nconst next = "https://example.test/other";'],
    ['python', 'value = "prefix#fragment"\nother = "second#fragment" # explanation'],
    ['json', '{"value":"<script>alert(1)</script> & <img src=x onerror=alert(2)>","uri":"file:///workspace"}'],
  ];
  for (const [lang, code] of cases) {
    const html = MDRender.renderCodeBlock(code, lang);
    const inner = html.match(/<code>([\s\S]*?)<\/code>/)[1];
    const text = inner.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    assert.equal(text, code, lang);
    assert.doesNotMatch(inner, /\x00TOK\d+\x00/);
    assert.doesNotMatch(inner, /<script\b|<img\b/);
    assert.equal(window.MDRender.renderCodeBlock(code, lang), html);
    assert.ok(html.includes('data-code="' + MDRender.escapeAttr(code) + '"'), 'copy payload stays original');
  }
});

test('MDRender displays the real MCP continuation JSON byte-for-byte and keeps it parseable', () => {
  const source = fs.readFileSync(path.join(root, 'certifications/claude/lessons/11-mcp-server-design-and-integration/docs/zh.md'), 'utf8');
  const code = [...source.matchAll(/```json\n([\s\S]*?)```/g)].find(match => match[1].includes('"uri": "file:///workspace"'))[1].replace(/\n$/, '');
  const expected = JSON.parse(code);
  const html = MDRender.parseMd('```json\n' + code + '\n```');
  const text = html.match(/<code>([\s\S]*?)<\/code>/)[1].replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  assert.equal(text, code);
  assert.deepEqual(JSON.parse(text), expected);
  assert.equal(expected.params.inputResponses.workspace_scope.roots[0].uri, 'file:///workspace');
});

test('SourceBoundary reads only exact manifest members in the core and both published certification programs', t => {
  for (const lessonPath of ['phases/01-math/01-vectors', 'certifications/claude/lessons/01-models', 'certifications/mcpa/lessons/01-discovery']) {
    const fixture = sourceFixture(t, lessonPath);
    assert.equal(readLessonMarkdown(fixture.directory, lessonPath, fixture.manifest), fs.readFileSync(fixture.filename, 'utf8'));
    assert.throws(() => readLessonMarkdown(fixture.directory, lessonPath, { lessons: {} }), /SourceBoundary/);
    fixture.manifest.lessons[lessonPath].path = 'phases/other/lesson';
    assert.throws(() => readLessonMarkdown(fixture.directory, lessonPath, fixture.manifest), /SourceBoundary/);
  }
});

test('SourceBoundary rejects traversal, unknown programs, encoded and malformed namespaces even when listed', t => {
  const fixture = sourceFixture(t);
  for (const lessonPath of ['../README', 'phases/a/../b', 'phases/a/b%2f..', 'phases/a/b\\c', '/phases/a/b', 'phases//a/b', 'certifications/unknown/lessons/01-test', 'certifications/mcpa/assessments/exam', 'phases/a/b\0']) {
    assert.throws(() => readLessonMarkdown(fixture.directory, lessonPath, { lessons: { [lessonPath]: { path: lessonPath } } }), /SourceBoundary/, lessonPath);
  }
});

test('SourceBoundary rejects every symlink component including in-root links and direct Markdown links', t => {
  for (const component of ['phases', 'phases/01-math', 'phases/01-math/01-vectors', 'phases/01-math/01-vectors/docs', 'phases/01-math/01-vectors/docs/zh.md']) {
    const fixture = sourceFixture(t);
    const original = path.join(fixture.directory, component);
    const destination = path.join(fixture.directory, 'shared');
    fs.renameSync(original, destination);
    fs.symlinkSync(destination, original);
    assert.throws(() => readLessonMarkdown(fixture.directory, fixture.lessonPath, fixture.manifest), /SourceBoundary: symlink/, component);
  }
});

test('SourceBoundary rejects a direct symlink swap at open and closes the descriptor', t => {
  const fixture = sourceFixture(t);
  const victim = path.join(fixture.directory, 'outside.md');
  fs.writeFileSync(victim, 'private');
  const open = fs.openSync;
  const close = fs.closeSync;
  let closed = 0;
  fs.openSync = function (filename, flags) {
    if (filename === fixture.filename) {
      fs.unlinkSync(filename);
      fs.symlinkSync(victim, filename);
      // Simulate a platform without effective O_NOFOLLOW: the post-open check must still fail.
      return open(filename, fs.constants.O_RDONLY);
    }
    return open(filename, flags);
  };
  fs.closeSync = function (fd) { closed++; return close(fd); };
  try {
    assert.throws(() => readLessonMarkdown(fixture.directory, fixture.lessonPath, fixture.manifest), /SourceBoundary/);
    assert.equal(closed, 1);
  } finally {
    fs.openSync = open;
    fs.closeSync = close;
  }
});

test('content-source accepts only the published Claude and MCPA lesson/assessment trees', () => {
  for (const local of [true, false]) {
    const source = contentSource(local);
    for (const program of ['claude', 'mcpa']) {
      assert.ok(fs.existsSync(path.join(root, 'certifications', program, 'program.json')));
      for (const suffix of ['lessons/01-models/docs/zh.md', 'lessons/01-models/quiz.json', 'assessments/exam/mock.json']) {
        assert.match(source.repoUrl(`certifications/${program}/${suffix}`), local ? /^\.\.\/certifications\// : /^https:\/\/raw\.githubusercontent\.com\/fancyboi999\//);
      }
    }
    for (const value of ['certifications/unknown/lessons/a/docs/zh.md', 'certifications/mcpa/program.json', 'certifications/mcpa/lessons/../program.json', 'certifications/mcpa/lessons/a/%2e%2e/secret', 'certifications/mcpa/lessons/a\\docs/zh.md', 'phases/a/b/../README.md', 'phases/a/b/docs/zh.md?raw=1']) {
      assert.throws(() => source.repoUrl(value), /Invalid repository|outside the allowed/, value);
    }
  }
});

test('deployed readers reuse matching Chinese embedded Markdown, but local previews fetch current source', () => {
  const source = fs.readFileSync(path.join(root, 'site/lesson.html'), 'utf8');
  const functions = source.slice(source.indexOf('      function readEmbeddedLesson()'), source.indexOf('      function fetchLesson(path, retried)'));
  const lessonPath = 'phases/01-math/01-vectors';
  const node = { textContent: JSON.stringify({ path: lessonPath, lang: 'zh', markdown: '# 嵌入课程' }) };
  const context = { document: { getElementById: () => node }, window: { AIFSContentSource: { isLocal: () => false } } };
  vm.runInNewContext(functions + '\nvar embeddedLesson = readEmbeddedLesson();', context);
  assert.equal(context.embeddedLessonMarkdown(lessonPath), '# 嵌入课程');
  assert.equal(context.embeddedLessonMarkdown('phases/other/lesson'), null);
  context.embeddedLesson.lang = 'en';
  assert.equal(context.embeddedLessonMarkdown(lessonPath), null);
  context.embeddedLesson.lang = 'zh';
  context.window.AIFSContentSource.isLocal = () => true;
  assert.equal(context.embeddedLessonMarkdown(lessonPath), null);
  node.textContent = 'not-json';
  assert.equal(context.readEmbeddedLesson(), null);
});

test('lesson inline scripts remain syntactically valid and keep protected reader and quiz hooks', () => {
  const source = fs.readFileSync(path.join(root, 'site/lesson.html'), 'utf8');
  const rendererSource = fs.readFileSync(path.join(root, 'site/md-render.js'), 'utf8');
  for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=|type="module"/.test(match[1])) continue;
    new vm.Script(match[2]);
  }
  assert.match(source, /window\.__PRERENDERED__/);
  assert.match(source, /function enhanceLesson\(/);
  assert.match(source, /function lessonHref\(/);
  assert.match(source, /function lessonSectionHeadings\(article\)/);
  assert.match(source, /MDRender\.quizPlacement\(headingInfo\)/);
  assert.match(rendererSource, /function quizPlacement\(headings\)/);
  assert.match(rendererSource, /firstHeading\(headings, \['核心概念', 'the concept'\]\)/);
  assert.match(source, /buildQuizHtml\(pre, 'pre', '课前检测'\)/);
  assert.match(source, /buildQuizHtml\(check, 'check', '课中检测'\)/);
  assert.match(source, /buildQuizHtml\(post, 'post', '课后测验'\)/);
  assert.match(source, /_vercel\/insights\/script\.js/);
  assert.doesNotMatch(source, /function parseMd\(/);
  assert.match(source, /var parseMd = MDRender\.parseMd/);
  assert.doesNotMatch(source, /set\('meta\[property="og:image"\]', ORIGIN \+ '\/og-image/);
});

test('MDRender ordered lists retain blank-separated items and the initial native start', () => {
  assert.equal(MDRender.parseMd('1. 甲\n\n2. 乙\n\n3. 丙'), '<ol><li>甲</li><li>乙</li><li>丙</li></ol>');
  assert.equal(MDRender.parseMd('1. 甲\n1. 乙\n1. 丙'), '<ol><li>甲</li><li>乙</li><li>丙</li></ol>');
  assert.equal(MDRender.parseMd('3. 甲\n\n7. 乙\n\n1. 丙'), '<ol start="3" style="--ol-start: 2"><li>甲</li><li>乙</li><li>丙</li></ol>');
  assert.equal(MDRender.parseMd('0. 甲\n2. 乙'), '<ol start="0" style="--ol-start: -1"><li>甲</li><li>乙</li></ol>');
});

test('MDRender ordered lists cannot continue across prose, headings, UL, code or blockquotes', () => {
  for (const boundary of ['普通段落', '## 新列表', '- 无序项', '```python\nprint("3. not a list")\n```', '> 引用', '---', '| 键 | 值 |\n| --- | --- |\n| a | b |']) {
    const html = MDRender.parseMd('3. 甲\n\n' + boundary + '\n\n1. 乙');
    assert.equal((html.match(/<ol\b/g) || []).length, 2, boundary);
    assert.ok(html.startsWith('<ol start="3" style="--ol-start: 2"><li>甲</li></ol>'), boundary);
    assert.ok(html.endsWith('<ol><li>乙</li></ol>'), boundary);
  }
  assert.equal(MDRender.parseMd('- 甲\n- 乙'), '<ul><li>甲</li><li>乙</li></ul>');
  assert.equal(MDRender.parseMd('- 甲\n\n- 乙'), '<ul><li>甲</li></ul><ul><li>乙</li></ul>', 'existing blank-separated UL behavior is unchanged');
});

test('MDRender real open-weight-vlm-recipes exercises form one five-item list and keep escaping/code/paths', () => {
  const markdown = fs.readFileSync(path.join(root, 'phases/12-multimodal-ai/07-open-weight-vlm-recipes/docs/zh.md'), 'utf8');
  const exercises = markdown.split('## 练习')[1].split('## 关键术语')[0];
  const html = MDRender.parseMd(exercises);
  assert.equal((html.match(/<ol\b/g) || []).length, 1);
  assert.equal((html.match(/<li>/g) || []).length, 5);
  assert.match(html, /MM1 第 3\.2 节/);
  assert.match(html, /设计一张消融表/);
  const escaped = MDRender.parseMd('3. & <标记> `phases/a/code/main.py`\n\n4. **中文**');
  assert.match(escaped, /&amp; &lt;标记&gt;/);
  assert.match(escaped, /<code>phases\/a\/code\/main\.py<\/code>/);
  assert.match(escaped, /<strong>中文<\/strong>/);
  const code = MDRender.parseMd('```python\nprint("1. & <tag>")\n```');
  assert.match(code, /data-code="print\(&quot;1\. &amp; &lt;tag&gt;&quot;\)"/);
  assert.doesNotMatch(code, /<ol\b/);
  const source = fs.readFileSync(path.join(root, 'site/lesson.html'), 'utf8');
  assert.match(source, /\.lesson-article ol\s*\{[^}]*counter-reset:\s*ol-counter var\(--ol-start,\s*0\)/);
});

test('Mermaid HTML labels keep the measured CJK font and line height instead of article prose styles', () => {
  const source = fs.readFileSync(path.join(root, 'site/lesson.html'), 'utf8');
  const labels = source.match(/\.lesson-article \.mermaid-render foreignObject p,\s*\.lesson-article \.mermaid-render foreignObject span,\s*\.mermaid-modal-body foreignObject p,\s*\.mermaid-modal-body foreignObject span\s*\{([^{}]*)\}/);
  assert.ok(labels, 'label rules must outrank article prose, not be wrapped in zero-specificity :where');
  assert.match(labels[1], /font-size:\s*13px\s*;/);
  assert.match(labels[1], /line-height:\s*1\.5\s*;/);
  assert.match(labels[1], /margin:\s*0\s*;/);
  assert.match(labels[1], /text-align:\s*center\s*;/);
  const cjkFont = '"JetBrains Mono", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif';
  assert.ok(labels[1].includes('font-family: ' + cjkFont));
  assert.equal(source.split("fontFamily: '" + cjkFont + "'").length - 1, 3, 'initial, lazy and theme Mermaid renders must measure with the same CJK font');
});

test('lesson reader typography can shrink on narrow CJK viewports without changing desktop sizes', () => {
  const source = fs.readFileSync(path.join(root, 'site/lesson.html'), 'utf8');
  assert.match(source, /font-size: clamp\(min\(2rem, 10vw\), 5vw, 3rem\)/);
  assert.match(source, /font-size: clamp\(min\(1\.5rem, 7\.5vw\), 3vw, 1\.9rem\)/);
  assert.match(source, /\.lesson-article h1 \{ font-size: min\(12vw, 2\.55rem\); \}/);
});

test('real local HTTP lesson route negotiates Chinese source and preserves legacy recovery and HEAD', async t => {
  const http = require('node:http');
  const { once } = require('node:events');
  const lessonPath = 'phases/01-math/01-vectors';
  const markdown = '# 向量\n\n> 方向与长度。\n\n## 核心概念\n\n中文完整正文。\n';
  const entry = { path: lessonPath, title: '向量', context: { kind: 'course', phaseId: 1, phaseName: '数学' } };
  const handler = require('../api/lesson').createHandler({ loadAssets: () => ({
    template: fs.readFileSync(path.join(root, 'site/lesson.html'), 'utf8'),
    manifest: { lessons: { [lessonPath]: entry } }, readMarkdown: () => markdown,
  }) });
  const server = http.createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const route = `${base}/lesson?path=${encodeURIComponent(lessonPath)}`;
  for (const accept of ['text/html', 'text/markdown']) {
    const get = await fetch(route, { headers: { Accept: accept } });
    assert.equal(get.status, 200);
    assert.equal(get.headers.get('vary'), 'Accept, Accept-Encoding');
    const text = await get.text();
    if (accept === 'text/markdown') assert.equal(text, markdown);
    else assert.match(text, /中文完整正文。/);
    const head = await fetch(route, { method: 'HEAD', headers: { Accept: accept } });
    assert.equal(head.status, get.status);
    for (const header of ['content-type', 'content-length', 'content-language', 'cache-control', 'vary']) {
      assert.equal(head.headers.get(header), get.headers.get(header));
    }
    assert.equal(await head.text(), '');
    assert.equal(Number(head.headers.get('content-length')), Buffer.byteLength(text));
  }
  const legacy = await fetch(route + '&legacy=1', { redirect: 'manual', headers: { Accept: 'text/markdown' } });
  assert.equal(legacy.status, 308);
  assert.equal(legacy.headers.get('location'), `/lesson?path=${encodeURIComponent(lessonPath)}`);
  const missing = await fetch(`${base}/lesson?path=phases%2Fmath%2Fmissing`, { headers: { Accept: 'text/markdown' } });
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get('cache-control'), 'no-store');
  assert.match(await missing.text(), /\/llms\.txt/);
});

test('Mermaid reader preserves natural label scale in a keyboard-scrollable region, including the modal', () => {
  const source = fs.readFileSync(path.join(root, 'site/lesson.html'), 'utf8');
  const fn = source.split('function fixMermaidClusterLabels(root) {')[1].split('function rerenderMermaidBlocks()')[0];
  const svg = { style: {}, viewBox: { baseVal: { width: 552 } } };
  const attrs = {};
  const target = { querySelector: () => svg, querySelectorAll: () => [], setAttribute: (key, value) => { attrs[key] = value; } };
  vm.runInNewContext('function fixMermaidClusterLabels(root) {' + fn + '; fixMermaidClusterLabels(target)', { target });
  assert.equal(svg.style.width, '552px');
  assert.equal(svg.style.maxWidth, 'none');
  assert.equal(attrs.tabindex, '0');
  assert.equal(attrs.role, 'region');
  assert.match(attrs['aria-label'], /方向键/);
  const modalAttrs = {};
  const centerAttrs = {};
  const modalTarget = { ...target, id: 'mermaidModalCenter', parentElement: { setAttribute: (key, value) => { modalAttrs[key] = value; } }, setAttribute: (key, value) => { centerAttrs[key] = value; } };
  vm.runInNewContext('function fixMermaidClusterLabels(root) {' + fn + '; fixMermaidClusterLabels(target)', { target: modalTarget });
  assert.equal(modalAttrs.tabindex, '0', 'modal keyboard target must own the overflow, not its natural-width content');
  assert.equal(modalAttrs.role, 'region');
  assert.deepEqual(centerAttrs, {});
  assert.match(source, /\.mermaid-modal-center\s*\{[^}]*min-width:\s*100%;[^}]*width:\s*max-content;/);
  assert.match(source, /\.lesson-figure \.lf-readable-viewport\s*\{[^}]*overflow-x:\s*auto;/);
  assert.match(source, /\.lesson-figure \.lf-readable-viewport svg\s*\{[^}]*max-width:\s*none;/);
});
