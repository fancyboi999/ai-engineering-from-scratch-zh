'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-2', {
  height: 270,
  title: '前缀命中会复用完整的 16-token block，直到遇到第一个差异',
  desc: '两条提示词共享一个 system prompt。每个完整的 16-token block 都会生成一个哈希，并包含前一个 block 的哈希。第二条提示词在映射中找到前三个 block 的哈希并复用这些 block。第四个 block 不同，因此匹配链结束，其余内容重新计算。',
}, f => {
  f.kicker(20, 18, '请求 A，已处理');
  f.kicker(620, 122, '请求 B，后到', { anchor: 'end' });
  const labels = ['h1', 'h2', 'h3', 'h4a', 'h5a'];
  const labelsB = ['h1', 'h2', 'h3', 'h4b', 'h5b'];
  for (let i = 0; i < 5; i += 1) {
    f.box({ x: 20 + i * 120, y: 28, w: 108, h: 46, hue: 'green', title: `块 ${i + 1}`, sub: labels[i] });
    const hit = i < 3;
    f.box({ x: 20 + i * 120, y: 128, w: 108, h: 46, hue: hit ? 'green' : 'plum', dash: hit ? undefined : 'dashed', title: hit ? '命中缓存' : '重新计算', sub: labelsB[i] });
  }
  for (let i = 0; i < 3; i += 1) f.arrow([74 + i * 120, 127], [74 + i * 120, 75], { style: 'reply' });
  f.text(446, 98, '此处不同，匹配结束', { size: 11.5, hue: 'rose', weight: 700 });
  f.text(20, 206, '每个哈希覆盖 16 个 token 并包含前一个哈希，因此 h3 对应开头的 48 个 token。', { size: 11.5, serif: true, hue: 'ink-soft' });
  f.text(20, 228, '20 个共享 token 只能复用一个缓存 block，剩余 4 个 token 每次都要计算。', { size: 11.5, serif: true, hue: 'ink-soft' });
  f.text(20, 250, '将共享内容按相同顺序放在最前面，延长匹配链。', { size: 11.5, serif: true, hue: 'ink-soft' });
});
