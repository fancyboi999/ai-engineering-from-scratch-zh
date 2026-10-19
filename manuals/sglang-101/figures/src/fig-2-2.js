'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-2-2', {
  height: 400,
  title: "调度循环的一轮",
  desc: "ingest_requests 取尽新请求，calc_priority 以默认 fcfs 排序等待队列，PrefillAdder.add_one_req 在 KV 预算允许时准入。若有准入，该轮运行 prefill 批次，否则为每个运行请求执行一步 decode。随后 process_batch_result 追加 token 并检查停止，再开始下一轮。",
}, f => {
  f.beat(1);
  const ingest = f.box({ x: 100, y: 16, w: 300, h: 48, hue: 'amber', title: 'ingest_requests', sub: ["取尽 ZMQ 请求，加入等待队列"] });
  f.beat(2);
  f.arrow([250, 64], [250, 85], { style: 'state' });
  const order = f.box({ x: 100, y: 86, w: 300, h: 48, hue: 'amber', title: 'calc_priority', sub: ["排序队列：默认 fcfs"] });
  f.beat(3);
  f.arrow([250, order.y + order.h], [250, 155], { style: 'state' });
  const adder = f.box({ x: 100, y: 156, w: 300, h: 48, hue: 'green', title: 'PrefillAdder.add_one_req', sub: ["KV 预算允许就准入"] });
  f.beat(4);
  f.arrow([170, adder.y + adder.h], [170, 247], { style: 'model', label: "已准入" });
  f.arrow([340, adder.y + adder.h], [340, 247], { style: 'model', label: "无请求准入" });
  const prefill = f.box({ x: 20, y: 248, w: 250, h: 48, hue: 'plum', title: "prefill 批次", sub: ["准入请求的 EXTEND 前向传播"] });
  const decode = f.box({ x: 300, y: 248, w: 300, h: 48, hue: 'plum', title: "decode 步骤", sub: ["每个运行请求一个 token"] });
  f.beat(5);
  f.arrow([170, prefill.y + prefill.h], [170, 335], { style: 'call' });
  f.arrow([340, decode.y + decode.h], [340, 335], { style: 'call' });
  const done = f.box({ x: 100, y: 336, w: 300, h: 48, hue: 'amber', title: 'process_batch_result', sub: ["追加 token、检查停止、发送结果"] });
  f.beat(6);
  f.path(`M${done.x + done.w} 360 L620 360 L620 40 L${ingest.x + ingest.w + 1} 40`, { style: 'state' });
  f.text(520, 33, "下一轮", { size: 11, hue: 'amber', anchor: 'middle', knock: true });
});
