'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  { seen: '5.06 s 后返回 503', body: ['no worker has room for the actor'], cause: 'worker 池已满', why: ['所有 worker 均已被预留'], hue: 'violet', fix: '释放 worker', how: ['挂起 actor，或扩容 worker'] },
  { seen: '0.07 s 内返回 503', body: ['AssignWorker prerequisite not met'], cause: 'actor 处于 CRASHED', why: ['仅 SUSPENDED 可恢复'], hue: 'amber', fix: '回退该 actor', how: ['kubectl ate revert actor'] },
  { seen: '0.08 s 内返回 500', body: ['error resuming actor lab-c/x1'], cause: '节点本地副本丢失', why: ['上传完成前即已丢失'], hue: 'teal', fix: '回退该 actor', how: ['近期调用的状态会丢失'] },
  { seen: '先超时，随后 500', body: ['error resuming actor lab-e/e-run'], cause: 'Postgres 中断', why: ['无法读取 actor 行记录'], hue: 'teal', fix: '恢复数据库', how: ['新建恢复滞后 27 s'] },
  { seen: '3 至 5 s 后返回 503', body: ['actor lab-e/e-run unavailable'], cause: '无 ate-api-server', why: ['路由器未收到任何响应'], hue: 'blue', fix: '检查其 pod', how: ['随后再检查 Postgres'] },
  { seen: '0.06 s 内返回 503', body: ['upstream connect error', 'reason: connection termination'], cause: '沙箱内进程已退出', why: ['状态仍保持 RUNNING'], hue: 'green', fix: '先挂起，再回退', how: ['挂起时加 --mode sync'] },
];

module.exports = figure('fig-8-3', {
  height: 420,
  title: '从失败请求定位根因与修复方法',
  desc: '六行对应六类失败请求。每行依次列出客户端看到的状态码、延迟与响应体，实测证实的根因，以及修复方法。其中两行为 500、四行为 503，凭延迟和响应体即可逐一区分。',
}, f => {
  f.kicker(20, 20, '客户端看到的现象');
  f.kicker(262, 20, '根因');
  f.kicker(450, 20, '修复方法');
  rows.forEach((row, index) => {
    const y = 30 + index * 64;
    const h = 54;
    f.box({ x: 20, y, w: 226, h, hue: 'rose', title: row.seen, sub: row.body });
    f.box({ x: 262, y, w: 172, h, hue: row.hue, title: row.cause, sub: row.why });
    f.box({ x: 450, y, w: 170, h, hue: 'grey', title: row.fix, sub: row.how, titleSize: 11.5 });
    f.arrow([246, y + h / 2], [261, y + h / 2], {});
    f.arrow([434, y + h / 2], [449, y + h / 2], {});
  });
});
