'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-4-2', {
  height: 356,
  title: '两种沙箱类别在 actor 与节点之间的分层',
  desc: '两列分层图，自底部的节点向上读到顶部的 actor。gvisor 类别中，worker pod 运行 ateworker-gvisor，为每个 actor 启动一个 runsc Sentry，actor 的所有容器共享该 Sentry。microvm 类别中，节点必须具备 /dev/kvm 设备，worker pod 运行 ateworker-microvm，启动 Cloud Hypervisor 与 virtiofsd，actor 的容器运行在客户机内核上并各自拥有独立 cgroup。',
}, f => {
  f.kicker(20, 18, '沙箱类别 gvisor');
  f.kicker(336, 18, '沙箱类别 microvm');
  f.rule(320, 8, 320, 348, { dash: 'dashed' });
  const left = [
    { hue: 'green', title: 'actor 容器', sub: '资源上限作用于整个 actor' },
    { hue: 'violet', title: 'runsc Sentry', sub: '用户态内核，每个 actor 一个' },
    { hue: 'violet', title: 'worker pod, ateworker-gvisor', sub: 'root, SYS_ADMIN, NET_ADMIN' },
    { hue: 'grey', title: '节点', sub: '任意 Linux 节点' },
  ];
  const right = [
    { hue: 'green', title: 'actor 容器', sub: '每个容器一个客户机 cgroup' },
    { hue: 'violet', title: '客户机内核', sub: 'Cloud Hypervisor 上的 Kata 客户机、virtiofsd' },
    { hue: 'violet', title: 'worker pod, ateworker-microvm', sub: 'root, SYS_ADMIN, NET_ADMIN' },
    { hue: 'grey', title: '带 /dev/kvm 的节点', sub: 'atelet 上报为 ate.dev/kvm' },
  ];
  [[left, 20], [right, 336]].forEach(([column, x]) => {
    column.forEach((item, index) => {
      const y = 30 + index * 68;
      f.box({ x, y, w: 284, h: 48, ...item });
      if (index < column.length - 1) f.arrow([x + 142, y + 67], [x + 142, y + 49], { style: 'call' });
    });
  });
  f.text(20, 318, '文件快照：runsc 检查点包', { size: 11, serif: true, hue: 'teal' });
  f.text(336, 318, '文件快照：tar 归档', { size: 11, serif: true, hue: 'teal' });
  f.text(20, 338, '最小内存上限：无限制', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(336, 338, '最小内存上限：128 MiB', { size: 11, serif: true, hue: 'ink-soft' });
});
