'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-4-2', {
  height: 300,
  title: "哪些 decode 批次能重放计算图",
  desc: "80 GB GPU、张量并行 1、max_bs 256 时，decode 批次到达 CUDA graph runner。大小 13 的批次重放为 16 捕获的图；256 重放最大图；300 超过 max_bs，改用 eager，每个内核一次提交，调度日志显示 cuda graph False。",
}, f => {
  f.kicker(20, 18, "decode 批次");
  f.kicker(250, 18, 'can_run_graph');
  f.kicker(450, 18, "执行内容");
  const cases = [
    { y: 30, bs: 'bs = 13', test: '13 <= 256', run: "重放 graph 16", sub: "3 个填充槽位", hue: 'violet', ok: true },
    { y: 110, bs: 'bs = 256', test: '256 <= 256', run: "重放 graph 256", sub: "最大捕获桶", hue: 'violet', ok: true },
    { y: 190, bs: 'bs = 300', test: '300 > 256', run: "eager 前向传播", sub: 'cuda graph: False', hue: 'rose', ok: false },
  ];
  for (const c of cases) {
    const batch = f.box({ x: 20, y: c.y, w: 150, h: 48, hue: 'amber', title: c.bs, sub: "运行请求" });
    const test = f.box({ x: 250, y: c.y, w: 130, h: 48, hue: 'blue', title: c.test, sub: c.ok ? 'fits' : "过大" });
    const run = f.box({ x: 450, y: c.y, w: 170, h: 48, hue: c.hue, title: c.run, sub: c.sub, dash: c.ok ? undefined : 'dashed' });
    f.arrow(batch.right(), [249, c.y + 24], { style: 'call' });
    f.arrow(test.right(), [449, c.y + 24], { style: c.ok ? 'call' : 'fail' });
  }
  f.text(20, 268, "捕获大小：1、2、4、8、12，然后 16 至 256，步长 8", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 286, "80 GB GPU、TP 1 的默认 max_bs 为 256", { size: 11, serif: true, hue: 'ink-soft' });
});
