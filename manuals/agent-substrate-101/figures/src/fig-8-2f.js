'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const drain = load(path.join(__dirname, '../../capture/lab/summary/node-drain-x86.json'));
const names = {
  a: ['RUNNING，', '每秒 1 个请求'],
  b: ['--mode sync 挂起，', '排空期间无请求'],
  b2: ['--mode sync 挂起，', '排空 2 s 后开始发请求'],
  c: ['默认模式挂起，', '最新快照仍为 PENDING'],
  d: ['RUNNING，', '1 个 120 s 长请求未结束'],
};
const LEFT = 188;
const RIGHT = 460;
const FIRST = -5;
const LAST = 70;
const px = t => LEFT + (Math.min(Math.max(t, FIRST), LAST) - FIRST) * (RIGHT - LEFT) / (LAST - FIRST);
const TOP = 52;
const STEP = 50;

function outcome(item) {
  if (item.revert) return [`${item.failed_after_drain}/${item.requests_after_drain} 个请求失败`, `回退后 ${item.revert.seconds_to_first_ok} s 返回 200`];
  return [`${item.ok_after_drain}/${item.requests_after_drain} 个返回 200`, `首个响应耗时 ${item.first_ok_seconds.toFixed(2)} s`];
}

module.exports = figure('fig-8-2f', {
  height: TOP + STEP * drain.cases.length + 62,
  title: '五次排空同一 worker 节点时的逐请求表现',
  desc: `五行分别对应执行 kubectl drain 时处于不同状态的 actor。两个处于 RUNNING 状态的 actor 在排空后所有请求均失败（分别为 ${drain.cases[0].failed_after_drain}/${drain.cases[0].requests_after_drain} 与 ${drain.cases[4].failed_after_drain}/${drain.cases[4].requests_after_drain}），直至我们手动发送回退。三个处于挂起状态的 actor 无需任何命令，排空后首个请求即在另一节点上返回 200。`,
}, f => {
  f.rect(20, 14, 4, 10, { fill: color('green-ink'), stroke: 'none' });
  f.text(30, 23, '单次请求，200', { size: 11, hue: 'ink-soft' });
  f.rect(150, 14, 4, 10, { fill: color('rose-ink'), stroke: 'none' });
  f.text(160, 23, '单次请求，失败', { size: 11, hue: 'ink-soft' });
  f.rule(298, 12, 298, 26, { hue: 'ink', dash: 'dashed' });
  f.text(306, 23, '手动发送的回退', { size: 11, hue: 'ink-soft' });
  f.rect(470, 14, 12, 10, { hue: 'grey', stroke: 'none' });
  f.text(488, 23, 'kubectl drain 执行期', { size: 11, hue: 'ink-soft' });

  drain.cases.forEach((item, index) => {
    const y = TOP + index * STEP;
    const [first, second] = names[item.case];
    f.text(20, y + 12, first, { size: 11.5, serif: true, hue: 'ink' });
    f.text(20, y + 27, second, { size: 11.5, serif: true, hue: 'ink-soft' });
    f.rule(px(FIRST), y + 30, px(LAST), y + 30, { hue: 'ink-soft' });
    f.rect(px(0), y + 2, px(item.drain_returned_seconds) - px(0), 28, { hue: 'grey', stroke: 'none' });
    const flight = item.request_in_flight;
    if (flight) f.rect(px(flight.sent_t), y + 20, px(flight.returned_t) - px(flight.sent_t), 6, { fill: color('rose-ink'), stroke: 'none' });
    for (const probe of item.probes) {
      if (probe.t > LAST) continue;
      f.rect(px(probe.t) - 1.5, y + 6, 3, 14, { fill: color(probe.code === '200' ? 'green-ink' : 'rose-ink'), stroke: 'none' });
    }
    if (item.revert) f.rule(px(item.revert.t), y - 2, px(item.revert.t), y + 34, { hue: 'ink', dash: 'dashed' });
    const [head, tail] = outcome(item);
    f.text(RIGHT + 12, y + 12, head, { size: 11, weight: 700, hue: item.revert ? 'rose' : 'green' });
    f.text(RIGHT + 12, y + 27, tail, { size: 11, serif: true, hue: 'ink-soft' });
  });

  const axis = TOP + drain.cases.length * STEP + 6;
  f.rule(px(FIRST), axis, px(LAST), axis, { hue: 'ink' });
  for (const t of [0, 10, 20, 30, 40, 50, 60, 70]) {
    f.rule(px(t), axis - 4, px(t), axis + 4, { hue: 'ink' });
    f.text(px(t), axis + 18, `${t} s`, { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  f.text((px(FIRST) + px(LAST)) / 2, axis + 38, '自执行 drain 命令起算的秒数', { size: 11.5, serif: true, anchor: 'middle', hue: 'ink-soft' });
});
