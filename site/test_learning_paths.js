const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const homepage = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const learningPaths = fs.readFileSync(path.join(__dirname, 'learning-paths.html'), 'utf8');
const learningPathsCss = fs.readFileSync(path.join(__dirname, 'learning-paths.css'), 'utf8');
const learningPathsJs = fs.readFileSync(path.join(__dirname, 'learning-paths.js'), 'utf8');

const domains = [
  { id: 'building-and-deploying', title: '构建与部署 AI 应用', children: 6 },
  { id: 'software-fundamentals', title: '软件工程基础', children: 5 },
  { id: 'coding-agents', title: 'Agent 辅助工程', children: 8 },
  { id: 'shaping-the-build', title: '产品判断与交付', children: 8 },
];

const expectedCareerTitles = new Map([
  ['forward-deployed-ai-engineer', '客户 AI 部署'],
  ['ai-developer-relations-engineer', '开发者体验与教育'],
  ['ai-data-engineer', 'AI 数据系统'],
  ['agentic-ai-engineer', 'Agent 系统工程'],
  ['applied-ai-engineer', 'LLM 产品工程'],
  ['ai-evaluation-reliability-engineer', 'AI 评估与可靠性'],
]);

const careerRoutes = Array.from(expectedCareerTitles, ([id, title]) => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'learning-paths', `${id}.json`), 'utf8'));
  return { id, title, manifest };
});

function sectionSource(id) {
  const start = learningPaths.indexOf(`<section class="skills-domain learning-paths-container" id="${id}"`);
  assert.notEqual(start, -1, `${id} section is missing`);
  const end = learningPaths.indexOf('</section>', start);
  assert.notEqual(end, -1, `${id} section is not closed`);
  return learningPaths.slice(start, end);
}

function careerSectionSource() {
  const start = learningPaths.indexOf('<section class="career-routes learning-paths-container" id="career-routes"');
  assert.notEqual(start, -1, 'career routes section is missing');
  const end = learningPaths.indexOf('<section class="skills-domain learning-paths-container"', start);
  assert.notEqual(end, -1, 'career routes section is not closed before the domain sections');
  return learningPaths.slice(start, end);
}

test('homepage nodes open the expanded learning paths domains', () => {
  assert.match(homepage, /href="learning-paths\.html"[\s\S]*?>\s*<span>查看学习路径<\/span>/);
  assert.match(homepage, /href="learning-paths\.html#career-routes">浏览职业路线<\/a>/);
  assert.match(homepage, /<figcaption class="learning-paths-compact-root">\s*<strong>AI 工程<\/strong>\s*<span>4 个相连领域<\/span>\s*<\/figcaption>/);
  assert.match(homepage, /@media \(max-width: 600px\)[\s\S]*?\.learning-paths-figure\s*\{[\s\S]*?display: grid;[\s\S]*?gap: 8px;[\s\S]*?padding: 12px;/);
  assert.match(homepage, /@media \(max-width: 600px\)[\s\S]*?\.learning-paths-figure picture\s*\{\s*display: none;\s*\}/);
  assert.match(homepage, /@media \(max-width: 600px\)[\s\S]*?\.learning-paths-node\s*\{[\s\S]*?position: relative;[\s\S]*?min-height: 48px;/);
  assert.match(homepage, /@media \(max-width: 600px\)[\s\S]*?\.learning-paths-node-label\s*\{[\s\S]*?position: static;[\s\S]*?clip: auto;/);
  for (const domain of domains) {
    assert.match(homepage, new RegExp(`href="learning-paths\\.html#${domain.id}"`));
    assert.match(learningPaths, new RegExp(`href="#${domain.id}"`));
  }
});

test('every core learning path exposes clickable child competencies', () => {
  let totalChildren = 0;
  for (const domain of domains) {
    const source = sectionSource(domain.id);
    assert.match(source, new RegExp(`<h2[^>]*>${domain.title}</h2>`));
    assert.match(source, /class="skills-domain-root-link"[^>]+learningPath=/);
    const children = source.match(/<a class="skills-node"/g) || [];
    assert.equal(children.length, domain.children, `${domain.id} child count drifted`);
    totalChildren += children.length;
  }
  assert.equal(totalChildren, 27);
});

test('software foundations follows five capability branches backed by lessons', () => {
  const source = sectionSource('software-fundamentals');
  for (const branch of [
    '端到端应用交付',
    '数据生命周期与存储',
    '系统架构与边界',
    '安全且有韧性的系统',
    '生产规模与服务负责',
  ]) {
    assert.match(source, new RegExp(`<strong>${branch}</strong>`));
  }
  assert.match(source, /class="skills-domain-children skills-domain-children--five"/);
  assert.match(source, /打开代表性课程/);
  assert.match(source, /13 节课基础路径 · 730 分钟/);
  assert.match(source, /17-infrastructure-and-production\/25-security-secrets-audit/);
});

test('domain route totals match their canonical manifests', () => {
  assert.match(sectionSource('building-and-deploying'), /12 节课路径 · 780 分钟/);
  assert.match(sectionSource('software-fundamentals'), /13 节课基础路径 · 730 分钟/);
  assert.match(sectionSource('coding-agents'), /16 节课路径 · 900 分钟/);
});

test('every child node resolves to a real local lesson', () => {
  const hrefs = Array.from(learningPaths.matchAll(/<a class="skills-node" href="\/lessons\/([^?"]+)\/\?learningPath=([^"]+)"/g));
  assert.equal(hrefs.length, 27);
  for (const match of hrefs) {
    const lessonPath = 'phases/' + match[1];
    const learningPath = match[2];
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'learning-paths', `${learningPath}.json`), 'utf8'));
    assert.equal(
      fs.existsSync(path.join(root, lessonPath, 'docs', 'zh.md')),
      true,
      `${lessonPath} does not resolve to a published lesson`
    );
    assert.equal(
      manifest.lessons.some(lesson => lesson.path === lessonPath),
      true,
      `${lessonPath} is not part of ${learningPath}`
    );
  }
});

