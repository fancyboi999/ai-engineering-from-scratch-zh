'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/import-times-mac.json'));
const order = ['baseline_pass', 'openai', 'langgraph_only', 'langchain_stack'];
const short = { baseline_pass: 'pass', openai: 'openai', langgraph_only: 'langgraph', langchain_stack: 'agent' };
const hue = { baseline_pass: 'grey', openai: 'olive', langgraph_only: 'indigo', langchain_stack: 'blue' };
const t = id => data.targets[id];

module.exports = figure('fig-3-1b', {
  height: 380,
  title: '四种导入的导入耗时，各 10 次运行',
  desc: `导入耗时（秒）的点图，在 Mac 上每种导入在新的 Python 进程中运行 10 次，左侧是磁盘上已有字节码，右侧是没有字节码。有字节码时的中位数：pass ${t('baseline_pass').warm_median} s，import openai ${t('openai').warm_median} s，langgraph 的 StateGraph ${t('langgraph_only').warm_median} s，create_agent 加 ChatOpenAI ${t('langchain_stack').warm_median} s。没有字节码时的中位数依次为 ${t('baseline_pass').cold_median} s、${t('openai').cold_median} s、${t('langgraph_only').cold_median} s 和 ${t('langchain_stack').cold_median} s。`,
}, f => {
  const c = chart(f, { x: 70, y: 40, w: 540, h: 260, xDomain: [0, 9], yDomain: [0, 3], yTicks: [0, 0.5, 1, 1.5, 2, 2.5, 3], yLabel: '秒' });
  f.kicker(70 + 135, 30, '磁盘上有字节码', { anchor: 'middle' });
  f.kicker(70 + 405, 30, '没有字节码', { anchor: 'middle' });
  f.rule(c.px(4.5), 40, c.px(4.5), 300, { hue: 'ink-mute', dash: 'dashed' });
  ['warm', 'cold'].forEach((kind, k) => {
    order.forEach((id, i) => {
      const slot = 1 + k * 4.5 + i;
      const runs = t(id)[kind];
      runs.forEach((v, j) => f.dot(c.px(slot) + (j - 4.5) * 2.2, c.py(v), { hue: hue[id], r: 2.6 }));
      const med = t(id)[`${kind}_median`];
      f.rule(c.px(slot) - 16, c.py(med), c.px(slot) + 16, c.py(med), { hue: hue[id], width: 2 });
      f.text(c.px(slot), c.py(med) - 9, String(med), { size: 11, anchor: 'middle', hue: hue[id], knock: true });
      f.text(c.px(slot), 318, short[id], { size: 11, anchor: 'middle', hue: 'ink-soft' });
    });
  });
  f.text(70, 346, 'pass：空程序。agent：create_agent 加 ChatOpenAI。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(70, 364, '每个点是在 Mac 上的一次运行。每条短线是 10 次的中位数。', { size: 11, serif: true, hue: 'ink-soft' });
});
