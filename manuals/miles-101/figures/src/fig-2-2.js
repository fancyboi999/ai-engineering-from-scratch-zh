'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/miles-gb10-lab.json')).runs;
const base = runs['e3e-base-frac025'].per_step;
const kept = runs['e3f-no-offload-rollout-frac025'].per_step;
const both = base.filter((r, i) => !r.rollout_paused_s && !kept[i].rollout_paused_s).map(r => r.step);
const items = [];
for (const s of both) {
  items.push({ name: `第 ${s} 步`, value: base[s].rollout_time_s, hue: 'grey', label: `${base[s].rollout_time_s.toFixed(1)} s` });
  items.push({ name: `第 ${s} 步`, value: kept[s].rollout_time_s, hue: 'violet', label: `${kept[s].rollout_time_s.toFixed(1)} s` });
}

module.exports = figure('fig-2-2', {
  height: 330,
  title: '保持 engine 加载可节省一两秒',
  desc: `同一天、随机种子 1、engine 内存比例 0.25 的两次运行中，都未受 heat pause 影响的步骤的 rollout 耗时。对比默认 offload 与 --no-offload-rollout：${both.map(s => `第 ${s} 步，${base[s].rollout_time_s.toFixed(1)} 对比 ${kept[s].rollout_time_s.toFixed(1)} s`).join('；')}。`,
}, f => {
  const c = chart(f, { x: 60, y: 56, w: 560, h: 200, xDomain: [0, 1], yDomain: [0, 80], yTicks: [0, 80], yLabel: 'clean step rollout 耗时（秒）' });
  c.bars(items, { width: 52 });
  legend(f, [{ name: '默认 offload', hue: 'grey' }, { name: 'engine 保持加载', hue: 'violet' }], 60, 22);
  f.text(60, 314, '步骤和答案长度相近时，耗时差为 0.6 至 1.8 s。', { size: 12, serif: true });
});
