'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const dir = path.join(__dirname, '../../capture/lab/internals/03-checkpoint');
const run1 = load(path.join(dir, 'crash.json'));
const run2 = load(path.join(dir, 'taskns.json'));
const cellsOf = data => {
  const out = {};
  for (const row of data.rows) (out[`${row.mode}/${row.wait_s.toFixed(1)}`] ||= []).push(row.category);
  return out;
};
const c1 = cellsOf(run1);
const c2 = cellsOf(run2);
const CELLS = ['sync/0.0', 'async/0.0', 'sync/0.2', 'async/0.2', 'exit/0.0', 'exit/0.2'];
for (const key of CELLS.slice(0, 4)) if (!c1[key] || !c2[key]) throw new Error(`fig-2-3b: missing cell ${key}`);
const reran = cats => cats.filter(c => c === 'a and c').length;
const pooled = mode => reran(c1[`${mode}/0.0`]) + reran(c2[`${mode}/0.0`]);
const total = mode => c1[`${mode}/0.0`].length + c2[`${mode}/0.0`].length;

const KIND = {
  'a and c': { fill: color('rose-ink'), stroke: color('rose-ink') },
  'only c': { fill: color('teal-ink'), stroke: color('teal-ink') },
  'nothing to resume': { fill: color('ink-mute'), stroke: color('ink-mute') },
};
const ORDER = ['a and c', 'only c', 'nothing to resume'];
const HUE = { 'a and c': 'rose', 'only c': 'teal', 'nothing to resume': 'ink-mute' };
const G1 = 112;
const G2 = 372;
const PITCH = 4.2;

module.exports = figure('fig-2-3b', {
  height: 340,
  title: '超步中途崩溃后，恢复运行了什么',
  desc: `SqliteSaver 崩溃测试的点阵行，使用 Qwen3 4B，在 x86 服务器虚拟机上运行。节点 a、b、c 并行运行：a 让模型说一种水果，b 调用天气工具，c 在 a 和 b 返回并等待 0 或 0.2 秒后退出进程。一个新进程恢复线程。每个点是一次试验，每个单元格 50 次，共两轮运行。不等待时，sync 在两轮中分别有 ${reran(c1['sync/0.0'])} 次和 ${reran(c2['sync/0.0'])} 次重跑了模型节点 a，合计 ${total('sync')} 次中的 ${pooled('sync')} 次；async 分别为 ${reran(c1['async/0.0'])} 次和 ${reran(c2['async/0.0'])} 次，合计 ${total('async')} 次中的 ${pooled('async')} 次。工具节点 b 从未重跑。等待 0.2 秒时，每次试验都只重跑 c。在 exit 模式下，第 1 轮的全部 100 次试验都不存在检查点。第 2 轮不包含 exit。`,
}, f => {
  f.kicker(G1, 24, '第 1 轮');
  f.kicker(G2, 24, '第 2 轮');
  f.text(20, 24, '模式，等待', { size: 11, hue: 'ink-mute' });
  CELLS.forEach((key, r) => {
    const [mode, wait] = key.split('/');
    const y = 52 + r * 32;
    f.beat(r + 1);
    f.text(20, y + 4, mode, { size: 12, weight: 700, hue: 'indigo' });
    f.text(70, y + 4, `${wait} s`, { size: 11, hue: 'ink-soft' });
    [[c1[key], G1], [c2[key], G2]].forEach(([cats, gx]) => {
      if (!cats) {
        f.text(gx, y + 4, '未运行', { size: 11, serif: true, hue: 'ink-mute' });
        return;
      }
      let k = 0;
      for (const kind of ORDER) {
        const n = cats.filter(x => x === kind).length;
        if (!n) continue;
        const d = Array.from({ length: n }, (_, j) => `M${(gx + 2 + (k + j) * PITCH).toFixed(1)} ${y}h0.01`).join('');
        f.path(d, { hue: HUE[kind], dash: 'dotted', width: 3.6, head: false, packet: false });
        k += n;
      }
      const n = reran(cats);
      const none = cats.filter(c => c === 'nothing to resume').length;
      f.text(gx + cats.length * PITCH + 6, y + 4, none ? '无' : `${n}/${cats.length}`, { size: 11, hue: n ? 'rose' : 'ink-soft' });
    });
    if (r === 1 || r === 3) f.rule(16, y + 16, 624, y + 16, { hue: 'ink-mute', opacity: 0.35 });
  });
  f.beat(0);
  const ky = 260;
  const key = [['a and c', '重跑了 a 和 c'], ['only c', '只重跑了 c'], ['nothing to resume', '没有可恢复的内容']];
  key.forEach(([kind, name], i) => {
    const x = 26 + i * 180;
    f.emit(`<circle cx="${x}" cy="${ky - 4}" r="4" fill="${KIND[kind].fill}" stroke="${KIND[kind].stroke}" stroke-width="1.2"/>`);
    f.text(x + 10, ky, name, { size: 11, serif: true, hue: 'ink-soft' });
  });
  f.text(20, 292, `零等待，两轮合计：sync 重跑 a 的有 ${pooled('sync')}/${total('sync')}，async 为 ${pooled('async')}/${total('async')}`, { size: 11.5, weight: 700, hue: 'rose' });
  f.text(20, 314, '工具节点 b 从未重跑，等待 0.2 秒后只剩 c 需要重跑', { size: 11, serif: true, hue: 'ink-soft' });
});
