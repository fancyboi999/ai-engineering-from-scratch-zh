'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const rows = [
  { lines: ['# syntax=docker/sandbox-kit:3'], note: '选择 frontend：sandbox-kit3.0.0-m.8' },
  { lines: ['schemaVersion: "3"'], note: 'REQUIRED，恰为字符串"3"（kitspec4）' },
  { lines: ['kind: workload'], note: 'workload、mixin或set（kitspec4）' },
  { lines: ['displayName: hello-kit'], note: '写入 org.opencontainers.image.title' },
  { lines: ['description: A shell workload with one', '  network grant, in the v3 descriptor form.'], note: '写入 org.opencontainers.image.description' },
  { lines: ['version: "1.0.0"'], note: '写入 org.opencontainers.image.version' },
  { lines: ['licenses: [Apache-2.0]'], note: '写入 org.opencontainers.image.licenses' },
  { lines: ['build: |', '  FROM docker/sandbox-templates:shell', '  COPY HELLO.md /home/agent/HELLO.md'], note: '镜像层配方（kitspec3.2）' },
  { lines: ['capabilities:', '  - type: com.docker.sandbox/network-policy@2', '    config:', '      runtime:', '        allow:', '          - example.com'], note: 'type/config 列表（kitspec7）' },
];

const annotations = [
  { key: 'vnd.docker.sandbox.kit.descriptor', value: 'kit.yaml 转 JSON，加402个 deb/ provides' },
  { key: 'vnd.docker.sandbox.kit.schema-version', value: '"3"' },
  { key: 'vnd.docker.sandbox.kit.capabilities', value: 'com.docker.sandbox/network-policy@2' },
  { key: 'vnd.docker.sandbox.kit.built-by', value: 'docker/sandbox-kit 3.0.0-m.8, 129be2ff' },
];

module.exports = figure('fig-4-1', {
  height: 612,
  title: 'v3 描述文件及携带它的 manifest',
  desc: '左为hello-kit/kit.yaml从syntax到capabilities的九个顶层项，说明各项去向。右为registry返回m101/hello-kit:v1的无注解OCI index与linux/arm64 manifest。manifest含四项vnd.docker.sandbox.kit注解：JSON描述及402个deb provides、schema-version3、network-policy@2、built-by sandbox-kit3.0.0-m.8；另有四项OCI键、config、16层及/usr/share/sandbox/kit/kit源码。青绿线连接源行与目标。',
}, f => {
  f.kicker(20, 18, 'hello-kit 的原始 kit.yaml');
  f.kicker(356, 18, 'registry 返回内容');
  f.box({ x: 20, y: 28, w: 306, h: 26, hue: 'green', title: 'capture/fixtures/kits/hello-kit/kit.yaml', titleSize: 11.5, align: 'left', pad: 8 });

  const rowTops = [];
  let y = 54;
  rows.forEach(row => {
    const h = row.lines.length * 15 + 24;
    rowTops.push(y);
    f.rect(20, y, 306, h, { fill: color('paper'), stroke: color('panel-edge') });
    row.lines.forEach((line, index) => {
      const indent = line.length - line.trimStart().length;
      f.text(26 + indent * 6.6, y + 15 + index * 15, line.trimStart(), { size: 11 });
    });
    f.text(26, y + h - 7, row.note, { size: 11, serif: true, hue: 'ink-soft' });
    y += h;
  });

  const right = 356;
  f.rect(right, 28, 264, 72, { fill: color('panel'), stroke: color('grey-ink') });
  f.text(right + 8, 45, 'OCI image index，tag v1', { size: 12, weight: 700 });
  f.text(right + 8, 61, 'application/vnd.oci.image.index.v1+json', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(right + 8, 76, 'linux/arm64与证明 manifest', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(right + 8, 91, 'annotations：无', { size: 11, serif: true, hue: 'ink-soft' });

  f.rect(right, 108, 264, 414, { fill: color('panel'), stroke: color('grey-ink') });
  f.text(right + 8, 125, '平台 manifest：linux/arm64', { size: 12, weight: 700 });
  f.text(right + 8, 141, 'application/vnd.oci.image.manifest.v1+json', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(right + 8, 162, '注解', { size: 11, hue: 'ink-soft' });
  const annCenters = annotations.map((annotation, index) => {
    const top = 168 + index * 46;
    f.rect(right + 8, top, 252, 42, { fill: color('teal-fill'), stroke: color('teal-ink') });
    f.text(right + 10, top + 16, annotation.key, { size: 11, hue: 'teal' });
    f.text(right + 10, top + 33, annotation.value, { size: 11, serif: true, hue: 'ink-soft' });
    return top + 21;
  });
  f.rect(right + 8, 352, 252, 58, { fill: color('teal-fill'), stroke: color('teal-ink') });
  f.text(right + 10, 368, 'org.opencontainers.image.*', { size: 11, hue: 'teal' });
  f.text(right + 10, 384, 'title hello-kit, version 1.0.0,', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(right + 10, 399, 'licenses Apache-2.0, description', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(right + 8, 416, 252, 40, { fill: color('paper'), stroke: color('panel-edge') });
  f.text(right + 12, 432, 'config', { size: 11, hue: 'ink-soft' });
  f.text(right + 12, 448, 'application/vnd.oci.image.config.v1+json', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(right + 8, 462, 252, 54, { fill: color('green-fill'), stroke: color('green-ink') });
  f.text(right + 12, 478, '16层', { size: 11, hue: 'green' });
  f.text(right + 12, 494, 'shell 模板、HELLO.md与源码', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(right + 12, 509, '暂存 /usr/share/sandbox/kit/kit', { size: 11, serif: true, hue: 'ink-soft' });

  const link = (fromY, toY, lane) => f.path(`M326 ${fromY} H${lane} V${toY} H${right + 7}`, { style: 'write', packet: false });
  link(rowTops[7] + 18, 489, 331);
  link(rowTops[3] + 34, 381, 335);
  link(rowTops[0] + 12, annCenters[3], 339);
  link(rowTops[1] + 19, annCenters[1], 343);
  link(41, annCenters[0], 347);
  link(rowTops[8] + 50, annCenters[2], 351);

  f.text(20, 548, 'docker buildx build -f fixtures/kits/hello-kit/kit.yaml --builder m101-builder', { size: 11 });
  f.text(33.2, 564, '-t m101-registry:5000/m101/hello-kit:v1 --push fixtures/kits/hello-kit', { size: 11 });
  f.text(20, 584, '默认 docker driver 的同一推送无注解（28-manifest-docker-driver.json）。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 600, 'index 没有八项注解，尽管 kitspec9.3要求提升（28-index.json）。', { size: 11, serif: true, hue: 'ink-soft' });
});
