'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/retries-x86.json'));
const cell = data.cells['t_timeout_always tool_retry_mw'];
const arrivals = cell.ledger_rows[0];
if (!cell.ledger_rows.every(n => n === arrivals) || !cell.tool_executions.every(n => n === arrivals)) throw new Error('fig-4-7: runs differ');

const lanes = [
  { title: 'tools 节点', sub: '工具调用', hue: 'indigo' },
  { title: 'ToolRetry', sub: 'Middleware()', hue: 'blue' },
  { title: 'remote_action', sub: '工具', hue: 'green' },
  { title: 'PostgreSQL 账本', sub: 'INSERT, pg_sleep(3)', hue: 'olive' },
];
const cx = index => 80 + index * 160;

module.exports = figure('fig-4-7', {
  height: 500,
  title: '一次连续三次超时的工具调用',
  desc: `四条生命线的时序图：tools 节点、ToolRetryMiddleware、remote_action 工具，以及 PostgreSQL 里的账本表。工具先插入一行，再在 1 s 的语句超时下运行 pg_sleep(3)。${arrivals} 次尝试每次都写入它的行，每次都以 QueryCanceled 结束。中间件在尝试之间先等 1 s，再等 2 s。最后一次尝试之后，它返回一条错误的 ToolMessage，账本里有 ${arrivals} 行；在 x86 服务器虚拟机上用 Qwen3 4B 的 ${cell.ledger_rows.length} 次运行中，每次都是如此。`,
}, f => {
  lanes.forEach((lane, i) => {
    f.box({ x: cx(i), y: 8, w: 140, h: 40, hue: lane.hue, title: lane.title, sub: lane.sub, titleSize: 11.5, anchor: 'middle', pad: 4 });
    f.lifeline(cx(i), 48, 490);
  });
  let y = 76;
  let n = 1;
  const row = (from, to, style, label) => {
    f.step(16, y, n++, { hue: style === 'fail' ? 'rose' : undefined });
    f.arrow([cx(from), y], [cx(to) + (cx(to) > cx(from) ? -1 : 1), y], { style, label });
    y += 34;
  };
  row(0, 1, 'call', 'remote_action(item)');
  for (let a = 1; a <= arrivals; a += 1) {
    row(1, 2, 'call', `第 ${a} 次尝试`);
    row(2, 3, 'effect', `INSERT ${a}`);
    row(2, 1, 'fail', 'QueryCanceled，1 s 后');
    if (a < arrivals) {
      f.text(cx(1) - 8, y - 10, `等待 ${a === 1 ? 1 : 2} s`, { size: 11, hue: 'amber', anchor: 'end', knock: true });
      y += 6;
    }
  }
  row(1, 0, 'reply', '错误的 ToolMessage');
  f.text(cx(3), y - 4, `账本 ${arrivals} 行`, { size: 12, anchor: 'middle', hue: 'rose', weight: 700, knock: true });
});
