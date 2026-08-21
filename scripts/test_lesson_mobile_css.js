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

console.log('lesson mobile CSS contract tests passed');
