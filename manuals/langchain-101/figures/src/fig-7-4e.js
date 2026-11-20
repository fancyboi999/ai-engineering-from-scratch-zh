'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const gl = require('../../../_shared/graphviz-lite.js');

const capture = fs.readFileSync(path.join(__dirname, '../../capture/out/53-draw-deep-agent.txt'), 'utf8');
const graph = gl.fromCapture(capture, 'get_graph().draw_mermaid()');
const s = gl.summary(graph);
const tools = graph.nodes.get('tools').meta.replace(/^__tools = /, '').split(', ');
const hue = node => (node.id === 'model' ? 'plum' : node.id === 'tools' ? 'green' : node.id.includes('.') ? 'blue' : 'indigo');
const plan = gl.layout(graph, { top: 44, hue, metaMax: 250 });
const loops = graph.edges.filter(e => e.from === e.to).map(e => e.from);

module.exports = figure('fig-7-4e', {
  height: plan.bottom + 44,
  title: 'deep agent 的图',
  desc: `带 tools=[add] 的 create_deep_agent 的已编译图，由 draw_mermaid 输出绘制。它有 ${s.nodes} 个节点。PatchToolCallsMiddleware.before_agent 在 model 之前运行，_ParentNotifierMiddleware.after_agent 在结束之前运行。tools 节点含 ${tools.length} 个工具：${tools.join(', ')}。${loops.join(', ')} 节点还有一条条件边回到自身。`,
}, f => {
  f.kicker(20, 20, 'create_deep_agent 的 get_graph()');
  f.text(620, 20, `${s.nodes} 个节点，${tools.length} 个工具`, { size: 11, anchor: 'end', hue: 'ink-soft' });
  gl.draw(f, plan);
  gl.legend(f, plan.bottom + 30, { plain: '普通边', conditional: '条件边，运行时选择' });
});
