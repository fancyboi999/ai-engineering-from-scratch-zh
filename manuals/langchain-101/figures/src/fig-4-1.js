'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');

const out = name => fs.readFileSync(path.join(__dirname, '../../capture/out', name), 'utf8');
const list = (text, heading) => {
  const at = text.indexOf('\n[', text.indexOf(heading)) + 1;
  return JSON.parse(text.slice(at, text.indexOf('\n]', at) + 2));
};
const agent = out('05-agent-graph.txt');
const bare = list(agent, '## a graph with no tools');
const withTools = list(agent, '## nodes');
const config = JSON.parse(/agent\.config:\n(\{[\s\S]*?\n\})/.exec(agent)[1]);
const streamMode = /agent\.stream_mode = '(\w+)'/.exec(agent)[1];
const order = out('09-middleware-order.txt');
const mwNodes = list(order, '## middleware=[A, B, C], graph nodes');
const mwEdges = list(order, '## edges').map(e => e.split(' -> '));
const fanOut = name => mwEdges.filter(([a]) => a === name).length;
const hooks = mwNodes.filter(name => name.includes('.'));

const GRID = [
  ['__start__', 'A.before_agent', 'B.before_agent', 'C.before_agent'],
  ['A.before_model', 'B.before_model', 'C.before_model', 'model'],
  ['tools', 'A.after_model', 'B.after_model', 'C.after_model'],
  ['C.after_agent', 'B.after_agent', 'A.after_agent', '__end__'],
];
const missing = mwNodes.filter(name => !GRID.flat().includes(name));
if (missing.length) throw new Error(`fig-4-1: nodes not placed: ${missing.join(', ')}`);
const COLX = [20, 172, 324, 476];
const W = 130;
const H = 24;
const ROW0 = 228;
const PITCH = 54;
const at = name => {
  const r = GRID.findIndex(row => row.includes(name));
  const c = GRID[r].indexOf(name);
  return { r, c, x: COLX[c], y: ROW0 + r * PITCH, cx: COLX[c] + W / 2 };
};
const hueOf = name => (name === 'model' ? 'plum' : name === 'tools' ? 'green' : name.startsWith('__') ? 'grey' : 'blue');

const agentEdges = list(agent, '## edges').map(e => ({ from: e.split(' -> ')[0], to: e.split(' -> ')[1].replace(' (conditional)', ''), conditional: e.includes('(conditional)') }));
const small = (f, y, nodes, label, edges) => {
  f.text(20, y - 8, label, { size: 11.5, weight: 700, hue: 'violet' });
  f.text(620, y - 8, `${nodes.length} 个节点`, { size: 11, anchor: 'end', hue: 'ink-soft' });
  const x = name => 20 + nodes.indexOf(name) * 140;
  nodes.forEach(name => f.box({ x: x(name), y, w: 104, h: H, hue: hueOf(name), title: name, titleSize: 11, pad: 2 }));
  for (const e of edges) {
    const style = { style: e.conditional ? 'state' : 'call' };
    const a = x(e.from);
    const b = x(e.to);
    if (Math.abs(b - a) === 140) {
      const lane = b > a ? -5 : 5;
      f.arrow([b > a ? a + 104 : a, y + H / 2 + (e.conditional ? lane : 0)], [b > a ? b - 1 : b + 105, y + H / 2 + (e.conditional ? lane : 0)], style);
    } else {
      f.path(`M${a + 72} ${y + H} V${y + H + 12} H${b + 52} V${y + H + 1}`, style);
    }
  }
};

module.exports = figure('fig-4-1', {
  height: 512,
  title: 'create_agent 的每个参数构建出什么',
  desc: `三张读自录制工具包的编译图。只给模型、不给工具的 create_agent 有 ${bare.length} 个节点：${bare.join('、')}。加上 tools=[add] 后多出 tools 节点，共 ${withTools.length} 个节点。再加上带全部四种节点钩子的 middleware=[A, B, C]，多出 ${hooks.length} 个钩子节点，共 ${mwNodes.length} 个，画成网格，图中共有 ${mwEdges.length} 条边：before 钩子依次运行 A、B、C，after_model 钩子依次运行 C、B、A，A.after_model 会路由到 tools、回到 A.before_model，或进入 after_agent 钩子。从有多个后继节点的节点引出的边画成琥珀色虚线。system_prompt 和 response_format 不增加节点，它们在 model 节点内部改变每个请求。每个 agent 的配置都带有 recursion_limit ${config.recursion_limit} 和 stream_mode ${streamMode}。`,
}, f => {
  f.kicker(20, 18, '编译后的图中的节点');
  small(f, 50, bare, 'create_agent(model)', [{ from: bare[0], to: bare[1] }, { from: bare[1], to: bare[2] }]);
  small(f, 114, withTools, 'create_agent(model, tools=[add])', agentEdges);
  f.text(20, 170, '没有工具的图，model 之后只有一个后继节点。加上工具会多出 tools 节点和一次选择。', { size: 11, serif: true, hue: 'ink-soft' });

  f.text(20, 204, 'create_agent(model, tools=[add], middleware=[A, B, C])', { size: 11.5, weight: 700, hue: 'violet' });
  f.text(620, 204, `${mwNodes.length} 个节点，其中 ${hooks.length} 个是钩子`, { size: 11, anchor: 'end', hue: 'ink-soft' });
  for (const name of mwNodes) {
    const p = at(name);
    f.box({ x: p.x, y: p.y, w: W, h: H, hue: hueOf(name), title: name, titleSize: 11, pad: 2, weight: name.includes('.') ? 400 : 700 });
  }
  const into = {};
  for (const [from, to] of mwEdges) {
    const a = at(from);
    const b = at(to);
    const style = { style: fanOut(from) > 1 ? 'state' : 'call' };
    into[to] = (into[to] || 0) + 1;
    const shift = (into[to] - 1) * 14 - 14;
    if (a.r === b.r) {
      const right = b.c > a.c;
      f.arrow([right ? a.x + W : a.x, a.y + H / 2], [right ? b.x - 1 : b.x + W + 1, b.y + H / 2], style);
    } else if (a.c === b.c) {
      const down = b.r > a.r;
      f.arrow([a.cx, down ? a.y + H : a.y], [a.cx, down ? b.y - 1 : b.y + H + 1], style);
    } else {
      const down = b.r > a.r;
      const mid = down ? a.y + H + (PITCH - H) / 2 : a.y - (PITCH - H) / 2;
      const tx = b.cx + shift;
      f.path(`M${a.cx} ${down ? a.y + H : a.y} V${mid} H${tx} V${down ? b.y - 1 : b.y + H + 1}`, style);
    }
  }
  f.text(20, 464, '实线：唯一的后继节点。琥珀虚线：条件边，后继节点在运行时选定。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 482, 'system_prompt 和 response_format 不增加节点：它们在 model 内部改变每个请求。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 500, `每个 agent 的配置里还带有 recursion_limit ${config.recursion_limit} 和 stream_mode ${streamMode}。`, { size: 11, serif: true, hue: 'ink-soft' });
});
