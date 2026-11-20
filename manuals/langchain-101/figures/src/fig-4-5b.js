'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const gl = require('../../../_shared/graphviz-lite.js');

const capture = fs.readFileSync(path.join(__dirname, '../../capture/out/49-draw-middleware.txt'), 'utf8');
const graph = gl.fromCapture(capture, 'get_graph().draw_mermaid()');
const s = gl.summary(graph);
const hooks = s.names.filter(name => name.includes('.'));
const hue = node => (node.id === 'model' ? 'plum' : node.id === 'tools' ? 'green' : node.id.includes('.') ? 'blue' : 'indigo');
const plan = gl.layout(graph, { top: 40, hue });

module.exports = figure('fig-4-5b', {
  height: plan.bottom + 40,
  title: '中间件 A、B、C 的图',
  desc: `带 tools=[add] 和 middleware=[A, B, C] 的 create_agent 的编译图，根据它的 draw_mermaid 输出绘制。共有 ${s.nodes} 个节点，其中 ${hooks.length} 个是钩子节点，共 ${s.edges} 条边，其中 ${s.conditional} 条是条件边。before 钩子从顶部起依次运行 A、B、C。after_model 钩子在 model 下方依次运行 C、B、A。A.after_model 有三条条件边：到 tools、到 C.after_agent、回到 A.before_model。tools 回到 A.before_model。`,
}, f => {
  f.kicker(20, 18, 'agent 的 get_graph()');
  f.text(620, 18, `${s.nodes} 个节点，其中 ${hooks.length} 个是钩子`, { size: 11, anchor: 'end', hue: 'ink-soft' });
  gl.draw(f, plan);
  gl.legend(f, plan.bottom + 28);
});
