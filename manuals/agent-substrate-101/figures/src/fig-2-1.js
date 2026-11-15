'use strict';

const fs = require('fs');
const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../capture/lab/summary/install-steps.json'), 'utf8'));
const pick = (group, step) => data[group].steps.find(row => row.step === step);
const release = [
  ['kind 集群', pick('release_images', '10-kind-cluster'), 'grey'],
  ['部署 ate-system', pick('release_images', '20-deploy-ate-system-prebuilt'), 'blue'],
  ['部署示例 counter', pick('release_images', '30-deploy-counter'), 'violet'],
];
const source = [
  ['kind 集群', pick('source_build', '10-kind-cluster'), 'grey'],
  ['部署 ate-system', pick('source_build', '20-deploy-ate-system'), 'rose'],
  ['重试同一步骤', pick('source_build', '22-deploy-ate-system-retry'), 'blue'],
  ['部署示例 counter', pick('source_build', '30-deploy-counter'), 'violet'],
];
const total = rows => rows.reduce((sum, [, row]) => sum + row.seconds, 0);

module.exports = figure('fig-2-1', {
  height: 358,
  title: '使用发布镜像与从源码安装的各步耗时',
  desc: `两组水平柱状图展示各安装步骤的耗时秒数。在 16 vCPU 的 x86 客户机上使用发布镜像：${release.map(([name, row]) => `${name} ${row.seconds} s`).join('、')}，共 ${total(release)} s。在 24 vCPU 的 x86 客户机上从源码构建：${source.map(([name, row]) => `${name} ${row.seconds} s${row.exit ? '（失败）' : ''}`).join('、')}，共 ${total(source)} s。失败步骤标为玫红色，因缺少 Docker buildx 插件而中断。`,
}, f => {
  const x0 = 190;
  const scale = 1.25;
  const draw = (rows, top) => {
    rows.forEach(([name, row, hue], index) => {
      const y = top + index * 28;
      f.text(180, y + 13, name, { size: 11.5, anchor: 'end' });
      f.rect(x0, y, row.seconds * scale, 18, { fill: color(`${hue}-ink`), stroke: 'none' });
      f.text(x0 + row.seconds * scale + 8, y + 13, row.exit ? `${row.seconds} s，退出码 1：无 buildx` : `${row.seconds} s`, { size: 11.5, hue: hue === 'grey' ? 'ink-soft' : hue });
    });
    const base = top + rows.length * 28 - 2;
    f.rule(x0, top - 6, x0, base, { hue: 'ink' });
    f.rule(x0, base, x0 + 300 * scale, base, { hue: 'ink' });
    for (const tick of [0, 100, 200, 300]) {
      f.rule(x0 + tick * scale, base, x0 + tick * scale, base + 4, { hue: 'ink' });
      f.text(x0 + tick * scale, base + 16, tick === 300 ? '300 s' : String(tick), { size: 11, anchor: 'middle', hue: 'ink-soft' });
    }
  };
  f.kicker(20, 18, '使用发布镜像 · x86 客户机，16 vCPU');
  f.text(620, 18, `共 ${total(release)} s`, { size: 11.5, anchor: 'end', weight: 700 });
  draw(release, 34);
  f.rule(20, 146, 620, 146, { dash: 'dashed' });
  f.kicker(20, 170, '从源码构建 · x86 客户机，24 vCPU');
  f.text(620, 170, `共 ${total(source)} s`, { size: 11.5, anchor: 'end', weight: 700 });
  draw(source, 186);
  f.text(20, 334, '源码构建使用 docker buildx 制作 Envoy 镜像，并编译了一个 Rust 模块。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 350, '两种安装方式中，示例步骤均用 ko 构建了 worker 与 counter 镜像。', { size: 11, serif: true, hue: 'ink-soft' });
});
