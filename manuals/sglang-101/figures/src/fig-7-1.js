'use strict';

const { figure } = require('../../../_shared/figkit.js');

const key = [
  ["主进程收到 SIGTERM：/health 返回 503，开始排空", 'state'],
  ["等待请求归零，排空时每 5 s 记日志", 'state'],
  ["向 scheduler 发 ShutdownReq，给 15 s 退出", 'state'],
  ["UnHealthy 或设置 SGL_FORCE_SHUTDOWN 时强制退出", 'fail'],
  ["整组收到 SIGTERM：scheduler_0 先以 -15 退出", 'fail'],
  ["父进程判断子进程崩溃，未排空便终止进程树", 'fail'],
];

module.exports = figure('fig-7-1', {
  height: 430,
  title: "SGLang 服务停止的三种路径",
  desc: "正在服务的 SGLang 主进程收到 SIGTERM 后排空请求、发送 ShutdownReq，以代码 0 退出。强制退出跳过排空；若整进程组收到 SIGTERM，scheduler 子进程先退出，父进程走崩溃路径，终止整棵进程树。",
}, f => {
  f.kicker(20, 22, "优雅关闭路径");
  f.box({ x: 20, y: 36, w: 110, h: 56, hue: 'amber', title: "服务中", sub: ['/health 200'] });
  f.box({ x: 170, y: 36, w: 120, h: 56, hue: 'amber', title: "排空中", sub: ['/health 503', "每 5 s 检查排空"] });
  f.box({ x: 330, y: 36, w: 120, h: 56, hue: 'blue', title: 'ShutdownReq', sub: ["15 s 内退出"] });
  f.box({ x: 490, y: 36, w: 130, h: 56, hue: 'amber', title: "退出码 0", sub: ["13 s 排空"], double: true });
  f.arrow([130, 64], [169, 64], { style: 'state' });
  f.arrow([290, 64], [329, 64], { style: 'state' });
  f.arrow([450, 64], [489, 64], { style: 'state' });
  f.step(150, 46, 1, { hue: 'amber' });
  f.step(310, 46, 2, { hue: 'amber' });
  f.step(470, 46, 3, { hue: 'amber' });

  f.kicker(170, 132, 'forced');
  f.box({ x: 150, y: 146, w: 180, h: 50, hue: 'rose', title: 'force_exit_handler', sub: ["丢弃运行任务"], double: true });
  f.line(230, 92, 230, 145, { style: 'fail' });
  f.step(246, 118, 4, { hue: 'rose' });

  f.kicker(100, 228, "信号发送给进程组");
  f.box({ x: 20, y: 242, w: 180, h: 50, hue: 'rose', title: "scheduler_0 退出 -15", sub: ["子进程先退出"] });
  f.box({ x: 260, y: 242, w: 180, h: 50, hue: 'rose', title: 'SIGQUIT', sub: ['kill_process_tree'], double: true });
  f.line(75, 92, 75, 241, { style: 'fail' });
  f.arrow([200, 267], [259, 267], { style: 'fail' });
  f.step(91, 170, 5, { hue: 'rose' });
  f.step(230, 252, 6, { hue: 'rose' });

  key.forEach(([line, style], index) => {
    const y = 326 + index * 17;
    f.step(30, y - 4, index + 1, { hue: style === 'fail' ? 'rose' : 'amber' });
    f.text(48, y, line, { size: 11, serif: true, hue: 'ink-soft' });
  });
});
