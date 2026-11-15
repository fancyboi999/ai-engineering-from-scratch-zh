'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  {
    left: { hue: 'plum', title: 'Task', sub: '自身数据库中的一行记录' },
    right: { hue: 'green', title: 'Actor 与 ActorTemplate', sub: '同名，仅文件快照' },
    label: '一一对应',
    style: 'call',
  },
  {
    left: { hue: 'plum', title: 'Workspace', sub: '内联文件与 Git 仓库' },
    right: { hue: 'violet', title: 'ax-task-runner, PID 1', sub: '先写文件，再尝试 clone' },
    label: '每次启动时',
    style: 'call',
  },
  {
    left: { hue: 'plum', title: 'Gateway', sub: '已存储，含 1 条出站规则' },
    right: { hue: 'grey', title: '无 EgressPolicy', sub: 'spec.gateway: Unimplemented' },
    label: '被拒绝',
    style: 'fail',
  },
  {
    left: { hue: 'plum', title: 'Model', sub: '已存储，不校验 Secret' },
    right: { hue: 'grey', title: 'Substrate 上无对应物', sub: '无 task 字段引用 Model' },
    label: '未使用',
    style: 'fail',
  },
  {
    left: { hue: 'olive', title: 'ax resume, ax suspend', sub: '由你手动执行的命令' },
    right: { hue: 'blue', title: 'ResumeActor, SuspendActor', sub: '空闲 600 s 仍为 RUNNING' },
    label: '由你调用',
    style: 'call',
  },
  {
    left: { hue: 'grey', title: '无 worker 选择器', sub: '模板未指定任何池' },
    right: { hue: 'violet', title: '其他团队的 WorkerPool', sub: '所有 task 均跑在池外' },
    label: '任意池',
    style: 'fail',
  },
];

module.exports = figure('fig-7-5', {
  height: 472,
  title: '实测中每个 Agent Executor 对象在 Agent Substrate 上的实际映射',
  desc: '六行展示我们在 Substrate v1.0.0 上实测 Agent Executor 某一提交时的对象映射关系。Task 是 Agent Executor 数据库中的一行记录，映射为同名的单个 actor 与模板，使用仅文件快照与黄金快照。Workspace 由 task runner 在每次启动时于沙箱内准备。Gateway 虽可存储，但引用它的 task 会因 Unimplemented 被拒绝，因此不会创建出站策略。Model 存储时不校验其 Secret，且 task 无字段引用 Model，因此密钥不会传入 task。resume 与 suspend 命令映射为两个 Substrate 调用，无请求的 task 在 600 秒内一直保持 RUNNING。模板未指定 worker 池，导致所有 task 均运行在另一命名空间的 WorkerPool 上。',
}, f => {
  f.kicker(20, 22, 'Agent Executor');
  f.kicker(380, 22, 'Agent Substrate');
  rows.forEach((row, index) => {
    const y = 34 + index * 72;
    const left = f.box({ x: 20, y, w: 240, h: 48, titleSize: 12, ...row.left });
    const right = f.box({ x: 380, y, w: 240, h: 48, titleSize: 12, ...row.right });
    f.arrow(left.right(), [right.x - 1, left.cy], { style: row.style, label: row.label });
  });
});
