'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/demos-mac.json')).deep_agent;
const hue = { main: 'blue', editor: 'indigo' };
const total = agent => data.totals[agent].input_tokens;

module.exports = figure('fig-7-5', {
  height: 380,
  title: 'deep agent 每次模型调用的提示词 token',
  desc: `在 Mac 上用 Qwen3 8B 运行一次 deep agent，其 ${data.calls.length} 次模型调用的提示词 token 点图。主 agent 调用了 ${data.totals.main.calls} 次，token 数为 ${data.calls.filter(c => c.agent === 'main').map(c => c.input_tokens).join(', ')}，共 ${total('main')}，绑定了 ${data.calls[0].tools} 个工具。editor 子 agent 调用了 ${data.totals.editor.calls} 次，token 数为 ${data.calls.filter(c => c.agent === 'editor').map(c => c.input_tokens).join(' 和 ')}，共 ${total('editor')}，绑定了 ${data.calls.find(c => c.agent === 'editor').tools} 个工具。`,
}, f => {
  const c = chart(f, { x: 70, y: 56, w: 540, h: 220, xDomain: [0.5, 7.5], yDomain: [0, 5000], xTicks: [1, 2, 3, 4, 5, 6, 7], yTicks: [0, 1000, 2000, 3000, 4000, 5000], yLabel: '该次调用的提示词 token', xLabel: '模型调用，按运行顺序' });
  data.calls.forEach(call => {
    f.dot(c.px(call.n), c.py(call.input_tokens), { hue: hue[call.agent], r: 4 });
    f.text(c.px(call.n), c.py(call.input_tokens) - 10, String(call.input_tokens), { size: 11, anchor: 'middle', hue: hue[call.agent], knock: true });
    f.text(c.px(call.n), c.py(0) - 8, call.tool_calls[0] || '回答', { size: 11, anchor: 'middle', hue: 'ink-soft', knock: true });
  });
  f.text(c.px(1.2), c.py(4700), `主 agent：${data.totals.main.calls} 次调用，${total('main')} token`, { size: 11.5, hue: 'blue', weight: 700 });
  f.text(c.px(3.6), c.py(1250), `editor 子 agent：${data.totals.editor.calls} 次调用，${total('editor')} token`, { size: 11.5, hue: 'indigo', weight: 700 });
  f.text(70, 334, '坐标轴上的标签是该次调用请求的工具。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(70, 352, `第 4、5 次调用在 task 工具内运行，绑定 ${data.calls[3].tools} 个工具，而不是 ${data.calls[0].tools} 个。`, { size: 11, serif: true, hue: 'ink-soft' });
});
