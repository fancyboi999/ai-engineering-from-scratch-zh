'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { truncateText, truncateWords, wordCount, explanationUnits, lessonDocumentSeo } = require('./lesson-document');

test('lesson-document: 中英文元数据、表格与代码不进入 SEO 正文', () => {
  const markdown = '# 中文标题\n\n> 从原理理解模型。\n\n**类型：** Build\n**语言:** Python\n**前置要求：** 无\n**预计时间：** 45 分钟\n**Type:** Learn\n**Languages:** Rust\n**Prerequisites:** None\n**Time:** 30 min\n\n## 学习目标\n- 理解梯度。\n\n| 字段 | 值 |\n| --- | --- |\n\n```python\nprint("SECRET_CODE")\n```\n\n~~~javascript\nconst hidden = "SECRET_TILDE";\n~~~\n\n训练时通过损失更新参数。\n';
  const seo = lessonDocumentSeo(markdown, '备用标题');
  assert.equal(seo.title, '中文标题');
  assert.match(seo.seoTitle, /AI 工程从零开始/);
  assert.match(seo.excerpt, /理解梯度。/);
  assert.match(seo.excerpt, /训练时通过损失更新参数。/);
  assert(!/Build|Python|Rust|None|SECRET|预计时间|30 min|字段|值/.test(seo.excerpt));
  assert(!/\.。|。\./.test(seo.excerpt));
});

test('lesson-document: CJK 截断不回退到很早的英文空格', () => {
  const text = '学习 API ' + '通过损失函数计算梯度并更新模型参数。'.repeat(20);
  const clipped = truncateText(text, 160);
  assert.equal(clipped.length, 160);
  assert(clipped.endsWith('…'));
  assert(clipped.startsWith('学习 API '));
  assert.equal(truncateWords('中文'.repeat(300), 220), '中文'.repeat(110) + '…');
  assert.equal(wordCount('调用API安全'), 5);
  assert.equal(explanationUnits('调用API安全'), 6);
});

test('lesson-document: 保留英文词边界，中文与英文说明阈值明确', () => {
  assert.equal(truncateText('alpha beta gamma delta', 16), 'alpha beta…');
  assert.equal(truncateWords('one two three four', 2), 'one two…');
  assert.equal(explanationUnits(Array(35).fill('word').join(' ')), 70);
  assert.equal(explanationUnits('汉'.repeat(70)), 70);
  assert.equal(explanationUnits('。！？ '), 0);
});

test('lesson-document: supplementary 汉字与 emoji 截断不产生孤立 surrogate', () => {
  const input = '中😀𠀀文'.repeat(30);
  for (let limit = 1; limit < 35; limit++) {
    const clipped = truncateText(input, limit);
    assert(clipped.length <= limit);
    assert.equal(clipped.isWellFormed(), true);
  }
  assert.equal(explanationUnits('𠀀𠀀'), 2);
});

test('lesson-document: 空文档 fallback，SEO 标题与描述有界', () => {
  assert.equal(lessonDocumentSeo('', '标题').excerpt, '标题');
  const seo = lessonDocumentSeo('# ' + '标题'.repeat(50) + '\n\n' + '中文说明。'.repeat(100));
  assert(seo.seoTitle.length <= 60);
  assert(seo.description.length <= 160);
  assert(wordCount(seo.excerpt) <= 220);
});
