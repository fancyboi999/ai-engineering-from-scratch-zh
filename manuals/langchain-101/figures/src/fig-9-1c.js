'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/prodapp-mac/summary/fix-mac.json')).load;
const count = (cell, key) => Object.entries(cell.kinds).filter(([k]) => k.startsWith(key)).reduce((s, [, v]) => s + v, 0);
const parts = cell => [
  ['完成', count(cell, 'runs:200:done') + count(cell, 'approve:200:done'), 'violet'],
  ['已中断', count(cell, 'runs:200:interrupted'), 'amber'],
  ['approve 返回 409', count(cell, 'approve:409'), 'grey'],
  ['ReadTimeout', Object.values(cell.client_errors).reduce((s, v) => s + v, 0), 'rose'],
];
const ROWS = [['没有心跳', data.before], ['每 15 s 一次心跳', data.after]];
const total = Math.max(...ROWS.map(([, c]) => parts(c).reduce((s, p) => s + p[1], 0)));
const scale = 600 / total;

module.exports = figure('fig-9-1c', {
  height: 236,
  title: '50 个客户端看到的结果：流上没有心跳与有心跳',
  desc: ROWS.map(([label, c]) => `${label}：${parts(c).map(([n, v]) => `${n} ${v} 次`).join('，')}，每秒 ${c.runs_per_s_exact} 次运行`).join('。') + '。一个 worker，Mac 上的 Qwen3 4B，读取超时 120 s。',
}, f => {
  ROWS.forEach(([label, cell], r) => {
    const y = 20 + r * 86;
    f.text(16, y + 12, label, { size: 11.5, weight: 700 });
    f.text(16, y + 28, `每秒 ${cell.runs_per_s_exact} 次运行，每次运行中位数 ${cell.p50_s.toFixed(0)} s`, { size: 11, serif: true, hue: 'ink-soft' });
    let x = 16;
    for (const [name, value, hue] of parts(cell)) {
      if (!value) continue;
      const w = value * scale;
      f.rect(x, y + 38, w, 26, { hue });
      if (w > 30) f.text(x + w / 2, y + 55, String(value), { size: 11, anchor: 'middle' });
      x += w;
    }
  });
  const legend = parts(data.before);
  legend.forEach(([name, , hue], i) => {
    f.rect(16 + i * 140, 206, 12, 12, { hue });
    f.text(34 + i * 140, 216, name, { size: 11, hue: 'ink-soft' });
  });
});
