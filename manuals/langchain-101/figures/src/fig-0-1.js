'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { title: '你的代码', sub: 'agent.invoke', hue: 'violet' },
  { title: 'agent 图', sub: 'create_agent', hue: 'indigo' },
  { title: '聊天模型', sub: 'Qwen3 4B', hue: 'plum' },
  { title: '工具', sub: 'add, flaky_disk', hue: 'green' },
  { title: 'checkpointer', sub: 'InMemorySaver', hue: 'teal' },
  { title: 'LangSmith', sub: '进程之外', hue: 'olive' },
];
const cx = index => 60 + index * 104;

const rows = [
  [0, 1, 'call', 'invoke: What is 2 + 3?', '调用 · 墨色实线'],
  [1, 2, 'model', 'system: You add numbers.', '模型调用 · 梅紫实线'],
  [2, 1, 'reply', 'tool_calls: add(a=2, b=3)', '回复 · 墨色虚线'],
  [1, 4, 'write', 'checkpoint step 1', '持久写入 · 青色实线'],
  [1, 3, 'state', 'next: tools', '状态迁移 · 琥珀虚线'],
  [1, 0, 'event', 'custom: lookup A-17', '流 · 靛蓝点线'],
  [1, 5, 'effect', 'POST /runs，7 次', '外部副作用 · 橄榄虚线'],
  [3, 1, 'fail', 'RuntimeError: disk on fire', '失败 · 玫红虚线'],
];

module.exports = figure('fig-0-1', {
  height: 470,
  title: '如何阅读本手册中的时序图',
  desc: '六条生命线：你的代码、由 create_agent 返回的 agent 图、运行在 Ollama 上的聊天模型 Qwen3 4B、一个工具、checkpointer，以及进程之外的 LangSmith。八个编号行展示八种箭头样式：以 What is 2 + 3? 调用 invoke 是墨色实线调用；系统 prompt You add numbers. 是梅紫实线模型调用；带 a=2、b=3 的工具调用 add 是墨色虚线回复；checkpoint step 1 是青色实线持久写入；next tools 是琥珀虚线状态迁移；自定义流值 lookup A-17 是靛蓝点线流；7 次 POST /runs 请求是橄榄虚线外部副作用；RuntimeError disk on fire 是玫红虚线失败。',
}, f => {
  lanes.forEach((lane, index) => {
    f.box({ x: cx(index), y: 8, w: 100, h: 40, hue: lane.hue, title: lane.title, sub: lane.sub, titleSize: 11, anchor: 'middle', pad: 3 });
    f.lifeline(cx(index), 48, 460);
  });
  rows.forEach(([from, to, style, label, note], index) => {
    const y = 84 + index * 48;
    f.beat(index + 1);
    f.step(16, y, index + 1, { hue: style === 'fail' ? 'rose' : undefined });
    const x1 = cx(from);
    const x2 = cx(to);
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note });
  });
});
