'use strict';

const { figure } = require('../../../_shared/figkit.js');

const checks = [
  ['node', ['22.22.0', "ok true，健康"]],
  ['ghidra', ['GHIDRA_INSTALL_DIR', 'ghidra/12.1.4/libexec']],
  ['ghidra-platform', ['darwin', "ok true，健康"]],
  ['ghidra-architecture', ['arm64', "ok true，健康"]],
  ['ghidra-installation', ['application.properties', "ok true，健康"]],
  ['ghidra-version', ['12.1.4', "策略：12.1.x、JDK 21"]],
  ['ghidra-headless', ['support/analyzeHeadless', "ok true，健康"]],
  ['ghidra-native_decompiler', ['os/mac_arm_64/decompile', "mach-o arm64 匹配"]],
  ['ghidra-java', ["21.0.12.1，64 位 JDK", "ok true，健康"]],
];

module.exports = figure('fig-2-2', {
  height: 360,
  title: "rea doctor 针对 Ghidra 的九项检查",
  desc: "九个框排成三行，从左向右再向下读，各带录制 Mac 返回的详情：node 22.22.0；ghidra 的 GHIDRA_INSTALL_DIR 为 ghidra/12.1.4/libexec；ghidra-platform 为 darwin；ghidra-architecture 为 arm64；ghidra-installation 为 application.properties；ghidra-version 12.1.4 满足 12.1.x、JDK 21 策略；ghidra-headless 为 support/analyzeHeadless；ghidra-native_decompiler 的 os/mac_arm_64/decompile 报告匹配的 mach-o arm64；ghidra-java 为 64 位 JDK 21.0.12.1。箭头依次连接检查。底部两个结果框：explicit 范围、providers ghidra 的 healthy true、退出 0；捕获过滤排除的整体审计集合 environment_healthy false。",
}, f => {
  f.kicker(20, 18, "rea doctor --provider ghidra · 按顺序");
  const boxes = checks.map(([title, sub], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    return f.box({ x: 20 + col * 205, y: 30 + row * 84, w: 190, h: 64, hue: 'violet', title, sub, titleSize: 11 });
  });
  boxes.forEach((box, index) => {
    const next = boxes[index + 1];
    if (!next) return;
    if (next.y === box.y) f.arrow(box.right(), [next.x - 1, box.cy], { style: 'call' });
    else f.path(`M${box.cx} ${box.y + box.h} V${box.y + box.h + 10} H${next.cx} V${next.y - 1}`, { style: 'call' });
  });
  f.path('M525 262 V276 H165 V289', { style: 'state' });
  f.path('M525 262 V276 H475 V289', { style: 'reply' });
  f.box({ x: 20, y: 290, w: 290, h: 56, hue: 'amber', title: 'healthy: true', sub: ["范围 explicit，providers [ghidra]", "退出 0，低于一秒"], titleSize: 12 });
  f.box({ x: 330, y: 290, w: 290, h: 56, hue: 'grey', title: 'environment_healthy: false', sub: ["整体审计集合，超出此范围", "捕获中已过滤排除"], titleSize: 12 });
});
