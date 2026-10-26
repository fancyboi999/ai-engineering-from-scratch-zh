'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-5-3b', {
  height: 306,
  title: "六项结果及其背后机制",
  desc: "独立实践报告的六行，各列负载、报告结果与解释它的 SGLang 机制：内核、基数缓存、分块 prefill、decode graph 上限、注意力数据与专家并行，以及草稿 token 成本。",
}, f => {
  f.kicker(20, 18, '工作负载');
  f.kicker(222, 18, "报告结果");
  f.kicker(440, 18, '机制');
  const rows = [
    ["独特 prompt、稠密模型", "相差几个百分点", "相同内核家族", 'violet', false],
    ["重复前缀", "首 token 583 对 2,141 ms", "基数缓存", 'green', false],
    ["16k 个 token 的 prompt", "首 token 更慢，TPOT 更快", "分块 prefill 8,192", 'blue', false],
    ["无并发上限", "ITL 100.92 对 28.84 ms", "图上限，推测", 'violet', true],
    ["DeepSeek MoE、多 GPU", "参考引擎、审计的 MLPerf", "注意力 DP 与 EP", 'blue', false],
    ["B200 上的 MTP", "TPOT 18.43 降至 9.92 ms", "草稿成本、接受率", 'plum', false],
  ];
  rows.forEach(([workload, result, mechanism, hue, guess], index) => {
    const y = 30 + index * 44;
    f.box({ x: 20, y, w: 190, h: 34, hue: 'olive', title: workload, titleSize: 11.5 });
    f.text(222, y + 22, result, { size: 11, serif: true, hue: 'ink-soft' });
    f.box({ x: 440, y, w: 180, h: 34, hue, title: mechanism, titleSize: 11.5, dash: guess ? 'dashed' : undefined });
  });
  f.text(20, 300, "虚线边框标记手册的假设，并非报告结论。", { size: 11, serif: true, hue: 'ink-soft' });
});
