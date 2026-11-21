'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const gl = require('../../../_shared/graphviz-lite.js');

const capture = fs.readFileSync(path.join(__dirname, '../../capture/out/48-draw-agent.txt'), 'utf8');
const graph = gl.fromCapture(capture, 'get_graph().draw_mermaid()');
const s = gl.summary(graph);
const hue = node => (node.id === 'model' ? 'plum' : node.id === 'tools' ? 'green' : 'indigo');
const plan = gl.layout(graph, { top: 44, hue });

module.exports = figure('fig-1-3c', {
  height: plan.bottom + 44,
  title: '本次运行中 agent 的图',
  desc: `带一个工具的 create_agent 编译图，根据它的 draw_mermaid 输出绘制。共有 ${s.nodes} 个节点：${s.names.join('、')}。一条普通边从 __start__ 到 model。三条条件边分别从 model 到 tools、从 model 到 __end__、从 tools 回到 model。tools 节点列出工具 add。`,
}, f => {
  f.kicker(20, 20, '编译后的图');
  f.text(620, 20, `${s.nodes} 个节点，${s.plain} 条普通边，${s.conditional} 条条件边`, { size: 11, anchor: 'end', hue: 'ink-soft' });
  gl.draw(f, plan);
  gl.legend(f, plan.bottom + 30);
});
