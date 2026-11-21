'use strict';

const fs = require('fs');
const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');

const text = fs.readFileSync(path.join(__dirname, '../../capture/out/09-middleware-order.txt'), 'utf8');
const list = heading => {
  const at = text.indexOf('[', text.indexOf(heading));
  return JSON.parse(text.slice(at, text.indexOf('\n]', at) + 2));
};
const events = list('## hook order for one tool round trip').map((raw, index) => {
  const line = raw.trim();
  if (line === 'model called') return { index, lane: 3, kind: 'model', name: line };
  const [, who, hook, edge, tool] = /^([A-Z])\.(\w+)(?: (enter|exit))?(?: (\w+))?$/.exec(line);
  return { index, lane: 'ABC'.indexOf(who), who, hook, edge, tool, name: line };
});
const edges = list('## edges');
const after = from => edges.map(e => e.split(' -> ')).filter(([a]) => a === from).map(([, b]) => b);
const chain = ['C.before_model'];
for (;;) {
  const next = after(chain[chain.length - 1]).find(name => name === 'model' || name.endsWith('after_model'));
  if (!next) break;
  chain.push(next);
}

const phases = [];
for (const event of events) {
  const kind = event.kind === 'model' ? 'wrap_model_call' : event.hook;
  const last = phases[phases.length - 1];
  if (last && last.kind === kind) last.end = event.index;
  else phases.push({ kind, start: event.index, end: event.index });
}

const X0 = 104;
const PITCH = (618 - X0) / events.length;
const px = i => X0 + (i + 0.5) * PITCH;
const LANES = [92, 128, 164, 200];
const LANE_NAMES = ['A', 'B', 'C', '模型、工具'];

module.exports = figure('fig-4-5', {
  height: 452,
  title: '三个中间件的钩子顺序',
  desc: `middleware=[A, B, C] 在一次工具往返中记录了 ${events.length} 次钩子调用，自左向右阅读。三条泳道 A、B、C，第四条泳道是模型与工具。每个点是一个节点钩子。每根条是一个 wrap 钩子，从进入到退出。顶部有 ${phases.length} 个编号阶段：before_agent A B C，before_model A B C，wrap_model_call 依次进入 A B C、模型在最内层、再依次离开 C B A，after_model C B A，wrap_tool_call 依次进入 A B C、围住 add 工具、再依次离开 C B A，同样的模型阶段再来一遍，以及 after_agent C B A。A 的条最长，所以 A 是最外层。轨迹下方是从编译后的 agent 读出的图的边：${chain.join(' 到 ')}。`,
}, f => {
  f.kicker(20, 18, `${events.length} 次钩子调用，按运行顺序排列`);
  phases.forEach((phase, n) => {
    const x1 = px(phase.start) - PITCH * 0.4;
    const x2 = px(phase.end) + PITCH * 0.4;
    f.rule(x1, 52, x2, 52, { hue: 'ink-mute' });
    f.rule(x1, 48, x1, 56, { hue: 'ink-mute' });
    f.rule(x2, 48, x2, 56, { hue: 'ink-mute' });
    f.step((x1 + x2) / 2, 36, n + 1, { hue: phase.kind.startsWith('wrap') ? 'blue' : 'indigo' });
  });
  LANES.forEach((y, lane) => {
    f.text(20, y + 4, LANE_NAMES[lane], { size: 11.5, weight: 700, hue: lane < 3 ? 'blue' : 'plum' });
    f.rule(X0, y, 618, y, { opacity: 0.3 });
  });

  const open = {};
  events.forEach(event => {
    const x = px(event.index);
    if (event.kind === 'model') {
      f.dot(x, LANES[3], { hue: 'plum', r: 4.5 });
      return;
    }
    const y = LANES[event.lane];
    if (event.edge === 'enter') {
      open[event.who] = event;
      if (event.tool && events[event.index + 1].edge === 'exit') f.dot(x + PITCH / 2, LANES[3], { hue: 'green', r: 4.5 });
      return;
    }
    if (event.edge === 'exit') {
      const start = px(open[event.who].index);
      const tool = open[event.who].hook === 'wrap_tool_call';
      f.rect(start - 3, y - 6, x - start + 6, 12, { fill: color(tool ? 'green-fill' : 'blue-fill'), stroke: color(tool ? 'green-ink' : 'blue-ink') });
      return;
    }
    const before = event.hook.startsWith('before');
    f.emit(`<circle cx="${x.toFixed(1)}" cy="${y}" r="4" fill="${before ? color('indigo-ink') : color('panel')}" stroke="${color('indigo-ink')}" stroke-width="1.4"/>`);
  });

  const key = phases.map((phase, n) => {
    const names = events.slice(phase.start, phase.end + 1).filter(e => e.who && e.edge !== 'exit').map(e => e.who).join(' ');
    return `${n + 1} ${phase.kind}${names ? `: ${names}` : ''}`;
  });
  f.kicker(20, 238, '阶段');
  key.forEach((line, i) => f.text(20 + (i % 3) * 206, 258 + Math.floor(i / 3) * 18, line, { size: 11, hue: 'ink-soft' }));

  const legendY = 330;
  f.emit(`<circle cx="26" cy="${legendY - 4}" r="4" fill="${color('indigo-ink')}" stroke="${color('indigo-ink')}" stroke-width="1.4"/>`);
  f.text(36, legendY, 'before_ 节点钩子', { size: 11, serif: true, hue: 'ink-soft' });
  f.emit(`<circle cx="176" cy="${legendY - 4}" r="4" fill="${color('panel')}" stroke="${color('indigo-ink')}" stroke-width="1.4"/>`);
  f.text(186, legendY, 'after_ 节点钩子', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(316, legendY - 10, 22, 12, { hue: 'blue' });
  f.text(344, legendY, 'wrap_model_call', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(470, legendY - 10, 22, 12, { hue: 'green' });
  f.text(498, legendY, 'wrap_tool_call', { size: 11, serif: true, hue: 'ink-soft' });

  f.kicker(20, 372, 'model 节点周围的图的边');
  chain.forEach((node, i) => {
    const x = 20 + i * 122;
    f.box({ x, y: 386, w: 100, h: 26, hue: node === 'model' ? 'indigo' : 'blue', title: node, titleSize: 11, pad: 2 });
    if (i < chain.length - 1) f.arrow([x + 100, 399], [x + 121, 399], { style: 'call' });
  });
  f.text(20, 436, '每个 after_model 钩子都是独立的节点，边按列表顺序的反方向连接。', { size: 11, serif: true, hue: 'ink-soft' });
});
