'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/internals/05-streaming/v3_38484.json'));
const LABEL = { reasoning_then_text: '先推理，后文本', text_only: '仅文本', raw_events: '原始事件' };
const order = ['text_only', 'raw_events', 'reasoning_then_text'].map(name => {
  const run = data.runs[name][0];
  const sent = run.series.emit.filter(e => e[1] === 'text').map(e => e[0] / 1000);
  const got = run.series.receive.filter(e => e[1] === 'text').map(e => e[0] / 1000);
  if (sent.length !== got.length) throw new Error(`fig-2-5b: ${name} lost deltas`);
  return { name, sent, got, reasoningEnd: run.reasoning_emit_ms[1] / 1000, summary: data.summary[name] };
});
const buffered = order[2];
const lagMax = p => Math.max(...p.got.map((g, i) => g - p.sent[i])) * 1000;
const firstLags = buffered.summary['first text delta lag ms per run'];
const allMax = order.slice(0, 2).map(p => p.summary['text lag ms median, p90, max (all deltas)'][2]);

const T0 = 30;
const T1 = 42.5;
const X0 = 176;
const PX = (612 - X0) / (T1 - T0);
const X = t => X0 + (t - T0) * PX;
const s1 = v => v.toFixed(1);

module.exports = figure('fig-2-5b', {
  height: 432,
  title: '三种 v3 消费循环下，文本增量的发出与收到',
  desc: `三对行，时间轴以秒计，取自每种消费循环五次运行中的第 0 次，对一次 create_agent 运行使用 stream_events 版本 v3。模型是 x86 服务器虚拟机上 Ollama 里开启推理的 Qwen3 8B。它从第一秒起发出约 211 个推理增量，持续到约 ${s1(buffered.reasoningEnd)} s，然后在约 8.6 s 内发出 60 个文本增量。每对行的上一行标出每个文本增量的发出时刻，下一行标出循环收到它的时刻。仅文本循环与原始事件循环在几毫秒内就收到每个增量；五次运行中它们最大的延迟分别为 ${allMax[0]} ms 和 ${allMax[1]} ms。先读取 message.reasoning 的循环在 ${s1(buffered.got[0])} s 一次收到全部 60 个文本增量，最多比发出时刻晚 ${s1(lagMax(buffered))} ms。五次运行中，它的第一个文本增量晚了 ${Math.min(...firstLags)} 到 ${Math.max(...firstLags)} ms。`,
}, f => {
  f.kicker(20, 26, '消费循环');
  order.forEach((p, k) => {
    const y = 64 + k * 92;
    f.beat(k + 1);
    const hue = p === buffered ? 'rose' : 'indigo';
    f.text(20, y + 10, LABEL[p.name], { size: 12, weight: 700, hue });
    f.text(20, y + 26, '发出', { size: 11, serif: true, hue: 'olive' });
    f.text(20, y + 50, '收到', { size: 11, serif: true, hue });
    f.rule(X0, y + 22, 612, y + 22, { hue: 'ink-mute', opacity: 0.3 });
    f.rule(X0, y + 46, 612, y + 46, { hue: 'ink-mute', opacity: 0.3 });
    const ticks = (ts, top) => ts.map(t => `M${X(t).toFixed(1)} ${top}v14`).join('');
    f.path(ticks(p.sent, y + 15), { hue: 'olive', width: 1, head: false, packet: false });
    f.path(ticks(p.got, y + 39), { hue, width: 1, head: false, packet: false });
    if (p === buffered) {
      const a = X(p.sent[0]);
      const b = X(p.got[0]) - 4;
      f.rect(a, y + 60, b - a, 8, { fill: color('rose-fill'), stroke: color('rose-ink'), dash: 'dashed' });
      f.text((a + b) / 2, y + 84, `全部 60 个增量都在 message.text 列表里等待，最多 ${s1(lagMax(p) / 1000)} s`, { size: 11, anchor: 'middle', hue: 'rose' });
    } else {
      f.text(612, y + 72, `本次运行最大延迟 ${lagMax(p).toFixed(1)} ms`, { size: 11, anchor: 'end', serif: true, hue: 'ink-soft' });
    }
  });
  const axisY = 64 + 3 * 92 + 4;
  for (let t = 30; t <= 42; t += 2) {
    f.rule(X(t), axisY, X(t), axisY + 4, { hue: 'ink' });
    f.text(X(t), axisY + 18, String(t), { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  f.text(X0 - 24, axisY + 18, '秒', { size: 11, anchor: 'end', hue: 'ink-soft' });
  f.beat(0);
  f.text(20, axisY + 44, `推理在 ${s1(buffered.reasoningEnd)} s 之前实时流出，图中未画出`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, axisY + 66, `5 次运行中，第一个文本增量都晚了 ${(Math.min(...firstLags) / 1000).toFixed(2)} 到 ${(Math.max(...firstLags) / 1000).toFixed(2)} s`, { size: 11.5, weight: 700, hue: 'rose' });
});
