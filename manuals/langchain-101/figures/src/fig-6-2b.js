'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const gl = require('../../../_shared/graphviz-lite.js');

const capture = fs.readFileSync(path.join(__dirname, '../../capture/out/50-draw-fanout.txt'), 'utf8');
const graph = gl.fromCapture(capture, 'get_graph().draw_mermaid()');
const s = gl.summary(graph);
const plan = gl.layout(graph, { top: 44 });
const cond = graph.edges.filter(e => e.conditional).map(e => `${e.from} 到 ${e.to}`);

module.exports = figure('fig-6-2b', {
  height: plan.bottom + 44,
  title: 'LangGraph 绘制的笑话图',
  desc: `由 draw_mermaid 输出绘制的已编译笑话图，自上而下。它有 ${s.nodes} 个节点和 ${s.edges} 条边。${s.conditional} 条条件边是 ${cond.join('、')}。从 plan 出发的边来自带 Send 的 add_conditional_edges。从 pick 出发的两条边来自 pick 的 Command 返回类型，没有调用 add_edge。`,
}, f => {
  f.kicker(20, 20, 'get_graph().draw_mermaid()');
  f.text(620, 20, `${s.plain} 条普通边，${s.conditional} 条条件边`, { size: 11, anchor: 'end', hue: 'ink-soft' });
  gl.draw(f, plan);
  const plan_ = plan.boxes.get('plan');
  const pick = plan.boxes.get('pick');
  f.text(plan_.x + plan_.w / 2 + 14, plan_.y + plan_.h + 13, 'Send：每个 subject 一个 write_joke 任务', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(pick.x + pick.w + 16, pick.y + 16, 'pick 返回一个 Command', { size: 11, serif: true, hue: 'ink-soft' });
  gl.legend(f, plan.bottom + 30, { plain: '普通边', conditional: '条件边，运行时选择' });
});
