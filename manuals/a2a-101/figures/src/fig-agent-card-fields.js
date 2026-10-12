'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const groups = [
  ["它是谁", "身份及发布者证明", [
    ['name', true, ['"test-runner"']],
    ['description', true, ['"Checks out a commit, runs its test suite in a', 'clean container, and streams the log."']],
    ['provider', false, ['organization "Platform Team", url "https://ci.example.com"']],
    ['version', true, ['"2.3.0"'], "agent 版本，不是协议版本"],
    ['documentationUrl', false, null],
    ['iconUrl', false, null],
    ['signatures', false, null, "deployer 签署卡片（第 2.3 节）"],
  ]],
  ["如何访问", "有序列表，首项优先", [
    ['supportedInterfaces', true, ['[0] JSONRPC, "1.0", http://localhost:41241/a2a/jsonrpc', '[1] HTTP+JSON, "1.0", http://localhost:41241/a2a/rest']],
  ]],
  ["有什么要求", "标志缺失等同 false", [
    ['capabilities', true, ['streaming true, pushNotifications true']],
    ['securitySchemes', false, null],
    ['securityRequirements', false, null, "因此调用无需凭据"],
  ]],
  ["提供什么", "媒体类型及描述工作的技能", [
    ['defaultInputModes', true, ['"text/plain", "application/json"']],
    ['defaultOutputModes', true, ['"text/plain", "application/json"']],
    ['skills', true, ['[0] id "run-tests", name "Run tests",', 'tags "ci", "tests"'], "还有描述和一个示例"],
  ]],
];

module.exports = figure('fig-agent-card-fields', {
  height: 556,
  title: "逐字段看 test-runner 的 agent 卡片",
  desc: "test-runner 在 /.well-known/agent-card.json 提供的卡片，以四个依次出现的标题分组显示字段。它是谁：name、description、provider、version，未设置 documentationUrl、iconUrl、signatures。如何访问：两个 supportedInterfaces，JSON-RPC 第一，HTTP+JSON 第二。有什么要求：capabilities 的 streaming、pushNotifications 为 true，无安全字段。提供什么：text/plain、application/json 模式和 run-tests 技能。圆点标记各 REQUIRED 字段。",
}, f => {
  f.box({ x: 20, y: 10, w: 600, h: 40, hue: 'blue', title: "test-runner 的 agent 卡片", sub: 'GET http://localhost:41241/.well-known/agent-card.json', align: 'left' });
  let y = 58;
  groups.forEach(([kicker, note, rows], index) => {
    f.beat(index + 1);
    f.rect(20, y, 600, 24, { hue: 'blue' });
    f.kicker(32, y + 16, kicker, { hue: 'blue' });
    f.text(204, y + 16, note, { size: 11, serif: true, hue: 'ink-soft' });
    y += 24;
    for (const [field, required, values, aside] of rows) {
      const lines = values || ["未设置"];
      const h = lines.length > 1 ? 36 : 22;
      if (values) f.rect(20, y, 600, h, { fill: color('paper'), stroke: color('panel-edge') });
      else f.rect(20, y, 600, h, { fill: color('paper'), stroke: color('ink-mute'), dash: 'dashed' });
      if (required) f.dot(30, y + 11, { r: 3, hue: 'blue' });
      f.text(40, y + 15, field, { size: 12, weight: required ? 700 : undefined, hue: values ? undefined : 'ink-mute' });
      lines.forEach((line, lineIndex) => f.text(204, y + 15 + lineIndex * 15, line, { size: 11, hue: values ? undefined : 'ink-mute' }));
      if (aside) f.text(610, y + 15 + (lines.length - 1) * 15, aside, { size: 11, serif: true, hue: 'ink-soft', anchor: 'end' });
      y += h;
    }
    y += 6;
  });
  f.beat(0);
  f.dot(30, y + 12, { r: 3, hue: 'blue' });
  f.text(40, y + 16, "proto AgentCard 中为 REQUIRED", { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(250, y + 5, 26, 14, { fill: color('paper'), stroke: color('ink-mute'), dash: 'dashed' });
  f.text(284, y + 16, "可选，本卡片未设置", { size: 11, serif: true, hue: 'ink-soft' });
});
