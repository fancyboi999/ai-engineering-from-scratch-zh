'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/agent-executor-second-x86.json'));
const flight = data.worker_loss_in_flight;
const short = state => state.replace('SNAPSHOT_STORAGE_STATE_', '');
const two = value => value.toFixed(2);
const rows = [
  { run: flight.snapshot_pending, label: '第 3 次运行，' },
  { run: flight.snapshot_durable, label: '第 4 次运行，' },
];
const LEFT = 168;
const RIGHT = 388;
const FIRST = -8;
const LAST = 2.5;
const px = t => LEFT + (t - FIRST) * (RIGHT - LEFT) / (LAST - FIRST);
const TOP = 50;
const STEP = 58;

module.exports = figure('fig-7-5d', {
  height: TOP + STEP * rows.length + 64,
  title: '删除 worker pod 时仍处于打开状态的 ax ssh 命令',
  desc: `两次运行，每行一次。每次运行中 ax ssh 命令每秒打印一行，并在输出 ${rows[0].run.ticks_received} 行后删除该 task 所在的 worker pod。两次运行中命令分别在删除后 ${two(rows[0].run.stream_ended_after_delete_seconds)} 秒与 ${two(rows[1].run.stream_ended_after_delete_seconds)} 秒报错退出；分别在 ${rows[0].run.crashed_seen_after_seconds} 秒与 ${rows[1].run.crashed_seen_after_seconds} 秒观测到 actor 变为 CRASHED，没有任何机制重新启动该命令。执行 ax resume task 后，该命令新写入的文件在两次运行中均已丢失；上次挂起前写入的记录在第一次运行（快照状态 ${short(rows[0].run.durable_snapshot_at_last_suspend)}）中丢失，在第二次运行（快照状态 ${short(rows[1].run.durable_snapshot_at_last_suspend)}）中得以保留。`,
}, f => {
  f.rect(20, 14, 4, 10, { fill: color('green-ink'), stroke: 'none' });
  f.text(30, 23, '命令输出的一行', { size: 11, hue: 'ink-soft' });
  f.rect(214, 14, 4, 10, { fill: color('rose-ink'), stroke: 'none' });
  f.text(224, 23, '命令报错退出', { size: 11, hue: 'ink-soft' });
  f.rule(440, 12, 440, 26, { hue: 'ink', dash: 'dashed' });
  f.text(448, 23, '观测到 actor 变为 CRASHED', { size: 11, hue: 'ink-soft' });

  rows.forEach((row, index) => {
    const y = TOP + index * STEP;
    const run = row.run;
    f.text(20, y + 12, row.label, { size: 11.5, serif: true, hue: 'ink' });
    f.text(20, y + 27, `丢失前 ${Math.round(run.suspend_to_loss_seconds)} s 挂起`, { size: 11.5, serif: true, hue: 'ink-soft' });
    f.rule(px(FIRST), y + 30, px(LAST), y + 30, { hue: 'ink-soft' });
    for (const t of run.tick_seconds_from_delete) f.rect(px(t) - 1.5, y + 6, 3, 14, { fill: color('green-ink'), stroke: 'none' });
    f.rect(px(run.stream_ended_after_delete_seconds) - 1.5, y + 2, 3, 22, { fill: color('rose-ink'), stroke: 'none' });
    f.rule(px(run.crashed_seen_after_seconds), y - 2, px(run.crashed_seen_after_seconds), y + 34, { hue: 'ink', dash: 'dashed' });
    const kept = run.file_from_before_last_suspend_kept;
    f.text(RIGHT + 14, y + 12, `${two(run.stream_ended_after_delete_seconds)} s 后报错，无重试`, { size: 11, weight: 700, hue: 'rose' });
    f.text(RIGHT + 14, y + 27, `${short(run.durable_snapshot_at_last_suspend)}：旧文件${kept ? '保留' : '丢失'}，新文件丢失`, { size: 11, serif: true, hue: 'ink-soft' });
  });

  const axis = TOP + rows.length * STEP + 6;
  f.rule(px(FIRST), axis, px(LAST), axis, { hue: 'ink' });
  for (const t of [-6, -4, -2, 0, 2]) {
    f.rule(px(t), axis - 4, px(t), axis + 4, { hue: 'ink' });
    f.text(px(t), axis + 18, `${t} s`, { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  f.text((px(FIRST) + px(LAST)) / 2, axis + 38, '自删除 worker pod 起算的秒数', { size: 11.5, serif: true, anchor: 'middle', hue: 'ink-soft' });
});
