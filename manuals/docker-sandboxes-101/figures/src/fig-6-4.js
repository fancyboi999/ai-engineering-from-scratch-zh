'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

function rows(f, y, entries) {
  entries.forEach(([key, value], index) => {
    const top = y + index * 24;
    f.rect(20, top, 600, 24, { fill: color('paper'), stroke: color('panel-edge') });
    f.text(30, top + 16, key, { size: 11, hue: 'ink-soft' });
    f.text(280, top + 16, value, { size: 11 });
  });
  return y + entries.length * 24;
}

module.exports = figure('fig-6-4', {
  height: 488,
  title: 'agent 文件作为 OCI 产物',
  desc: '顶share push将files.yaml存localhost:15000的m101/agent:v1。pull在当前目录写相同localhost:15000_m101_agent:v1.yaml；run引用答README一行。底manifest：mediaType OCI，artifactType application/vnd.docker.agent.config.v1+json，config/唯一层沿用Docker类型。四注解为两个agent/cagent版本v1.149.0、OCI创建与描述；--key另添证明注解，此次未录。',
}, f => {
  const file = f.box({ x: 20, y: 30, w: 140, h: 56, hue: 'violet', title: 'files.yaml', sub: ['agent：root', 'filesystem, shell'] });
  const registry = f.box({ x: 240, y: 30, w: 150, h: 120, hue: 'grey', title: 'localhost:15000', sub: ['m101/agent:v1', '普通 HTTP', 'registry:2'] });
  const pulled = f.box({ x: 470, y: 30, w: 150, h: 56, hue: 'violet', title: 'share pull', sub: ['逐字节相同 YAML', '在当前目录'] });
  const run = f.box({ x: 470, y: 100, w: 150, h: 50, hue: 'violet', title: '按引用运行', titleSize: 11.5, sub: 'README.md has 1 line.' });
  f.arrow(file.right(), [registry.x - 1, file.cy], { style: 'call', label: 'share push', labelSize: 11 });
  f.arrow([registry.x + registry.w, pulled.cy], [pulled.x - 1, pulled.cy], { style: 'reply', label: 'share pull', labelSize: 11 });
  f.arrow([registry.x + registry.w, run.cy], [run.x - 1, run.cy], { style: 'reply', label: 'run', labelSize: 11 });

  f.box({ x: 20, y: 170, w: 600, h: 26, hue: 'grey', title: 'registry 提供的 m101/agent:v1 manifest', titleSize: 12, align: 'left' });
  rows(f, 196, [
    ['mediaType', 'application/vnd.oci.image.manifest.v1+json'],
    ['artifactType', 'application/vnd.docker.agent.config.v1+json'],
    ['config', 'application/vnd.docker.container.image.v1+json'],
    ['layers[0]', 'application/vnd.docker.image.rootfs.diff.tar.gzip'],
  ]);
  f.box({ x: 20, y: 300, w: 600, h: 26, hue: 'violet', title: '注解', titleSize: 12, align: 'left' });
  rows(f, 326, [
    ['io.docker.agent.version', 'v1.149.0'],
    ['io.docker.cagent.version', 'v1.149.0，旧键'],
    ['org.opencontainers.image.created', '<ts>'],
    ['org.opencontainers.image.description', 'OCI artifact containing files.yaml'],
  ]);
  f.box({ x: 20, y: 434, w: 600, h: 40, hue: 'grey', dash: 'dashed', title: '--key以注解添加签名或MAC，此次未录制', titleSize: 11.5, weight: 400 });
});
