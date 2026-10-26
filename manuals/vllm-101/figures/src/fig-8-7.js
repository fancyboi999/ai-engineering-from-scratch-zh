'use strict';

const { figure } = require('../../../_shared/figkit.js');

const out = [
  ['Paris', 12095], ['.', 13], ['The', 576], ['capital', 6722], ['of', 315], ['Italy', 15344],
  ['is', 374], ['Rome', 21718], ['.', 13], ['The', 576], ['capital', 6722], ['of', 315],
];

module.exports = figure('fig-8-7', {
  height: 400,
  title: '一次 verify 会保留首个拒绝位置之前的 draft，并额外生成一个 token',
  desc: '上方：proposer 生成三个 draft token，目标模型一次性验证，保留前两个、拒绝第三个，并再生成自己的一个 token。下方：我们在 L4 上使用 Qwen3-8B 和 EAGLE3，每步生成三个 draft 的真实请求，总共输出 12 个 token。一个来自 prefill，另 11 个来自 6 次 verify；这 6 次共保留 18 个 draft 中的 5 个。',
}, f => {
  f.kicker(20, 18, '按位置说明规则');
  ['草稿 1', '草稿 2', '草稿 3'].forEach((t, i) => f.box({ x: 20 + i * 130, y: 28, w: 116, h: 36, hue: 'violet', title: t }));
  const verdict = [['保留', 'green'], ['保留', 'green'], ['拒绝', 'rose']];
  verdict.forEach(([t, hue], i) => {
    f.arrow([78 + i * 130, 64], [78 + i * 130, 95], { style: 'model' });
    f.box({ x: 20 + i * 130, y: 96, w: 116, h: 36, hue, dash: hue === 'rose' ? 'dashed' : undefined, title: t });
  });
  f.box({ x: 410, y: 96, w: 140, h: 36, hue: 'plum', title: '目标 token' });
  f.arrow([396, 114], [409, 114], { style: 'model' });
  f.text(20, 158, '目标模型一次通过即可写入保留的 draft，并额外生成一个 token。', { size: 11.5, serif: true, hue: 'ink-soft' });
  f.kicker(20, 196, '真实请求：L4 上的 Qwen3-8B、EAGLE3，每步 3 个 draft');
  out.forEach(([t, id], i) => {
    const x = 20 + (i % 6) * 100;
    const y = 206 + Math.floor(i / 6) * 54;
    f.box({ x, y, w: 92, h: 44, hue: i === 0 ? 'plum' : 'green', title: t, sub: String(id), titleSize: 12 });
  });
  f.text(20, 336, 'Token 1 来自 prefill，其余 11 个来自 6 次 verify。', { size: 11.5, serif: true, hue: 'ink-soft' });
  f.text(20, 358, '每次保留的 draft 数：3 次为 0，2 次为 1，1 次为 3。', { size: 11.5, serif: true, hue: 'ink-soft' });
  f.text(20, 380, '因此保留了 18 个 draft 中的 5 个，平均每次约 1.8 个 token。', { size: 11.5, serif: true, hue: 'ink-soft' });
});
