'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/lab/summary/rotation-x86.json')).dataplanes;
const agw = runs.agentgateway;
const envoy = runs.envoy;
const cycle = agw.seconds_between_first_seen;
const one = value => value.toFixed(1);
const list = side => side.changes.map(item => `${one(item.seconds)}`).join('、');
const old = side => side.changes.map(item => item.requests_with_old_value).join('、');

module.exports = figure('fig-6-5b', {
  height: 330,
  title: '凭据轮换后上游看到新值所需的秒数',
  desc: `对数时间轴折线图。在两种数据平面上分别将一条 replaceHeaders 规则背后的 Kubernetes Secret 修改三次，由单个 actor 每秒发一次请求。在 agentgateway 上，上游分别在 ${list(agw)} s 后看到新值，期间仍有 ${old(agw)} 次请求携带旧值；在 Envoy 上分别耗时 ${list(envoy)} s，期间有 ${old(envoy)} 次请求携带旧值。agentgateway 上三次首次看到新值的时间相隔 ${cycle.map(v => Math.round(v)).join(' 与 ')} s。两种数据平面在 ${agw.probe_requests} 次与 ${envoy.probe_requests} 次请求中均无失败。`,
}, f => {
  const c = chart(f, { x: 60, y: 40, w: 380, h: 230, xDomain: [0.5, 3.5], yDomain: [0.5, 500], yScale: 'log10', xTicks: [1, 2, 3], yTicks: [1, 10, 100, 300], xFormat: v => `第 ${v} 次`, yFormat: v => `${v} s`, xLabel: '按顺序对 Kubernetes Secret 的三次修改', yLabel: '上游看到新凭据值的秒数（对数刻度）' });
  f.rule(c.px(0.5), c.py(300), c.px(3.5), c.py(300), { hue: 'rose', dash: 'dashed' });
  c.series(agw.changes.map(item => [item.change, item.seconds]), { hue: 'indigo', name: 'agentgateway', r: 3.4 });
  c.series(envoy.changes.map(item => [item.change, item.seconds]), { hue: 'indigo', name: 'Envoy', dash: 'dashed', r: 3.4 });
  for (const item of agw.changes) f.text(c.px(item.change), c.py(item.seconds) + 18, `${one(item.seconds)} s`, { size: 11, anchor: 'middle', hue: 'indigo', knock: true });
  for (const item of envoy.changes) f.text(c.px(item.change), c.py(item.seconds) - 9, `${one(item.seconds)} s`, { size: 11, anchor: 'middle', hue: 'indigo', knock: true });

  f.text(456, c.py(agw.changes[2].seconds) + 22, 'agentgateway', { size: 11.5, weight: 700, hue: 'indigo' });
  f.text(456, c.py(agw.changes[2].seconds) + 37, `更新后仍有 ${old(agw)} 次`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(456, c.py(agw.changes[2].seconds) + 51, '请求携带旧值', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(456, c.py(envoy.changes[2].seconds) + 4, 'Envoy', { size: 11.5, weight: 700, hue: 'indigo' });
  f.text(456, c.py(envoy.changes[2].seconds) + 19, `更新后仍有 ${old(envoy)} 次`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(456, c.py(envoy.changes[2].seconds) + 33, '请求携带旧值', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(456, c.py(300) + 4, '300 s', { size: 11.5, weight: 700, hue: 'rose' });
  f.text(456, c.py(300) + 19, `agentgateway 上新值出现`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(456, c.py(300) + 33, `间隔约 ${Math.round(cycle[0])} s`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(60, 322, `每秒一次请求，全程零失败：agentgateway 共 ${agw.probe_requests} 次，Envoy 共 ${envoy.probe_requests} 次。`, { size: 11, serif: true, hue: 'ink-soft' });
});
