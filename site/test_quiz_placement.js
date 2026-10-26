const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const MDRender = require('./md-render.js');

const ROOT = path.join(__dirname, '..');

function lessonsWithQuiz() {
  const lessons = [];
  for (const phase of fs.readdirSync(path.join(ROOT, 'phases'))) {
    const phaseDir = path.join(ROOT, 'phases', phase);
    if (!fs.statSync(phaseDir).isDirectory()) continue;
    for (const lesson of fs.readdirSync(phaseDir)) {
      const lessonDir = path.join(phaseDir, lesson);
      const quizPath = path.join(lessonDir, 'quiz.json');
      const markdownPath = path.join(lessonDir, 'docs', 'zh.md');
      if (!fs.existsSync(quizPath) || !fs.existsSync(markdownPath)) continue;
      lessons.push({
        name: phase + '/' + lesson,
        quiz: JSON.parse(fs.readFileSync(quizPath, 'utf8')),
        markdown: fs.readFileSync(markdownPath, 'utf8')
      });
    }
  }
  return lessons;
}

const LESSONS = lessonsWithQuiz();

function assertPlaced(place, count, name) {
  for (const stage of ['pre', 'check', 'post']) {
    assert.ok(place[stage] >= 0 && place[stage] <= count, `${name}: ${stage} index ${place[stage]} outside 0..${count}`);
  }
  assert.ok(place.pre <= place.check && place.check <= place.post, `${name}: stages out of order ${JSON.stringify(place)}`);
}

test('every Chinese lesson quiz has one ordered placement before footer panels', () => {
  assert.ok(LESSONS.length > 300);
  for (const lesson of LESSONS) {
    const headings = MDRender.sectionHeadings(lesson.markdown);
    assertPlaced(MDRender.quizPlacement(headings), headings.length, lesson.name);
  }
});

test('translated chapter titles place quizzes around the matching Chinese sections', () => {
  const headings = [
    '学习目标', '问题背景', '核心概念', '动手构建', '实际使用', '拿去用', '练习', '关键术语', '延伸阅读'
  ].map((text) => ({ id: MDRender.slugify(text), text }));
  const place = MDRender.quizPlacement(headings);
  assert.deepEqual([place.pre, place.check, place.post], [2, 4, 7]);
});

test('lessons without standard chapters still put their checks in reading order', () => {
  const headings = ['背景', '系统结构', '运行过程', '总结'].map((text) => ({ text }));
  const place = MDRender.quizPlacement(headings);
  assertPlaced(place, headings.length, 'non-standard chapter titles');
});

test('heading parsing ignores code examples and extracts rendered IDs', () => {
  const markdown = '## 核心概念\n\n```md\n## 示例标题\n```\n\n## 实际使用';
  assert.deepEqual(MDRender.sectionHeadings(markdown).map((heading) => heading.text), ['核心概念', '实际使用']);
  assert.deepEqual(MDRender.headingIds('<h2 id="core"></h2><h2 id="use"></h2>'), ['core', 'use']);
});

test('lesson quizzes suppress the duplicate sidebar quiz', () => {
  for (const lesson of LESSONS) assert.deepEqual(MDRender.quizPanelQuestions(lesson.quiz), [], lesson.name);
  assert.equal(MDRender.quizPanelQuestions(null), null);
  assert.equal(MDRender.quizPanelQuestions({ questions: [] }), null);
});

test('a quiz without stage labels still appears as one section', () => {
  const source = fs.readFileSync(path.join(__dirname, 'lesson.html'), 'utf8');
  assert.match(source, /if \(!pre\.length && !check\.length && !post\.length\)/);
  assert.match(source, /buildQuizHtml\(questions, 'all', '测验'\)/);
});

test('walkthrough is mounted on both rendering paths and disposed before replacement', () => {
  const source = fs.readFileSync(path.join(__dirname, 'lesson.html'), 'utf8');
  assert.match(source, /AIFSWalkthrough\.mount\(article, \{ path: lessonPath \}\)/);
  assert.match(source, /AIFSWalkthrough\.unmount\(\)/);
  assert.match(source, /function enhanceLesson\(\)/);
  assert.match(source, /function renderLesson\(md\)/);
});
