'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-1-1', {
  height: 330,
  title: "捕获 Mac 上的 prefill 与 decode",
  desc: "两列来自一次单请求基准。左侧 prefill 对 512 prompt token 做一次前向，写入 512 KV 条目，首 token 延迟中位数 162.98 ms，即每 prompt token 约 0.32 ms。右侧 decode 对其后 127 token 各做一次前向，每次读取全部权重与已缓存 KV，平均每 token 4.38 ms。",
}, f => {
  f.kicker(20, 18, "prefill · 一次处理完整 prompt");
  f.kicker(336, 18, "decode · 每次一个 token");
  f.rule(320, 8, 320, 298, { dash: 'dashed' });

  const p1 = f.box({ x: 20, y: 32, w: 284, h: 44, hue: 'olive', title: "512 个 prompt token ID", sub: "random 数据集，种子 7" });
  const p2 = f.box({ x: 20, y: 110, w: 284, h: 54, hue: 'plum', title: "一次前向传播", sub: ["一批矩阵乘处理 512 token"] });
  const p3 = f.box({ x: 20, y: 198, w: 284, h: 44, hue: 'green', title: "写入 512 个 KV 条目", sub: "为后续每一步保留" });
  f.arrow([162, p1.y + 44], [162, p2.y - 1], { style: 'call' });
  f.arrow([162, p2.y + 54], [162, p3.y - 1], { style: 'write' });
  f.text(20, 270, "TTFT 中位数 162.98 ms", { size: 12.5, weight: 700, hue: 'plum' });
  f.text(20, 290, "每 prompt token 约 0.32 ms", { size: 11.5, serif: true, hue: 'ink-soft' });

  const d1 = f.box({ x: 336, y: 32, w: 284, h: 44, hue: 'olive', title: "每请求 1 个新 token", sub: "上次 decode 生成的 token" });
  const d2 = f.box({ x: 336, y: 110, w: 284, h: 54, hue: 'plum', title: "一次前向传播", sub: ["为一个 token 读取全部权重"] });
  const d3 = f.box({ x: 336, y: 198, w: 284, h: 44, hue: 'green', title: "读取 512 + n 个 KV 条目", sub: "并再写入一个" });
  f.arrow([478, d1.y + 44], [478, d2.y - 1], { style: 'call' });
  f.arrow([478, d3.y], [478, d2.y + 55], { style: 'reply' });
  f.text(336, 270, "平均 TPOT 4.38 ms", { size: 12.5, weight: 700, hue: 'plum' });
  f.text(336, 290, "后续 127 token 各重复一次", { size: 11.5, serif: true, hue: 'ink-soft' });
  f.text(20, 316, "Qwen3-0.6B-4bit · SGLang 0.5.22 / MLX", { size: 11, serif: true, hue: 'ink-mute' });
});
