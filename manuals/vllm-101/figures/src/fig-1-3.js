'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-1-3', {
  height: 300,
  title: '一个请求经过 vLLM 的三个进程',
  desc: '客户端通过 HTTP 将请求发给 API server 进程。该进程为请求分词，再通过 ZeroMQ 发给 engine core。engine core 负责调度，并将 batch 发给 GPU worker，每块 GPU 对应一个 worker。token ID 沿原路径返回，API server 再将文本流式发给客户端。',
}, f => {
  f.kicker(20, 18, '客户端');
  f.kicker(160, 18, '进程 1');
  f.kicker(330, 18, '进程 2');
  f.kicker(500, 18, '每块 GPU 各一个');
  const client = f.box({ x: 20, y: 40, w: 116, h: 64, hue: 'olive', title: '客户端', sub: ['curl、OpenAI', 'SDK、基准测试'] });
  const api = f.box({ x: 160, y: 40, w: 150, h: 64, hue: 'blue', title: 'API 服务器', sub: ['HTTP 路由', '分词器'] });
  const core = f.box({ x: 330, y: 40, w: 150, h: 64, hue: 'blue', title: '引擎核心', sub: ['调度器', 'KVCacheManager'] });
  const worker = f.box({ x: 500, y: 40, w: 120, h: 64, hue: 'violet', title: 'GPU 工作者', sub: ['GPUModelRunner', '前向计算'] });
  f.arrow([136, 62], [159, 62], { style: 'call' });
  f.arrow([310, 62], [329, 62], { style: 'call' });
  f.arrow([480, 62], [499, 62], { style: 'call' });
  f.arrow([499, 88], [481, 88], { style: 'reply' });
  f.arrow([329, 88], [311, 88], { style: 'reply' });
  f.arrow([159, 88], [137, 88], { style: 'event' });
  f.step(148, 50, 1);
  f.step(320, 50, 2);
  f.step(490, 50, 3);
  const keyed = [
    [1, 'HTTP 请求，文本输入', 140],
    [2, 'ZeroMQ 消息，token ID', 164],
    [3, '共享内存队列，每步一个 batch', 188],
  ];
  keyed.forEach(([n, label, y]) => {
    f.step(42, y - 4, n);
    f.text(72, y, label, { size: 11.5, serif: true, hue: 'ink-soft' });
  });
  f.line(24, 208, 60, 208, { style: 'reply', head: false });
  f.text(72, 212, 'token ID 按步骤返回', { size: 11.5, serif: true, hue: 'ink-soft' });
  f.line(24, 232, 60, 232, { style: 'event', head: false });
  f.text(72, 236, '文本流式返回客户端', { size: 11.5, serif: true, hue: 'ink-soft' });
  f.text(20, 280, 'worker 崩溃会出现在 engine core 日志中。分词器变慢会拖慢首 token。', { size: 11, serif: true, hue: 'ink-soft' });
});
