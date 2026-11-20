'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { flat } = require('../../../_shared/forms.js');

const lab = path.join(__dirname, '../../capture/lab/chat-ui-mac');
const summary = JSON.parse(fs.readFileSync(path.join(lab, 'summary/chatui-mac.json'), 'utf8'));
const seq = summary.requests_after_isolated_browser;
const byN = n => seq.find(r => r.n === n);
const sseEvents = n => fs.readFileSync(path.join(lab, 'runs/sse', `${String(n).padStart(4, '0')}.sse`), 'utf8')
  .replace(/\r\n/g, '\n').split('\n\n')
  .map(block => (block.split('\n').find(l => l.startsWith('event:')) || '').slice(6).trim())
  .filter(Boolean);

const info = byN(9);
const search = byN(10);
const create = byN(14);
const ask = byN(20);
const askHistory = byN(21);
const resume = byN(22);
const resumeHistory = byN(23);
const askEvents = sseEvents(20);
const resumeEvents = sseEvents(22);
const count = (list, name) => list.filter(e => e === name).length;
const s = v => `${v.toFixed(2)} s`;
const tool = summary.tool_runs.find(t => t.name === 'send_email');

const lanes = [
  { title: 'Agent Chat UI', sub: '浏览器', hue: 'violet', draw: (f, x) => flat.terminal(f, x, 18, 'violet', { w: 40, h: 34 }) },
  { title: 'Agent Server', sub: 'langgraph dev', hue: 'indigo', draw: (f, x) => flat.unit(f, x, 22, 'indigo', { w: 34, h: 30 }) },
  { title: '智能体图', sub: 'create_agent，Ollama', hue: 'plum', draw: (f, x) => flat.tower(f, x, 18, 'plum', { w: 34, h: 34 }) },
];
const cx = [70, 340, 540];

const groups = [
  { hue: 'ink', rows: [
    [0, 1, 'call', `GET /info  ${info.status}`, '加载时及每次连接后'],
    [0, 1, 'call', `POST /threads/search  graph_id ${search.body_shape.metadata.graph_id}`, `limit ${search.body_shape.limit}，填充历史列表`],
    [0, 1, 'call', 'POST /threads  metadata {}', '仅线程的第一条消息'],
  ] },
  { hue: 'ink', rows: [
    [0, 1, 'call', 'POST runs/stream  input.messages', `${ask.body_shape.stream_mode.join(', ')}；on_disconnect ${ask.body_shape.on_disconnect}`],
    [1, 2, 'call', '运行', '模型调用'],
    [2, 1, 'reply', 'AI 消息，完整的工具调用', `POST 之后 ${s(ask.timing.server_first_model_output_s)}`],
    [1, 0, 'event', `messages: ${ask.timing.sse_first_ai_value}`, `工具卡片晚 ${s(ask.timing.ui_minus_sse_s)} 绘出`],
    [1, 0, 'state', 'values: __interrupt__', `共 ${count(askEvents, 'values')} 个 values 和 ${count(askEvents, 'messages')} 个 messages 事件`],
    [0, 1, 'call', `POST /history  limit ${askHistory.body_shape.limit}`, '每次运行之后'],
  ] },
  { hue: 'teal', rows: [
    [0, 1, 'call', 'POST runs/stream  command.resume', `decisions [${resume.body_shape['command.resume'].decisions.map(d => d.type).join(', ')}]；on_disconnect ${resume.body_shape.on_disconnect}`],
    [1, 2, 'call', '从检查点恢复', `stream_resumable ${resume.body_shape.stream_resumable}`],
    [2, 2, 'effect', `${tool.name} 运行`, ''],
    [1, 0, 'event', `messages："${resume.timing.sse_first_ai_value}"，共 ${count(resumeEvents, 'messages')} 个事件`, `首个 token ${s(resume.timing.sse_first_ai_event_s)}，晚 ${s(resume.timing.ui_minus_sse_s)} 绘出`],
    [0, 1, 'call', `POST /history  limit ${resumeHistory.body_shape.limit}`, ''],
  ] },
];

const HEIGHT = 112 + groups.reduce((sum, g) => sum + g.rows.length * 40 + 10, 0) + 30;

module.exports = figure('fig-8-2', {
  height: HEIGHT,
  title: 'Agent Chat UI 一次审批的请求',
  desc: `三条生命线：浏览器中的 Agent Chat UI、langgraph dev 下的 Agent Server，以及 Ollama 上的智能体图。步骤 1，加载时 UI 调用 GET /info 和 POST /threads/search（graph_id 为 ${search.body_shape.metadata.graph_id}，limit 为 ${search.body_shape.limit}），线程的第一条消息会调用 POST /threads。步骤 2，消息以 POST runs/stream 发出，流模式为 ${ask.body_shape.stream_mode.join(', ')}，on_disconnect 为 ${ask.body_shape.on_disconnect}。模型在 POST 之后 ${s(ask.timing.server_first_model_output_s)} 返回完整的 ${ask.timing.sse_first_ai_value} 调用，一个 messages 事件携带它，一个 values 事件携带 __interrupt__。UI 随后调用 POST /history。步骤 3，Approve 发出 POST runs/stream，带 command.resume 的 decisions ${resume.body_shape['command.resume'].decisions.map(d => d.type).join(', ')}、on_disconnect ${resume.body_shape.on_disconnect} 和 stream_resumable ${resume.body_shape.stream_resumable}。工具运行，首个 token 在 POST 之后 ${s(resume.timing.sse_first_ai_event_s)} 到达，UI 再晚 ${s(resume.timing.ui_minus_sse_s)} 把它绘出。`,
}, f => {
  lanes.forEach((lane, index) => {
    lane.draw(f, cx[index]);
    f.text(cx[index], 70, lane.title, { size: 11, weight: 700, hue: lane.hue, anchor: 'middle' });
    f.text(cx[index], 84, lane.sub, { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
    f.lifeline(cx[index], 92, HEIGHT - 24);
  });
  let y = 116;
  groups.forEach((group, g) => {
    const top = y;
    f.beat(g + 1);
    group.rows.forEach(([from, to, style, label, note]) => {
      const x1 = cx[from];
      const x2 = cx[to];
      if (from === to) {
        f.rect(x2 - 6, y - 10, 12, 20, { hue: 'olive' });
        f.text(x2 - 14, y + 4, label, { size: 11.5, hue: 'olive', anchor: 'end', knock: true });
      } else {
        f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note: note || undefined });
      }
      y += 40;
    });
    f.step(16, top, g + 1, { hue: group.hue });
    if (group.rows.length > 1) f.rule(16, top + 10, 16, y - 46, { hue: 'ink-mute' });
    y += 10;
  });
  f.beat(0);
});
