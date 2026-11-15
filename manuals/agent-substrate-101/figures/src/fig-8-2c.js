'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const outages = load(path.join(__dirname, '../../capture/lab/summary/dependency-loss-x86.json')).outages;
const FIRST = -10;
const LAST = 100;
const TOP = 118;
const HEIGHT = 168;
const WIDTH = 172;
const panels = ['postgres', 'ate-api-server', 'kube-apiserver'].map((key, index) => {
  const points = outages[key].per_second.running.filter(point => point.t >= FIRST && point.t <= LAST).sort((a, b) => a.t - b.t);
  const failed = points.filter(point => !point.ok);
  const served = points.filter(point => point.ok);
  const sorted = served.map(point => point.seconds).sort((a, b) => a - b);
  return { key, x: 52 + index * 196, data: outages[key], points, failed, slowest: failed.length ? Math.max(...failed.map(point => point.seconds)) : 0, median: sorted[Math.floor(sorted.length / 2)] };
});
function stretches(points) {
  const out = [];
  let joined = false;
  points.forEach((point, index) => {
    if (!point.ok) {
      joined = false;
      return;
    }
    if (joined && point.t - points[index - 1].t <= 2) out[out.length - 1].push(point);
    else out.push([point]);
    joined = true;
  });
  return out;
}

const names = { postgres: 'Postgres 中断', 'ate-api-server': 'ate-api-server 中断', 'kube-apiserver': 'kube-apiserver 中断' };
const codes = panel => [...new Set(panel.failed.map(point => point.code))];

module.exports = figure('fig-8-2c', {
  height: 352,
  title: '三项依赖中断期间发往运行中 actor 的每次请求耗时',
  desc: `三个面板绘制每秒向运行中 actor e-run 发送一次请求时收到响应前的耗时。Postgres 中断期间，每次失败请求耗时 ${panels[0].slowest.toFixed(1)} 秒（客户端超时），Postgres 恢复时仍未结束的请求收到 500。ate-api-server 中断期间，每次失败请求至多在 ${panels[1].slowest.toFixed(2)} 秒后收到 503。Kubernetes API server 中断期间，所有请求均在约 ${panels[2].median.toFixed(2)} 秒内返回 200。`,
}, f => {
  f.dot(26, 18, { hue: 'rose', r: 3 });
  f.text(36, 22, '单次失败请求', { size: 11, hue: 'ink-soft' });
  f.path('M186 18 H204', { hue: 'green', head: false, width: 2, packet: false });
  f.text(210, 22, '返回 200 的请求', { size: 11, hue: 'ink-soft' });
  f.rule(420, 12, 420, 24, { hue: 'ink', dash: 'dashed' });
  f.text(428, 22, '恢复就绪', { size: 11, hue: 'ink-soft' });

  panels.forEach((panel, index) => {
    const scale = WIDTH / (LAST - FIRST);
    const x0 = panel.x + (0 - FIRST) * scale;
    f.rect(x0, TOP, panel.data.outage_seconds * scale, HEIGHT, { hue: 'grey', stroke: 'none' });
    const c = chart(f, { x: panel.x, y: TOP, w: WIDTH, h: HEIGHT, xDomain: [FIRST, LAST], yDomain: [0, 10], xTicks: [0, 30, 60, 90], yTicks: [0, 3, 6, 9], xFormat: t => `${t}`, yLabel: index ? undefined : '收到响应前的耗时（秒）' });
    f.kicker(panel.x, 48, names[panel.key], { hue: 'ink-soft' });
    f.rule(c.px(panel.data.dependency_ready_t), TOP, c.px(panel.data.dependency_ready_t), TOP + HEIGHT, { hue: 'ink', dash: 'dashed' });
    for (const run of stretches(panel.points)) c.series(run.map(point => [point.t, point.seconds]), { hue: 'green', dots: run.length === 1, width: 2.2, r: 2 });
    for (const point of panel.failed) f.dot(c.px(point.t), c.py(point.seconds), { hue: 'rose', r: 2 });
    panel.c = c;
  });

  const [pg, api, kube] = panels;
  const lines = [
    [pg, 'rose', `状态码 000：${pg.slowest.toFixed(0)} s 超时，`, `恢复瞬间 ${pg.failed.filter(point => point.code === '500').length} 个请求收到 500`],
    [api, 'rose', `0.5 至 ${api.slowest.toFixed(2)} s 后返回 ${codes(api).join(', ')}：`, '路由器的暂存预算耗尽'],
    [kube, 'green', '所有请求均返回 200', `耗时约 ${kube.median.toFixed(2)} s`],
  ];
  for (const [panel, hue, first, second] of lines) {
    f.text(panel.x, 64, first, { size: 11, serif: true, hue });
    f.text(panel.x, 79, second, { size: 11, serif: true, hue });
  }
  f.text(320, 340, '发出请求所在的秒数（自依赖中断起算）', { size: 11.5, serif: true, anchor: 'middle', hue: 'ink-soft' });
});
