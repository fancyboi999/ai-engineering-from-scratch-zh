'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const file = name => load(path.join(__dirname, '../../capture/lab/summary', name)).outages;
const sides = [
  { name: 'Envoy', outages: file('dependency-loss-x86.json') },
  { name: 'agentgateway', outages: file('dependency-loss-agw-x86.json') },
];
const panels = [
  { key: 'postgres', name: 'Postgres 中断' },
  { key: 'ate-api-server', name: 'ate-api-server 中断' },
  { key: 'kube-apiserver', name: 'kube-apiserver 中断' },
];
const LEFT = 118;
const SCALE = 2.2;
const FIRST = -10;
const LAST = 120;
const px = t => LEFT + (Math.min(Math.max(t, FIRST), LAST) - FIRST) * SCALE;
const stream = (side, key) => side.outages[key].summary.running;

function spans(points) {
  const sorted = points.slice().sort((a, b) => a.t - b.t);
  const out = [];
  sorted.forEach((point, index) => {
    const next = sorted[index + 1];
    const end = next ? next.t : point.t + 1;
    const last = out[out.length - 1];
    if (last && last.ok === point.ok) last.end = end;
    else out.push({ start: point.t, end, ok: point.ok });
  });
  return out;
}

function note(side, key) {
  const s = stream(side, key);
  if (s.first_failure_t === null) return `${s.ok_during_outage}/${s.requests_during_outage} 个请求成功`;
  return `${s.first_failure_t} s 至 ${s.last_failure_t} s 期间失败`;
}

module.exports = figure('fig-8-2e', {
  height: 318,
  title: '两种数据平面在三项依赖中断期间对运行中 actor 的转发表现',
  desc: `三个面板分别对应被中断的一项依赖，每个面板含 Envoy 数据平面与 agentgateway 数据平面各一行。每行代表集群内 pod 每秒向运行中 actor 发送一次请求。Postgres 中断时，Envoy 与 agentgateway 的首次失败分别出现在第 ${stream(sides[0], 'postgres').first_failure_t} 秒与第 ${stream(sides[1], 'postgres').first_failure_t} 秒，末次失败分别在第 ${stream(sides[0], 'postgres').last_failure_t} 秒与第 ${stream(sides[1], 'postgres').last_failure_t} 秒（Postgres 分别在第 ${sides[0].outages.postgres.dependency_ready_t} 秒与第 ${sides[1].outages.postgres.dependency_ready_t} 秒恢复就绪）。ate-api-server 中断时，Envoy 的失败持续自第 ${stream(sides[0], 'ate-api-server').first_failure_t} 秒至第 ${stream(sides[0], 'ate-api-server').last_failure_t} 秒，agentgateway 自第 ${stream(sides[1], 'ate-api-server').first_failure_t} 秒至第 ${stream(sides[1], 'ate-api-server').last_failure_t} 秒。Kubernetes API server 中断期间，两种数据平面均无请求失败。`,
}, f => {
  f.rect(20, 14, 12, 8, { fill: color('green-ink'), stroke: 'none' });
  f.text(38, 22, '请求返回 200', { size: 11, hue: 'ink-soft' });
  f.rect(190, 14, 12, 8, { fill: color('rose-ink'), stroke: 'none' });
  f.text(208, 22, '请求失败', { size: 11, hue: 'ink-soft' });
  f.rect(320, 12, 12, 12, { hue: 'grey', stroke: 'none' });
  f.text(338, 22, '依赖中断', { size: 11, hue: 'ink-soft' });
  f.rule(468, 12, 468, 24, { hue: 'ink', dash: 'dashed' });
  f.text(476, 22, '恢复就绪', { size: 11, hue: 'ink-soft' });

  panels.forEach((panel, index) => {
    const top = 46 + index * 76;
    f.kicker(20, top + 4, panel.name, { hue: 'ink-soft' });
    sides.forEach((side, row) => {
      const data = side.outages[panel.key];
      const y = top + 16 + row * 22;
      f.rect(px(0), y - 3, px(data.outage_seconds) - px(0), 16, { hue: 'grey', stroke: 'none' });
      f.text(20, y + 9, side.name, { size: 11, serif: true, hue: 'ink-soft' });
      for (const run of spans(data.per_second.running)) {
        const x1 = px(run.start);
        const x2 = px(run.end);
        if (x2 - x1 < 0.5) continue;
        f.rect(x1, y, x2 - x1, 10, { fill: color(run.ok ? 'green-ink' : 'rose-ink'), stroke: 'none' });
      }
      f.rule(px(data.dependency_ready_t), y - 3, px(data.dependency_ready_t), y + 13, { hue: 'ink', dash: 'dashed' });
      const failed = stream(side, panel.key).first_failure_t !== null;
      f.text(px(LAST) + 12, y + 9, note(side, panel.key), { size: 11, hue: failed ? 'rose' : 'green' });
    });
  });

  f.rule(px(FIRST), 274, px(LAST), 274, { hue: 'ink' });
  for (const t of [0, 30, 60, 90, 120]) {
    f.rule(px(t), 270, px(t), 278, { hue: 'ink' });
    f.text(px(t), 292, `${t} s`, { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  f.text(px(FIRST), 310, '自依赖中断起算的秒数（每种数据平面各运行一次）', { size: 11.5, serif: true, hue: 'ink-soft' });
});
