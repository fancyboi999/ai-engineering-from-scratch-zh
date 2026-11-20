'use strict';

const fs = require('fs');
const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');

const run = fs.readFileSync(path.join(__dirname, '../../capture/out/06-agent-run.txt'), 'utf8');
const after = heading => run.slice(run.indexOf(heading) + heading.length);
const callText = after('model calls, as the model received them:');
const calls = JSON.parse(callText.slice(0, callText.lastIndexOf(']') + 1));
const finalText = after('## final state');
const start = finalText.indexOf('\n[\n', finalText.indexOf('"messages"\n]')) + 1;
const final = JSON.parse(finalText.slice(start, finalText.indexOf('\n]\n', start) + 2));
const system = calls[0].messages[0];
if (!system.startsWith('system: ')) throw new Error('fig-3-5: the first message of a call is not the system prompt');
const short = message => {
  if (message.type === 'HumanMessage') return `human: ${message.content}`;
  if (message.type === 'ToolMessage') return `tool: ${message.content}`;
  if (message.tool_calls) return `ai: tool_calls ${message.tool_calls[0].name}`;
  return `ai: ${message.content}`;
};
const replies = final.filter(message => message.type === 'AIMessage');

const ROW = 150;
const line = (f, x, y, w, content, hue, options = {}) => {
  f.rect(x, y, w, 20, { fill: color(options.fresh ? `${hue}-fill` : 'paper'), stroke: color(`${hue}-ink`), dash: options.dash, strokeWidth: options.fresh ? 1.4 : 1 });
  f.text(x + 8, y + 14, content, { size: 11, hue: options.fresh ? hue : 'ink', weight: options.fresh ? 700 : undefined, max: w - 12 });
};

module.exports = figure('fig-3-5', {
  height: 400,
  title: 'model 节点如何构建每个请求',
  desc: `两行，每行对应 06-agent-run.txt 中那次运行的一次模型调用。每行左侧是调用之前的 state.messages，青色：调用 1 之前有 ${calls[0].messages.length - 1} 条消息，调用 2 之前有 ${calls[1].messages.length - 1} 条。中间是聊天模型收到的请求：先是紫色的系统提示词“${system.slice(8)}”，因为它不在状态里，所以用虚线；然后是来自状态的同样那些消息。一条梅紫色箭头把请求送到聊天模型。一条青色箭头把回复带回，model 节点把它追加到 state.messages：调用 1 之后是对 ${replies[0].tool_calls[0].name} 的工具调用，调用 2 之后是“${replies[1].content}”。两行之间，tools 节点追加 ToolMessage。状态最终有 ${final.length} 条消息，不含系统消息。`,
}, f => {
  f.kicker(20, 18, 'state.messages');
  f.kicker(236, 18, '请求');
  f.kicker(510, 18, '聊天模型');

  const states = [final.slice(0, calls[0].messages.length - 1), final.slice(0, calls[1].messages.length - 1)];
  states.forEach((state, r) => {
    const top = 34 + r * ROW;
    f.beat(r * 2 + 1);
    f.step(10, top + 10, r + 1, { hue: 'plum' });
    f.rect(20, top - 4, 196, state.length * 24 + 12, { hue: 'teal' });
    state.forEach((message, k) => line(f, 28, top + 2 + k * 24, 180, short(message), 'teal'));

    const request = calls[r].messages;
    f.rect(236, top - 4, 200, request.length * 24 + 12, { stroke: color('plum-ink'), fill: 'none' });
    line(f, 244, top + 2, 184, system, 'violet', { dash: 'dashed', fresh: true });
    state.forEach((message, k) => line(f, 244, top + 26 + k * 24, 184, short(message), 'teal'));
    f.arrow([216, top + 14 + 24], [235, top + 14 + 24], { style: 'call' });

    const model = f.box({ x: 510, y: top - 4, w: 110, h: 44, hue: 'plum', title: `调用 ${calls[r].call}`, sub: `工具：${calls[r].tools.join(', ')}`, titleSize: 11.5 });
    f.arrow([436, top + 16], [model.x - 1, top + 16], { style: 'model', label: `${request.length} 条消息`, labelX: 473 });

    f.beat(r * 2 + 2);
    const reply = replies[r];
    const y = top + Math.max(state.length * 24 + 12, request.length * 24 + 12) + 14;
    f.path(`M565 ${top + 40} V${y} H${20 + 196 + 1}`, { style: 'write' });
    f.text(340, y - 6, `追加：${short(reply)}`, { size: 11.5, hue: 'teal', anchor: 'middle', knock: true });
    line(f, 28, y - 10, 180, short(reply), 'plum', { fresh: true });
  });

  f.beat(5);
  const end = 34 + 2 * ROW + 6;
  f.text(20, end + 10, `随后 tools 节点追加“${short(final[2])}”，调用 2 能看到它。`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, end + 28, `运行结束后 state.messages 有 ${final.length} 条消息，其中不含系统提示词。`, { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(20, end + 40, 14, 12, { fill: color('violet-fill'), stroke: color('violet-ink'), dash: 'dashed' });
  f.text(40, end + 50, 'create_agent 的 system_prompt：每次调用都先发送，从不保存', { size: 11, serif: true, hue: 'ink-soft' });
});
