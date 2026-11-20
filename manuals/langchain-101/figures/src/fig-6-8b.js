'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const graph = load(path.join(__dirname, '../../capture/lab/summary/recursion-mac.json'));
const agent = load(path.join(__dirname, '../../capture/lab/summary/recursion-x86.json'));
const same = values => {
  if (!values.every(v => v === values[0])) throw new Error('fig-6-8b: runs differ');
  return values[0];
};
const capped = agent.cases.create_agent_forever_no_config_capped;
const points = [
  { steps: graph.cases.stategraph_loop_recursion_limit_25.limit_reached, label: '配置 25', hue: 'indigo' },
  { steps: graph.cases.stategraph_loop_env_25.limit_reached, label: '环境变量 25', hue: 'indigo' },
  { steps: graph.cases.stategraph_loop_no_config.limit_reached, label: '默认', hue: 'indigo' },
  { steps: agent.cases.create_agent_forever_recursion_limit_25.limit_reached, label: '配置 25', hue: 'blue', calls: same(agent.cases.create_agent_forever_recursion_limit_25.model_calls) },
  { steps: agent.cases.create_agent_forever_recursion_limit_101.limit_reached, label: '配置 101', hue: 'blue', calls: same(agent.cases.create_agent_forever_recursion_limit_101.model_calls) },
  { steps: capped.steps, label: '默认', hue: 'rose', calls: capped.model_calls },
];

module.exports = figure('fig-6-8b', {
  height: 356,
  title: 'GraphRecursionError 之前的步数',
  desc: `按对数刻度绘制每次运行在停止前走的步数的点图。Mac 上不带模型的 StateGraph 循环，在 recursion_limit 为 25 和环境变量设为 25 时都在 25 步停止，不带配置时在 ${graph.cases.stategraph_loop_no_config.limit_reached} 步停止。x86 服务器虚拟机上用 Qwen3 4B 的 create_agent agent，在 ${points[3].calls} 次模型调用后于 25 步停止，在 ${points[4].calls} 次后于 101 步停止，各 3 次运行全部如此。使用默认上限时，实验脚本在 ${Math.round(capped.wall_s / 60)} 分钟后把它停下，此时已走 ${capped.steps} 步、做了 ${capped.model_calls} 次模型调用。`,
}, f => {
  const c = chart(f, { x: 70, y: 40, w: 540, h: 200, xDomain: [0, 7.5], yDomain: [10, 30000], yScale: 'log10', yTicks: [10, 100, 1000, 10000], yLabel: '停止前的步数，对数刻度' });
  points.forEach((p, i) => {
    const slot = i < 3 ? i + 1 : i + 1.5;
    const x = c.px(slot);
    f.dot(x, c.py(p.steps), { hue: p.hue, r: 3.5 });
    f.text(x, c.py(p.steps) - 10, String(p.steps), { size: 11, anchor: 'middle', hue: p.hue, knock: true });
    f.text(x, 258, p.label, { size: 11, anchor: 'middle', hue: 'ink-soft' });
    if (p.calls) f.text(x, 274, `${p.calls} 次调用`, { size: 11, anchor: 'middle', serif: true, hue: 'ink-soft' });
  });
  f.text((c.px(1) + c.px(3)) / 2, 296, 'StateGraph 循环，Mac', { size: 11.5, anchor: 'middle', weight: 700, hue: 'indigo' });
  f.text((c.px(4.5) + c.px(6.5)) / 2, 296, 'create_agent，Qwen3 4B', { size: 11.5, anchor: 'middle', weight: 700, hue: 'blue' });
  f.text(70, 326, 'agent 情形下方的调用数是它的模型调用次数。agent 在 x86 服务器虚拟机上运行。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(70, 344, `玫红色的默认运行没有触到上限：实验脚本在 ${Math.round(capped.wall_s)} s 后把它停下。`, { size: 11, serif: true, hue: 'rose' });
});
