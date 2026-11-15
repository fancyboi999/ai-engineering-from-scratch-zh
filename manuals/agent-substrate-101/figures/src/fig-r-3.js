'use strict';

const { figure } = require('../../../_shared/figkit.js');

const L = 20;
const M = 250;
const R = 480;
const W = 140;
const H = 62;
const ROWS = [64, 150, 236, 322];
const mid = row => ROWS[row] + H / 2;
const CODE = { style: 'state', hue: 'ink-mute', dash: 'dotted' };
const key = [
  '琥珀色箭头：实测触发的状态转换。玫红色箭头：实测触发的故障转换。',
  '灰色点线箭头：源码中存在但本次未实测触发的状态转换。',
  '虚线边框：工作流途经的中间状态。双线边框：随后即删除记录的终止状态。',
  '发往 CRASHED 状态 actor 的请求返回 503，响应体为 AssignWorker prerequisite not met。',
  '对 CRASHED 状态的 actor 调用 ResumeActor 返回 FailedPrecondition。',
  '对 SUSPENDED 状态的 actor 调用 SuspendActor 不产生任何变化。',
];

module.exports = figure('fig-r-3', {
  height: 596,
  title: '七种 actor 状态、全部转换路径及各状态下的请求响应',
  desc: '标注各状态枚举编号的状态转换参考图。CreateActor 创建处于 4 SUSPENDED 的 actor。ResumeActor 使其经 1 RESUMING 进入 2 RUNNING，SuspendActor 使其经 3 SUSPENDING 回到 SUSPENDED。恢复失败、沙箱丢失或挂起失败会使其进入 5 CRASHED（此时请求返回 503）。RevertActor 将处于崩溃、运行或挂起状态的 actor 经 7 REVERTING 回退至 SUSPENDED。DeleteActor 可将任意状态的 actor 转入 6 DELETING。每个状态框均标出实测中的请求响应结果。',
}, f => {
  f.rect(L, ROWS[0], W, ROWS[3] + H - ROWS[0], { hue: 'amber' });
  f.text(L + W / 2, 250, '4 SUSPENDED', { size: 12, weight: 700, anchor: 'middle' });
  f.text(L + W / 2, 267, '不占用 worker', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.text(L + W / 2, 282, '请求：恢复后', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.text(L + W / 2, 297, '0.36 s 返回 200', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });

  f.rect(R, ROWS[0], W, ROWS[2] + H - ROWS[0], { hue: 'amber' });
  f.text(R + W / 2, 122, '2 RUNNING', { size: 12, weight: 700, anchor: 'middle' });
  f.text(R + W / 2, 139, '占用一个 worker', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.text(R + W / 2, 154, '请求：0.06 至', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.text(R + W / 2, 169, '0.09 s 返回 200', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.text(R + W / 2, 214, '沙箱内进程退出：', { size: 11, serif: true, hue: 'rose', anchor: 'middle' });
  f.text(R + W / 2, 229, '仍显示 RUNNING，', { size: 11, serif: true, hue: 'rose', anchor: 'middle' });
  f.text(R + W / 2, 244, '请求返回 503', { size: 11, serif: true, hue: 'rose', anchor: 'middle' });

  const state = (row, title, sub, extra = {}) => f.box({ x: M, y: ROWS[row], w: W, h: H, hue: 'amber', title, titleSize: 12, sub, pad: 4, dash: 'dashed', ...extra });
  state(0, '3 SUSPENDING', ['写入检查点', '请求：未记录']);
  state(1, '1 RESUMING', ['恢复沙箱环境', '请求：未记录']);
  state(2, '5 CRASHED', ['保持至 RevertActor', '请求：0.06 s 返回 503'], { hue: 'rose', dash: undefined, strokeWidth: 2 });
  state(3, '7 REVERTING', ['回退至持久快照', '请求：未记录']);

  f.line(90, 22, 90, ROWS[0] - 1, {});
  f.text(98, 40, 'CreateActor', { size: 11 });

  f.arrow([R, mid(0)], [M + W + 1, mid(0)], { style: 'state', label: 'SuspendActor', labelSize: 11 });
  f.arrow([M, mid(0)], [L + W + 1, mid(0)], { style: 'state', label: '检查点', labelSize: 11, note: '节点或 bucket' });
  f.arrow([L + W, mid(1)], [M - 1, mid(1)], { style: 'state', label: 'ResumeActor', labelSize: 11, note: '每次请求时' });
  f.arrow([M + W, mid(1)], [R - 1, mid(1)], { style: 'state' });
  f.text(R - 6, mid(1) + 15, '就绪', { size: 11, serif: true, hue: 'ink-soft', anchor: 'end' });

  f.path(`M${M + W} ${ROWS[0] + 54} H435 V${ROWS[2] + 12} H${M + W + 1}`, CODE);
  f.text(429, ROWS[1] - 7, '挂起失败', { size: 11, serif: true, hue: 'ink-soft', anchor: 'end' });

  f.arrow([320, ROWS[1] + H], [320, ROWS[2] - 1], { style: 'fail', label: '恢复失败', labelSize: 11 });
  f.arrow([R, mid(2) + 10], [M + W + 1, mid(2) + 10], { style: 'fail', label: '沙箱丢失', labelSize: 11, note: 'pod 或 OOM' });
  f.arrow([320, ROWS[2] + H], [320, ROWS[3] - 1], { style: 'state', label: 'RevertActor', labelSize: 11 });

  f.arrow([M, ROWS[3] + 18], [L + W + 1, ROWS[3] + 18], { style: 'state', label: '回退完成', labelSize: 11 });
  f.arrow([L + W, ROWS[3] + 46], [M - 1, ROWS[3] + 46], { ...CODE, label: 'RevertActor', labelSize: 11 });
  f.path(`M550 ${ROWS[2] + H} V${mid(3)} H${M + W + 1}`, CODE);
  f.text(470, mid(3) - 6, 'RevertActor', { size: 11, hue: 'ink-mute', anchor: 'middle' });

  const dy = 414;
  f.box({ x: M, y: dy, w: W, h: 50, hue: 'amber', title: '6 DELETING', titleSize: 12, sub: ['停止工作负载'], pad: 4, double: true });
  f.text(L, dy + 29, 'DeleteActor（任意状态）', { size: 11 });
  f.arrow([206, dy + 25], [M - 1, dy + 25], {});
  f.arrow([M + W, dy + 25], [440, dy + 25], { style: 'state' });
  f.text(448, dy + 29, '删除数据库记录', { size: 11, serif: true, hue: 'ink-soft' });

  key.forEach((line, index) => f.text(L, 494 + index * 17, line, { size: 11, serif: true, hue: 'ink-soft' }));
});
