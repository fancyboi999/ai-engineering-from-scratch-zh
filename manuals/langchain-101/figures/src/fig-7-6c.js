'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { x: 80, name: '你的代码', hue: 'violet' },
  { x: 232, name: 'traceable', hue: 'blue' },
  { x: 392, name: 'callbacks', hue: 'blue' },
  { x: 556, name: '客户端', hue: 'olive' },
];
const rows = [
  [0, 1, 'call', '"local" 下的 pipeline()', '一个 traceable 函数'],
  [1, 0, 'reply', 'RunTree 交给 on_end', '保存在内存中，0 个请求'],
  [0, 2, 'call', '"local" 下的 agent.invoke()', 'LangChain 代码'],
  [2, 2, 'state', '追踪开启："local" 为真值', '添加了 LangChainTracer'],
  [2, 3, 'fail', 'POST /runs 7, PATCH 7', '已发送，尽管是 local'],
  [0, 2, 'call', 'enabled=False 下的 invoke()', '在 collect_runs() 内'],
  [2, 0, 'reply', 'traced_runs 中有 4 个运行', '保存在内存中，0 个请求'],
];

module.exports = figure('fig-7-6c', {
  height: 420,
  title: 'tracing_context(enabled="local") 保留与发送的内容',
  desc: '四条生命线：你的代码、langsmith 的 traceable 包装器、LangChain 回调管理器和 LangSmith 客户端。enabled 设为 local 的 tracing_context 内，traceable 函数构建一棵运行树并交给 on_end，客户端收不到任何请求。同一上下文内的 agent.invoke 会打开追踪，因为回调管理器把字符串 local 当作真值，并添加 LangChainTracer，它发送 7 次 POST /runs 和 7 次 PATCH。enabled 设为 False 的 tracing_context 加 collect_runs 内的同一个 invoke，把四个顶层运行保留在内存中，什么也不发送。',
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x, y: 10, w: 116, h: 30, hue: lane.hue, title: lane.name, titleSize: 12, anchor: 'middle' });
    f.lifeline(lane.x, 40, 408);
  }
  rows.forEach(([from, to, style, label, note], index) => {
    const y = 80 + index * 48;
    f.step(16, y, index + 1);
    const x1 = lanes[from].x;
    const x2 = lanes[to].x;
    if (from === to) {
      f.path(`M${x1} ${y - 8} H${x1 + 30} V${y + 8} H${x1 + 1}`, { style });
      f.text(x1 + 38, y - 2, label, { size: 11.5, hue: 'amber', knock: true });
      f.text(x1 + 38, y + 13, note, { size: 11, serif: true, hue: 'ink-soft', knock: true });
      return;
    }
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note, labelX: (x1 + x2) / 2 });
  });
});