test('career chooser opens detailed work-family guides before lessons', () => {
  const source = careerSectionSource();
  assert.equal((source.match(/<details class="career-guide"/g) || []).length, careerRoutes.length);
  assert.equal((source.match(/data-career-choice=/g) || []).length, careerRoutes.length);
  assert.equal((source.match(/>学习专项课程<\/a>/g) || []).length, careerRoutes.length);
  assert.doesNotMatch(source, /career-path-card|Start path/);

  for (const career of careerRoutes) {
    const manifest = career.manifest;
    const guideId = `career-route-${career.id}`;
    const firstLesson = manifest.lessons[0].path;
    const href = `/lessons/${firstLesson.replace(/^phases\//, '')}/?learningPath=${career.id}`;
    assert.equal(source.includes(`href="#${guideId}" data-career-choice="${career.id}"`), true, `${career.id} chooser link is missing`);
    assert.equal(source.includes(`id="${guideId}" data-career-guide="${career.id}"`), true, `${career.id} guide is missing`);
    assert.equal(source.includes(`<strong>${career.title}</strong>`), true, `${career.id} work-family title is missing`);
    assert.equal(source.includes(manifest.commonTitles.join(' · ')), true, `${career.id} search titles drifted from its manifest`);
    assert.equal(source.includes(`${manifest.lessons.length} 节专项课 · ${manifest.estimatedMinutes} 分钟`), true, `${career.id} guided time is missing`);
    assert.equal(source.includes(`href="${href}"`), true, `${career.id} guide does not open its specialist lessons`);
  }
});

