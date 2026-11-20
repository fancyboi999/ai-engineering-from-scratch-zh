'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');
const lane = require('../lib/swimlane.js');

const S = load(path.join(__dirname, '../../capture/lab/summary/multiagent-mac.json'));
const TASK = 'chain01';
const runs = S.patterns.map(p => {
  const r = S.lanes[`${TASK}|${p}`];
  if (!r) throw new Error(`fig-6-7c: no recorded run of ${TASK} for ${p}`);
  return r;
});
const tmax = Math.ceil(Math.max(...runs.map(r => Math.max(...r.events.map(e => e.t1)))) / 5) * 5;
const multi = runs.some(r => r.turn_calls.length > 1);
const body = runs.reduce((h, r) => h + lane.panelHeight(r), 0);
const height = 20 + body + 30 + (multi ? 44 : 28);

module.exports = figure('fig-6-7c', {
  height,
  title: `${TASK} 经过各模式的一次录制运行`,
  desc: `五个泳道面板，每个模式一个，任务为 ${TASK}，模型为 Claude Haiku 5.5，共用 ${tmax} 秒的时间轴。每条泳道是一个智能体，每个梅紫方框是一次模型调用，每个三角形是一次工具调用。${runs.map(r => `${lane.PATTERN_NAME[r.pattern]}：${r.calls} 次模型调用，${r.in} 个输入 token，${r.wall.toFixed(1)} s，${r.passed ? '通过' : '失败'}`).join('；')}。`,
}, f => {
  let y = 12;
  runs.forEach((r, i) => {
    y += lane.panel(f, { x: 16, y, w: 608, run: r, tmax, beat: i + 1 });
  });
  f.beat(6);
  y += lane.axis(f, { x: 16, y: y - 4, w: 608, tmax, step: tmax > 20 ? 5 : 2 });
  lane.legend(f, { x: 16, y: y + 12, turns: multi });
});
