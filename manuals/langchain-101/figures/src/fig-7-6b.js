'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/tracing-mac-real.json'));
const order = [
  ['ok-flush', ['正常', 'flush'], 'olive'],
  ['slow-flush', ['很慢', 'flush'], 'olive'],
  ['slow-fg', ['很慢', '后台关闭'], 'olive'],
  ['slow', ['很慢'], 'olive'],
  ['e500', ['返回', '500'], 'rose'],
  ['down', ['宕机'], 'rose'],
  ['hang', ['挂起'], 'rose'],
];
const row = key => data.failures[key];

module.exports = figure('fig-7-6b', {
  height: 414,
  title: '从最后一次运行到进程退出的秒数，按端点分组',
  desc: `Mac 上从最后一次 agent 运行到进程退出的耗时点图，每种端点条件一个进程，每个进程做 50 次 Qwen3 4B agent 运行。结尾调用 wait_for_all_tracers 时：端点正常为 ${row('ok-flush').exit_lag_s} s，端点很慢为 ${row('slow-flush').exit_lag_s} s。不调用时：端点很慢 ${row('slow').exit_lag_s} s，端点很慢且关闭后台回调 ${row('slow-fg').exit_lag_s} s，端点返回 500 为 ${row('e500').exit_lag_s} s，端点宕机为 ${row('down').exit_lag_s} s（收到 ${row('down').runs_expected} 次运行中的 ${row('down').runs_received} 次），端点挂起则在最后一次运行后 208 s 仍然存活，300 s 时被杀（收到 ${row('hang').runs_expected} 次运行中的 ${row('hang').runs_received} 次）。所有条件下每次 agent 运行都返回了答案。`,
}, f => {
  const c = chart(f, { x: 70, y: 52, w: 540, h: 230, xDomain: [0, 7], yDomain: [0, 20], yTicks: [0, 5, 10, 15, 20], yLabel: '最后一次运行到退出的秒数' });
  order.forEach(([key, label, hue], i) => {
    const cx = c.px(i + 0.5);
    const r = row(key);
    const got = `${r.runs_received}/${r.runs_expected}`;
    if (key === 'hang') {
      f.arrow([cx, c.py(12)], [cx, c.py(20) - 8], { style: 'fail' });
      f.text(cx, c.py(20) - 14, '已终止', { size: 11, anchor: 'middle', hue });
      f.text(cx, c.py(10.8), got, { size: 11, anchor: 'middle', hue, knock: true });
      f.text(cx, c.py(9.2), `于 ${row('hang').exit.split(' at ')[1]}`, { size: 11, anchor: 'middle', hue, knock: true });
    } else {
      f.dot(cx, c.py(r.exit_lag_s), { hue, r: 3.4 });
      f.text(cx, c.py(r.exit_lag_s) - 10, `${r.exit_lag_s} s`, { size: 11, anchor: 'middle', hue, knock: true });
      f.text(cx, c.py(r.exit_lag_s) - 24, got, { size: 11, anchor: 'middle', hue: 'ink-soft', knock: true });
    }
    label.forEach((line, k) => f.text(cx, 300 + k * 14, line, { size: 11, anchor: 'middle', hue: 'ink-soft' }));
  });
  f.text(70, 344, '每个点是一个含 50 次 agent 运行的进程，共 350 次追踪运行。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(70, 362, '点上方的分数是到达端点的追踪运行数。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(70, 380, 'flush：最后一次运行后调用 wait_for_all_tracers()。后台关闭：', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(70, 398, 'LANGCHAIN_CALLBACKS_BACKGROUND=false。每个进程中的 50 次运行都给出了答案。', { size: 11, serif: true, hue: 'ink-soft' });
});
