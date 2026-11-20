'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/internals/08-costs/breakdown.json'));
const ROWS = ['none/async', 'memory/async', 'memory/sync', 'memory/exit', 'sqlite/async', 'sqlite/sync', 'sqlite/exit'];
const NAME = { none: '无 saver', memory: 'InMemorySaver', sqlite: 'SqliteSaver' };
const LOOP = ['prepare_next_tasks', 'apply_writes', 'loop._put_checkpoint', 'loop.put_writes'];
const bars = ROWS.map(key => {
  const row = data.rows[key];
  if (!row) throw new Error(`fig-2-6b: no row ${key}`);
  const [saver, mode] = key.split('/');
  const S = row.supersteps_median;
  return {
    saver: NAME[saver],
    mode,
    total: row.framework_ms_per_superstep_median,
    loop: LOOP.reduce((a, k) => a + (row[k] ? row[k].total_ms : 0), 0) / S,
    share: row.framework_share_pct_median,
    wall: row.wall_s.median,
  };
});
const lo = Math.min(...bars.map(b => b.total));
const hi = Math.max(...bars.map(b => b.total));
const shareLo = Math.min(...bars.map(b => b.share));
const shareHi = Math.max(...bars.map(b => b.share));

const X0 = 200;
const W = 320;
const MAXV = 6;
const X = v => X0 + (v / MAXV) * W;
const Y0 = 64;
const RH = 34;

module.exports = figure('fig-2-6b', {
  height: 400,
  title: '每个超步的框架耗时，按 saver 与持久性模式划分',
  desc: `七根横条，每个 saver 与持久性模式组合一根，对象是 x86 服务器虚拟机上用 Qwen3 4B、含 ${data.k} 次工具往返的一次 create_agent 运行，共 22 个超步，每行 ${data.n} 次运行，取中位数。虚拟机当时有负载，所以请看占比和各条的顺序，不要看毫秒数。框架耗时是总耗时减去 Ollama 调用和工具函数内部的耗时。每根条给出每个超步的毫秒数：${bars.map(b => `${b.saver} ${b.mode} ${b.total.toFixed(2)}`).join('，')}。靛蓝部分是循环函数：规划、应用、构建检查点和记录任务写入。灰色部分是其余：节点包装，以及循环等待的 saver 工作。最右列是框架耗时占总耗时的比例，为 ${shareLo} 到 ${shareHi}%，运行时长约 ${bars[0].wall.toFixed(1)} s，其余时间都被模型占用。`,
}, f => {
  f.kicker(20, 24, 'saver，模式');
  f.text(X0, 24, '每个超步的框架耗时（毫秒）', { size: 11, serif: true, hue: 'ink-soft' });
  f.kicker(620, 24, '占比', { anchor: 'end' });
  f.text(620, 40, '占总耗时', { size: 11, serif: true, hue: 'ink-soft', anchor: 'end' });
  for (let t = 0; t <= MAXV; t += 2) {
    f.rule(X(t), Y0 - 14, X(t), Y0 + ROWS.length * RH - 10, { hue: 'ink-mute', opacity: 0.25 });
    f.text(X(t), Y0 + ROWS.length * RH + 6, `${t} ms`, { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  bars.forEach((b, r) => {
    const y = Y0 + r * RH;
    f.beat(r + 1);
    f.text(20, y + 4, b.saver, { size: 11.5, hue: 'teal' });
    f.text(134, y + 4, b.mode, { size: 11.5, hue: 'amber' });
    f.rect(X(0), y - 8, X(b.loop) - X(0), 14, { hue: 'indigo' });
    f.rect(X(b.loop), y - 8, X(b.total) - X(b.loop), 14, { hue: 'grey' });
    f.text(X(b.total) + 6, y + 4, `${b.total.toFixed(2)} ms`, { size: 11, hue: 'ink-soft', knock: true });
    f.text(620, y + 4, `${b.share.toFixed(3)} %`, { size: 11.5, anchor: 'end', weight: 700, hue: 'ink' });
  });
  f.beat(0);
  const ky = Y0 + ROWS.length * RH + 40;
  f.rect(20, ky - 11, 22, 14, { hue: 'indigo' });
  f.text(48, ky, '循环：规划、应用、检查点、任务写入', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(20, ky + 11, 22, 14, { hue: 'grey' });
  f.text(48, ky + 22, '其余：节点包装、saver 等待循环', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, ky + 50, `在每次约 ${bars[0].wall.toFixed(1)} s 的运行中，模型占用了其余 ${(100 - shareHi).toFixed(2)}% 或更多`, { size: 11, hue: 'plum' });
});
