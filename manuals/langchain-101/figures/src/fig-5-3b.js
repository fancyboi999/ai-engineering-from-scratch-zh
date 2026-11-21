'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const recorded = new Set(Object.keys(load(path.join(__dirname, '../../capture/lab/summary/crash-resume-x86.json')).keys.none.cells).map(cell => cell.split(' ')[2]));

const lanes = [
  { title: '图循环', sub: 'Pregel', hue: 'indigo', x: 220 },
  { title: '节点', sub: 'tools、model', hue: 'indigo', x: 340 },
  { title: '账本', sub: 'PostgreSQL', hue: 'olive', x: 460 },
  { title: 'checkpointer', sub: '两种 saver', hue: 'teal', x: 580 },
];
const rows = [
  [0, 1, 'call', '运行 charge', '1 before_tool'],
  [1, 2, 'effect', '插入并提交', '2 inside_tool'],
  [1, 0, 'reply', '返回写入', '3 before_put_writes'],
  [0, 3, 'write', 'put_writes', '4 before_put'],
  [0, 3, 'write', 'put，该步', null],
  [0, 1, 'call', '下一次模型调用', '5 after_tool'],
];

const drawn = rows.filter(row => row[4]).map(row => row[4].split(' ')[1]);
if (drawn.length !== recorded.size || drawn.some(name => !recorded.has(name))) throw new Error('fig-5-3b: the kill points differ from the lab summary');

module.exports = figure('fig-5-3b', {
  height: 470,
  title: '工具所在步骤中的五个终止点',
  desc: '四条生命线：图循环、节点、图之外的 PostgreSQL 账本，以及 checkpointer。六行：循环运行 charge 工具，工具插入并提交一行账本记录，工具返回它的写入，循环用 put_writes 保存这些写入，循环用 put 保存该步的检查点，循环启动下一次模型调用。终止点位于第 1、2、3、4 和 6 行之后。',
}, f => {
  lanes.forEach(lane => {
    f.box({ x: lane.x, y: 8, w: 112, h: 40, hue: lane.hue, title: lane.title, sub: lane.sub, titleSize: 11.5, anchor: 'middle', pad: 3 });
    f.lifeline(lane.x, 48, 452);
  });
  f.kicker(20, 28, '终止点');
  rows.forEach(([from, to, style, label, kill], i) => {
    const y = 84 + i * 62;
    f.beat(i + 1);
    const x1 = lanes[from].x;
    const x2 = lanes[to].x;
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label });
    if (kill) {
      const ky = y + 31;
      f.rule(160, ky, 630, ky, { hue: 'rose', dash: 'dashed', width: 1.2 });
      f.text(20, ky + 4, kill, { size: 11, hue: 'rose' });
    }
  });
});
