'use strict';

const fs = require('fs');
const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');

const out = name => fs.readFileSync(path.join(__dirname, '../../capture/out', name), 'utf8');
const section = (text, heading) => {
  const start = text.indexOf(heading);
  if (start < 0) throw new Error(`fig-5-1: no section ${heading}`);
  const end = text.indexOf('\n## ', start + heading.length);
  return text.slice(start, end < 0 ? undefined : end);
};
const chunks = body => body.split(/\nchunk \d+:\n/).slice(1).map(part => JSON.parse(part.slice(0, part.indexOf('\n}') + 2)));
const counted = body => Number(/\n(\d+) chunks\n/.exec(body)[1]);
const perTask = (body, printed) => {
  const n = counted(body);
  if (n !== 2 * nodes.length) throw new Error('fig-5-1: expected one start and one result for each task');
  return Array.from({ length: n }, (_, i) => ({ col: Math.floor(i / 2) + 1, kind: i % 2 ? 'end' : 'start', printed: i < printed.length }));
};

const updates = chunks(section(out('21-stream-updates-values.txt'), "## stream_mode='updates'"));
const nodes = updates.map(chunk => Object.keys(chunk)[0]);
const values = chunks(section(out('21-stream-updates-values.txt'), "## stream_mode='values'"));
const messages = chunks(section(out('22-stream-messages.txt'), "## stream_mode='messages'"));
const tasksText = section(out('23-stream-tasks-custom-debug.txt'), "## stream_mode='tasks'");
const tasks = chunks(tasksText);
const custom = Number(/(\d+) chunks/.exec(section(out('23-stream-tasks-custom-debug.txt'), "## stream_mode='custom'"))[1]);
const debugText = section(out('23-stream-tasks-custom-debug.txt'), "## stream_mode='debug'");
const debug = chunks(debugText);
const tools = chunks(section(out('26-stream-tools-mode.txt'), "## stream_mode='tools'"));
const events = JSON.parse(out('25-stream-events-v3.events.json'));

const v3 = [];
let column = 0;
for (const event of events) {
  v3.push({ col: column, kind: event.method === 'values' ? 'state' : event.method === 'tools' ? 'tool' : 'model' });
  if (event.method === 'values') column += 1;
}
const rows = [
  ['updates', updates.map((chunk, i) => ({ col: i + 1, kind: nodes[i] === 'tools' ? 'tool' : 'model' }))],
  ['values', values.map((chunk, i) => ({ col: i, kind: 'state' }))],
  ['messages', messages.map(chunk => ({ col: chunk.metadata.langgraph_step, kind: chunk.message.type === 'ToolMessage' ? 'tool' : 'model' }))],
  ['tasks', perTask(tasksText, tasks)],
  ['debug', perTask(debugText, debug)],
  ['custom', Array.from({ length: custom }, () => ({ col: 0, kind: 'state' }))],
  ['tools', tools.map(chunk => ({ col: 2, kind: chunk.event === 'tool-started' ? 'start' : 'tool' }))],
  ['v3 events', v3],
];
const STYLE = {
  state: { hue: 'indigo', filled: true },
  model: { hue: 'plum', filled: true },
  tool: { hue: 'green', filled: true },
  start: { hue: 'amber', filled: false },
  end: { hue: 'amber', filled: true },
};
const bands = [
  { x: 112, w: 52, label: '输入' },
  { x: 176, w: 132, label: `${nodes[0]}，第 1 步` },
  { x: 320, w: 96, label: `${nodes[1]}，第 2 步` },
  { x: 428, w: 150, label: `${nodes[2]}，第 3 步` },
];
const total = name => rows.find(row => row[0] === name)[1].length;

module.exports = figure('fig-5-1', {
  height: 404,
  title: '一次 agent 运行在各个流模式下的数据块',
  desc: `八行，对应同一次 agent 运行的八种流，分四列：输入、第 1 步的 ${nodes[0]} 节点、第 2 步的 ${nodes[1]} 节点、第 3 步的 ${nodes[2]} 节点。每个标记是从录制中读出的一个数据块，颜色表示它携带的内容：靛蓝是整个状态，梅紫是模型输出，绿色是工具输出，琥珀色是开始或结束的任务。updates 有 ${total('updates')} 个，values ${total('values')} 个，messages ${total('messages')} 个，tasks ${total('tasks')} 个，debug ${total('debug')} 个，custom ${total('custom')} 个，slow_sum agent 上的 tools 模式 ${total('tools')} 个，stream_events v3 有 ${total('v3 events')} 个事件。v3 流在每一步结束时发出一个 values 事件。`,
}, f => {
  bands.forEach(band => {
    const hue = band.label === '输入' ? 'violet' : band.label.startsWith('tools') ? 'green' : 'indigo';
    f.text(band.x + band.w / 2, 24, band.label, { size: 11, anchor: 'middle', hue });
    f.rule(band.x - 6, 34, band.x - 6, 300, { hue: 'ink-mute', dash: 'dashed' });
  });
  f.rule(584, 34, 584, 300, { hue: 'ink-mute', dash: 'dashed' });
  f.kicker(20, 24, '流');
  f.kicker(606, 24, 'n', { anchor: 'middle' });
  rows.forEach(([name, marks], i) => {
    const y = 52 + i * 32;
    f.beat(i + 1);
    f.text(20, y + 4, name, { size: 11.5, hue: 'indigo' });
    bands.forEach((band, b) => {
      const here = marks.filter(mark => mark.col === b);
      const step = here.length ? Math.min(12, (band.w - 8) / here.length) : 0;
      const start = band.x + band.w / 2 - (step * (here.length - 1)) / 2 - 3;
      here.forEach((mark, k) => {
        const style = STYLE[mark.kind];
        f.rect(start + k * step, y - 7, 6, 14, { fill: style.filled ? color(`${style.hue}-ink`) : color('paper'), stroke: color(`${style.hue}-ink`), strokeWidth: 1.2 });
      });
    });
    f.text(606, y + 4, String(marks.length), { size: 12, anchor: 'middle', weight: 700, hue: marks.length ? 'indigo' : 'ink-mute' });
  });
  f.beat(0);
  const key = [['state', '整个状态'], ['model', '模型输出'], ['tool', '工具输出'], ['start', '任务开始'], ['end', '任务结束']];
  key.forEach(([kind, name], i) => {
    const style = STYLE[kind];
    const x = 20 + i * 122;
    f.rect(x, 318, 6, 14, { fill: style.filled ? color(`${style.hue}-ink`) : color('paper'), stroke: color(`${style.hue}-ink`), strokeWidth: 1.2 });
    f.text(x + 12, 330, name, { size: 11, serif: true, hue: 'ink-soft' });
  });
  f.text(20, 362, '每个标记是一个数据块。tasks 和 debug 运行时没有 checkpointer。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 380, 'tools 行来自 slow_sum agent：开始、两个增量、完成。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 398, '每一列都以一个 v3 values 事件收尾。', { size: 11, serif: true, hue: 'ink-soft' });
});
