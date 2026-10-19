'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { title: "客户端", sub: "Python 脚本", hue: 'olive' },
  { title: 'tokenizer', sub: 'manager', hue: 'blue' },
  { title: 'scheduler', sub: "事件循环", hue: 'blue' },
  { title: "模型", sub: 'MLX, Qwen3', hue: 'violet' },
  { title: 'detokenizer', sub: 'manager', hue: 'blue' },
  { title: 'macOS', sub: "Metal、磁盘", hue: 'grey' },
];
const cx = index => 60 + index * 104;

const rows = [
  [0, 1, 'call', 'POST /v1/chat/completions', "调用 · 墨色实线"],
  [1, 2, 'event', 'TokenizedGenerateReqInput', "ZMQ 消息 · 靛蓝虚点线"],
  [2, 3, 'state', "请求：等待到运行", "状态变化 · 琥珀虚线"],
  [2, 3, 'model', "prefill：1 新 token，2998 缓存", "模型计算 · 梅紫实线"],
  [3, 5, 'effect', "Metal 内存上限 51.8 GB", "外部影响 · 橄榄虚线"],
  [3, 5, 'write', "9 个模型文件写入 HF 缓存", "持久写入 · 青绿实线"],
  [2, 4, 'event', 'BatchTokenIDOutput', "ZMQ 消息 · 靛蓝虚点线"],
  [1, 0, 'reply', '200 OK, cached_tokens 2998', "响应 · 墨色虚线"],
  [3, 2, 'fail', "c=32 时 Insufficient Memory", "失败 · 玫红虚线"],
];

module.exports = figure('fig-0-1', {
  height: 520,
  title: "如何阅读本手册的时序图",
  desc: "六条生命线：客户端脚本、tokenizer manager、scheduler、MLX 上的模型、detokenizer manager 和 macOS。九行编号交互使用八种箭头样式：POST /v1/chat/completions 为墨色实线调用，TokenizedGenerateReqInput 为靛蓝虚点 ZMQ 消息，等待到运行为琥珀虚线状态变化，1 新 token 加 2998 缓存的 prefill 为梅紫实线模型调用，51.8 GB Metal 内存上限为橄榄虚线外部影响，Hugging Face 缓存中的模型文件为青绿实线持久写入，BatchTokenIDOutput 为靛蓝虚点消息，200 OK 与 cached_tokens 2998 为墨色虚线响应，并发 32 的 Insufficient Memory 为玫红虚线失败。",
}, f => {
  lanes.forEach((lane, index) => {
    f.box({ x: cx(index), y: 8, w: 92, h: 40, hue: lane.hue, title: lane.title, sub: lane.sub, titleSize: 11, anchor: 'middle', pad: 3 });
    f.lifeline(cx(index), 48, 512);
  });
  rows.forEach(([from, to, style, label, note], index) => {
    const y = 84 + index * 48;
    f.beat(index + 1);
    f.step(16, y, index + 1, { hue: style === 'fail' ? 'rose' : undefined });
    const x1 = cx(from);
    let x2 = cx(to);
    if (from === to) x2 = x1 + 70;
    const labelX = from === to ? x1 + 90 : undefined;
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note, labelX });
  });
});
