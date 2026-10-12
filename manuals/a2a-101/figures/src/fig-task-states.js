'use strict';

const { figure } = require('../../../_shared/figkit.js');

const note = (f, x, y, content, anchor) => f.text(x, y, content, { size: 11, serif: true, hue: 'ink-soft', anchor });

module.exports = figure('fig-task-states', {
  height: 448,
  title: "九种任务状态与套件的转换",
  desc: "九个 TaskState 值去掉 TASK_STATE_ 前缀，按采集顺序显示套件转换。05 中 SUBMITTED 转 WORKING，03、05 中 WORKING 结束为 COMPLETED。06 中 reviewer 提问时 SUBMITTED 转 INPUT_REQUIRED，客户端回答时回到 WORKING。07 中 WORKING 转 AUTH_REQUIRED，操作员批准后恢复。08 中 deployer 拒绝生产部署，SUBMITTED 转 REJECTED。09 中缺少提交使 WORKING 结束为 FAILED，10 中 CancelTask 使其结束为 CANCELED。四种终态有双边框，无出边。零值 UNSPECIFIED 独立显示，套件从不发送。",
}, f => {
  const auth = f.box({ x: 20, y: 56, w: 140, h: 42, hue: 'amber', dash: 'dashed', title: 'AUTH_REQUIRED', sub: "值 8" });
  const submitted = f.box({ x: 20, y: 168, w: 140, h: 42, hue: 'amber', title: 'SUBMITTED', sub: "值 1" });
  const working = f.box({ x: 250, y: 168, w: 140, h: 42, hue: 'amber', title: 'WORKING', sub: "值 2" });
  const input = f.box({ x: 250, y: 290, w: 140, h: 42, hue: 'amber', dash: 'dashed', title: 'INPUT_REQUIRED', sub: "值 6" });
  f.kicker(470, 12, '终态');
  const completed = f.box({ x: 470, y: 20, w: 150, h: 54, hue: 'amber', double: true, title: 'COMPLETED', sub: ["值 3", "见 03 05 06 07"] });
  const failed = f.box({ x: 470, y: 92, w: 150, h: 54, hue: 'rose', double: true, title: 'FAILED', sub: ["值 4", "提交缺失，见 09"] });
  const canceled = f.box({ x: 470, y: 162, w: 150, h: 54, hue: 'rose', double: true, title: 'CANCELED', sub: ["值 5", "CancelTask，见 10"] });
  const rejected = f.box({ x: 470, y: 324, w: 150, h: 54, hue: 'rose', double: true, title: 'REJECTED', sub: ["值 7", "见 08"] });
  f.box({ x: 20, y: 396, w: 140, h: 42, hue: 'grey', title: 'UNSPECIFIED', sub: "值 0，未使用" });
  note(f, 176, 414, "所有名称省略 TASK_STATE_ 前缀。", 'start');
  note(f, 176, 430, "虚线框：中断态。双边框：终态。", 'start');

  const branch = target => f.path(`M430 ${working.cy} V${target.cy} H${target.x - 1}`, { style: 'state' });

  f.beat(1);
  f.arrow([submitted.x + submitted.w, submitted.cy], [working.x - 1, working.cy], { style: 'state' });
  note(f, 205, 183, "开始（05）", 'middle');

  f.beat(2);
  f.path(`M${working.x + working.w} ${working.cy} H430`, { style: 'state', head: false });
  branch(completed);

  f.beat(3);
  f.path(`M90 ${submitted.y + submitted.h} V${input.cy} H${input.x - 1}`, { style: 'state' });
  note(f, 170, input.cy - 6, "询问分支（06）", 'middle');

  f.beat(4);
  f.line(320, input.y, 320, working.y + working.h + 1, { style: 'state' });
  note(f, 328, 255, "客户端回答（06）", 'start');

  f.beat(5);
  f.path(`M360 ${working.y} V${auth.cy} H${auth.x + auth.w + 1}`, { style: 'state' });
  note(f, 260, auth.cy - 6, "需要批准（07）", 'middle');

  f.beat(6);
  f.path(`M90 ${auth.y + auth.h} V138 H300 V${working.y - 1}`, { style: 'state' });
  note(f, 195, 132, "操作员批准（07）", 'middle');

  f.beat(7);
  f.path(`M50 ${submitted.y + submitted.h} V${rejected.cy} H${rejected.x - 1}`, { style: 'state' });
  note(f, 170, rejected.cy - 6, "拒绝生产部署（08）", 'middle');

  f.beat(8);
  branch(failed);

  f.beat(9);
  branch(canceled);
});
