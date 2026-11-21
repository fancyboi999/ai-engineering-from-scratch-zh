'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const gl = require('../../../_shared/graphviz-lite.js');

const capture = fs.readFileSync(path.join(__dirname, '../../capture/out/51-draw-functional.txt'), 'utf8');
const graph = gl.fromCapture(capture, 'get_graph().draw_mermaid()');
const s = gl.summary(graph);
const plan = gl.layout(graph, { top: 44 });
const node = plan.boxes.get('workflow');

module.exports = figure('fig-6-3b', {
  height: plan.bottom + 44,
  title: '入口点的图',
  desc: `workflow 入口点的图，由其 draw_mermaid 输出绘制。它有 ${s.nodes} 个节点：${s.names.join(', ')}。一条普通边从 __start__ 到 workflow，一条条件边从 workflow 到 __end__。任务 double 和 ask_human 在 workflow 节点内部运行，不在图中。`,
}, f => {
  f.kicker(20, 20, '@entrypoint 的 get_graph()');
  f.text(620, 20, `${s.nodes} 个节点，没有任务节点`, { size: 11, anchor: 'end', hue: 'ink-soft' });
  gl.draw(f, plan);
  f.text(node.x + node.w + 20, node.y + 16, 'double 和 ask_human 在这里面运行', { size: 11, serif: true, hue: 'ink-soft' });
  gl.legend(f, plan.bottom + 30, { plain: '普通边', conditional: '条件边，运行时选择' });
});
