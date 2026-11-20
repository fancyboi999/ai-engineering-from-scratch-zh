'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/streaming-mac-real.json'));
const text = data.phases.text.variants;
const rows = [
  ['plain_openai', '朴素 openai 循环', 'grey'],
  ['chatopenai_stream', 'ChatOpenAI.stream', 'blue'],
  ['agent_messages', 'messages 模式', 'indigo'],
  ['agent_messages_updates', 'messages 与 updates', 'indigo'],
  ['astream_events_v2', 'astream_events v2', 'indigo'],
  ['stream_events_v3', 'v3，文档中的循环', 'indigo'],
  ['stream_events_v3_raw', 'v3，原始事件', 'indigo'],
  ['astream_events_v3', 'async v3，文本循环', 'indigo'],
  ['astream_events_v3_gather', 'async v3，先读推理', 'rose'],
];
const fmt = v => (v >= 100 ? String(Math.round(v)) : String(v));

module.exports = figure('fig-5-1c', {
  height: 420,
  title: '按流 API 划分的每次运行的首个 token 送达延迟',
  desc: `点图，纵轴为对数刻度，表示从代理转发 Qwen3 4B 的首个 token 到消费者看到它之间的时间，在 Mac 上，每种 API 运行 ${text.plain_openai.n} 次。中位数：朴素 openai ${text.plain_openai.first_delay_ms_median} ms，ChatOpenAI ${text.chatopenai_stream.first_delay_ms_median} ms，messages 模式 ${text.agent_messages.first_delay_ms_median} ms，v3 文档中的循环 ${text.stream_events_v3.first_delay_ms_median} ms，先读推理的 async v3 消费者 ${text.astream_events_v3_gather.first_delay_ms_median} ms。`,
}, f => {
  const c = chart(f, { x: 196, y: 40, w: 352, h: 288, xScale: 'log10', yDomain: [0, 9], xDomain: [0.1, 10000], xTicks: [0.1, 1, 10, 100, 1000, 10000], xFormat: String, xLabel: '从发送到消费者收到的毫秒数，对数刻度' });
  f.text(20, 28, '流 API', { size: 11.5, serif: true, hue: 'ink-soft' });
  f.text(630, 28, '中位数', { size: 11.5, serif: true, hue: 'ink-soft', anchor: 'end' });
  rows.forEach(([key, label, hue], i) => {
    const cy = c.py(8.5 - i);
    const entry = text[key];
    const d = entry.first_delay_ms.map((v, j) => `M${Math.round(c.px(v)) - 2} ${Math.round(cy + ((j * 37) % 13 - 6) * 1.4)}a2 2 0 1 0 4 0a2 2 0 1 0-4 0`).join('');
    f.mark(d, { hue });
    const mx = c.px(entry.first_delay_ms_median);
    f.rule(mx, cy - 13, mx, cy + 13, { hue: 'ink', width: 2 });
    f.text(20, cy + 4, label, { size: 11, hue: hue === 'rose' ? 'rose' : 'ink' });
    f.text(630, cy + 4, `${fmt(entry.first_delay_ms_median)} ms`, { size: 11, hue: hue === 'rose' ? 'rose' : 'ink', anchor: 'end', weight: 700 });
  });
  f.text(20, 392, `每个点是 Qwen3 4B 生成 80 个 token 的一次运行，每种 API 运行 ${text.plain_openai.n} 次。较高的刻度线是中位数。`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 408, '玫红色的一行先遍历 message.reasoning 再读 message.text，所以文本要等到最后。', { size: 11, serif: true, hue: 'ink-soft' });
});
