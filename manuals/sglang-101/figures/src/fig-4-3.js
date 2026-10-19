'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-4-3', {
  height: 456,
  title: "v0.5.22 默认注意力后端",
  desc: "决策树按模型注意力类型分为左侧 MHA、右侧 MLA。MHA：因 issue 17411，Hopper 加 CUDA 12.3 用 fa3；Blackwell SM100 用 trtllm_mha，K/V 宽度不等则 fa4；AMD 用 aiter；Apple MPS 用 torch_native；其他 GPU 用 flashinfer，模型带 attention sinks 则 triton。MLA：Hopper 用 fa3；Blackwell 用 flashinfer，DeepSeek V3 覆盖为 trtllm_mla；AMD 在 16 或 128 KV head 时用 aiter；其余用 triton。",
}, f => {
  const root = f.box({ x: 180, y: 20, w: 280, h: 46, hue: 'blue', title: 'get_default_attn_backend', sub: "未设置 --attention-backend" });
  const mha = f.box({ x: 20, y: 100, w: 280, h: 46, hue: 'violet', title: "MHA 模型", sub: 'Llama, Qwen, Gemma' });
  const mla = f.box({ x: 340, y: 100, w: 280, h: 46, hue: 'violet', title: "MLA 模型", sub: 'DeepSeek V3, GLM MoE' });
  f.arrow(root.bottom(60), mha.top(220), { style: 'call' });
  f.arrow(root.bottom(220), mla.top(60), { style: 'call' });
  const left = [
    ['Hopper', 'fa3', "issue 17411"],
    ['Blackwell SM100', 'trtllm_mha', "K/V 宽度不同时用 fa4"],
    ['AMD ROCm', 'aiter', "全部 MHA 模型"],
    ['Apple MPS', 'torch_native', 'PyTorch SDPA'],
    ["其他 GPU", 'flashinfer', "有 sinks 时用 triton"],
  ];
  const right = [
    ['Hopper', 'fa3', "同 MHA"],
    ['Blackwell SM100', 'flashinfer', "DeepSeek V3 覆盖值"],
    ['AMD ROCm', 'aiter', "16 或 128 KV head 时"],
    ['Apple MPS', 'torch_native', 'PyTorch SDPA'],
    ["其他 GPU", 'triton', "可移植内核"],
  ];
  [[left, 20], [right, 340]].forEach(([rows, x]) => {
    f.rule(x + 8, 146, x + 8, 170 + (rows.length - 1) * 56 + 24, { hue: 'ink-mute' });
    rows.forEach(([gpu, backend, note], index) => {
      const y = 170 + index * 56;
      f.rule(x + 8, y + 24, x + 16, y + 24, { hue: 'ink-mute' });
      f.text(x + 20, y + 28, gpu, { size: 11, hue: 'ink-soft' });
      f.box({ x: x + 128, y, w: 152, h: 48, hue: 'violet', title: backend, titleSize: 12, sub: note });
    });
  });
});
