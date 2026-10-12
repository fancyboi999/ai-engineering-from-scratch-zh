#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const lessonHtml = fs.readFileSync(path.join(__dirname, '..', 'site', 'lesson.html'), 'utf8');

const codeCard = lessonHtml.match(/\.code-card\s*\{([^{}]*)\}/);
assert(codeCard, 'lesson.html 缺少 .code-card 样式');
assert.match(
  codeCard[1],
  /min-width:\s*0\s*;/,
  '.code-card 必须允许 Grid item 收缩，避免长运行命令撑宽移动端页面'
);

const longTextWrap = lessonHtml.match(
  /\.quiz-question-text\s*,\s*\.quiz-option\s*,\s*\.quiz-option-text\s*,\s*\.quiz-explanation\s*\{([^{}]*)\}/
);
assert(longTextWrap, 'lesson.html 缺少测验长文本的统一断行规则');
assert.match(longTextWrap[1], /min-width:\s*0\s*;/, '测验文本必须允许 Flex item 收缩');
assert.match(longTextWrap[1], /overflow-wrap:\s*anywhere\s*;/, '测验中的长标识符必须允许断行');

const actionHead = lessonHtml.match(/\.lesson-action-head\s*\{([^{}]*)\}/);
assert(actionHead, 'lesson.html 缺少行动面板标题栏样式');
assert.match(actionHead[1], /display:\s*flex\s*;/, '桌面行动面板标题栏必须保留 Flex 布局');

const narrowActionHead = lessonHtml.match(
  /@media\s*\(max-width:\s*768px\)\s*\{\s*\.lesson-main\s*\{[^{}]*\}\s*\.lesson-action-head\s*\{([^{}]*)\}/
);
assert(narrowActionHead, 'lesson.html 缺少窄屏行动面板标题栏规则');
assert.match(narrowActionHead[1], /display:\s*grid\s*;/, '窄屏必须启用 Grid，不能只给 Flex 容器设置 grid-template-columns');
assert.match(narrowActionHead[1], /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/, '窄屏介绍与检查点状态必须各占一行');

console.log('lesson mobile CSS contract tests passed');