test('career route manifests are honest evidence-building overlays', () => {
  for (const career of careerRoutes) {
    const manifest = career.manifest;
    assert.equal(manifest.id, career.id);
    assert.equal(manifest.title, career.title);
    assert.equal(manifest.kind, 'career-route');
    assert.equal(manifest.workFamily, career.title);
    assert.equal(manifest.sourceBasis.reviewedAt, '2026-08-29');
    assert.match(manifest.sourceBasis.method, /主要职位描述/);
    assert.ok(manifest.commonTitles.length >= 3);
    assert.ok(manifest.responsibilities.length >= 3);
    assert.ok(manifest.goodFitIf.length >= 2);
    assert.ok(manifest.baseline.length >= 2);
    assert.ok(manifest.portfolioProof.evidence.length >= 3);
    assert.ok(manifest.readinessCriteria.length >= 4);
    assert.ok(manifest.coverage.strong.length >= 2);
    assert.ok(manifest.coverage.partial.length >= 1);
    assert.ok(manifest.coverage.outsideCourse.length >= 1);
    assert.match(manifest.boundary, /专业路线/);
    assert.match(manifest.timeNote, /课程时间/);
    assert.match(manifest.completionClaim, /不保证获得/);
    assert.equal(manifest.stages.length, 4);
    assert.deepEqual(
      manifest.stages.map(stage => stage.id),
      ['common-core', 'role-practice', 'proof-project', 'interview-readiness-evidence']
    );
    for (const stage of manifest.stages) {
      assert.ok(Array.from(stage.outcome).length >= 16, `${career.id} ${stage.id} needs a concrete outcome`);
      assert.ok(stage.artifact.length > 20, `${career.id} ${stage.id} needs a concrete artifact`);
      assert.ok(stage.lessonPaths.length > 0, `${career.id} ${stage.id} needs lessons`);
    }

    const lessonPaths = manifest.lessons.map(lesson => lesson.path);
    const stagePaths = manifest.stages.flatMap(stage => stage.lessonPaths);
    assert.deepEqual(stagePaths, lessonPaths, `${career.id} stages must partition lessons in route order`);
    assert.deepEqual(manifest.lessons.map(lesson => lesson.order), Array.from({ length: manifest.lessons.length }, (_, index) => index + 1));
    assert.equal(manifest.lessons.reduce((total, lesson) => total + lesson.minutes, 0), manifest.estimatedMinutes);
    assert.equal(new Set(lessonPaths).size, manifest.lessons.length);
    assert.doesNotMatch(JSON.stringify(manifest), /https?:\/\/|[–—]/);
    for (const lesson of manifest.lessons) {
      assert.equal(
        fs.existsSync(path.join(root, lesson.path, 'docs', 'zh.md')),
        true,
        `${career.id} references missing lesson ${lesson.path}`
      );
    }
  }
});

test('career guidance states the prerequisite and employment boundaries', () => {
  const source = careerSectionSource();
  assert.match(source, /这些路线是在共享基础之上的专项叠加/i);
  assert.match(source, /不保证获得工作/i);
  assert.match(source, /仅指课程引导时间/i);
  assert.match(source, /不含基础学习、独立项目和职业经验/i);
  assert.match(source, /href="#software-fundamentals">工程基础<\/a>/);
  assert.match(source, /href="#building-and-deploying">AI 应用基础<\/a>/);
  assert.match(source, /你愿意每周重复做哪类工作？/);
  assert.match(source, /你要负责什么/);
  assert.match(source, /作品集证据/);
  assert.match(source, /课程覆盖与缺口/);
  assert.doesNotMatch(source, /[–—]/);
});

