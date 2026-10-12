'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const kits = [
  { x: 20, title: 'hello-kit, workload', sub: ['fixtures/kits/hello-kit', 'network-policy@2, runtime:', 'allow example.com'] },
  { x: 220, title: 'gh, mixin', sub: ['kitspec 2 example', 'network-policy@1 runtime allow', 'github.com, api.github.com,', 'uploads.github.com', 'credential@1: github, runtime,', 'GH_TOKEN proxyManaged'] },
  { x: 420, title: 'bounds, mixin', sub: ['kitcap network-policy@2 config', 'install: registry.npmjs.org', 'runtime: allow api.github.com', 'GET and HEAD on /repos/**', 'deny api.github.com DELETE', 'deny telemetry.example.com'] },
];

const grants = [
  ['runtime allow', 'example.com, github.com, uploads.github.com'],
  ['runtime allow', 'api.github.com，任意方法/路径（丢弃有界项，kitspec9.5）'],
  ['runtime deny', 'api.github.com DELETE、telemetry.example.com（拒绝优先，kitcap）'],
  ['install allow', 'registry.npmjs.org（agent启动前关闭，kitspec12）'],
  ['credential', 'github at runtime, GH_TOKEN proxyManaged, inject on api.github.com'],
];

module.exports = figure('fig-4-2', {
  height: 606,
  title: '三个 kit 解析为授权集合',
  desc: '顶为三kit：录制hello-kit workload允许example.com；规范gh mixin的network-policy@1允许及GitHub凭据；另一个mixin的@2有界允许与两拒绝。中间sbx解析恰有一个workload的闭合集合。下方锁定记录保存合并后的五行允许、拒绝、安装及凭据。下一版两分支：授权仍在集合内则静默应用；移除DELETE拒绝则扩权，需批准。',
}, f => {
  f.kicker(20, 18, '声明的 kit');
  const boxes = kits.map(kit => f.box({ x: kit.x, y: 26, w: 200, h: 118, hue: 'green', title: kit.title, sub: kit.sub, pad: 8, titleSize: 12 }));

  const resolver = f.box({ x: 120, y: 190, w: 400, h: 48, hue: 'blue', title: 'sbx 解析集合（kitspec5.3）', sub: '闭合集合，一个 workload，每名称一提供者，拒绝优先' });
  boxes.forEach(box => f.path(`M${box.cx} 144 V166 H${resolver.cx} V189`, { style: 'call', hue: 'ink-mute', head: false }));
  f.arrow([resolver.cx, 238], [resolver.cx, 269], { style: 'write', label: '锁定记录保存授权集合' });

  f.rect(20, 270, 600, 170, { fill: color('teal-fill'), stroke: color('teal-ink') });
  f.rect(23, 273, 594, 164, { fill: 'none', stroke: color('teal-ink') });
  f.text(32, 292, '沙箱合并授权集合（kitspec7.4）', { size: 12, weight: 700, hue: 'teal' });
  grants.forEach(([kind, value], index) => {
    const y = 300 + index * 26;
    f.rect(32, y, 576, 24, { fill: color('paper'), stroke: color('panel-edge') });
    f.text(40, y + 16, kind, { size: 11, hue: 'teal' });
    f.text(142, y + 16, value, { size: 11, serif: true });
  });

  f.text(330, 464, 'kit 下一版本', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.box({ x: 20, y: 482, w: 280, h: 64, hue: 'amber', title: '仍在集合内', sub: ['已获准主机上的有界允许', '静默应用（kitspec7.4）'] });
  f.box({ x: 340, y: 482, w: 280, h: 64, hue: 'rose', title: 'removes deny api.github.com DELETE', sub: ['移除拒绝就是扩权', '应用前停下询问'], titleSize: 12 });
  f.arrow([160, 440], [160, 481], { style: 'state', label: '相同授权' });
  f.arrow([480, 440], [480, 481], { style: 'fail', label: '更广授权' });
  f.text(20, 572, 'kit 不自行授权；各行是宿主回答的请求，锁定记录判断下一版。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 590, '来源：hello-kit/kit.yaml、kitspec2/5.3/7.4/9.5、kitcap network-policy@2/credential@1。', { size: 11, serif: true, hue: 'ink-soft' });
});
