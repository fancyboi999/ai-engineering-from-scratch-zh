'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/streaming-mac-real.json'));
const live = data.timeline.astream_events_v3;
const batched = data.timeline.astream_events_v3_gather;
const last = run => run.tokens[run.tokens.length - 1];
const tracks = [
  [live, 0, '模型发送', 'olive', '只读文本的循环'],
  [live, 1, '消费者收到', 'indigo', ''],
  [batched, 0, '模型发送', 'olive', '先读推理，再读文本的循环'],
  [batched, 1, '消费者收到', 'rose', ''],
];

module.exports = figure('fig-5-1d', {
  height: 330,
  title: '两种 async v3 消费者中，每个 token 的发送时刻与收到时刻',
  desc: `Mac 上两种消费者各一次运行的时间线，Qwen3 4B 生成 ${live.tokens.length} 个 token。在文本循环中，每个 token 都在发送后几毫秒内被看到，范围是运行开始后的 ${live.tokens[0][1]} ms 到 ${last(live)[1]} ms。在先读推理的循环中，模型从 ${batched.tokens[0][0]} ms 到 ${last(batched)[0]} ms 持续发送，消费者在 ${batched.tokens[0][1]} 到 ${last(batched)[1]} ms 一次看到全部 ${batched.tokens.length} 个 token。`,
}, f => {
  const c = chart(f, { x: 214, y: 44, w: 396, h: 200, xDomain: [0, 4500], yDomain: [0, 4], xTicks: [0, 1000, 2000, 3000, 4000], xFormat: String, xLabel: '运行开始后的毫秒数' });
  tracks.forEach(([run, column, label, hue, group], i) => {
    const cy = c.py(3.5 - i);
    if (group) f.text(20, cy - 18, group, { size: 11.5, weight: 700, hue: 'ink' });
    f.text(20, cy + 4, label, { size: 11, hue: 'ink-soft' });
    const d = run.tokens.map(token => `M${(c.px(token[column]) - 1).toFixed(1)} ${cy - 10}h2v20h-2z`).join('');
    f.mark(d, { hue });
  });
  const seen = batched.tokens[0][1];
  f.text(c.px(seen) - 8, c.py(0.5) + 4, `全部 ${batched.tokens.length} 个在 ${Math.round(seen)} ms`, { size: 11, hue: 'rose', anchor: 'end', weight: 700, knock: true });
  f.text(20, 298, `每根刻度线是一次运行中 ${live.tokens.length} 个 token 之一。橄榄色刻度线是 Ollama 上的 Qwen3 4B 发送的时刻。`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 314, '其余是消费者看到 token 的时刻。下面那个循环要到最后才看到文本。', { size: 11, serif: true, hue: 'ink-soft' });
});
