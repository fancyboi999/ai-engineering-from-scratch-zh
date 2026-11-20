'use strict';

const fs = require('fs');
const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { flat } = require('../../../_shared/forms.js');

const out = name => fs.readFileSync(path.join(__dirname, '../../capture/out', name), 'utf8');
const block = (text, heading, skip = 0) => {
  let body = text.slice(text.indexOf(heading) + heading.length);
  for (let i = 0; i < skip; i += 1) body = body.slice(body.indexOf('\n]') + 2);
  return JSON.parse(body.slice(body.indexOf('['), body.indexOf('\n]') + 2));
};
const run = out('06-agent-run.txt');
const final = block(run, '## final state', 1);
const calls = block(run, 'model calls, as the model received them:');
const history = out('30-state-history-forks.txt').split('## get_state_history, newest first')[1].split('\n## ')[0];
const checkpoints = history.split(/\n(?=\{)/).filter(chunk => chunk.trim().startsWith('{')).map(chunk => JSON.parse(chunk.slice(0, chunk.lastIndexOf('}') + 1))).reverse();
const call = final[1].tool_calls[0];
const answer = final[3].content;
const system = calls[0].messages[0].split(': ')[1];

const kindOf = message => ({ HumanMessage: ['H', 'violet'], AIMessage: ['AI', 'plum'], ToolMessage: ['T', 'green'] })[message.type];
const nextOf = cp => (cp.next.length ? cp.next.join(', ') : '无');
const cpRow = i => ({ write: checkpoints[i], label: `put，第 ${checkpoints[i].step} 步`, note: `next: ${nextOf(checkpoints[i])}` });

const lanes = [
  { title: '你的代码', sub: 'agent.invoke', hue: 'violet', draw: (f, x) => flat.terminal(f, x, 18, 'violet', { w: 40, h: 34 }) },
  { title: 'model 节点', sub: 'model', hue: 'indigo', draw: (f, x) => flat.unit(f, x, 22, 'indigo', { w: 34, h: 30 }) },
  { title: '聊天模型', sub: calls[0].model, hue: 'plum', draw: (f, x) => flat.tower(f, x, 18, 'plum', { w: 34, h: 34 }) },
  { title: 'tools 节点', sub: call.name, hue: 'green', draw: (f, x) => flat.unit(f, x, 22, 'green', { w: 34, h: 30 }) },
  { title: 'checkpointer', sub: 'InMemorySaver', hue: 'teal', draw: (f, x) => flat.cylinder(f, x, 14, 'teal', { w: 34, h: 40 }) },
];
const cx = index => 46 + index * 90;
const STATE = 470;

const groups = [
  [[0, 4, 'write', cpRow(0)]],
  [[0, 4, 'write', cpRow(1)]],
  [
    [1, 2, 'model', { label: `调用 1：${calls[0].messages.length} 条消息` }],
    [2, 1, 'reply', { label: `tool_calls: ${call.name}(${Object.values(call.args).join(', ')})` }],
    [1, 4, 'write', cpRow(2)],
  ],
  [
    [1, 3, 'call', { label: `Send: ${call.name}, ${call.id}` }],
    [3, 4, 'write', { ...cpRow(3), label: `put，第 ${checkpoints[3].step} 步：${final[2].type} ${final[2].content}` }],
  ],
  [
    [1, 2, 'model', { label: `调用 2：${calls[1].messages.length} 条消息` }],
    [2, 1, 'reply', { label: answer }],
  ],
  [
    [1, 4, 'write', cpRow(4)],
    [1, 0, 'reply', { label: `${final.length} 条消息` }],
  ],
];

module.exports = figure('fig-1-3', {
  height: 610,
  title: '一次 create_agent 运行，逐步展开',
  desc: `五条生命线，上方各有一幅小图：你的代码画成终端，model 节点，聊天模型，tools 节点，以及画成圆柱的 checkpointer。第六列用小方块显示每个检查点里的消息。六个编号步骤与正文中的列表一一对应：1，第 ${checkpoints[0].step} 步的输入检查点，没有消息，next 为 __start__。2，第 ${checkpoints[1].step} 步的检查点，含用户消息，next 为 model。3，model 节点带着系统提示词“${system}”和用户消息调用聊天模型，得到工具调用 ${call.name}，参数为 ${Object.values(call.args).join(' 和 ')}，并保存第 ${checkpoints[2].step} 步，next 为 tools。4，model 节点把工具调用发给 tools 节点，tools 节点保存第 ${checkpoints[3].step} 步，其中含 ${call.id} 对应的 ToolMessage，next 为 model。5，第二次模型调用收到 ${calls[1].messages.length} 条消息，回答“${answer}”。6，第 ${checkpoints[4].step} 步的检查点含 ${final.length} 条消息，没有下一个节点，invoke 把它们返回。`,
}, f => {
  lanes.forEach((lane, index) => {
    lane.draw(f, cx(index));
    f.text(cx(index), 70, lane.title, { size: 11, weight: 700, hue: lane.hue, anchor: 'middle' });
    f.text(cx(index), 84, lane.sub, { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
    f.lifeline(cx(index), 92, 572);
  });
  f.kicker(STATE, 70, 'state.messages');
  f.text(STATE, 84, '每个检查点中的内容', { size: 11, serif: true, hue: 'ink-soft' });
  f.rule(STATE - 14, 60, STATE - 14, 572, { hue: 'ink-mute', opacity: 0.4 });

  let y = 116;
  let saved = 0;
  groups.forEach((rows, g) => {
    const top = y;
    f.beat(g + 1);
    rows.forEach(([from, to, style, row]) => {
      const x1 = cx(from);
      const x2 = cx(to);
      f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label: row.label, labelX: style === 'write' ? x2 - 76 : undefined });
      if (row.note) f.text(x2 - 76, y + 16, row.note, { size: 11, anchor: 'middle', hue: 'amber', knock: true });
      if (row.write) {
        const count = row.write.messages.length;
        if (!count) f.text(STATE, y + 4, '空', { size: 11, serif: true, hue: 'ink-mute' });
        final.slice(0, count).forEach((message, k) => {
          const [mark, hue] = kindOf(message);
          const fresh = k >= saved;
          f.rect(STATE + k * 34, y - 8, 30, 16, { fill: color(fresh ? `${hue}-fill` : 'paper'), stroke: color(`${hue}-ink`), strokeWidth: fresh ? 1.4 : 0.8 });
          f.text(STATE + k * 34 + 15, y + 4, mark, { size: 11, anchor: 'middle', hue, weight: fresh ? 700 : undefined });
        });
        saved = count;
      }
      y += 40;
    });
    f.step(16, top, g + 1, { hue: rows.every(row => row[2] === 'write') ? 'teal' : 'ink' });
    if (rows.length > 1) f.rule(16, top + 10, 16, y - 46, { hue: 'ink-mute' });
    y += 8;
  });
  f.beat(0);
  const legend = [['H', 'violet', 'HumanMessage'], ['AI', 'plum', 'AIMessage'], ['T', 'green', 'ToolMessage']];
  legend.forEach(([mark, hue, name], i) => {
    const x = 20 + i * 150;
    f.rect(x, 584, 30, 16, { fill: color(`${hue}-fill`), stroke: color(`${hue}-ink`), strokeWidth: 1.4 });
    f.text(x + 15, 596, mark, { size: 11, anchor: 'middle', hue, weight: 700 });
    f.text(x + 38, 596, name, { size: 11, serif: true, hue: 'ink-soft' });
  });
  f.text(STATE, 596, '粗体：该步新增', { size: 11, serif: true, hue: 'ink-soft' });
});
