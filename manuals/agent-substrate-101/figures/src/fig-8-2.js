'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const outages = load(path.join(__dirname, '../../capture/lab/summary/dependency-loss-x86.json')).outages;
const lag = key => outages[key].summary.suspended.last_failure_t - outages[key].dependency_ready_t;
const kube = outages['kube-apiserver'].summary;
const panels = [
  { key: 'postgres', name: 'Postgres 中断', sign: `9 s 超时，随后 500；就绪后新建恢复仍失败 ${lag('postgres')} s` },
  { key: 'ate-api-server', name: 'ate-api-server 中断', sign: '5 s 内返回 503；路由器自行发现新 pod' },
  { key: 'kube-apiserver', name: 'kube-apiserver 中断', sign: `中断期服务了 ${kube.running.ok_during_outage}/${kube.running.requests_during_outage} 个请求与 ${kube.suspended.ok_during_outage}/${kube.suspended.requests_during_outage} 次新建恢复` },
];
const streams = [
  { key: 'running', name: '运行中 actor', span: 1 },
  { key: 'suspended', name: '新建恢复', span: 5 },
  { key: 'proxy', name: '经由代理', span: 1 },
];
const LEFT = 118;
const SCALE = 3.3;
const FIRST = -10;
const LAST = 120;
const px = t => LEFT + (Math.min(Math.max(t, FIRST), LAST) - FIRST) * SCALE;

function runs(points, span) {
  const sorted = points.slice().sort((a, b) => a.t - b.t);
  const out = [];
  sorted.forEach((point, index) => {
    const next = sorted[index + 1];
    const end = next ? next.t : point.t + span;
    const last = out[out.length - 1];
    if (last && last.ok === point.ok) last.end = end;
    else out.push({ start: point.t, end, ok: point.ok });
  });
  return out;
}

module.exports = figure('fig-8-2', {
  height: 392,
  title: '三项依赖中断期间的逐秒请求结果',
  desc: '三个面板分别对应被中断的一项依赖：Postgres 中断 61 秒、ate-api-server 中断 60 秒、Kubernetes API server 中断 86 秒。发往运行中 actor 的请求与新建恢复在前两个面板中均失败，在第三个面板中则全部成功（仅经由 kubectl ate proxy 的请求失败）。每行末尾标出失败请求总数。',
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
    const data = outages[panel.key];
    const top = 46 + index * 100;
    f.kicker(20, top + 4, `${panel.name}，${data.outage_seconds} s`, { hue: 'ink-soft' });
    f.text(620, top + 4, panel.sign, { size: 11, serif: true, anchor: 'end', hue: 'ink-soft' });
    f.rect(px(0), top + 12, px(data.outage_seconds) - px(0), 64, { hue: 'grey', stroke: 'none' });
    streams.forEach((stream, row) => {
      const y = top + 20 + row * 18;
      const points = data.per_second[stream.key];
      const failed = points.filter(point => !point.ok).length;
      f.text(20, y + 9, stream.name, { size: 11, serif: true, hue: 'ink-soft' });
      for (const run of runs(points, stream.span)) {
        const x1 = px(run.start);
        const x2 = px(run.end);
        if (x2 - x1 < 0.5) continue;
        f.rect(x1, y, x2 - x1, 10, { fill: color(run.ok ? 'green-ink' : 'rose-ink'), stroke: 'none' });
      }
      f.text(620, y + 9, `${failed} 次失败`, { size: 11, anchor: 'end', weight: failed ? 700 : undefined, hue: failed ? 'rose' : 'green' });
    });
    f.rule(px(data.dependency_ready_t), top + 12, px(data.dependency_ready_t), top + 76, { hue: 'ink', dash: 'dashed' });
  });

  f.rule(px(FIRST), 344, px(LAST), 344, { hue: 'ink' });
  for (const t of [0, 30, 60, 90, 120]) {
    f.rule(px(t), 340, px(t), 348, { hue: 'ink' });
    f.text(px(t), 362, `${t} s`, { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  f.text((px(FIRST) + px(LAST)) / 2, 380, '自依赖中断起算的秒数', { size: 11.5, serif: true, anchor: 'middle', hue: 'ink-soft' });
});
