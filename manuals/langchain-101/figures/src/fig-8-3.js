'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/overhead-mac-real.json'));
const v = data.variants;
const programs = [
  ['a_plain_openai', ['plain', 'openai 循环'], 'grey'],
  ['b_bind_tools_loop', ['ChatOpenAI', 'bind_tools 循环'], 'blue'],
  ['c_create_agent', ['create_agent'], 'blue'],
  ['d_create_agent_saver', ['create_agent', 'InMemorySaver'], 'teal'],
  ['e_stategraph', ['手写', 'StateGraph'], 'blue'],
];

module.exports = figure('fig-8-3', {
  height: 380,
  title: '三次 Qwen3 4B 调用的一次运行中，模型之外的耗时',
  desc: `点图，展示 Mac 上每次运行在模型之外花费的毫秒数，每个程序 ${v.a_plain_openai.n} 次运行，对象是 Ollama 上的 Qwen3 4B，经一个给每次模型调用计时的代理访问。中位数：plain openai 循环 ${v.a_plain_openai.framework_ms_median} ms，ChatOpenAI bind_tools 循环 ${v.b_bind_tools_loop.framework_ms_median} ms，create_agent ${v.c_create_agent.framework_ms_median} ms，带 InMemorySaver 的 create_agent ${v.d_create_agent_saver.framework_ms_median} ms，手写 StateGraph ${v.e_stategraph.framework_ms_median} ms。`,
}, f => {
  const c = chart(f, { x: 70, y: 40, w: 540, h: 250, xDomain: [0, 5], yDomain: [0, 80], yTicks: [0, 20, 40, 60, 80], yLabel: '模型之外的毫秒数' });
  programs.forEach(([key, label, hue], i) => {
    const cx = c.px(i + 0.5);
    const d = v[key].framework_ms.map((ms, j) => `M${Math.round(cx + ((j * 37) % 61 - 30) * 1.3) - 2} ${Math.round(c.py(ms))}a2 2 0 1 0 4 0a2 2 0 1 0-4 0`).join('');
    f.mark(d, { hue });
    const med = v[key].framework_ms_median;
    f.rule(cx - 44, c.py(med), cx + 44, c.py(med), { hue: 'ink', width: 2 });
    f.text(cx, c.py(med) - 8, `${med} ms`, { size: 11, hue: 'ink', anchor: 'middle', knock: true, weight: 700 });
    label.forEach((line, k) => f.text(cx, 308 + k * 14, line, { size: 11, anchor: 'middle', hue: 'ink-soft' }));
  });
  f.text(70, 356, `每个点是一次含三次模型调用和两次工具调用的运行，每个程序 ${v.a_plain_openai.n} 次。`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(70, 372, '黑线是中位数。预热轮次不计入。', { size: 11, serif: true, hue: 'ink-soft' });
});
