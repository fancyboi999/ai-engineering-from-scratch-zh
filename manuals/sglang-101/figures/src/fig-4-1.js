'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-4-1', {
  height: 400,
  title: "一次 decode 的逐项提交与重放",
  desc: "两列对比。左为 eager decode：transformer 每层的每个内核都由 Python model runner 单独提交，每层重复。右为计算图重放：decode CUDA graph runner 对一个已捕获批次大小发起一次重放，GPU 按序运行所有层已录制的内核。",
}, f => {
  f.kicker(20, 18, "A · 即时解码");
  f.kicker(336, 18, "B · 计算图重放");
  f.rule(320, 8, 320, 392, { dash: 'dashed' });
  const kernels = ['rms_norm', 'qkv_proj GEMM', "注意力 decode", 'o_proj GEMM', 'gate_up_proj GEMM', 'silu_and_mul', 'down_proj GEMM'];
  kernels.forEach((name, index) => {
    const y = 30 + index * 46;
    const launch = f.box({ x: 20, y, w: 84, h: 34, hue: 'blue', title: "提交", titleSize: 11.5 });
    f.arrow(launch.right(), [144, y + 17], { style: 'call' });
    f.box({ x: 145, y, w: 160, h: 34, hue: 'violet', title: name, titleSize: 11.5 });
  });
  f.text(20, 366, "每个内核一次 CPU 提交，", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 382, "模型每层都要重复", { size: 11, serif: true, hue: 'ink-soft' });
  const replay = f.box({ x: 336, y: 30, w: 284, h: 52, hue: 'blue', title: 'replay(bs=16)', sub: ["整步只需一次 CPU 调用"] });
  const graph = f.box({ x: 336, y: 124, w: 284, h: 160, hue: 'violet', title: "已捕获 decode graph，bs=16", sub: ["每一层、每个内核", "顺序与 A 列相同", "固定形状与地址", "启动时录制一次"] });
  f.arrow(replay.bottom(), graph.top(), { style: 'call', label: "一次调用" });
  f.text(336, 312, "13 请求填充至 16 后重放", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(336, 328, "超过 max_bs 的批次无法重放", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(336, 344, "像 A 列一样运行", { size: 11, serif: true, hue: 'ink-soft' });
});
