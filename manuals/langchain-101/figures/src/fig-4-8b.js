'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-4-8b', {
  height: 430,
  title: 'AutoModeMiddleware 如何处理一次工具调用',
  desc: '模型请求两次工具调用：参数 name 为 main 的 delete_branch，以及参数为 2 和 3 的 add。对每个列出的工具，AutoModeMiddleware 向决策模型提出 noul 类型的问题 is_risky，附带指令、该工具调用、工具描述、最多 30 条消息，以及 criteria 为 null。delete_branch 得分 0.999，不低于 0.5，所以得到一条错误的 ToolMessage，没有运行。add 得分 0.0，所以运行并返回 5。未列出的工具不经提问直接运行。',
}, f => {
  const ai = f.box({ x: 320, y: 12, w: 300, h: 48, hue: 'plum', title: 'AIMessage tool_calls', sub: 'delete_branch(main), add(2, 3)', anchor: 'middle' });
  const q = f.box({ x: 120, y: 100, w: 400, h: 84, hue: 'amber', title: '问题 is_risky，类型 noul', sub: ['instructions、tool_call、tool_description、', '最多 30 条消息、criteria: null'] });
  f.arrow([320, ai.y + ai.h], [320, q.y - 1], { style: 'call', label: '每个列出的工具' });
  const block = f.box({ x: 20, y: 250, w: 280, h: 64, hue: 'rose', title: 'delete_branch: 0.999', sub: ['不低于 0.5：错误的 ToolMessage，', '工具不运行'], align: 'left' });
  const run = f.box({ x: 340, y: 250, w: 280, h: 64, hue: 'green', title: 'add: 0.0', sub: ['低于 0.5：工具运行，', 'ToolMessage 为 5'], align: 'left' });
  f.path(`M220 ${q.y + q.h} V${block.y - 1}`, { style: 'fail' });
  f.path(`M420 ${q.y + q.h} V${run.y - 1}`, { style: 'reply' });
  f.text(228, 222, '有风险', { size: 11, hue: 'rose', knock: true });
  f.text(428, 222, '放行', { size: 11, knock: true });
  f.box({ x: 20, y: 344, w: 600, h: 48, hue: 'grey', title: '不在 tools= 里的工具', sub: '不向决策模型提问，直接运行', align: 'left' });
  f.text(20, 418, '这些概率是 Qwen3 4B 通过录制工具包里的 OllamaDecisionModel 给出的回答。', { size: 11, serif: true, hue: 'ink-soft' });
});
