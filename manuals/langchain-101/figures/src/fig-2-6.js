'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/internals/09-growth/growth.json'));
const plainRow = data.rows.sqlite;
const deltaRow = data.rows['sqlite-delta'];
const plain = plainRow.row_bytes;
const delta = deltaRow.row_bytes;
if (plain.length !== delta.length) throw new Error('fig-2-6: the two runs have different row counts');
const snapshots = delta.map((b, i) => [i, b]).filter(([, b]) => b > 10 * Math.min(...delta.slice(1)));
const typical = [...delta].sort((a, b) => a - b)[Math.floor(delta.length / 2)];
const mb = v => `${(v / 1e6).toFixed(2)} MB`;
const thread = r => Number(r.checkpoint_bytes_total) + Number(r.writes_bytes);
const ratio = thread(plainRow) / thread(deltaRow);

module.exports = figure('fig-2-6', {
  height: 380,
  title: '每个检查点行的字节数：普通 messages 与 DeltaChannel 对比',
  desc: `SqliteSaver 的 checkpoints 表中每一行的字节数，按顺序排列，对象是 x86 服务器虚拟机上用 Qwen3 4B、含 ${plainRow.tool_round_trips} 次真实工具往返的一次 create_agent 运行；一次用普通的 add_messages 通道，一次用 messages 采用 DeltaChannel 的 state_schema。每个点是一行，每次运行 ${plain.length} 行。普通行从 ${plain[1]} 字节呈直线增长到 ${plain[plain.length - 1]} 字节，总计 ${plainRow.checkpoint_bytes_total} 字节。DeltaChannel 行保持在约 ${typical} 字节，只有 ${snapshots.length} 个快照行例外，位置为 ${snapshots.map(s => s[0]).join(' 和 ')}，大小为 ${snapshots.map(s => s[1]).join(' 和 ')} 字节，总计 ${deltaRow.checkpoint_bytes_total} 字节。加上 writes 表，普通线程占用的字节数是 DeltaChannel 线程的 ${ratio.toFixed(1)} 倍。`,
}, f => {
  const c = chart(f, { x: 70, y: 44, w: 420, h: 250, xDomain: [0, 210], yDomain: [0, 100000], xTicks: [0, 50, 100, 150, 200], yTicks: [0, 20000, 40000, 60000, 80000, 100000], yFormat: v => `${v / 1000} KB`, xLabel: '检查点行，按顺序', yLabel: '该行的字节数' });
  f.beat(1);
  plain.forEach((b, i) => f.dot(c.px(i), c.py(b), { hue: 'teal', r: 1.5 }));
  f.beat(2);
  delta.forEach((b, i) => f.dot(c.px(i), c.py(b), { hue: 'indigo', r: 1.5 }));
  f.beat(3);
  const last = plain.length - 1;
  f.text(c.px(last) + 12, c.py(plain[last]) + 16, '普通 messages', { size: 11.5, weight: 700, hue: 'teal' });
  f.text(c.px(last) + 12, c.py(plain[last]) + 31, `共 ${mb(Number(plainRow.checkpoint_bytes_total))}`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(c.px(last) + 12, c.py(typical) - 30, 'DeltaChannel', { size: 11.5, weight: 700, hue: 'indigo' });
  f.text(c.px(last) + 12, c.py(typical) - 15, `共 ${mb(Number(deltaRow.checkpoint_bytes_total))}`, { size: 11, serif: true, hue: 'ink-soft' });
  const lx = c.px(64);
  const ly = c.py(13000);
  f.text(lx, ly, 'DeltaChannel 快照行', { size: 11, hue: 'indigo' });
  f.text(lx, ly + 15, '每 100 次更新一行', { size: 11, serif: true, hue: 'ink-soft' });
  snapshots.forEach(([i, b]) => {
    f.emit(`<circle cx="${c.px(i).toFixed(1)}" cy="${c.py(b).toFixed(1)}" r="4" fill="none" stroke="${color('indigo-ink')}" stroke-width="1.5"/>`);
    f.leader([lx + 40, ly - 12], [c.px(i) + (i > 150 ? -2 : 3), c.py(b) + 4], { hue: 'indigo' });
  });
  f.beat(0);
  f.text(70, 356, `含 writes 的整个线程：普通 ${mb(thread(plainRow))}，DeltaChannel ${mb(thread(deltaRow))}，少 ${ratio.toFixed(1)} 倍`, { size: 11, serif: true, hue: 'ink-soft' });
});
