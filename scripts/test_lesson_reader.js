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
  for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=|type="module"/.test(match[1])) continue;
    new vm.Script(match[2]);
  }
  assert.match(source, /window\.__PRERENDERED__/);
  assert.match(source, /function enhanceLesson\(/);
  assert.match(source, /function lessonHref\(/);
  assert.match(source, /function findH2\(selectors, zhTexts\)/);
  assert.match(source, /\['动手构建', '构建', 'Build It'\]/);
  assert.match(source, /_vercel\/insights\/script\.js/);
  assert.doesNotMatch(source, /function parseMd\(/);
  assert.match(source, /var parseMd = MDRender\.parseMd/);
  assert.doesNotMatch(source, /set\('meta\[property="og:image"\]', ORIGIN \+ '\/og-image/);
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
