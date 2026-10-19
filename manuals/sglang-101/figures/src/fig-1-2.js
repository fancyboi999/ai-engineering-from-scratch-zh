'use strict';

const { figure } = require('../../../_shared/figkit.js');

const layers = [
  { hue: 'olive', title: "客户端", sub: "curl、OpenAI SDK、sglang.benchmark.serving", owner: 'yours' },
  { hue: 'grey', title: 'sgl-model-gateway', sub: "跨服务器路由，第 6.4 节", owner: 'separate', dash: 'dashed' },
  { hue: 'blue', title: 'TokenizerManager', sub: "HTTP / OpenAI API，文本转 token ID", owner: 'SGLang' },
  { hue: 'blue', title: 'Scheduler', sub: "批次、准入、回撤、重叠", owner: 'SGLang' },
  { hue: 'green', title: "KV 池与 UnifiedRadixCache", sub: "181,574 槽位，缓存前缀", owner: 'SGLang' },
  { hue: 'violet', title: "前向传播", sub: "注意力后端、CUDA graphs、Mac 的 MLX", owner: 'SGLang' },
  { hue: 'blue', title: 'DetokenizerManager', sub: "ID 转文本、停止字符串、流式输出", owner: 'SGLang' },
  { hue: 'teal', title: "模型权重", sub: "mlx-community/Qwen3-0.6B-4bit，答案质量", owner: "模型" },
  { hue: 'grey', title: "内存预算与硬件", sub: "--mem-fraction-static、其他程序", owner: 'operator', dash: 'dashed' },
];

module.exports = figure('fig-1-2', {
  height: 470,
  title: "SGLang 的职责",
  desc: "九层结构从顶部客户端到底部硬件。SGLang 负责 tokenizer manager、scheduler、含基数缓存的 KV 池、前向传播和 detokenizer。模型网关是独立组件。模型权重决定答案质量，运维者决定内存预算。",
}, f => {
  f.kicker(20, 18, 'layer');
  f.kicker(540, 18, 'owner');
  layers.forEach((layer, index) => {
    const y = 30 + index * 48;
    f.box({ x: 20, y, w: 500, h: 40, hue: layer.hue, dash: layer.dash, title: layer.title, sub: layer.sub, align: 'left' });
    f.text(540, y + 25, layer.owner, { size: 12, weight: layer.owner === 'SGLang' ? 700 : undefined, hue: layer.owner === 'SGLang' ? 'blue' : 'ink-soft' });
  });
});
