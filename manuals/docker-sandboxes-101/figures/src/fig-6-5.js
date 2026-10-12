'use strict';

const { figure } = require('../../../_shared/figkit.js');

const callers = [
  { title: 'docker-agent', sub: '宿主进程', hue: 'violet', url: 'http://localhost:12434', note: '12434端口 TCP 已开' },
  { title: 'printer', sub: 'Compose 服务', hue: 'grey', url: 'http://model-runner.docker.internal', note: '以 LLM_URL 注入，含 /v1/' },
  { title: '容器', sub: 'Docker Engine', hue: 'grey', url: 'http://172.17.0.1:12434', note: '依据文档，未录制', dash: 'dashed' },
  { title: 'socket 客户端', sub: '宿主，Docker socket', hue: 'grey', url: 'http://localhost/exp/vDD4.40', note: 'model status 的 endpointHost' },
  { title: 'docker-agent', sub: '沙箱内部', hue: 'blue', url: 'http://host.docker.internal:12434', note: '经过沙箱代理' },
];

module.exports = figure('fig-6-5', {
  height: 372,
  title: '一个 Model Runner 的五种 base URL',
  desc: '左五调用者：宿主启TCP后localhost:12434；Compose printer注入model-runner.docker.internal的/v1/；Engine容器172.17.0.1:12434（文档，未录）；宿主Docker socket用status的endpointHost localhost/exp/vDD4.40；沙箱经代理host.docker.internal:12434。右runner为llama.cpp b9879-metal与ai/qwen3:4b；base后OpenAI /engines/v1/、指定引擎/engines/llama.cpp/v1/、/v1/；Anthropic /anthropic/v1/messages与/v1/messages；Ollama /api/。均不检查凭据。',
}, f => {
  const runner = f.box({
    x: 430, y: 30, w: 190, h: 280, hue: 'plum', title: 'Docker Model Runner', align: 'left',
    sub: ['llama.cpp b9879-metal', 'model ai/qwen3:4b', 'base URL 后的路径：', '/engines/v1/ OpenAI', '/engines/llama.cpp/v1/', '/v1/，status 端点', '/anthropic/v1/messages', '/v1/messages，示例', '/api/ Ollama'],
  });
  callers.forEach((caller, index) => {
    const box = f.box({ x: 20, y: 30 + index * 58, w: 150, h: 44, hue: caller.hue, dash: caller.dash, title: caller.title, sub: caller.sub });
    f.arrow(box.right(), [runner.x - 1, box.cy], { style: 'call', label: caller.url, labelSize: 11, note: caller.note });
  });
  f.box({ x: 20, y: 324, w: 600, h: 34, hue: 'grey', dash: 'dashed', title: '所有路径均不检查凭据：可达端口就能运行模型', titleSize: 11.5, weight: 400 });
});
