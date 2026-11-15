'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  { does: '按需执行 SuspendActor', detail: ['无内置空闲计时器：60/60 次采样仍为 RUNNING'], add: '何时挂起的决策', how: ['kagent 会在每轮结束后挂起'], hue: 'plum' },
  { does: '维护固定数量的 worker', detail: ['池满时请求在 5 s 后返回 503'], add: '自动扩缩容组件', how: ['按空闲 worker 槽位而非 CPU 利用率扩缩'], hue: 'grey' },
  { does: '沙箱消亡时标为 CRASHED', detail: ['沙箱内进程退出时 actor 仍为 RUNNING'], add: '死进程探活与收敛', how: ['监听 upstream connect error 并处理'], hue: 'grey' },
  { does: '单副本 router 与单副本 Postgres', detail: ['单出站网关、双副本 ate-api-server'], add: '故障切换与高可用', how: ['配置数据库备库与多副本路由器'], hue: 'grey' },
  { does: '密钥池与三条管理命令', detail: ['添加、激活与移除 JWT 密钥'], add: '定期轮换计划', how: ['无内置组件自动轮换密钥'], hue: 'grey' },
  { does: '单一入站允许列表', detail: ['列表内的客户端可调用所有 actor'], add: '多租户入站隔离', how: ['v1.0.0 需在 Substrate 外部实现'], hue: 'grey' },
];

module.exports = figure('fig-8-5', {
  height: 408,
  title: 'v1.0.0 中各项职责的边界划分',
  desc: '六行对应六项职责。左侧为 Substrate 在 v1.0.0 中已完成的部分：按请求挂起、维护固定数量的 worker、沙箱消亡时将 actor 标为崩溃、运行单路由器与单数据库、提供密钥管理命令、维护单一入站允许列表。右侧为运维方或 harness 必须自行补齐的部分。',
}, f => {
  f.kicker(20, 20, 'Substrate 负责');
  f.kicker(340, 20, '由你补充');
  rows.forEach((row, index) => {
    const y = 30 + index * 62;
    f.box({ x: 20, y, w: 290, h: 52, hue: 'blue', title: row.does, sub: row.detail });
    f.box({ x: 340, y, w: 280, h: 52, hue: row.hue, title: row.add, sub: row.how });
    f.rule(310, y + 26, 340, y + 26, { hue: 'ink-mute', dash: 'dotted' });
  });
});
