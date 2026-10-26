'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-8-3', {
  height: 360,
  title: '两种方法分别解决两类问题',
  desc: 'trainer 和 engine 使用不同 kernel 计算相同模型，因此 log probability 会有差异。deterministic inference 只修复 engine 一端：相同输入在任何 batch 中都会得到相同输出。true on-policy 模式通过让两端使用相同 kernel 来消除差距，但只在契约适用时有效：Hopper GPU 上的 FlashAttention 3、compute capability 9.0，以及 dense Qwen3 模型。',
}, f => {
  const trainer = f.box({ x: 20, y: 40, w: 270, h: 76, hue: 'blue', title: "训练器，FSDP", sub: ['使用自身的 attention kernel', 'matmul 和求和顺序独立'] });
  const engine = f.box({ x: 350, y: 40, w: 270, h: 76, hue: 'violet', title: "引擎，SGLang", sub: ['使用自身的 attention backend', '求和顺序会随 batch 改变'] });
  f.arrow([trainer.x + trainer.w, 78], [engine.x - 1, 78], { style: 'fail', head: false });
  f.text(320, 140, '差距约为 0.015', { size: 11.5, anchor: 'middle', hue: 'rose' });

  const det = f.box({ x: 350, y: 156, w: 270, h: 64, hue: 'amber', title: "确定性推理", sub: ['engine 可在任意 batch 下重复输出'] });
  f.arrow([485, engine.y + engine.h], [485, det.y - 1], { style: 'state' });
  f.text(350, 238, '我们的运行中差距仍约为 0.015', { size: 11.5, hue: 'rose' });

  const contract = f.box({ x: 20, y: 156, w: 270, h: 64, hue: 'green', title: 'true on-policy 契约', sub: ['两端使用相同 kernel'] });
  f.arrow([155, trainer.y + trainer.h], [155, contract.y - 1], { style: 'state' });
  f.text(20, 238, '契约适用时差距为零', { size: 11.5, hue: 'green' });

  f.kicker(20, 278, 'Miles main 上的契约固定内容');
  f.text(20, 300, '两端均使用 FlashAttention 3，仅支持 Hopper GPU', { size: 12, serif: true });
  f.text(20, 320, '仅支持 dense Qwen3 模型', { size: 12, serif: true });
  f.text(20, 344, 'GB10 的 compute capability 为 12.1，不满足该契约。', { size: 12, serif: true, hue: 'ink-soft' });
});
