'use strict';

const { figure } = require('../../../_shared/figkit.js');

const steps = [
  { decode: 8, prefill: 2040, label: '步骤 1' },
  { decode: 8, prefill: 2040, label: '步骤 2' },
  { decode: 8, prefill: 16, label: '步骤 3' },
];

module.exports = figure('fig-8-2', {
  height: 250,
  title: '每步共享 2,048-token 预算：先 decode，再用提示词块填满余量',
  desc: '三个 scheduler 步骤，默认预算为 2,048 个 token。8 个正在运行的请求各生成一个 decode token；一个新的 4,096-token 提示词以每块 2,040 个 token 的方式填充剩余预算。步骤 3 处理提示词最后 16 个 token，新请求从步骤 4 开始 decode。',
}, f => {
  const scale = 520 / 2048;
  f.kicker(20, 18, '每步预算：--max-num-batched-tokens 2048');
  steps.forEach((s, index) => {
    const y = 34 + index * 58;
    f.text(20, y + 24, s.label, { size: 12, weight: 700 });
    const dw = Math.max(s.decode * scale, 14);
    f.rect(90, y, dw, 36, { hue: 'amber' });
    const pw = s.prefill * scale;
    f.rect(90 + dw + 2, y, pw, 36, { hue: 'plum' });
    if (pw > 200) f.text(90 + dw + 12, y + 23, `新请求的 ${s.prefill.toLocaleString('en-US')} 个提示词 token`, { size: 11.5, hue: 'plum' });
    else f.text(160, y + 23, '提示词最后 16 个 token；步骤 4 开始 decode', { size: 11.5, hue: 'ink-soft' });
    if (90 + dw + 2 + pw < 600) f.rect(90 + dw + 4 + pw, y, 600 - (90 + dw + 4 + pw) + 10, 36, { hue: 'grey', dash: 'dashed' });
  });
  f.rect(20, 214, 12, 12, { hue: 'amber' });
  f.text(40, 224, 'decode：每个运行中请求生成一个 token', { size: 11.5, serif: true, hue: 'ink-soft' });
  f.rect(340, 214, 12, 12, { hue: 'plum' });
  f.text(360, 224, '新提示词的一个 chunk', { size: 11.5, serif: true, hue: 'ink-soft' });
});
