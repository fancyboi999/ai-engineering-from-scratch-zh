'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const gl = require('../../../_shared/graphviz-lite.js');

const capture = fs.readFileSync(path.join(__dirname, '../../capture/out/48-draw-agent.txt'), 'utf8');
const heading = 'get_graph().draw_mermaid()';
const graph = gl.fromCapture(capture, heading);
const block = capture.slice(capture.indexOf(`## ${heading}`), capture.indexOf('\n## ', capture.indexOf(`## ${heading}`) + 4));
const rows = block.split('\n').filter(line => line.startsWith('\t') && !line.includes('classDef')).map(line => line.trim());
const isEdge = line => / -->? | -\.-> /.test(line);
const nodeRows = rows.filter(line => !isEdge(line));
const edgeRows = rows.filter(isEdge);
const hue = node => (node.id === 'model' ? 'plum' : node.id === 'tools' ? 'green' : 'indigo');
const plan = gl.layout(graph, { top: 60, center: 520, hue });
const s = gl.summary(graph);

module.exports = figure('fig-4-1b', {
  height: 310,
  title: '从 draw_mermaid 的各行到一幅图',
  desc: `带一个工具的 agent 的 draw_mermaid 输出，逐行列出，旁边是它所描述的图。${nodeRows.length} 行节点定义给出每个节点的 id 和标签：:::first 与 :::last 类标出 __start__ 和 __end__，tools 的标签带有元数据 __tools = add。随后是 ${edgeRows.length} 行边定义：--> 是普通边，-.-> 是条件边。图中有 ${s.nodes} 个节点、${s.plain} 条普通边和 ${s.conditional} 条条件边。`,
}, f => {
  f.kicker(20, 20, 'draw_mermaid() 的各行');
  f.kicker(420, 20, '对应的图');
  let y = 50;
  f.text(20, y, '节点行：id(label)，编号与图对应', { size: 11, serif: true, hue: 'ink-soft' });
  y += 22;
  nodeRows.forEach((line, i) => {
    f.step(30, y - 4, i + 1, { hue: 'indigo' });
    f.text(46, y, line, { size: 11, max: 360 });
    y += 24;
  });
  y += 6;
  f.text(20, y, '边行：--> 普通，-.-> 条件', { size: 11, serif: true, hue: 'ink-soft' });
  y += 22;
  for (const line of edgeRows) {
    const conditional = line.includes('-.->');
    f.line(20, y - 4, 40, y - 4, { style: conditional ? 'state' : 'call' });
    f.text(46, y, line, { size: 11, hue: conditional ? 'amber' : undefined });
    y += 20;
  }
  gl.draw(f, plan);
  nodeRows.forEach((line, i) => {
    const id = /^([^(]+)\(/.exec(line)[1];
    const box = plan.boxes.get(id);
    f.step(box.x - 14, box.y + box.h / 2, i + 1, { hue: 'indigo' });
  });
  f.text(20, y + 8, 'frontmatter 和 classDef 行只设置样式。', { size: 11, serif: true, hue: 'ink-soft' });
});
