'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');

const out = name => fs.readFileSync(path.join(__dirname, '../../capture/out', name), 'utf8');
const pins = Object.fromEntries([...out('00-versions.txt').matchAll(/^([a-z0-9-]+)==(\S+)$/gm)].map(m => [m[1], m[2]]));
const python = /^python (\S+)$/m.exec(out('00-versions.txt'))[1];
const v = name => {
  if (!pins[name]) throw new Error(`fig-1-1: ${name} is not pinned in 00-versions.txt`);
  return pins[name];
};
const graphText = out('05-agent-graph.txt');
const list = heading => JSON.parse(graphText.slice(graphText.indexOf('[', graphText.indexOf(heading)), graphText.indexOf('\n]', graphText.indexOf(heading)) + 2));
const nodes = list('## nodes');
const edges = list('## edges').map(e => ({ from: e.split(' -> ')[0], to: e.split(' -> ')[1].replace(' (conditional)', ''), conditional: e.includes('(conditional)') }));
const graphType = /^type (\S+)$/m.exec(graphText)[1].split('.').pop();
const requests = JSON.parse(/HTTP requests the client received, by method and path:\n(\{[\s\S]*?\})/.exec(out('42-langsmith.txt'))[1]);
const posts = requests['POST /runs'];
const patches = requests['PATCH /runs/<run-id>'];

const L = 20;
const R = 446;
const band = (f, y, h, hue, title, pkg, options = {}) => {
  f.rect(L, y, R - L, h, { hue, dash: options.dash });
  f.text(L + 12, y + 18, title, { size: 12.5, weight: 700, hue });
  f.text(R - 10, y + 18, pkg, { size: 11, anchor: 'end', hue: 'ink-soft' });
};
const chip = (f, x, y, w, title, hue, options = {}) => f.box({ x, y, w, h: 24, hue, title, titleSize: 11, pad: 4, dash: options.dash, weight: options.weight });

