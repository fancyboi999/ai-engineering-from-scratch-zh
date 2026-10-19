'use strict';

const { figure } = require('../../../_shared/figkit.js');

const steps = [
  ["用 sglang.benchmark.serving 测量", "三个并发级别的 TTFT、TPOT、输出 tok/s · 5.1", 'olive'],
  ['--mem-fraction-static', "按共享机器设置 KV 池 · 3.2", 'green'],
  ["Prompt 顺序", "共享文本在前，每请求变化在后，读 cached_tokens · 3.4", 'green'],
  ['--max-running-requests', "并发上限设为实测拐点 · 5.1", 'amber'],
  ['--cuda-graph-backend-decode, --attention-backend', "完成 1 至 4 步后，每次只改一项 · 4.1、4.2", 'violet'],
  ['--tp-size, --dp-size, --attn-dp-size', "仅单副本饱和后 · 6.1", 'indigo'],
  ['--disaggregation-mode', "仅测得 prefill 拖慢 decode 后 · 6.3", 'indigo'],
];

module.exports = figure('fig-7-1b', {
  height: 452,
  title: "修改 SGLang 设置的顺序",
  desc: "本手册修改的七项设置按顺序排列：用 sglang.benchmark.serving 测量、确定 KV 池容量、排序 prompt、将并发限在拐点，再调 CUDA graphs 与注意力后端，然后并行，最后分离。各行列出测量它的章节。",
}, f => {
  steps.forEach(([title, sub, hue], index) => {
    const y = 14 + index * 62;
    f.step(30, y + 24, index + 1, { hue });
    f.box({ x: 52, y, w: 568, h: 48, hue, title, sub: [sub], align: 'left' });
    if (index < steps.length - 1) f.line(30, y + 34, 30, y + 75, { style: 'state', head: false });
  });
});
