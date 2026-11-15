'use strict';

const fs = require('fs');
const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');

const lab = path.join(__dirname, '../../capture/lab/G-dataplane');

function containers(dataplane) {
  const pods = new Map();
  for (const line of fs.readFileSync(path.join(lab, dataplane, '13-crictl-ps-atenet.txt'), 'utf8').trim().split('\n').slice(1)) {
    const cells = line.trim().split(/\s{2,}/);
    pods.set(cells[0], { name: cells[4], pod: cells[7].replace(/-[a-z0-9]+-[a-z0-9]+$/, '') });
  }
  return fs.readFileSync(path.join(lab, dataplane, '13-crictl-stats-atenet.txt'), 'utf8').trim().split('\n').map(line => {
    const cells = line.trim().split(/\s+/);
    return { ...pods.get(cells[0]), mb: parseFloat(cells[3]) };
  });
}

const PODS = ['atenet-router', 'atenet-egress'];
const sides = [
  { key: 'envoy', label: 'Envoy', holder: 'sdsmint', order: ['atenet-router', 'envoy', 'ext-proc', 'sdsmint'], y: 74 },
  { key: 'agentgateway', label: 'agentgateway', holder: 'agentgateway', order: ['agentgateway'], y: 206 },
].map(side => {
  const all = containers(side.key);
  const items = PODS.flatMap(pod => all.filter(item => item.pod === pod).sort((a, b) => side.order.indexOf(a.name) - side.order.indexOf(b.name)));
  return { ...side, items, total: all.reduce((sum, item) => sum + item.mb, 0) };
});

const X0 = 130;
const PER_MB = 4.9;
const BAR = 46;
const AXIS = 300;
const x = mb => X0 + mb * PER_MB;

module.exports = figure('fig-6-6', {
  height: 344,
  title: '两种数据平面按容器拆分的空闲内存占用',
  desc: `0 至 100 MB 坐标轴上的两条堆叠柱。Envoy 数据平面共 ${sides[0].items.length} 个容器，总计占用 ${Math.round(sides[0].total)} MB：atenet-router pod 内的 atenet-router 与 envoy，以及 atenet-egress pod 内的 envoy、ext-proc 与 sdsmint，其中仅 sdsmint 持有拦截 CA 私钥。agentgateway 数据平面共 ${sides[1].items.length} 个容器，总计占用 ${Math.round(sides[1].total)} MB：两个 pod 内各一个 agentgateway 容器，其中 atenet-egress 内的容器持有 CA 私钥。`,
}, f => {
  for (let mb = 20; mb <= 100; mb += 20) f.rule(x(mb), 40, x(mb), AXIS, { hue: 'ink-mute', opacity: 0.2 });
  f.text(X0, 24, '每个方括号代表一个 pod，每个方框代表一个容器。', { size: 11, serif: true, hue: 'ink-soft' });
  for (const side of sides) {
    f.text(16, side.y + 20, side.label, { size: 12, weight: 700 });
    f.text(16, side.y + 36, `${side.items.length} 个容器`, { size: 11, serif: true, hue: 'ink-soft' });
    let at = 0;
    for (const pod of PODS) {
      const inPod = side.items.filter(item => item.pod === pod);
      const from = x(at);
      const to = x(at + inPod.reduce((sum, item) => sum + item.mb, 0));
      f.rule(from + 2, side.y - 8, to - 2, side.y - 8, { hue: 'indigo', width: 1.2 });
      f.rule(from + 2, side.y - 8, from + 2, side.y - 3, { hue: 'indigo', width: 1.2 });
      f.rule(to - 2, side.y - 8, to - 2, side.y - 3, { hue: 'indigo', width: 1.2 });
      f.text(from + 2, side.y - 14, pod, { size: 11, hue: 'indigo', knock: true });
      for (const item of inPod) {
        const left = x(at);
        const w = item.mb * PER_MB;
        const key = pod === 'atenet-egress' && item.name === side.holder;
        f.rect(left, side.y, w, BAR, { fill: color('indigo-fill'), stroke: color('indigo-ink'), strokeWidth: key ? 2.6 : undefined });
        const cx = left + w / 2;
        if (w > 50) {
          f.text(cx, side.y + 20, item.name, { size: 11, anchor: 'middle', weight: 700 });
          f.text(cx, side.y + 35, item.mb.toFixed(1), { size: 11, anchor: 'middle', serif: true, hue: 'ink-soft' });
        }
        if (key) {
          const note = w > 50 ? '持有 CA 私钥' : `${item.name}，${item.mb.toFixed(1)} MB，持有 CA 私钥`;
          f.leader([cx, side.y + BAR + 18], [cx, side.y + BAR + 2], { hue: 'indigo' });
          f.text(w > 50 ? cx + 8 : left + w, side.y + BAR + 26, note, { size: 11, hue: 'indigo', anchor: w > 50 ? 'start' : 'end', knock: true });
        }
        at += item.mb;
      }
    }
    f.text(x(side.total) + 8, side.y + 28, `${Math.round(side.total)} MB`, { size: 12.5, weight: 700, knock: true });
  }
  f.rule(X0, 40, X0, AXIS, { hue: 'ink' });
  f.rule(X0, AXIS, x(100), AXIS, { hue: 'ink' });
  for (let mb = 0; mb <= 100; mb += 20) {
    f.rule(x(mb), AXIS, x(mb), AXIS + 5, { hue: 'ink' });
    f.text(x(mb), AXIS + 18, String(mb), { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  f.text(x(50), AXIS + 36, '空闲态内存（MB），每个容器采样一次', { size: 11.5, serif: true, hue: 'ink-soft', anchor: 'middle' });
});
