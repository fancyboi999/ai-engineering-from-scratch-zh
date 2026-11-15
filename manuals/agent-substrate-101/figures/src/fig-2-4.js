'use strict';

const fs = require('fs');
const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');

const log = fs.readFileSync(path.join(__dirname, '../../capture/lab/A-quickstart/60-state.log'), 'utf8').split('\n');
const pods = log.map(line => line.trim().split(/\s+/)).filter(cols => cols.length > 8 && /^\d+\/\d+$/.test(cols[2])).map(cols => ({ ns: cols[0], name: cols[1], ready: cols[2], status: cols[3] }));
const of = (ns, prefix) => pods.filter(pod => pod.ns === ns && pod.name.startsWith(prefix));
const describe = (ns, prefix, kind) => {
  const found = of(ns, prefix);
  if (!found.length) throw new Error(`fig-2-4: no pod ${ns}/${prefix}`);
  const containers = Number(found[0].ready.split('/')[1]);
  if (found[0].status === 'Completed') return 'Job，已完成';
  const count = `${found.length} 个 pod`;
  const each = containers === 1 ? '' : `，${found.length > 1 ? '各 ' : ''}${containers} 容器`;
  if (kind && found.length === 1) return containers === 1 ? `${kind}，1 个 pod` : `${kind}${each}`;
  return `${count}${each}`;
};
const system = [
  ['ate-api-server', 'blue', ''], ['ate-controller', 'blue', ''],
  ['ate-idp-server', 'blue', ''], ['atelet', 'violet', 'DaemonSet'],
  ['atenet-router', 'indigo', ''], ['atenet-egress', 'indigo', ''],
  ['k8s-credential-provider', 'indigo', ''], ['postgres-0', 'teal', 'StatefulSet'],
  ['rustfs-5', 'teal', '对象存储'], ['rustfs-bucket-init', 'grey', ''],
];
const running = ns => pods.filter(pod => pod.ns === ns && pod.status === 'Running').length;

module.exports = figure('fig-2-4', {
  height: 414,
  title: '安装过程在 kind-control-plane 上创建的组件',
  desc: `命名空间 ate-system 包含 ${running('ate-system')} 个运行中 pod 和 1 个已完成 Job：ate-api-server、ate-controller、ate-idp-server、atelet、atenet-router、atenet-egress、k8s-credential-provider、postgres-0、rustfs 与 rustfs-bucket-init。命名空间 podcertificate-controller-system 包含 podcertificate-controller。命名空间 ate-demo-counter 包含 WorkerPool counter 的 ${running('ate-demo-counter')} 个 worker pod。命名空间 otel-system 包含 jaeger、opentelemetry-collector 与 prometheus。底部两框说明对象存储位置：etcd 保存三个自定义资源 WorkerPool、SandboxConfig 和 CSIDriverConfig，Postgres 保存 atespace、模板、actor、worker 和策略。`,
}, f => {
  f.kicker(20, 18, `ate-system · ${running('ate-system')} 个运行中 pod，1 个已完成 Job`);
  f.rect(20, 26, 400, 240, { fill: color('paper'), stroke: color('ink-mute') });
  system.forEach(([prefix, hue, kind], index) => {
    const x = 28 + (index % 2) * 196;
    const y = 34 + Math.floor(index / 2) * 46;
    f.box({ x, y, w: 188, h: 40, hue, title: prefix === 'rustfs-5' ? 'rustfs' : prefix, sub: describe('ate-system', prefix, kind), titleSize: 11.5, pad: 4, dash: hue === 'grey' ? 'dashed' : undefined });
  });
  f.kicker(20, 290, 'podcertificate-controller-system');
  f.box({ x: 20, y: 298, w: 400, h: 40, hue: 'blue', title: 'podcertificate-controller', sub: `签发 pod 证书，${describe('podcertificate-controller-system', 'podcertificate-controller', '')}`, titleSize: 11.5 });
  f.kicker(436, 18, 'ate-demo-counter');
  f.box({ x: 436, y: 26, w: 184, h: 58, hue: 'violet', title: 'counter', sub: [`WorkerPool，${running('ate-demo-counter')} 个 worker pod`, '镜像 ateworker-gvisor'], titleSize: 11.5, pad: 6 });
  f.kicker(436, 110, 'otel-system');
  ['jaeger', 'opentelemetry-collector', 'prometheus'].forEach((name, index) => {
    if (!of('otel-system', name).length) throw new Error(`fig-2-4: no pod otel-system/${name}`);
    f.box({ x: 436, y: 118 + index * 36, w: 184, h: 30, hue: 'grey', title: name, titleSize: 11.5, pad: 6, weight: 400 });
  });
  f.kicker(436, 242, 'kube-system');
  f.box({ x: 436, y: 250, w: 184, h: 40, hue: 'grey', title: 'Kubernetes v1.37.0', sub: `${running('kube-system')} 个 pod，非 Substrate 创建`, titleSize: 11.5, pad: 6 });
  f.kicker(20, 360, '对象存储位置');
  f.box({ x: 20, y: 368, w: 290, h: 40, hue: 'grey', title: 'etcd：3 个自定义资源', sub: 'WorkerPool, SandboxConfig, CSIDriverConfig', titleSize: 12 });
  f.box({ x: 330, y: 368, w: 290, h: 40, hue: 'teal', title: 'Postgres：其余全部对象', sub: 'atespace、模板、actor、worker、策略', titleSize: 12, pad: 4 });
});
