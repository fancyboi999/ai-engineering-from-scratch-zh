'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/agent-server-x86-real.json'));
const servers = [
  ['dev-default', '默认，1 个任务', 'rose'],
  ['dev-njobs10', '每个 worker 10 个任务', 'indigo'],
];
const levels = [1, 4, 16];
const point = (server, c) => data.load.find(row => row.server === server && row.clients === c);
const runs = data.load.reduce((sum, row) => sum + row.ok, 0);
const errors = data.load.reduce((sum, row) => sum + row.errors, 0);

module.exports = figure('fig-8-1', {
  height: 360,
  title: 'langgraph dev 下 Qwen3 4B 每秒运行数，按并发客户端数',
  desc: `点图，对数刻度，展示每秒运行数随并发客户端数（1、4、16）的变化，对象是 x86 服务器虚拟机上的 langgraph dev，带一个在 CPU 上的 Qwen3 4B agent，每个点一次负载运行。默认每个 worker 一个任务：每秒 ${levels.map(c => point('dev-default', c).runs_per_s).join('、')} 次运行。每个 worker 十个任务：${levels.map(c => point('dev-njobs10', c).runs_per_s).join('、')}。全部 ${runs} 次运行都回答正确，错误 ${errors} 个。`,
}, f => {
  const c = chart(f, { x: 70, y: 40, w: 380, h: 240, xScale: 'log2', xDomain: [0.8, 20], yDomain: [0, 0.3], xTicks: levels, yTicks: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3], yLabel: '每秒运行数', xLabel: '并发客户端数' });
  const ends = [];
  servers.forEach(([key, name, hue]) => {
    const pts = levels.map(n => [n, point(key, n).runs_per_s]);
    c.series(pts, { hue, r: 3.2 });
    ends.push({ name, hue, y: c.py(pts[pts.length - 1][1]) });
  });
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i += 1) if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
  ends.forEach(end => f.text(c.px(20) + 10, end.y + 4, end.name, { size: 11, hue: end.hue }));
  f.text(70, 334, '每个点是对 agent 图的一次负载运行：1 和 4 个客户端时 10 次运行，16 个时 32 次。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(70, 350, 'Ollama 一次只处理一个模型调用，4 个客户端以上为每秒 0.44 到 0.45 次。', { size: 11, serif: true, hue: 'ink-soft' });
});
