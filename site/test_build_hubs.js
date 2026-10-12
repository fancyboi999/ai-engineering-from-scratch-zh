'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { buildHubs, writeHubs } = require('./build-hubs');
const routes = require('../lib/hub-routes');
const { checkHubs } = require('../scripts/check_hubs');

const lessonPath = 'phases/01-math-foundations/01-vectors';
const canonical = 'https://aieng-zh.cn/lessons/01-math-foundations/01-vectors/';
const explanation = '反向传播沿计算图反向计算梯度，把输出误差传到每个参数。它让神经网络能够根据损失更新权重，不必手工为每一层推导和实现导数。实际训练中还需要正确管理计算图和梯度累积。';

function term(overrides = {}) {
  return {
    term: 'Backpropagation', slug: 'backpropagation', category: '数学与训练',
    means: explanation, whyItMatters: '用梯度更新模型参数。', example: '训练前清零梯度。',
    confusion: '', whyCalled: '', says: '让网络从误差中学习。',
    aliases: ['反向传播'], related: [], lessons: [{ label: '课程', url: `../${lessonPath}/` }], sources: [],
    ...overrides,
  };
}

function options(root) {
  return {
    phases: [{ id: 1, name: '数学基础', desc: '从数学理解模型。', lessons: [{
      name: '向量与反向传播', url: `https://github.com/fancyboi999/ai-engineering-from-scratch-zh/tree/main/${lessonPath}/`,
      type: 'Build', lang: 'Python', keywords: '理解反向传播',
    }] }],
    prerequisites: { 1: [] }, glossary: [term()], categories: ['数学与训练'], minutes: { [lessonPath]: 45 },
    lessonManifest: { lessons: { [lessonPath]: {
      title: '向量与反向传播', canonicalUrl: canonical, context: { kind: 'course' }, excerpt: '沿计算图计算梯度。',
    } } }, root,
  };
}

