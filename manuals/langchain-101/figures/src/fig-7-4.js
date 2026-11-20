'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/tokens-mac.json'));
const tasks = ['trivial', 'tools', 'files'];
const harnesses = [['plain', 'plain', 'olive'], ['create_agent', 'agent', 'blue'], ['deep_agent', 'deep', 'violet']];
const cell = (task, harness) => data.cells[`${task} ${harness}`];

module.exports = figure('fig-7-4', {
  height: 414,
  title: '三种框架下每次模型调用的 prompt token',
  desc: `点图，展示在 Mac 上用 Qwen3 8B 时每次模型调用的 prompt token 数，每个任务和框架各运行三次。trivial 任务中，朴素循环和 create_agent 发送了 ${cell('trivial', 'plain').prompt_tokens_per_call[0][0]} 个 token，Deep Agents 发送了 ${cell('trivial', 'deep_agent').prompt_tokens_per_call[0][0]} 个。tools 任务的各次调用为 ${cell('tools', 'plain').prompt_tokens_per_call[0].join(' 和 ')}，对比 ${cell('tools', 'deep_agent').prompt_tokens_per_call[0].join(' 和 ')}。files 任务为 ${cell('files', 'plain').prompt_tokens_per_call[0].join(', ')}，对比 ${cell('files', 'deep_agent').prompt_tokens_per_call[0].join(', ')}。create_agent 每次调用发送的 token 数都与 朴素循环相同。`,
}, f => {
  const c = chart(f, { x: 70, y: 56, w: 540, h: 250, xDomain: [0, 12], yDomain: [0, 2600], yTicks: [0, 500, 1000, 1500, 2000, 2500], yLabel: '每次模型调用的 prompt token' });
  tasks.forEach((task, t) => {
    const base = t * 4;
    f.kicker(c.px(base + 2), 22, task, { anchor: 'middle' });
    if (t) f.rule(c.px(base), 56, c.px(base), 306, { hue: 'ink-mute', dash: 'dashed' });
    harnesses.forEach(([key, short, hue], h) => {
      const slot = base + 1 + h;
      const runs = cell(task, key).prompt_tokens_per_call;
      runs.forEach((calls, run) => calls.forEach((tokens, i) => f.dot(c.px(slot) + (i - (calls.length - 1) / 2) * 9, c.py(tokens), { hue, r: 2.4 + run * 0.6 })));
      const total = cell(task, key).prompt_tokens_total[0];
      const top = Math.max(...runs[0]);
      f.text(c.px(slot), c.py(top) - 9, String(total), { size: 11, anchor: 'middle', hue, knock: true });
      f.text(c.px(slot), 324, short, { size: 11, anchor: 'middle', hue: 'ink-soft' });
    });
  });
  f.text(70, 350, '每个点是一次模型调用。同一次运行的各次调用并排排列。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(70, 368, '同一格的三次运行相互重叠，因为每次重复发送的 token 数都相同。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(70, 386, '格子上方的数字是一次运行的 prompt 总数。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(70, 404, '朴素循环：基于 ollama 的循环。agent：create_agent。deep：create_deep_agent。', { size: 11, serif: true, hue: 'ink-soft' });
});
