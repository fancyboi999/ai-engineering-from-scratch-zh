'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/miles-gb10-lab.json')).runs;
const base = runs['e6a-base'].per_step;
const dapo = runs['e2b-dapo-filter'].per_step;
const work = r => r.rollout_time_s - r.rollout_paused_s;
const dropped = r => r.dropped_all_wrong + r.dropped_all_right;
const median = v => { const s = [...v].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const one = dapo.filter(r => dropped(r) <= 16);
const two = dapo.filter(r => dropped(r) > 16);

module.exports = figure('fig-3-2', {
  height: 340,
  title: 'filter 会额外消耗一到两批 prompt',
  desc: `随机种子 1 的 12 步训练中，每步 rollout 耗时扣除了 heat guard 暂停。未使用 filter 时中位数为 ${median(base.map(work)).toFixed(1)} s。使用 filter、每批 48 个 prompt 时，丢弃 16 组或更少的步骤只需一批，中位数为 ${median(one.map(work)).toFixed(1)} s。丢弃更多组的步骤需要第二批，中位数为 ${median(two.map(work)).toFixed(1)} s。`,
}, f => {
  const c = chart(f, { x: 60, y: 56, w: 560, h: 200, xDomain: [0, 11], yDomain: [0, 200], xTicks: [0, 3, 6, 9, 11], yTicks: [0, 100, 200], xLabel: '训练步骤', yLabel: 'rollout 秒数，已扣除暂停' });
  c.series(base.map(r => [r.step, work(r)]), { hue: 'grey', name: '不启用 filter' });
  c.series(dapo.map(r => [r.step, work(r)]), { hue: 'violet', name: 'filter' });
  c.note(1, work(dapo[1]), '一批', { anchor: 'middle', dy: 18, hue: 'violet', serif: false });
  c.note(7.5, Math.min(work(dapo[7]), work(dapo[8])), '一批', { anchor: 'middle', dy: 18, hue: 'violet', serif: false });
  legend(f, [{ name: '不启用 filter', hue: 'grey' }, { name: 'DAPO filter，每批 48 个 prompt', hue: 'violet' }], 60, 22);
  f.text(60, 326, `中位数：不启用 filter 为 ${median(base.map(work)).toFixed(0)} s；使用一批为 ${median(one.map(work)).toFixed(0)} s；使用两批为 ${median(two.map(work)).toFixed(0)} s。`, { size: 12, serif: true });
});
