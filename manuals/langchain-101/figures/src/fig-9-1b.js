'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const gl = require('../../../_shared/graphviz-lite.js');

const capture = fs.readFileSync(path.join(__dirname, '../../capture/out/54-draw-service-agent.txt'), 'utf8');
const graph = gl.fromCapture(capture, 'get_graph().draw_mermaid()');
const s = gl.summary(graph);
const hooks = s.names.filter(name => name.includes('.'));
const tools = graph.nodes.get('tools').meta.replace(/^__tools = /, '').split(', ');
const hue = node => (node.id === 'model' ? 'plum' : node.id === 'tools' ? 'green' : node.id.includes('.') ? 'blue' : 'indigo');
const plan = gl.layout(graph, { top: 44, hue, metaMax: 240 });

module.exports = figure('fig-9-1b', {
  height: plan.bottom + 44,
  title: '服务智能体的图',
  desc: `参考服务中 build_agent 的已编译图，由 draw_mermaid 输出绘制。它有 ${s.nodes} 个节点，其中 ${hooks.length} 个是钩子节点：${hooks.join(', ')}。其他中间件只有 wrap 钩子，不增加节点。ModelCallLimitMiddleware 可以在 model 之前或之后结束运行。tools 节点含 ${tools.length} 个工具：${tools.join(', ')}。`,
}, f => {
  f.kicker(20, 20, 'build_agent 的 get_graph()');
  f.text(620, 20, `${s.nodes} 个节点，其中 ${hooks.length} 个是钩子`, { size: 11, anchor: 'end', hue: 'ink-soft' });
  gl.draw(f, plan);
  gl.legend(f, plan.bottom + 30, { plain: '普通边', conditional: '条件边，运行时选择' });
});
