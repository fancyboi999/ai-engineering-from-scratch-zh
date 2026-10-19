'use strict';

const { figure } = require('../../../_shared/figkit.js');

const trainer = 110;
const server = 500;
const rows = [
  ['call', 'POST /pause_generation', "mode retract：运行请求回到队列"],
  ['call', 'POST /begin_weight_update', "准备按 checkpoint 格式写层"],
  ['call', 'POST /update_weights_from_distributed', "一个 bucket：名称、dtype、形状"],
  ['event', "rank 0 发起 NCCL 广播", "每个 bucket 重复第 3、4 行"],
  ['call', 'POST /end_weight_update', "量化层只重新打包一次"],
  ['call', 'POST /update_weight_version', "后续 token 带新版本"],
  ['call', 'POST /continue_generation', "回撤请求重新 prefill"],
];

module.exports = figure('fig-7-2', {
  height: 400,
  title: "Miles 与 SGLang 之间的一次权重更新",
  desc: "Miles rank 0 以 retract 模式暂停 SGLang，开启权重更新会话，每个 bucket 先发 HTTP 描述，再 NCCL 广播，关闭会话使量化层只重新打包一次，设置新权重版本，恢复生成。",
}, f => {
  f.box({ x: trainer, y: 10, w: 150, h: 30, hue: 'grey', title: "Miles rank 0", titleSize: 12, anchor: 'middle' });
  f.box({ x: server, y: 10, w: 150, h: 30, hue: 'blue', title: "SGLang 服务", titleSize: 12, anchor: 'middle' });
  f.lifeline(trainer, 40, 390);
  f.lifeline(server, 40, 390);
  rows.forEach(([style, label, note], index) => {
    const y = 78 + index * 44;
    f.beat(index + 1);
    f.step(24, y, index + 1, { hue: style === 'event' ? 'indigo' : 'ink' });
    f.arrow([trainer, y], [server - 1, y], { style, label, note, labelX: (trainer + server) / 2 });
  });
});