test('learning paths stays navigable on narrow screens and uses a neutral root', () => {
  assert.match(learningPaths, /<title>AI 工程学习路径 - AI Engineering from Scratch 简体中文版<\/title>/);
  assert.match(learningPaths, /<span class="learning-paths-eyebrow">4 条核心路径 · 6 条职业路线<\/span>/);
  assert.match(learningPaths, /<h1 id="learningPathsTitle">AI 工程学习路径<\/h1>/);
  assert.match(learningPaths, /class="learning-paths-entry-nav"[\s\S]*?href="#overview"[\s\S]*?href="#career-routes"/);
  assert.match(learningPathsCss, /@media \(max-width: 600px\)[\s\S]*?\.skills-domain-children\s*\{[\s\S]*?grid-template-columns: 1fr/);
  assert.match(learningPathsCss, /\.skills-domain-children\s*\{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);[\s\S]*?min-width: 0;/);
  assert.match(learningPathsCss, /\.skills-domain-children--five\s*\{[\s\S]*?grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(learningPathsCss, /@media \(max-width: 900px\)[\s\S]*?\.skills-domain-children--five\s*\{[\s\S]*?grid-template-columns: 1fr/);
  assert.match(learningPathsCss, /@media \(max-width: 900px\)[\s\S]*?\.skills-domain-children--five \.skills-node::before\s*\{[\s\S]*?display: block/);
  assert.match(learningPathsCss, /@media \(max-width: 600px\)[\s\S]*?\.skills-domain-children \.skills-node::before\s*\{[\s\S]*?display: block/);
  assert.match(learningPathsCss, /\.skills-domain-children:not\(\.skills-domain-children--five\) \.skills-node:nth-child\(n \+ 5\)::before\s*\{\s*display: block;\s*height: 28px;\s*\}/);
  assert.match(learningPathsCss, /@media \(max-width: 900px\)[\s\S]*?\.skills-domain-children:not\(\.skills-domain-children--five\) \.skills-node:nth-child\(n \+ 3\)::before\s*\{\s*display: block;\s*height: 28px;\s*\}/);
  assert.match(learningPathsCss, /@media \(max-width: 600px\)[\s\S]*?\.skills-domain-children:not\(\.skills-domain-children--five\) \.skills-node:nth-child\(n \+ 3\)::before\s*\{\s*height: 0;\s*\}/);
  assert.doesNotMatch(learningPathsCss, /\.skills-node:nth-child\(n \+ (?:3|5)\)::before\s*\{[^}]*display:\s*none/);
  assert.match(learningPathsCss, /\.career-choice-grid\s*\{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(learningPathsCss, /@media \(max-width: 900px\)[\s\S]*?\.career-choice-grid\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(learningPathsCss, /@media \(max-width: 600px\)[\s\S]*?\.career-choice-grid\s*\{[\s\S]*?grid-template-columns: 1fr/);
  assert.match(learningPathsCss, /\.career-guide-grid\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(learningPathsCss, /@media \(max-width: 900px\)[\s\S]*?\.career-guide-grid\s*\{[\s\S]*?grid-template-columns: 1fr/);
  assert.match(learningPathsCss, /\.career-guide-grid p,[\s\S]*?\.career-guide-grid li\s*\{[\s\S]*?font-size: 1rem/);
  assert.doesNotMatch(learningPathsCss, /min-width: calc\(var\(--child-count\)/);
  assert.doesNotMatch(learningPaths, /class="skills-domain-scroller" tabindex=/);
  assert.match(learningPathsCss, /\.learning-paths-domain-link:focus-visible/);
  assert.match(learningPathsCss, /\.career-guide > summary:focus-visible/);
  assert.match(learningPathsCss, /\.career-guide-cta:focus-visible/);
  assert.match(learningPathsCss, /\.skills-node:focus-visible/);
  for (const filename of ['006-ai-engineering-learning-paths.svg', '006-ai-engineering-learning-paths-mobile.svg']) {
    const svg = fs.readFileSync(path.join(__dirname, 'assets', 'figures', filename), 'utf8');
    assert.match(svg, /\.root\{fill:#fafaf5;stroke:#1a1a1a;stroke-width:3\}/);
    assert.doesNotMatch(svg, /\.root\{fill:#3553ff/);
  }
});

test('career chooser hash navigation reveals and focuses a guide', () => {
  assert.match(learningPathsJs, /function careerGuideFromHash\(hash\)/);
  assert.match(learningPathsJs, /guide\.matches\('details\.career-guide'\)/);
  assert.match(learningPathsJs, /function closeOtherCareerGuides\(activeGuide\)/);
  assert.match(learningPathsJs, /if \(guide !== activeGuide\) guide\.open = false/);
  assert.match(learningPathsJs, /guide\.open = true/);
  assert.match(learningPathsJs, /setAttribute\('aria-current', 'location'\)/);
  assert.match(learningPathsJs, /addEventListener\('hashchange'/);
  assert.match(learningPathsJs, /if \(!revealCareerGuide\(window\.location\.hash, true\)\) syncCareerChoice\(null\)/);
  assert.match(learningPathsJs, /prefers-reduced-motion: reduce/);
});

test('learning paths shares the site theme preference', () => {
  assert.match(learningPaths, /<script src="learning-paths\.js\?v=20260831a"><\/script>/);
  assert.match(learningPaths, /<link rel="stylesheet" href="learning-paths\.css\?v=20260831a">/);
  assert.match(learningPathsJs, /localStorage\.getItem\('theme'\)/);
  assert.match(learningPathsJs, /localStorage\.setItem\('theme', theme\)/);
  assert.match(learningPathsJs, /prefers-color-scheme: dark/);
  assert.match(learningPathsJs, /addEventListener\('storage'/);
});
