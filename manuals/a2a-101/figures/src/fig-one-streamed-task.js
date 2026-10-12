'use strict';

const { figure } = require('../../../_shared/figkit.js');

const PLANNER = 110;
const RUNNER = 400;
const MID = (PLANNER + RUNNER) / 2;

const rows = [
  { beat: 1, step: null, dir: 1, style: 'call', label: 'GET /.well-known/agent-card.json' },
  { beat: 1, step: null, dir: -1, style: 'reply', label: 'AgentCard, capabilities.streaming: true' },
  { beat: 2, step: null, dir: 1, style: 'call', label: 'SendStreamingMessage', note: "messageId 5bc8fbbc，无 taskId" },
  { beat: 2, step: null, dir: -1, style: 'reply', label: 'HTTP 200, text/event-stream' },
  { beat: 3, step: 1, dir: -1, style: 'event', label: 'task · TASK_STATE_SUBMITTED', note: "任务 728ba084，history 保存请求", time: '09:00:01.750Z' },
  { beat: 4, step: 2, dir: -1, style: 'event', label: 'statusUpdate · TASK_STATE_WORKING', note: 'Checking out 9f3c2e1 and starting the suite', time: '09:00:02.000Z' },
  { beat: 5, step: 3, dir: -1, style: 'event', label: 'artifactUpdate · test-log.txt', note: "首块：collected 12 items" },
  { beat: 6, step: 4, dir: -1, style: 'event', label: 'artifactUpdate · append' },
  { beat: 7, step: 5, dir: -1, style: 'event', label: 'artifactUpdate · append' },
  { beat: 8, step: 6, dir: -1, style: 'event', label: 'artifactUpdate · append' },
  { beat: 9, step: 7, dir: -1, style: 'event', label: 'artifactUpdate · append, lastChunk' },
  { beat: 10, step: 8, dir: -1, style: 'event', label: 'artifactUpdate · summary.json, lastChunk' },
  { beat: 11, step: 9, dir: -1, style: 'event', label: 'statusUpdate · TASK_STATE_COMPLETED', note: '1 failed, 11 passed', time: '09:00:02.250Z' },
];

const TOP = 84;
const ys = rows.reduce((list, row, index) => list.concat(index ? list[index - 1] + (rows[index - 1].note ? 46 : 34) : TOP), []);
const END = ys[ys.length - 1] + 30;

module.exports = figure('fig-one-streamed-task', {
  height: END + 34,
  title: "从读取卡片到关闭流的任务",
  desc: "两条生命线：planner 和 localhost:41241 的 test-runner。planner 读取 agent 卡片，发送带新 messageId、不带 taskId 的 SendStreamingMessage，得到 HTTP 200 和 text/event-stream。随后九个编号帧：TASK_STATE_SUBMITTED 的任务 728ba084，转 TASK_STATE_WORKING 的 statusUpdate，构建 test-log.txt 的五个 artifactUpdate 帧、最后一个带 lastChunk，一个 summary.json 的 artifactUpdate，以及转 TASK_STATE_COMPLETED 的 statusUpdate。只有第 1、2、9 帧有时间戳，为 09:00:01.750Z、09:00:02.000Z、09:00:02.250Z。随后服务器关闭流，没有 final 标志。",
}, f => {
  f.box({ x: PLANNER, y: 8, w: 132, h: 40, hue: 'violet', title: 'planner', sub: "客户端 agent", titleSize: 12, anchor: 'middle' });
  f.box({ x: RUNNER, y: 8, w: 140, h: 40, hue: 'blue', title: 'test-runner', sub: 'localhost:41241', titleSize: 12, anchor: 'middle' });
  f.kicker(488, 32, "套件时钟");
  f.lifeline(PLANNER, 48, END);
  f.lifeline(RUNNER, 48, END);

  rows.forEach((row, index) => {
    const y = ys[index];
    f.beat(row.beat);
    if (row.step) f.step(24, y, row.step, { hue: 'indigo' });
    const [x1, x2] = row.dir > 0 ? [PLANNER, RUNNER - 1] : [RUNNER, PLANNER + 1];
    f.arrow([x1, y], [x2, y], { style: row.style, label: row.label, note: row.note, labelX: MID });
    if (row.time) f.text(488, y + 4, row.time, { size: 11, hue: 'amber' });
  });

  f.beat(10);
  const first = ys[6];
  const last = ys[11];
  f.rule(484, first - 8, 484, last + 8, { hue: 'ink-mute' });
  ["第 3 至第 8 帧", "不带", '时间戳'].forEach((line, index) => f.text(492, (first + last) / 2 - 10 + index * 14, line, { size: 11, serif: true, hue: 'ink-soft' }));

  f.beat(12);
  f.rule(PLANNER - 12, END, PLANNER + 12, END, { hue: 'ink', width: 1.6 });
  f.rule(RUNNER - 12, END, RUNNER + 12, END, { hue: 'ink', width: 1.6 });
  f.text(MID, END + 22, "服务器在第 9 帧后关闭流，没有 final 标志", { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
});
