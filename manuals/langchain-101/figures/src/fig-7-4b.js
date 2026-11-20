'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-7-4b', {
  height: 400,
  title: 'create_deep_agent 添加的工具与状态',
  desc: '该录制在 Ollama 上用 Qwen3 4B 调用 create_deep_agent，工具为 add，系统提示词为 You keep notes。主智能体绑定了九个工具：来自 FilesystemMiddleware 的 ls、read_file、write_file、edit_file、delete、glob 和 grep，来自 SubAgentMiddleware 的 task，以及调用方提供的 add。它的状态新增了一个保存 /notes.md 的 files 通道。task 工具启动 general-purpose 子智能体，它绑定的工具相同但没有 task，其系统提示词有 286 个字符。图新增了两个中间件节点：PatchToolCallsMiddleware.before_agent 与 _ParentNotifierMiddleware.after_agent。没有 write_todos 工具，也没有 execute 工具。',
}, f => {
  f.box({ x: 20, y: 14, w: 600, h: 44, hue: 'violet', title: 'create_deep_agent(model=llm(), tools=[add], system_prompt="You keep notes.")', titleSize: 11.5, sub: '你的调用' });
  f.kicker(20, 84, '主模型每次调用绑定的工具：9 个');
  f.box({ x: 20, y: 96, w: 300, h: 60, hue: 'green', title: 'FilesystemMiddleware', sub: ['ls, read_file, write_file, edit_file,', 'delete, glob, grep'], align: 'left' });
  const task = f.box({ x: 336, y: 96, w: 140, h: 60, hue: 'green', title: 'SubAgent', sub: ['Middleware', 'task'], align: 'left' });
  f.box({ x: 492, y: 96, w: 128, h: 60, hue: 'violet', title: '你的', sub: ['add'], align: 'left' });
  f.kicker(20, 186, '状态与图');
  f.box({ x: 20, y: 198, w: 300, h: 60, hue: 'teal', title: '状态中的 files 通道', sub: ['/notes.md：content、encoding、', 'created_at、modified_at'], align: 'left' });
  f.box({ x: 336, y: 198, w: 284, h: 60, hue: 'indigo', title: '两个中间件节点', sub: ['PatchToolCallsMiddleware.before_agent', '_ParentNotifierMiddleware.after_agent'], align: 'left' });
  const sub = f.box({ x: 336, y: 300, w: 284, h: 60, hue: 'blue', title: 'general-purpose 子智能体', sub: ['8 个工具：相同，但没有 task', '自己的提示词，286 个字符'], align: 'left' });
  f.path(`M${task.cx} ${task.y + task.h} V178 H628 V${sub.cy} H${sub.x + sub.w + 1}`, { style: 'call' });
  f.text(20, 318, '0.7.38 中未绑定：', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 336, 'write_todos（现为选用），以及', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 354, 'execute（文档字符串中列出）。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 390, '来自 Qwen3 4B 上的录制工具包运行：共 6 次调用，第 5 次是子智能体。', { size: 11, serif: true, hue: 'ink-soft' });
});
