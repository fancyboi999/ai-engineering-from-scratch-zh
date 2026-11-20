'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { flat } = require('../../../_shared/forms.js');

const text = fs.readFileSync(path.join(__dirname, '../../capture/out/42-langsmith.txt'), 'utf8');
const section = text.slice(text.indexOf('## a create_agent run inside a local trace'));
const requests = JSON.parse(/by method and path:\n(\{[\s\S]*?\})/.exec(section)[1]);
const posts = requests['POST /runs'];
const patches = requests['PATCH /runs/<run-id>'];
const runs = /\n\n((?:chain|llm|tool) [\s\S]*?)\n\n/.exec(section)[1].split('\n').map(line => {
  const [, indent, type, name] = /^( *)(\w+) (.+)$/.exec(line);
  return { depth: indent.length / 2, type, name };
});
if (runs.length - 1 !== posts || posts !== patches) throw new Error('fig-1-3b: the tree and the request counts disagree');

const hueOf = run => {
  if (run.depth === 0) return 'violet';
  if (run.type === 'llm') return 'plum';
  if (run.type === 'tool') return 'green';
  return 'indigo';
};
const CLIENT = 566;
const TOP = 92;
const PITCH = 40;

module.exports = figure('fig-1-3b', {
  height: 480,
  title: '一次被追踪的 agent 轮次中的各个 run',
  desc: `一棵缩进树，列出 ${runs.length} 个 run，按开始顺序每行一个：${runs.map(run => `${run.type} ${run.name}`).join('，')}。根节点 agent_turn 是录制工具包里的 traceable 函数，运行在 enabled 为 local 的 tracing_context 中，数据只留在内存里。它下面的 ${posts} 个 run 各有一条橄榄色虚线箭头指向右侧的客户端泳道，因为客户端在 run 开始时收到一次 POST /runs，结束时收到一次 PATCH，共 ${posts} 个 POST 和 ${patches} 个 PATCH。每个图节点是一个 chain run，两次模型调用是 llm 叶子，工具调用是 tool 叶子。`,
}, f => {
  flat.gateway(f, CLIENT, 6, 'olive', { w: 52, h: 36, ports: 4 });
  f.text(CLIENT, 58, '客户端', { size: 11, weight: 700, hue: 'olive', anchor: 'middle' });
  f.text(CLIENT, 72, '记录每个请求', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.lifeline(CLIENT, 78, TOP + runs.length * PITCH - 10);
  f.kicker(20, 20, 'run 树，按 run 开始的顺序');
  f.text(20, 38, '名称在上，run 类型在下', { size: 11, serif: true, hue: 'ink-soft' });

  const parents = [];
  runs.forEach((run, index) => {
    const y = TOP + index * PITCH;
    const x = 20 + run.depth * 40;
    const hue = hueOf(run);
    f.beat(index + 1);
    parents[run.depth] = { x, y };
    if (run.depth) {
      const parent = parents[run.depth - 1];
      f.path(`M${parent.x + 12} ${parent.y + 14} V${y} H${x - 1}`, { hue: 'ink-mute', head: false, packet: false });
    }
    const w = Math.max(run.name.length, run.type.length + 4) * 7.2 + 20;
    f.rect(x, y - 14, w, 30, { hue });
    f.text(x + 10, y, run.name, { size: 11.5, weight: 700, hue });
    f.text(x + 10, y + 12, `${run.type} run`, { size: 11, serif: true, hue: 'ink-soft' });
    if (run.depth === 0) {
      f.text(x + w + 12, y + 4, "保存在内存中：tracing_context(enabled='local')", { size: 11, serif: true, hue: 'ink-mute' });
      return;
    }
    f.arrow([x + w, y], [CLIENT - 1, y], { style: 'effect', label: index === 1 ? '先 POST，后 PATCH' : undefined, labelX: 440 });
  });

  f.beat(0);
  const bottom = TOP + runs.length * PITCH + 8;
  f.rule(20, bottom, 620, bottom, { opacity: 0.4 });
  f.text(20, bottom + 22, `根节点之下有 ${runs.length - 1} 个 run，客户端收到 ${posts} 个 POST /runs 和 ${patches} 个 PATCH。`, { size: 11, serif: true, hue: 'ink-soft' });
  const key = [['indigo', '图节点'], ['plum', '模型调用'], ['green', '工具调用']];
  key.forEach(([hue, name], i) => {
    f.rect(20 + i * 150, bottom + 36, 14, 12, { hue });
    f.text(40 + i * 150, bottom + 46, name, { size: 11, serif: true, hue: 'ink-soft' });
  });
});
