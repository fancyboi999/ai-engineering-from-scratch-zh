'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-message-or-task', {
  height: 396,
  title: "同一方法，两种结果结构",
  desc: "planner 向 code-reviewer 发送 SendMessage，agent 逻辑决定结构。不带 text/x-diff part 的问题得到 result.message，即上下文 dc423c62 中的消息 3b4b1206。客户端只能读 parts，并在该上下文发送新消息。diff 得到 result.task，即上下文 49c5a238 中、状态 TASK_STATE_INPUT_REQUIRED 的任务 e5c95b09。客户端可用该 taskId 回答，或通过 GetTask、SubscribeToTask、CancelTask 跟踪和操作任务。",
}, f => {
  const send = f.box({ x: 170, y: 14, w: 300, h: 44, hue: 'violet', title: 'SendMessage', sub: "planner 到 code-reviewer，同一方法" });

  f.beat(1);
  const decide = f.box({ x: 150, y: 86, w: 340, h: 54, hue: 'plum', title: "code-reviewer 决定", sub: ["无 text/x-diff part 的问题：消息", "其他情况：任务"] });
  f.arrow(send.bottom(), [send.cx, decide.y - 1], { style: 'call' });

  f.beat(2);
  const message = f.box({ x: 20, y: 192, w: 280, h: 58, hue: 'blue', title: 'result.message', sub: ['messageId 3b4b1206', "contextId dc423c62，无任务 ID"] });
  f.path(`M250 ${decide.y + decide.h} V164 H${message.cx} V${message.y - 1}`, { style: 'reply' });
  f.text(message.cx, 158, "问题（02）", { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });

  f.beat(3);
  const task = f.box({ x: 340, y: 192, w: 280, h: 58, hue: 'amber', title: 'result.task', sub: ['id e5c95b09, contextId 49c5a238', 'TASK_STATE_INPUT_REQUIRED'] });
  f.path(`M390 ${decide.y + decide.h} V164 H${task.cx} V${task.y - 1}`, { style: 'reply' });
  f.text(task.cx, 158, "diff（06）", { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });

  f.beat(4);
  f.kicker(176, 280, "客户端下一步能做什么");
  const reuse = f.box({ x: 20, y: 290, w: 280, h: 46, hue: 'violet', title: "新的 SendMessage", sub: "用 contextId dc423c62 继续" });
  f.arrow(message.bottom(), [message.cx, reuse.y - 1], { style: 'call' });
  f.text(20, 362, "没有可轮询、取消或订阅的任务。", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 378, "消息就是完整答案。", { size: 11, serif: true, hue: 'ink-soft' });

  f.beat(5);
  const act = f.box({ x: 340, y: 290, w: 280, h: 82, hue: 'violet', title: "操作任务 e5c95b09", sub: ["带其 taskId 的 SendMessage 回答", "GetTask、SubscribeToTask 跟踪", "CancelTask 请求停止"] });
  f.arrow(task.bottom(), [task.cx, act.y - 1], { style: 'call' });
});
