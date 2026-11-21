'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/retries-x86.json'));
const faults = [['m_drop_always', '每次调用都被断开'], ['m_refused_always', '每次调用都被拒绝'], ['m_timeout_always', '每次调用都超时']];
const configs = [['openai_client_default', '客户端默认', 'plum'], ['openai_mw_only', '仅中间件', 'blue'], ['openai_stacked', '两层叠加', 'rose']];
const cell = (fault, config) => data.cells[`${fault} ${config}`].model_attempts;

module.exports = figure('fig-3-2b', {
  height: 360,
  title: '一次失败的模型调用在中继处的尝试次数',
  desc: `点图，记录在 x86 服务器虚拟机上、Ollama 前面的中继处看到的模型尝试次数，模型为 Qwen3 4B，每个单元格运行 3 次。三组分别是每次调用都断开连接、端口被拒绝，以及每次调用都超时。在每一组里，ChatOpenAI 的客户端默认重试尝试了 ${cell('m_drop_always', 'openai_client_default')[0]} 次，关闭客户端重试的 ModelRetryMiddleware 尝试了 ${cell('m_drop_always', 'openai_mw_only')[0]} 次，两层一起尝试了 ${cell('m_drop_always', 'openai_stacked')[0]} 次。每个单元格的三次运行次数完全相同。`,
}, f => {
  const c = chart(f, { x: 70, y: 40, w: 540, h: 230, xDomain: [0, 12], yDomain: [0, 10], yTicks: [0, 1, 3, 7, 9], yLabel: '中继处的模型尝试次数' });
  f.rule(c.px(0), c.py(7), c.px(12), c.py(7), { hue: 'ink-mute', dash: 'dashed' });
  f.text(c.px(12) - 4, c.py(7) - 6, '文档所述的 6 次重试，共 7 次尝试', { size: 11, serif: true, anchor: 'end', hue: 'ink-mute', knock: true });
  faults.forEach(([fault, label], g) => {
    configs.forEach(([config, , hue], i) => {
      const slot = 1 + g * 4 + i;
      cell(fault, config).forEach((v, j) => f.dot(c.px(slot) + (j - 1) * 7, c.py(v), { hue, r: 3 }));
    });
    f.text(c.px(2 + g * 4), 290, label, { size: 11, anchor: 'middle', hue: 'ink-soft' });
  });
  configs.forEach(([, label, hue], i) => {
    const x = 70 + i * 180;
    f.dot(x + 4, 322, { hue, r: 3.5 });
    f.text(x + 14, 326, label, { size: 11.5, hue });
  });
  f.text(70, 350, '每个点是在 x86 服务器虚拟机上的一次运行。真实的 404 在每个单元格里只尝试 1 次。', { size: 11, serif: true, hue: 'ink-soft' });
});
