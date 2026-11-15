'use strict';

const fs = require('fs');
const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');

const lab = path.join(__dirname, '../../capture/lab/F-egress');
const kept = JSON.parse(fs.readFileSync(path.join(__dirname, '../../capture/lab/summary/network-x86.json'), 'utf8')).keepalive_after_rule_removal;
const reused = (dataplane, test) => {
  const run = kept[dataplane][test];
  return run.runs.codes.map((code, index) => ({ t: 2 * index - run.rule_removed_seconds_after_start, ok: code === '200' }));
};
const clock = text => {
  const [h, m, s] = text.split(':').map(Number);
  return h * 3600 + m * 60 + s;
};

function samples(dataplane) {
  const text = fs.readFileSync(path.join(lab, dataplane, '40-supplement.txt'), 'utf8');
  const partB = text.slice(text.indexOf('## B.'), text.indexOf('## C.'));
  const partC = text.slice(text.indexOf('## C.'));
  const removed = part => clock([...part.matchAll(/### \[([0-9:.]+)\] policy update f-main <- P1\.yaml/g)].pop()[1]);
  const rows = (part, pattern, ok) => {
    const zero = removed(part);
    return [...part.matchAll(pattern)].map(match => ({ t: clock(match[1]) - zero, ok: match[2] === ok }));
  };
  return {
    dns: rows(partC, /^(\d\d:\d\d:\d\d) dns=status: ([A-Z]+) http=/gm, 'NOERROR'),
    http: rows(partC, /^(\d\d:\d\d:\d\d) dns=status: [A-Z]+ http=(\d+)/gm, '200'),
    conn: rows(partB, /^(\d\d:\d\d:\d\d) dns=status: [A-Z]+ newconn_certs=(\d)/gm, '1'),
    h1: reused(dataplane, 'h1'),
    h2: reused(dataplane, 'h2'),
  };
}

const groups = [
  { name: 'Envoy 数据平面', data: samples('envoy'), responseEnd: 39 },
  { name: 'agentgateway 数据平面', data: samples('agentgateway'), responseEnd: 18 },
];
const FROM = -6;
const END = 40;
const X0 = 190;
const PER = 9.4;
const px = t => X0 + (t - FROM) * PER;
const first = points => points.find(point => !point.ok && point.t >= 0).t;
const lastServed = points => Math.max(...points.filter(point => point.ok).map(point => point.t));

module.exports = figure('fig-6-6b', {
  height: 490,
  title: '移除出站规则后的新建请求与已打开连接',
  desc: `${FROM} 至 ${END} 秒时间轴上的两组共十四条轨道，0 秒为移除规则时刻，约每 2 秒采样一点。在 Envoy 数据平面上，移除后首次采样即拒绝新建 DNS 查询和新建透传连接；新建 HTTP 请求放行至 ${Math.round(lastServed(groups[0].data.http))} s，从 ${Math.round(first(groups[0].data.http))} s 起拒绝；复用 HTTP/1.1 连接上的请求从 ${Math.round(first(groups[0].data.h1))} s 起拒绝，https 规则复用 HTTP/2 连接上的请求从 ${Math.round(first(groups[0].data.h2))} s 起拒绝；已打开的 HTTP 响应持续到服务端在 39 s 结束，已打开的透传连接在 20 s 完成了第二次请求。在 agentgateway 数据平面上，移除后首次采样即拒绝全部三类新建请求及两种复用连接上的后续请求；已打开的 HTTP 响应在 18 s 结束，已打开的透传连接在 20 s 完成了第二次请求。`,
}, f => {
  const lastGroupBottom = 30 + groups.length * 204;
  groups.forEach((group, g) => {
    const top = 30 + g * 204;
    f.kicker(16, top, group.name);
    const tracks = [
      ['新建 DNS 查询', group.data.dns],
      ['新建 HTTP 请求', group.data.http],
      ['新建透传连接', group.data.conn],
      ['复用 HTTP/1.1 连接', group.data.h1],
      ['复用 HTTP/2（https 规则）', group.data.h2],
    ];
    tracks.forEach(([label, points], index) => {
      const y = top + 26 + index * 24;
      f.text(16, y + 4, label, { size: 11, serif: true, hue: 'ink-soft' });
      f.rule(px(FROM), y, px(END), y, { opacity: 0.35 });
      for (const point of points) {
        if (point.t < FROM || point.t > END) continue;
        f.dot(px(point.t), y, { hue: point.ok ? 'green' : 'rose', r: 3.2 });
      }
      const t = first(points);
      const immediate = points.filter(point => point.t >= 0)[0].t === t;
      f.text(immediate ? px(0) + 6 : px(t) - 5, y - 8, immediate ? '首次采样即拒绝' : `${Math.round(t)} s 起拒绝`, { size: 11, hue: 'rose', weight: 700 });
    });
    const open = [
      ['已打开的 HTTP 响应', group.responseEnd, `服务端于 ${group.responseEnd} s 结束`],
      ['已打开的透传连接', 20, '20 s 完成第二次请求'],
    ];
    open.forEach(([label, end, note], index) => {
      const y = top + 26 + (index + 5) * 24;
      f.text(16, y + 4, label, { size: 11, serif: true, hue: 'ink-soft' });
      f.rect(px(FROM), y - 5, (end - FROM) * PER, 10, { fill: color('green-fill'), stroke: color('green-ink') });
      f.dot(px(end), y, { hue: 'green', r: 3.2 });
      const inside = end > 30;
      f.text(px(end) + (inside ? 0 : 10), y + (inside ? -9 : 4), note, { size: 11, hue: 'green', anchor: inside ? 'end' : 'start' });
    });
  });
  f.rule(px(0), 22, px(0), lastGroupBottom, { hue: 'ink', dash: 'dashed' });
  f.text(px(0) + 6, 20, '移除规则', { size: 11, hue: 'ink-soft' });
  const axis = lastGroupBottom;
  f.rule(px(FROM), axis, px(END), axis, { hue: 'ink' });
  for (let t = -5; t <= END; t += 5) {
    f.rule(px(t), axis, px(t), axis + 5, { hue: 'ink' });
    if (t % 10 === 0) f.text(px(t), axis + 18, String(t), { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  f.text(16, axis + 18, '移除后的秒数', { size: 11, serif: true, hue: 'ink-soft' });
  f.dot(px(FROM) + 4, axis + 34, { hue: 'green', r: 3.2 });
  f.text(px(FROM) + 12, axis + 38, '放行', { size: 11, serif: true, hue: 'ink-soft' });
  f.dot(px(FROM) + 56, axis + 34, { hue: 'rose', r: 3.2 });
  f.text(px(FROM) + 64, axis + 38, '拒绝', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(px(FROM) + 114, axis + 38, '长条：规则移除前已打开的连接', { size: 11, serif: true, hue: 'ink-soft' });
});
