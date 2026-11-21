'use strict';

const { figure } = require('../../../_shared/figkit.js');

const columns = [
  { x: 16, kicker: 'v1，两种模式', outer: '一个元组', outerSub: ['(mode, data)', '形状随模式变化'], inner: 'data', innerSub: ['(ToolMessage, metadata)', 'langgraph_node: tools'], where: 'messages 的第 3 个块' },
  { x: 222, kicker: 'v2，任意模式', outer: '一个 StreamPart 字典', outerSub: ['type, ns, data', 'type: messages'], inner: 'data', innerSub: ['message: ToolMessage', 'metadata: node tools'], where: '第 3 个 part' },
  { x: 428, kicker: 'v3 事件', outer: '一个事件帧', outerSub: ['type, method, params, seq', 'method: tools'], inner: 'params.data', innerSub: ['event: tool-finished', 'output: ToolMessage'], where: 'seq 9' },
];

module.exports = figure('fig-5-1b', {
  height: 270,
  title: '同一个工具结果在 v1、v2 和 v3 中的样子',
  desc: '三列，每列对应一种流 API，都携带 add 工具的 ToolMessage 5。使用两种模式的 v1 产出一个由模式和数据组成的元组，数据是带元数据的 ToolMessage。v2 产出一个带 type、ns 和 data 的 StreamPart 字典。v3 产出一个带 type、method、params 和 seq 的事件帧，其中 method 为 tools，数据是以 ToolMessage 为 output 的 tool-finished 事件。',
}, f => {
  columns.forEach(col => {
    f.kicker(col.x, 18, col.kicker);
    const outer = f.box({ x: col.x, y: 30, w: 196, h: 64, hue: 'indigo', title: col.outer, sub: col.outerSub, align: 'left' });
    const inner = f.box({ x: col.x, y: 128, w: 196, h: 64, hue: 'green', title: col.inner, sub: col.innerSub, align: 'left' });
    f.arrow([col.x + 98, outer.y + outer.h], [col.x + 98, inner.y - 1], { style: 'event' });
    f.text(col.x, 218, col.where, { size: 11, serif: true, hue: 'ink-soft' });
  });
  f.rule(217, 10, 217, 226, { dash: 'dashed' });
  f.rule(423, 10, 423, 226, { dash: 'dashed' });
  f.text(16, 254, '三者携带的是同一个 ToolMessage，content 为 5，并带有该次调用的 tool_call_id。', { size: 11, serif: true, hue: 'ink-soft' });
});
