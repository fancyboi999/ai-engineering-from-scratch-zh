'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const gl = require('../../../_shared/graphviz-lite.js');

const capture = fs.readFileSync(path.join(__dirname, '../../capture/out/52-draw-subgraph.txt'), 'utf8');
const flat = gl.fromCapture(capture, 'get_graph().draw_mermaid()');
const xray = gl.fromCapture(capture, 'get_graph(xray=True).draw_mermaid()');
const a = gl.summary(flat);
const b = gl.summary(xray);
const left = gl.layout(flat, { top: 64, center: 160 });
const right = gl.layout(xray, { top: 64, center: 440 });
const bottom = Math.max(left.bottom, right.bottom);

module.exports = figure('fig-6-7b', {
  height: bottom + 44,
  title: '同一个父图，分别用 xray 和不用 xray 绘制',
  desc: `子图示例的父图，由 draw_mermaid 输出绘制两次。get_graph() 有 ${a.nodes} 个节点，把子图显示为一个名为 inner 的节点。get_graph(xray=True) 有 ${b.nodes} 个节点，把子图画成包住节点 ${[...xray.clusters.get('inner')].join(' 和 ')} 的方框 inner，父图的边指向 inner:shout，并从 inner:ask_ok 引出。`,
}, f => {
  f.kicker(20, 20, 'get_graph()');
  f.kicker(300, 20, 'get_graph(xray=True)');
  f.text(20, 40, `${a.nodes} 个节点，inner 是一个节点`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(300, 40, `${b.nodes} 个节点，子图已展开`, { size: 11, serif: true, hue: 'ink-soft' });
  f.rule(280, 12, 280, bottom + 4, { dash: 'dotted' });
  gl.draw(f, left);
  gl.draw(f, right);
  gl.legend(f, bottom + 30, { plain: '普通边', conditional: '条件边，运行时选择' });
});
