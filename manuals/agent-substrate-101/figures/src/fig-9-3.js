'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const tasks = load(path.join(__dirname, '../../capture/lab/summary/demos-x86.json')).tool_sandbox;
const names = ['从镜像站下载文件', '按域名访问外部主机', '按 IP 访问外部主机', '按域名访问 Kubernetes API', '2 s CPU 计算任务', '分配 640 MiB 内存'];
const results = ['文件已保存，exit 0', 'NXDOMAIN', '网关返回 403', '域名未解析', '墙钟耗时 2.38 s', '503，actor CRASHED'];
const good = [true, false, false, false, true, false];
const two = value => value.toFixed(2);

module.exports = figure('fig-9-3', {
  height: 336,
  title: '同一工具沙箱 actor 中依次执行并回退的六项任务',
  desc: `第二台 x86 服务器客户机上向同一工具沙箱 actor（配置单条软件源出站规则、500 millicores 与 256 MiB 内存）发送六条命令的六行实测结果。${tasks.map((t, i) => `${names[i]}：${results[i]}，回退耗时 ${two(t.revert_seconds)} s，回退后剩余 ${t.files_after_revert} 个文件`).join('；')}。`,
}, f => {
  f.kicker(16, 28, '命令尝试执行的操作');
  f.kicker(232, 28, '执行结果');
  f.kicker(420, 28, '回退', { hue: 'amber' });
  f.kicker(506, 28, '/work 内文件数', { hue: 'green' });
  tasks.forEach((task, index) => {
    const y = 46 + index * 46;
    const hue = good[index] ? 'green' : 'rose';
    f.rule(16, y - 8, 624, y - 8, { hue: 'ink-mute', opacity: 0.25 });
    f.text(16, y + 14, names[index], { size: 12, weight: 700 });
    f.box({ x: 232, y, w: 168, h: 28, hue, title: results[index], titleSize: 11.5 });
    f.arrow([400, y + 14], [470, y + 14], { style: 'state' });
    f.text(420, y + 34, `${two(task.revert_seconds)} s`, { size: 11, hue: 'amber' });
    f.box({ x: 506, y, w: 60, h: 28, hue: 'green', title: String(task.files_after_revert), titleSize: 12 });
  });
});
