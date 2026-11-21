'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-2', {
  height: 340,
  title: 'init_chat_model 如何解析模型字符串',
  desc: '一张按顺序做三项判断的决策图。第一，第一个冒号之前的部分是不是已知的 provider？openai:gpt-4.1 和 ollama:qwen3:4b 都是，分别构建 ChatOpenAI 和 ChatOllama。第二，名称是否以已知前缀开头，如 gpt-、o3 或 claude？gpt-4.1-mini 和 claude-haiku-4-5 都是，分别构建 ChatOpenAI 和 ChatAnthropic。第三，其他任何字符串，如 qwen3:4b，会在发出任何请求之前抛出 ValueError: Unable to infer model provider。',
}, f => {
  const test = (y, title, sub) => f.box({ x: 20, y, w: 260, h: 56, hue: 'blue', title, sub, align: 'left' });
  const out = (y, title, sub, hue) => f.box({ x: 360, y, w: 260, h: 56, hue, title, sub, align: 'left' });
  const t1 = test(20, '是已知的 provider 前缀？', '第一个冒号之前的部分');
  const o1 = out(20, 'ollama:qwen3:4b', 'ChatOllama，模型 qwen3:4b', 'plum');
  const t2 = test(120, '名称以已知前缀开头？', 'gpt-, o1, o3, claude, gemini');
  const o2 = out(120, 'claude-haiku-4-5', 'ChatAnthropic', 'plum');
  const o3 = out(220, 'qwen3:4b', 'ValueError: Unable to infer', 'rose');
  f.arrow(t1.right(), [o1.x - 1, t1.cy], { style: 'call', label: '是' });
  f.arrow(t2.right(), [o2.x - 1, t2.cy], { style: 'call', label: '是' });
  f.arrow([150, t1.y + t1.h], [150, t2.y - 1], { style: 'call', label: '否' });
  f.path(`M150 ${t2.y + t2.h} L150 248 L${o3.x - 1} 248`, { style: 'fail' });
  f.text(158, 196, '否', { size: 11.5 });
  f.text(20, 300, 'qwen3 不是已知的 provider，所以 ollama:qwen3:4b 只在第一个冒号处切分。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 320, '这个错误发生在任何请求到达 provider 之前。', { size: 11, serif: true, hue: 'ink-soft' });
});