function temporaryDirectory(t) {
  const root = fs.mkdtempSync(path.join('/tmp', 'test-build-hubs-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('hub-routes: 保留阶段目录 ID、术语 slug 与既有课程路径', () => {
  assert.equal(routes.phaseSlug('01-math-foundations'), 'math-foundations');
  assert.equal(routes.phasePath('math-foundations'), '/phase/math-foundations');
  assert.equal(routes.phaseHubPath(lessonPath), '/phase/math-foundations');
  assert.equal(routes.phaseHubPath('certifications/claude/lessons/00-strategy'), '');
  assert.equal(routes.phaseLabel(1, '数学基础'), '阶段 01：数学基础');
  assert.equal(routes.termPath('backpropagation'), '/glossary/backpropagation');
  assert.equal(routes.glossaryLookupKey('  Émbedding  模型 '), 'embedding 模型');
  for (const slug of ['', '../escape', 'A', 'a/b', 'a?b', 'a--b']) {
    assert.throws(() => routes.termPath(slug), /无效的 Hub slug/);
    assert.throws(() => routes.phasePath(slug), /无效的 Hub slug/);
  }
});

test('build-hubs: 中文正文、导航、FAQ、JSON-LD 和 canonical', t => {
  const hubs = buildHubs(options(temporaryDirectory(t)));
  assert.equal(hubs.phasePages.length, 1);
  assert.equal(hubs.termPages.length, 1);
  const phase = hubs.phasePages[0];
  assert.equal(phase.href, '/phase/math-foundations');
  assert(phase.html.includes(`href="${canonical.replace('https://aieng-zh.cn', '')}"`));
  assert.match(phase.html, /1 节构建课/);
  assert.match(phase.html, /约 45 分钟/);
  assert.match(phase.html, /<html lang="zh-CN"/);
  assert(!/Free Lesson|Frequently asked|Sponsors|vercel-scripts/.test(phase.html));
  const termPage = hubs.termPages[0];
  assert.match(termPage.html, /什么是 Backpropagation？/);
  assert.match(termPage.html, /category=%E6%95%B0%E5%AD%A6%E4%B8%8E%E8%AE%AD%E7%BB%83/);
  assert(termPage.html.includes(explanation));
  assert.match(termPage.markdown, /## 课程/);
  assert.match(hubs.glossaryJsonLd, /"inLanguage":"zh-CN"/);
  assert.match(hubs.glossaryIndex, /href="\/glossary\/backpropagation"/);
  assert.deepEqual(hubs.lessonTerms[lessonPath], [{ term: 'Backpropagation', href: '/glossary/backpropagation' }]);
});

test('build-hubs: 读取中文阶段 README 的起始课、前置要求、命令和记录', t => {
  const root = temporaryDirectory(t);
  const directory = path.join(root, 'phases/01-math-foundations');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'README.md'), '# 阶段 1：数学基础\n\n> 从向量开始。\n\n正文介绍。\n\n## 在 GitHub 上开始本阶段\n\n**前置要求：** Python 基础。\n\n**第一课：** [向量](01-vectors/)\n\n```bash\npython3 phases/01-math-foundations/01-vectors/code/main.py\n```\n\n记录命令和退出码。\n');
  const hubs = buildHubs(options(root));
  const guide = hubs.phaseModels[0].guide;
  assert.equal(guide.lede, '从向量开始。');
  assert.deepEqual(guide.intro, ['正文介绍。']);
  assert.equal(guide.prerequisites, 'Python 基础。');
  assert.equal(guide.start.lesson.path, lessonPath);
  assert.equal(guide.record, '记录命令和退出码。');
  assert(hubs.phasePages[0].html.includes(guide.command));
  assert.match(hubs.phasePages[0].markdown, /```bash/);
  fs.writeFileSync(path.join(directory, 'README.md'), '## 开始本阶段\n\n**第一课：** [丢失](99-missing/)\n');
  assert.throws(() => buildHubs(options(root)), /起始课程不存在/);
});

test('build-hubs: CJK 长条目通过，定义-only 与短条目保留原锚点', t => {
  const input = options(temporaryDirectory(t));
  input.glossary = [term(), term({ term: 'Short', slug: 'short', means: '例'.repeat(68), example: '例', whyItMatters: '' }),
    term({ term: 'Definition', slug: 'definition', example: '', whyItMatters: '' })];
  let hubs = buildHubs(input);
  assert.equal(hubs.termPages.length, 1);
  assert.equal(hubs.skipped.length, 2);
  assert.match(hubs.skipped[0].reason, /69 单位/);
  assert.equal(hubs.termModels[1].href, '/glossary#short');
  assert.match(hubs.glossaryIndex, /href="#short"/);
  input.glossary[1].means += '例';
  hubs = buildHubs(input);
  assert.equal(hubs.termPages.length, 2);
  input.glossary[1].means = Array(34).fill('word').join(' ');
  input.glossary[1].example = 'example';
  assert.equal(buildHubs(input).termPages.length, 2);
});

test('build-hubs: 中文别名发现标题和章节，ASCII 名称不误匹配词内字符', t => {
  const input = options(temporaryDirectory(t));
  input.glossary = [term({ lessons: [] }), term({ term: 'Vector', slug: 'vector', aliases: [], lessons: [] })];
  input.lessonManifest.lessons[lessonPath].title = '反向传播与 Vectorized 运算';
  const hubs = buildHubs(input);
  assert.equal(hubs.termModels[0].titled.length, 1);
  assert.equal(hubs.termModels[1].titled.length, 0);
});

test('build-hubs: 缺少引用、重复 slug 和保护 canonical 覆盖均 fail-loud', t => {
  const root = temporaryDirectory(t);
  let input = options(root);
  input.glossary[0].related = ['Missing'];
  assert.throws(() => buildHubs(input), /不存在的相关术语/);
  input = options(root);
  input.glossary[0].lessons = [{ url: '../phases/01-math-foundations/99-missing/' }];
  assert.throws(() => buildHubs(input), /不存在的课程/);
  input = options(root);
  delete input.lessonManifest.lessons[lessonPath];
  assert.throws(() => buildHubs(input), /缺少 SEO 条目/);
  input = options(root);
  input.lessonManifest.lessons[lessonPath].canonicalUrl = 'https://aiengineeringfromscratch.com/lesson.html';
  assert.throws(() => buildHubs(input), /canonical 不匹配/);
  input = options(root);
  input.prerequisites[1] = [99];
  assert.throws(() => buildHubs(input), /不存在的前置阶段/);
  input = options(root);
  input.glossary.push(term({ term: 'Other' }));
  assert.throws(() => buildHubs(input), /slug 重复/);
  input = options(root);
  input.glossary[0].slug = '../escape';
  assert.throws(() => buildHubs(input), /无效的 Hub slug/);
});

test('build-hubs: HTML/JSON-LD 转义，支持注入资产版本函数', t => {
  const input = options(temporaryDirectory(t));
  input.glossary[0].means += '</script><script>alert(1)</script>';
  let calls = 0;
  input.versionHtml = html => { calls++; return html.replace('/hubs.css', '/hubs.css?v=test'); };
  const hubs = buildHubs(input);
  assert.equal(calls, 2);
  assert.match(hubs.termPages[0].html, /&lt;script&gt;/);
  const graph = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(hubs.termPages[0].html)[1]);
  assert.equal(graph['@graph'][0].description, input.glossary[0].means);
  assert.match(hubs.phasePages[0].html, /hubs\.css\?v=test/);
});

test('write-hubs: 只写指定生成目录，清理过期页面，不改源文件', t => {
  const root = temporaryDirectory(t);
  const output = path.join(root, 'output');
  fs.mkdirSync(path.join(output, 'hubs/phase'), { recursive: true });
  fs.writeFileSync(path.join(output, 'hubs/phase/stale.html'), 'stale');
  fs.writeFileSync(path.join(output, 'hubs/phase/keep.txt'), 'keep');
  const input = options(root);
  const before = JSON.stringify(input);
  const hubs = writeHubs(input, output);
  assert.equal(JSON.stringify(input), before);
  assert(!fs.existsSync(path.join(output, 'hubs/phase/stale.html')));
  assert.equal(fs.readFileSync(path.join(output, 'hubs/phase/keep.txt'), 'utf8'), 'keep');
  assert.equal(fs.readFileSync(path.join(output, 'hubs/glossary/backpropagation.html'), 'utf8'), hubs.termPages[0].html);
  assert.equal(fs.readFileSync(path.join(output, 'agent-pages/phase/math-foundations.md'), 'utf8'), hubs.phasePages[0].markdown);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, 'lesson-terms.json'), 'utf8')).lessons, hubs.lessonTerms);
});

test('build-hubs: 真实中文源全量生成与模板检查（隔离 /tmp）', () => {
  const { hubs } = checkHubs();
  assert.equal(hubs.phasePages.length, 20);
});
