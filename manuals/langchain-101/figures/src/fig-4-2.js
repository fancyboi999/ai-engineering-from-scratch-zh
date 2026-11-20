'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-4-2', {
  height: 520,
  title: '哪种策略会运行，以及它如何失败',
  desc: '一张决策图。显式给出的 ToolStrategy 和显式给出的 ProviderStrategy 保持原样。普通 schema 或 AutoStrategy 在模型档案说 structured_output 为 true，或模型名在固定列表中时，变成 ProviderStrategy，否则变成 ToolStrategy。ToolStrategy 的失败方式有：对解析错误无次数限制地重试；agent 没有工具时一直循环到递归上限；agent 有自己的工具时结束但没有 structured_response。ProviderStrategy 的失败方式有：联合类型在构建时抛出 ValueError；服务器返回 400 时抛出异常；第一次调用返回错误的 JSON 时抛出异常。',
}, f => {
  f.kicker(20, 20, '你传给 response_format 的内容');
  const tool = f.box({ x: 20, y: 34, w: 196, h: 50, hue: 'violet', title: 'ToolStrategy(s)', sub: '显式' });
  const auto = f.box({ x: 222, y: 34, w: 196, h: 50, hue: 'violet', title: '普通 schema', sub: '或 AutoStrategy(s)' });
  const prov = f.box({ x: 424, y: 34, w: 196, h: 50, hue: 'violet', title: 'ProviderStrategy(s)', sub: '显式' });
  const profile = f.box({ x: 222, y: 118, w: 196, h: 50, hue: 'amber', title: 'model.profile', sub: '说明 structured_output？' });
  const name = f.box({ x: 222, y: 202, w: 196, h: 50, hue: 'amber', title: '模型名', sub: '在固定列表中？' });
  const toolOut = f.box({ x: 20, y: 290, w: 260, h: 50, hue: 'blue', title: '运行 ToolStrategy', sub: '每个 schema 一个工具，tool_choice 为 any' });
  const provOut = f.box({ x: 360, y: 290, w: 260, h: 50, hue: 'blue', title: '运行 ProviderStrategy', sub: 'response_format，只尝试一次' });
  f.arrow([70, tool.y + tool.h], [70, toolOut.y - 1], { style: 'call', label: '保持' });
  f.arrow([570, prov.y + prov.h], [570, provOut.y - 1], { style: 'call', label: '保持' });
  f.arrow([auto.cx, auto.y + auto.h], [auto.cx, profile.y - 1], { style: 'call' });
  f.path(`M${profile.x + profile.w} ${profile.cy} H510 V${provOut.y - 1}`, { style: 'state' });
  f.text(426, profile.cy - 6, '是', { size: 11, hue: 'amber', knock: true });
  f.arrow([profile.cx, profile.y + profile.h], [profile.cx, name.y - 1], { style: 'state', label: '否' });
  f.path(`M${name.x + name.w} ${name.cy} H460 V${provOut.y - 1}`, { style: 'state' });
  f.text(426, name.cy - 6, '是', { size: 11, hue: 'amber', knock: true });
  f.path(`M${name.x} ${name.cy} H170 V${toolOut.y - 1}`, { style: 'state' });
  f.text(186, name.cy - 6, '否', { size: 11, hue: 'amber', knock: true });
  f.kicker(20, 372, '各自如何失败');
  const toolFail = f.box({ x: 20, y: 384, w: 290, h: 92, hue: 'rose', title: 'ToolStrategy', sub: ['解析错误：重试，无次数限制', 'tools=[]：循环到递归上限', '你的工具加纯文本：没有结果，也没有错误'], align: 'left' });
  const provFail = f.box({ x: 330, y: 384, w: 290, h: 92, hue: 'rose', title: 'ProviderStrategy', sub: ['联合类型：构建时 ValueError', '服务器返回 400：抛出异常', '错误的 JSON：第一次调用就抛出异常'], align: 'left' });
  f.arrow([230, toolOut.y + toolOut.h], [230, toolFail.y - 1], { style: 'fail' });
  f.arrow([490, provOut.y + provOut.h], [490, provFail.y - 1], { style: 'fail' });
  f.text(20, 504, '运行时的任何失败都不会让一次运行从一种策略转到另一种。', { size: 11, serif: true, hue: 'ink-soft' });
});
