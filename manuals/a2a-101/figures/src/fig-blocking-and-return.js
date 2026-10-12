'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const TICKS = { submitted: 200, working: 360, completed: 520 };
const CHUNKS = [375, 440, 455, 470, 485, 500];

const tracks = [
  {
    y: 64,
    kicker: "A · 阻塞",
    label: "SendMessage 无 configuration，任务 3d8f7801",
    marks: [
      { x: TICKS.submitted, seen: false, text: "不可见", beat: 1 },
      { x: TICKS.working, seen: false, text: "不可见", beat: 1 },
      { x: TICKS.completed, seen: true, text: '09:00:00.750', beat: 2 },
    ],
    chunks: [{ at: CHUNKS, beat: 1 }],
    requests: [{ x1: 50, x2: TICKS.completed, step: 1, text: "一个请求，保持到回复", beat: 1 }],
  },
  {
    y: 164,
    kicker: "B · 立即返回",
    label: "returnImmediately 后 GetTask 两次，任务 d0c28826",
    marks: [
      { x: TICKS.submitted, seen: true, text: '09:00:01.000', beat: 3 },
      { x: TICKS.working, seen: true, text: '09:00:01.250', beat: 4 },
      { x: TICKS.completed, seen: true, text: '09:00:01.500', beat: 5 },
    ],
    chunks: [{ at: CHUNKS.slice(0, 1), beat: 4 }, { at: CHUNKS.slice(1), beat: 5 }],
    requests: [
      { x1: 50, x2: TICKS.submitted, step: 2, text: 'SendMessage', beat: 3 },
      { x1: 392, x2: 432, step: 3, beat: 4 },
      { x1: 540, x2: 580, step: 4, beat: 5 },
    ],
  },
];

const key = [
  [1, "阻塞 SendMessage：一次回复，已完成任务含 test-log.txt 和 summary.json"],
  [2, "带 returnImmediately 的 SendMessage：回复含 TASK_STATE_SUBMITTED"],
  [3, "GetTask，historyLength 0：TASK_STATE_WORKING 和五个日志 part 的第一个"],
  [4, "GetTask，historyLength 0：TASK_STATE_COMPLETED、五个日志 part 和 summary.json"],
];

module.exports = figure('fig-blocking-and-return', {
  height: 334,
  title: "阻塞调用与立即返回调用",
  desc: "两条时间线在请求处对齐，使用套件时钟。A：任务 3d8f7801 的阻塞 SendMessage 在 TASK_STATE_SUBMITTED、TASK_STATE_WORKING 和六个产物分块到达期间保持打开，客户端看不到这两种状态。09:00:00.750 到 TASK_STATE_COMPLETED 时回复。B：任务 d0c28826 的 SendMessage 设置 returnImmediately，在 09:00:01.000 的 TASK_STATE_SUBMITTED 返回。首次 GetTask 在 09:00:01.250 看到 TASK_STATE_WORKING 和一个日志 part，第二次在 09:00:01.500 看到 TASK_STATE_COMPLETED 及全部产物。",
}, f => {
  for (const track of tracks) {
    f.kicker(20, track.y - 46, track.kicker);
    f.text(150, track.y - 46, track.label, { size: 11, serif: true, hue: 'ink-soft' });
    f.rule(40, track.y, 620, track.y, { hue: 'ink-mute' });
  }
  f.rule(40, 212, 620, 212, { hue: 'ink' });
  for (const [name, x] of [['TASK_STATE_SUBMITTED', TICKS.submitted], ['TASK_STATE_WORKING', TICKS.working], ['TASK_STATE_COMPLETED', TICKS.completed]]) {
    f.rule(x, 208, x, 216, { hue: 'ink' });
    f.text(x, 230, name, { size: 11, anchor: 'middle', hue: 'amber' });
  }
  f.kicker(20, 230, "套件时钟");
  key.forEach(([step, text], index) => {
    const y = 258 + index * 20;
    f.step(30, y - 4, step, { hue: 'violet' });
    f.text(48, y, text, { size: 11, serif: true });
  });

  for (let beat = 1; beat <= 5; beat += 1) {
    f.beat(beat);
    for (const track of tracks) {
      for (const request of track.requests.filter(item => item.beat === beat)) {
        f.rect(request.x1, track.y + 10, request.x2 - request.x1, 20, { hue: 'violet' });
        f.step(request.text ? request.x1 + 13 : (request.x1 + request.x2) / 2, track.y + 20, request.step, { hue: 'violet' });
        if (request.text) f.text(request.x1 + 28, track.y + 24, request.text, { size: 11, hue: 'violet' });
      }
      for (const group of track.chunks.filter(item => item.beat === beat)) {
        for (const x of group.at) f.rule(x, track.y - 6, x, track.y + 6, { hue: 'green', width: 2 });
      }
      for (const mark of track.marks.filter(item => item.beat === beat)) {
        f.rect(mark.x - 4, track.y - 4, 8, 8, mark.seen ? { fill: color('amber-ink'), stroke: 'none' } : { fill: color('paper'), stroke: color('amber-ink') });
        f.text(mark.x, track.y - 14, mark.text, { size: 11, serif: true, anchor: 'middle', hue: mark.seen ? 'amber' : 'ink-mute' });
      }
    }
  }
});
