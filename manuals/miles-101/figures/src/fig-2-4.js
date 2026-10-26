'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/miles-gb10-lab.json')).runs;
const steady = name => {
  const later = runs[name].per_step.filter(p => p.step >= 2);
  const mean = key => later.reduce((a, p) => a + p[key], 0) / later.length;
  return { update_weights_time_s: mean('update_weights_time_s'), sleep_time_s: mean('sleep_time_s'), wake_up_time_s: mean('wake_up_time_s') };
};
const small = steady('e4-0.6b');
const large = steady('e4-1.7b');
const times = key => (large[key] / small[key]).toFixed(1);
const items = [];
for (const [key, name] of [['update_weights_time_s', '更新'], ['sleep_time_s', '卸载'], ['wake_up_time_s', '加载']]) {
  items.push({ name: `${name} 0.6B`, value: small[key], hue: 'blue', label: `${small[key].toFixed(2)} s` });
  items.push({ name: `${name} 1.7B`, value: large[key], hue: 'violet', label: `${large[key].toFixed(2)} s` });
}

module.exports = figure('fig-2-4', {
  height: 330,
  title: '更大的模型使 offload 比权重更新更耗时',
  desc: `各模型运行 4 个短步骤并完成两步预热后，第 2 和第 3 步的平均耗时。Qwen3-0.6B 与 Qwen3-1.7B 的权重更新耗时分别为 ${small.update_weights_time_s.toFixed(2)} s 和 ${large.update_weights_time_s.toFixed(2)} s。trainer offload 分别为 ${small.sleep_time_s.toFixed(2)} s 和 ${large.sleep_time_s.toFixed(2)} s；onload 分别为 ${small.wake_up_time_s.toFixed(2)} s 和 ${large.wake_up_time_s.toFixed(2)} s。`,
}, f => {
  const c = chart(f, { x: 60, y: 56, w: 560, h: 200, xDomain: [0, 1], yDomain: [0, 4], yTicks: [0, 2, 4], yLabel: "秒，步骤 2 与 3 的均值" });
  c.bars(items, { width: 52 });
  legend(f, [{ name: 'Qwen3-0.6B', hue: 'blue' }, { name: 'Qwen3-1.7B，参数量为 2.8 倍', hue: 'violet' }], 60, 22);
  f.text(60, 314, `权重更新耗时增长 ${times('update_weights_time_s')} 倍。trainer offload 和 onload 分别增长 ${times('sleep_time_s')} 倍和 ${times('wake_up_time_s')} 倍。`, { size: 12, serif: true });
});
