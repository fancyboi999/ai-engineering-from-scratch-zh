'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { x: 96, title: 'planner', sub: "客户端 agent", hue: 'violet' },
  { x: 338, title: 'test-runner', sub: 'localhost:41241', hue: 'blue' },
  { x: 556, title: "任务存储", sub: "test-runner 内部", hue: 'teal' },
];

const rows = [
  [1, 0, 1, 'call', 'SendStreamingMessage', "在 9f3c2e1 运行全套测试"],
  [2, 1, 0, 'event', "第 1 帧 · task SUBMITTED", "任务 25239d4c"],
  [2, 1, 0, 'event', "第 2 帧 · statusUpdate WORKING", null],
  [3, 1, 0, 'event', "第 3 帧 · artifactUpdate", "test_suite_01，命名 test-log.txt"],
  [3, 1, 0, 'event', "第 4 帧 · artifactUpdate", 'test_suite_02, append: true'],
  [4, 'closed'],
  [5, 1, 2, 'write', "追加 test_suite_03", "没有打开的流"],
  [5, 1, 2, 'write', "追加 test_suite_04", "无人收到帧"],
  [6, 0, 1, 'call', 'SubscribeToTask 25239d4c', null],
  [6, 2, 1, 'reply', "存储任务", "已有日志 part 01 至 04"],
  [7, 1, 0, 'event', "第 1 帧 · task WORKING", "快照：test-log.txt，4 个 part"],
  [8, 1, 0, 'event', "第 2 至第 5 帧 · artifactUpdate", "test_suite_05 至 08，08 带 lastChunk"],
  [8, 1, 0, 'event', "第 6 帧 · statusUpdate COMPLETED", "96 passed，随后关闭流"],
  [9, 0, 1, 'call', 'SubscribeToTask 25239d4c', "结束后再次调用"],
  [9, 1, 0, 'fail', '-32004 UnsupportedOperationError', "任务已 TASK_STATE_COMPLETED"],
];

const STEP = 40;
const TOP = 82;
const height = TOP + rows.length * STEP + 4;

module.exports = figure('fig-stream-resubscribe', {
  height,
  title: "断开的流与订阅",
  desc: "三条生命线：planner、test-runner、其任务存储。planner 打开 SendStreamingMessage，收到四帧：TASK_STATE_SUBMITTED 任务、working 状态、test-log.txt 的两个 artifactUpdate 分块，随后关闭连接。test-runner 在无流打开时将分块 03、04 追加到存储任务，没有客户端看到。planner 调用 SubscribeToTask，test-runner 读取存储任务，首帧是 Task 快照，test-log.txt 已有四个 part。第 2 至第 5 帧带分块 05 至 08，第 6 帧带 completed 状态，随后关闭流。对已结束任务第二次 SubscribeToTask 以 -32004 UnsupportedOperationError 失败。",
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x, y: 10, w: 136, h: 40, hue: lane.hue, title: lane.title, sub: lane.sub, titleSize: 12, anchor: 'middle' });
    f.lifeline(lane.x, 50, height - 8);
  }
  let step = 0;
  rows.forEach((row, index) => {
    const y = TOP + index * STEP;
    f.beat(row[0]);
    if (row[1] === 'closed') {
      const x = lanes[0].x;
      f.rule(x - 30, y, x + 30, y, { hue: 'rose', width: 2 });
      f.text(x + 38, y + 4, "客户端关闭连接", { size: 11, serif: true, hue: 'rose', weight: 700 });
      return;
    }
    const [, from, to, style, label, note] = row;
    step += 1;
    f.step(24, y, step);
    const x1 = lanes[from].x;
    const x2 = lanes[to].x;
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note: note || undefined, labelX: (x1 + x2) / 2 });
  });
});
