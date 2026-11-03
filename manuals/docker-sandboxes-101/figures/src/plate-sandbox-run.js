'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const HOST_OY = 205;
const VM_OY = 584;

module.exports = figure('plate-sandbox-run', {
  height: 700,
  title: '一个 agent、一个 microVM、一个代理',
  desc: "录制 Mac 上的 docker-agent run --sandbox 运行，画成宿主工作台上的机器，下方是玻璃般的 microVM。在宿主上，docker-agent v1.149.0 暂存 kit sandbox-kits/<hash>，把含 models.dev 和 localhost:12434 的允许列表写入代理规则，再请 sbx 和 sandboxd v0.47.0 创建沙箱，沙箱进入 running。Hypervisor.framework 线下方，基于 docker/docker-agent-sbx-templates:latest 的 microVM docker-agent-<hash> 内有 docker-agent version main、filesystem 和 shell 工具、四个工作区挂载，以及代理为 gateway.docker.internal:3128、provider key 为 proxy-managed 的环境。模型调用上行到 host.docker.internal:12434，经 :3128 的代理，到达端口 12434 上运行 ai/qwen3:4b 的 Docker Model Runner。回答是：The working directory contains README.md with 1 line.",
}, f => {
  const host = f.isoView({ ox: 0, oy: HOST_OY, angle: 'true' });
  const vm = f.isoView({ ox: 0, oy: VM_OY, angle: 'true' });
  const unit = (view, cx, c, size, h, hue, options = {}) => {
    const [xc, yc] = view.at(cx, c);
    return f.isoBlock(view, { x: xc - size / 2, y: yc - size / 2, w: size, d: size, h, hue, ...options });
  };
  const face = (part, points, hue, opacity) => f.polygon(points.map(([u, v, k]) => part.P(u, v, k)), { fill: color(hue), fillOpacity: opacity });
  const quad = (part, u0, u1, k0, k1, hue, opacity) => face(part, [[u0, 46, k0], [u1, 46, k0], [u1, 46, k1], [u0, 46, k1]], hue, opacity);
  const flow = (a, b, style) => f.path(`M${a[0] + 2} ${a[1]} L${b[0] - 2} ${b[1]}`, { style });

  f.kicker(20, 18, '宿主 · macOS 26.2 arm64');
  f.text(620, 18, 'docker-agent run --sandbox --exec files-sandbox.yaml', { size: 11, anchor: 'end', hue: 'ink-soft' });

  const machines = [
    { cx: 80, hue: 'violet', title: 'docker-agent', sub: ['v1.149.0', 'Homebrew'] },
    { cx: 240, hue: 'blue', title: 'sbx, sandboxd', sub: ['v0.47.0', '创建 VM'] },
    { cx: 400, hue: 'indigo', title: 'proxy :3128', sub: ['在宿主上', '执行规则'] },
    { cx: 560, hue: 'plum', title: 'Model Runner', sub: ['ai/qwen3:4b', '端口 12434'] },
  ];
  f.isoBeam(host, { sx0: 14, sx1: 626, c: 72, back: 128, h: 6, hue: 'paper', inkHue: 'ink-mute', ink: 1, shadow: false });
  const parts = machines.map(m => {
    f.box({ x: m.cx - 74, y: 32, w: 148, h: 56, hue: m.hue, title: m.title, sub: m.sub, titleSize: 12, pad: 6 });
    return unit(host, m.cx, 0, 46, 30, m.hue);
  });
  const [agent, sbx, proxy, runner] = parts;
  quad(agent, 7, 39, 9, 26, 'violet-ink', 0.85);
  for (const k of [21, 16]) quad(agent, 11, 30, k - 1.6, k, 'violet-fill', 0.9);
  f.isoBlock(host, { x: sbx.box.x + 13, y: sbx.box.y + 13, z: 30, w: 20, d: 20, h: 14, hue: 'blue', ink: 1, dash: 'dashed', shadow: false });
  for (let u = 8; u <= 38; u += 6) quad(proxy, u, u + 2, 5, 26, 'indigo-ink', 0.7);
  const drum = f.isoDrum(host, { x: runner.box.x + 23, y: runner.box.y + 23, z: 30, r: 13, h: 12, hue: 'plum' });
  parts.forEach((part, index) => f.leader([machines[index].cx, 89], part === runner ? drum.top : part.top, { hue: machines[index].hue }));

  const [kx, ky] = host.at(160, 40);
  const kit = f.isoBlock(host, { x: kx - 13, y: ky - 10, w: 26, d: 20, h: 5, hue: 'green' });
  const [lx, ly] = host.at(320, 40);
  const list = f.isoBlock(host, { x: lx - 11, y: ly - 11, w: 22, d: 22, h: 2, hue: 'paper', inkHue: 'teal', ink: 1, shadow: false });
  for (const v of [6, 13]) face(list, [[4, v, 2], [18, v, 2], [18, v + 2.5, 2], [4, v + 2.5, 2]], 'teal-ink', 0.8);
  f.box({ x: 20, y: 258, w: 196, h: 44, hue: 'green', title: 'sandbox-kits/<hash>', sub: 'docker-agent 暂存的 kit', titleSize: 11, pad: 6 });
  f.box({ x: 256, y: 258, w: 132, h: 56, hue: 'teal', title: '允许列表', sub: ['models.dev', 'localhost:12434'], titleSize: 11, pad: 6 });
  f.leader([160, 257], kit.top, { hue: 'green' });
  f.leader([320, 257], list.top, { hue: 'teal' });

  f.beat(1);
  flow(agent.P(46, 0, 15), sbx.P(0, 46, 15), 'call');
  f.text(160, HOST_OY - 22, 'create', { size: 11.5, anchor: 'middle', knock: true });
  f.beat(2);
  f.path(`M${agent.near[0] + 6} ${agent.near[1] + 18} L${kit.P(0, 10, 5)[0] - 3} ${kit.P(0, 10, 5)[1] - 1}`, { style: 'write' });
  f.path(`M${list.P(22, 11, 2)[0] + 2} ${list.P(22, 11, 2)[1]} L${proxy.P(0, 40, 8)[0] - 3} ${proxy.P(0, 40, 8)[1]}`, { style: 'write' });

  f.beat(3);
  f.line(240, HOST_OY + 25, 240, 338, { style: 'state' });
  f.text(232, 334, '已创建，running', { size: 11.5, anchor: 'end', hue: 'amber', knock: true });

  f.beat(0);
  f.rule(20, 346, 620, 346, { dash: 'dashed' });
  f.text(20, 362, 'Hypervisor.framework · kern.hv_support: 1', { size: 11, hue: 'ink-soft' });

  const cf = 70;
  const cb = -70;
  const H = 44;
  const corner = (sx, c, z) => vm.P(...vm.at(sx, c), z);
  const pane = (c, z0, z1) => [corner(18, c, z0), corner(622, c, z0), corner(622, c, z1), corner(18, c, z1)];
  const floor = [corner(18, cf, 0), corner(622, cf, 0), corner(622, cb, 0), corner(18, cb, 0)];
  f.polygon(floor, { fill: color('paper') });
  f.polygon(floor, { fill: color('shine'), fillOpacity: 0.45 });
  f.polygon(pane(cb, 0, H), { fill: color('accent'), fillOpacity: 0.05 });
  const edge = (a, b) => f.rule(a[0], a[1], b[0], b[1], { hue: 'ink-mute', opacity: 0.55 });
  edge(corner(18, cb, 0), corner(622, cb, 0));

  const inner = [
    { cx: 100, hue: 'indigo' },
    { cx: 250, hue: 'green' },
    { cx: 400, hue: 'violet' },
    { cx: 545, hue: 'olive' },
  ].map(spec => unit(vm, spec.cx, 0, 46, 30, spec.hue));
  const [env, mounts, guest, tools] = inner;
  quad(env, 6, 40, 19, 23, 'indigo-ink', 0.7);
  quad(env, 6, 30, 10, 14, 'indigo-ink', 0.45);
  for (let i = 0; i < 4; i += 1) quad(mounts, 6 + i * 9.5, 12 + i * 9.5, 9, 19, 'green-ink', 0.75);
  quad(guest, 7, 39, 9, 26, 'violet-ink', 0.85);
  for (const k of [21, 16]) quad(guest, 11, 30, k - 1.6, k, 'violet-fill', 0.9);
  f.isoBlock(vm, { x: tools.box.x + 9, y: tools.box.y + 9, z: 30, w: 26, d: 20, h: 3, hue: 'paper', inkHue: 'olive', ink: 1, shadow: false });
  f.isoBlock(vm, { x: tools.box.x + 13, y: tools.box.y + 15, z: 33, w: 26, d: 20, h: 3, hue: 'paper', inkHue: 'olive', ink: 1, shadow: false });

  f.polygon(pane(cf, 0, H), { fill: color('accent'), fillOpacity: 0.07 });
  edge(corner(18, cf, H), corner(622, cf, H));
  f.polygon([corner(18, cb, H), corner(622, cb, H), corner(622, cf, 0), corner(18, cf, 0)], { stroke: color('ink-mute'), strokeWidth: 1.5 });
  for (const [sx, len] of [[160, 30], [176, 16]]) {
    const a = corner(sx, cf, H - 6);
    f.rule(a[0], a[1], a[0] + len * 0.5, a[1] + len, { hue: 'ink-mute', width: 1.4, opacity: 0.45 });
  }

  f.box({ x: 20, y: 376, w: 280, h: 56, hue: 'indigo', title: '环境', sub: ['HTTP_PROXY gateway.docker.internal:3128', 'ANTHROPIC_API_KEY=proxy-managed'], titleSize: 12, pad: 6 });
  f.box({ x: 440, y: 376, w: 180, h: 56, hue: 'violet', title: 'docker-agent main', sub: ['commit 154b78f2', '运行 files-sandbox.yaml'], titleSize: 12, pad: 6 });
  f.box({ x: 150, y: 440, w: 220, h: 56, hue: 'green', title: '4 个工作区挂载', sub: ['repo-sandbox rw, agents ro', 'sandbox-kits ro, cfg ro'], titleSize: 12, pad: 6 });
  f.box({ x: 452, y: 440, w: 168, h: 56, hue: 'olive', title: 'filesystem, shell', sub: ['操作挂载内容', '的工具'], titleSize: 12, pad: 6 });
  f.leader([100, 433], env.P(23, 46, 21), { hue: 'indigo' });
  f.leader([470, 433], guest.P(46, 30, 18), { hue: 'violet' });
  f.leader([260, 497], mounts.P(23, 46, 19), { hue: 'green' });
  f.leader([545, 497], tools.top, { hue: 'olive' });
  f.text(20, 636, 'microVM docker-agent-<hash> · docker/docker-agent-sbx-templates:latest', { size: 11, hue: 'ink-soft' });

  f.beat(4);
  f.line(400, guest.top[1] - 2, 400, HOST_OY + 24, { style: 'model' });
  f.text(408, 330, 'host.docker.internal:12434', { size: 11.5, hue: 'plum', knock: true });
  f.text(408, 362, '经 HTTP_PROXY', { size: 11, serif: true, hue: 'ink-soft', knock: true });
  f.beat(5);
  flow(proxy.P(46, 0, 15), runner.P(0, 46, 15), 'model');
  f.text(480, HOST_OY - 22, ':12434', { size: 11.5, anchor: 'middle', hue: 'plum', knock: true });

  f.beat(6);
  f.box({ x: 20, y: 650, w: 600, h: 38, hue: 'grey', title: 'The working directory contains README.md with 1 line.', titleSize: 12, weight: 400 });
});
