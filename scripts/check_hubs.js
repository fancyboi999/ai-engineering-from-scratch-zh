'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { writeHubs } = require('../site/build-hubs');

const root = path.resolve(__dirname, '..');

// 只调用现有中文解析器；不执行全站 build，也不修改任何源文件。
function sourceOptions() {
  const filename = path.join(root, 'site/build.js');
  const context = {
    require: createRequire(filename), module: { exports: {} },
    __dirname: path.dirname(filename), __filename: filename, process, console,
  };
  const source = fs.readFileSync(filename, 'utf8');
  // 基线仍有内联 SEO 函数；只在隔离上下文替换这些旧定义，检验共享函数的接线。
  // 整合后若已经 import 共享函数，不再给 const 绑定赋值。
  const legacyFunctions = ['lessonDocumentSeo', 'wordCount', 'truncateWords', 'truncateText', 'seoTitleFor']
    .filter(name => new RegExp(`function ${name}\\(`).test(source));
  const sharedAssignment = legacyFunctions.length
    ? `\n({ ${legacyFunctions.join(', ')} } = require("../lib/lesson-document"));` : '';
  vm.runInNewContext(source + sharedAssignment
    + '\nmodule.exports.hubSources = { parseGlossary, parseCurriculumPrereqs, GLOSSARY_CATEGORY_ORDER };', context, { filename });
  const build = context.module.exports;
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const roadmap = fs.readFileSync(path.join(root, 'ROADMAP.md'), 'utf8');
  const phases = build.parseReadme(readme, build.parseRoadmap(roadmap));
  const lessonManifest = build.buildSeoManifests(phases, build.parseCertifications()).lessonManifest;
  const minutes = {};
  for (const phase of phases) {
    for (const lesson of phase.lessons) {
      const lessonPath = /phases\/[^/]+\/[^/]+/.exec(lesson.url)[0];
      const markdown = fs.readFileSync(path.join(root, lessonPath, 'docs/zh.md'), 'utf8');
      const time = /\*\*预计时间[:：]\*\*\s*(?:~|约)?\s*(\d+)\s*(分钟|小时)/.exec(markdown);
      assert(time, `${lessonPath} 缺少预计时间`);
      minutes[lessonPath] = Number(time[1]) * (time[2] === '小时' ? 60 : 1);
    }
  }
  return {
    phases, lessonManifest, minutes, root,
    prerequisites: build.hubSources.parseCurriculumPrereqs(readme, phases),
    glossary: build.hubSources.parseGlossary(fs.readFileSync(path.join(root, 'glossary/terms.md'), 'utf8')),
    categories: build.hubSources.GLOSSARY_CATEGORY_ORDER,
  };
}

function validatePages(hubs) {
  const pages = hubs.phasePages.concat(hubs.termPages);
  assert.equal(new Set(pages.map(page => page.href)).size, pages.length);
  for (const page of pages) {
    assert.match(page.html, /<html lang="zh-CN"/);
    assert(page.html.includes(`<link rel="canonical" href="https://aieng-zh.cn${page.href}">`));
    assert.match(page.html, /<h1>[^<]+<\/h1>/);
    assert(!/aiengineeringfromscratch\.com|rohitg00|vercel-scripts|\/sponsors|\/blogs|lesson\.html\?/.test(page.html));
    const json = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(page.html)[1]);
    assert.equal(json['@graph'][0].inLanguage, 'zh-CN');
    assert.equal(json['@graph'].find(item => item['@type'] === 'FAQPage').inLanguage, 'zh-CN');
    const ids = [...page.html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${page.href} 重复 id`);
    for (const match of page.html.matchAll(/aria-labelledby="([^"]+)"/g)) assert(ids.includes(match[1]));
    for (const match of page.html.matchAll(/href="(\/lessons\/[^"]+)"/g)) {
      const sourcePath = match[1].replace(/^\/lessons\//, 'phases/');
      assert(fs.existsSync(path.join(root, sourcePath, 'docs/zh.md')), `${page.href} 链接不存在：${sourcePath}`);
    }
  }
  assert.equal(hubs.phaseModels.reduce((sum, phase) => sum + phase.lessons.length, 0), 528);
  assert.equal(hubs.termModels.length, hubs.termPages.length + hubs.skipped.length);
  assert(hubs.termPages.length > 200, '中文术语不应被英文空格计数误过滤');
}

function checkHubs() {
  const output = fs.mkdtempSync(path.join('/tmp', 'aieng-zh-hubs-'));
  const options = sourceOptions();
  const hubs = writeHubs(options, output);
  validatePages(hubs);
  fs.writeFileSync(path.join(output, 'skipped-terms.json'), JSON.stringify(hubs.skipped, null, 2) + '\n');
  console.log(`验证通过：${hubs.phasePages.length} 个阶段 Hub，${hubs.termPages.length} 个术语独立页，${hubs.skipped.length} 个短条目。`);
  console.log(`生成与短条目明细：${output}`);
  return { hubs, output };
}

if (require.main === module) checkHubs();
module.exports = { sourceOptions, validatePages, checkHubs };