module.exports = figure('fig-1-1', {
  height: 512,
  title: '四个项目及其在锁定版本下的包',
  desc: `六个色带自上而下堆叠，每个色带是一个项目，标出它的包和锁定版本：Deep Agents 对应 deepagents ${v('deepagents')}，因为是可选的所以画成虚线；LangChain 对应 langchain ${v('langchain')}；LangGraph 对应 langgraph ${v('langgraph')}；provider 包，如 langchain-openai ${v('langchain-openai')}；LangChain core 对应 langchain-core ${v('langchain-core')}；以及 Python ${python} 与 pydantic ${v('pydantic')}。LangGraph 色带内是 create_agent 返回的图，类型为 ${graphType}，节点有 ${nodes.join('、')}。四个编号箭头：create_deep_agent 调用 create_agent，create_agent 返回该图，model 节点调用某个 provider 包里的聊天模型类，该类继承 core 里的 BaseChatModel。侧边的 LangSmith ${v('langsmith')} 为橄榄色。一条橄榄色虚线箭头从 core 指向它，表示一次被追踪的 agent 轮次发出 ${posts} 个 POST /runs 和 ${patches} 个 PATCH 请求，且追踪在你打开之前保持关闭。`,
}, f => {
  f.kicker(L, 16, '每一层导入它下面的各层');

  band(f, 26, 58, 'blue', 'Deep Agents', `deepagents ${v('deepagents')}`, { dash: 'dashed' });
  chip(f, L + 12, 52, 150, 'create_deep_agent', 'blue', { dash: 'dashed' });
  f.text(R - 10, 70, '可选', { size: 11, serif: true, anchor: 'end', hue: 'blue' });

  band(f, 94, 58, 'blue', 'LangChain', `langchain ${v('langchain')}`);
  chip(f, L + 12, 120, 180, 'create_agent(model, tools)', 'blue');
  chip(f, 220, 120, 78, 'middleware', 'blue', { weight: 400 });
  chip(f, 306, 120, 108, 'init_chat_model', 'blue', { weight: 400 });

  band(f, 162, 108, 'indigo', 'LangGraph', `langgraph ${v('langgraph')}, checkpoint ${v('langgraph-checkpoint')}`);
  f.text(L + 12, 198, `一个 ${graphType}`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(250, 198, '琥珀虚线：条件边', { size: 11, serif: true, hue: 'amber' });
  const Y = 230;
  const at = { __start__: 60, model: 170, tools: 290, __end__: 390 };
  const width = { __start__: 80, model: 64, tools: 64, __end__: 72 };
  for (const name of nodes) {
    const hue = name === 'tools' ? 'green' : name.startsWith('__') ? 'grey' : 'indigo';
    f.box({ x: at[name] - width[name] / 2, y: Y - 12, w: width[name], h: 24, hue, title: name, titleSize: 11, pad: 3 });
  }
  const edge = (name, sign) => at[name] + (sign * width[name]) / 2;
  for (const e of edges) {
    const style = { style: e.conditional ? 'state' : 'call' };
    if (e.from === '__start__') f.arrow([edge('__start__', 1), Y], [edge('model', -1) - 1, Y], style);
    if (e.from === 'model' && e.to === 'tools') f.arrow([edge('model', 1), Y - 6], [edge('tools', -1) - 1, Y - 6], style);
    if (e.from === 'tools' && e.to === 'model') f.arrow([edge('tools', -1), Y + 6], [edge('model', 1) + 1, Y + 6], style);
    if (e.from === 'model' && e.to === '__end__') f.path(`M${at.model + 20} ${Y + 12} V${Y + 28} H${at.__end__} V${Y + 13}`, style);
  }

  band(f, 280, 58, 'plum', 'provider 包', `langchain-openai ${v('langchain-openai')}`);
  chip(f, L + 12, 306, 96, 'ChatAnthropic', 'plum', { weight: 400 });
  chip(f, 132, 306, 76, 'ChatOpenAI', 'plum');
  chip(f, 212, 306, 76, 'ChatOllama', 'plum', { weight: 400 });
  f.text(R - 10, 324, `langchain-ollama ${v('langchain-ollama')}`, { size: 11, anchor: 'end', hue: 'ink-soft' });

  band(f, 348, 58, 'blue', 'LangChain core', `langchain-core ${v('langchain-core')}`);
  chip(f, L + 12, 374, 68, 'messages', 'blue', { weight: 400 });
  chip(f, 108, 374, 96, 'BaseChatModel', 'blue');
  chip(f, 212, 374, 62, 'BaseTool', 'blue', { weight: 400 });
  chip(f, 282, 374, 70, 'callbacks', 'blue', { weight: 400 });

  band(f, 416, 48, 'grey', `Python ${python}`, `pydantic ${v('pydantic')}, langchain-protocol ${v('langchain-protocol')}`);
  f.text(L + 12, 454, '录制工具包用的是这个 Python。这些包需要 3.11 或更高版本。', { size: 11, serif: true, hue: 'ink-soft' });

  f.beat(1);
  f.arrow([107, 77], [107, 119], { style: 'call' });
  f.step(126, 100, 1);
  f.beat(2);
  f.arrow([182, 145], [182, Y - 13], { style: 'call' });
  f.step(200, 190, 2);
  f.beat(3);
  f.arrow([176, Y + 12], [176, 305], { style: 'model' });
  f.step(158, 262, 3, { hue: 'plum' });
  f.text(144, 266, 'model.invoke', { size: 11, hue: 'plum', anchor: 'end', knock: true });
  f.beat(4);
  f.arrow([160, 331], [160, 373], { style: 'call' });
  f.step(178, 362, 4);
  f.text(192, 366, '继承', { size: 11, serif: true, hue: 'ink-soft' });

  f.beat(5);
  f.rect(474, 162, 146, 176, { hue: 'olive' });
  f.text(547, 184, 'LangSmith', { size: 12.5, weight: 700, anchor: 'middle', hue: 'olive' });
  f.text(547, 200, `langsmith ${v('langsmith')}`, { size: 11, anchor: 'middle', hue: 'ink-soft' });
  ['客户端：traceable、', 'tracing_context、', 'evaluate', '', '平台：追踪、', '数据集、Agent Server'].forEach((line, i) => {
    if (line) f.text(484, 226 + i * 16, line, { size: 11, serif: true, hue: 'ink-soft' });
  });
  f.path('M352 386 H547 V339', { style: 'effect' });
  f.text(452, 380, `POST /runs ${posts}, PATCH ${patches}`, { size: 11, hue: 'olive', knock: true });
  f.text(474, 404, '针对一次被追踪的轮次。', { size: 11, serif: true, hue: 'olive' });
  f.text(474, 420, '追踪在你打开', { size: 11, serif: true, hue: 'olive' });
  f.text(474, 436, '之前保持关闭。', { size: 11, serif: true, hue: 'olive' });

  f.beat(0);
  f.text(L, 484, '编号：1 调用，2 返回图，3 调用模型类，', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(L, 500, '4 该类继承 core 里的类。', { size: 11, serif: true, hue: 'ink-soft' });
});
