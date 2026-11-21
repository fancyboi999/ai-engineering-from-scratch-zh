'use strict';

const { figure } = require('../../../_shared/figkit.js');

const total = 6.13;
const runs = [
  { depth: 0, name: 'LangGraph', hue: 'indigo', start: 0, secs: 6.13, meta: '6 个子运行' },
  { depth: 1, name: 'model', hue: 'indigo', start: 0, secs: 3.33 },
  { depth: 2, name: 'ChatOllama', hue: 'plum', start: 0, secs: 3.33, meta: '282 token' },
  { depth: 1, name: 'tools', hue: 'indigo', start: 3.33, secs: 0 },
  { depth: 2, name: 'add', hue: 'green', start: 3.33, secs: 0 },
  { depth: 1, name: 'model', hue: 'indigo', start: 3.34, secs: 2.79 },
  { depth: 2, name: 'ChatOllama', hue: 'plum', start: 3.34, secs: 2.79, meta: '302 token' },
];
const messages = [
  { who: '用户', hue: 'violet', text: 'What is 305 + 18?' },
  { who: 'AI', hue: 'plum', text: '工具调用 add(a=305, b=18)' },
  { who: 'add', hue: 'green', text: '工具结果 323' },
  { who: 'AI', hue: 'plum', text: '323' },
];

module.exports = figure('fig-7-6d', {
  height: 372,
  title: 'LangSmith 追踪视图中一次被追踪的 agent 运行',
  desc: '对 LangSmith 追踪视图的重绘，内容是 Ollama 上 Qwen3 4B 的一次 create_agent 运行，位于托管免费计划的项目 aiefs-lc101-trace 中。左窗格是运行树：6.13 s 的 LangGraph 根运行有 6 个子运行，3.33 s 的 model 节点内含一次 282 token 的 ChatOllama 调用，tools 节点内含 0.00 s 的 add 工具，第二个 2.79 s 的 model 节点内含一次 302 token 的 ChatOllama 调用。每个运行旁的条形显示它在 6.13 s 内的运行时间段。右窗格是根运行：输入是用户问题 What is 305 + 18?，输出是用户消息、调用 add（a 为 305，b 为 18）的 AI 消息、工具结果 323，以及最终的 AI 回答 323。',
}, f => {
  f.rect(16, 10, 608, 30, { hue: 'olive' });
  f.text(28, 30, 'LangSmith', { size: 12.5, weight: 700, hue: 'olive' });
  f.text(112, 30, '项目 aiefs-lc101-trace，开启追踪的一次运行', { size: 11.5, serif: true, hue: 'ink-soft' });

  f.kicker(28, 66, '运行树');
  f.kicker(206, 66, '瀑布图');
  const barX = 206;
  const barW = 96;
  runs.forEach((run, index) => {
    const y = 92 + index * 38;
    const x = 28 + run.depth * 16;
    if (run.depth) f.rule(x - 8, y - 22, x - 8, y - 4, { hue: 'ink-mute' });
    f.rect(x, y - 11, 10, 10, { hue: run.hue });
    f.text(x + 16, y - 2, run.name, { size: 12, weight: 700, hue: run.hue });
    f.text(x + 16, y + 12, run.meta ? `${run.secs.toFixed(2)} s, ${run.meta}` : `${run.secs.toFixed(2)} s`, { size: 11, serif: true, hue: 'ink-soft' });
    const left = barX + (run.start / total) * barW;
    const width = Math.max(2, (run.secs / total) * barW);
    f.rect(left, y - 8, width, 8, { hue: run.hue });
  });

  f.rule(318, 54, 318, 360, { hue: 'ink-mute' });

  f.kicker(334, 66, '根运行，输入');
  f.box({ x: 334, y: 76, w: 290, h: 40, hue: 'violet', title: '用户', sub: 'What is 305 + 18?', align: 'left', titleSize: 12, titleHue: 'violet' });
  f.kicker(334, 144, '根运行，输出');
  messages.forEach((message, index) => {
    const y = 154 + index * 50;
    f.box({ x: 334, y, w: 290, h: 40, hue: message.hue, title: message.who, sub: message.text, align: 'left', titleSize: 12, titleHue: message.hue });
  });
});
