'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-1', {
  height: 470,
  title: '锁定版本下各个包的依赖要求',
  desc: '一棵依赖树。deepagents 0.7.38 要求 langchain 1.5 或更高、langchain-anthropic 1.7.10 或更高、langchain-google-genai 4.4.3 或更高，以及 langsmith 0.14.17 或更高。langchain 1.5.0 要求 langchain-core 1.8 或更高，以及从 1.2.12 到低于 1.3 的 langgraph，extras 包括 openai、anthropic、ollama 和 mcp，以虚线画出。langgraph 1.2.22 要求 langchain-core 1.4.7 或更高、4.3 到低于 5 的 langgraph-checkpoint、1.1 到低于 1.2 的 langgraph-prebuilt，以及 0.4.6 到低于 0.5 的 langgraph-sdk。langchain-core 1.8.0 要求 0.14.9 到低于 1 的 langsmith、0.0.20 或更高的 langchain-protocol，以及 2.7.4 到低于 3 的 pydantic。',
}, f => {
  const B = (x, y, w, title, sub, hue, dash) => f.box({ x, y, w, h: 44, hue, title, sub, dash, titleSize: 12 });
  const deep = B(20, 14, 180, 'deepagents 0.7.38', '可选的 harness', 'blue', 'dashed');
  const lc = B(240, 14, 180, 'langchain 1.5.0', 'create_agent', 'blue');
  const extras = B(460, 14, 160, 'extras', 'openai, ollama, mcp', 'plum', 'dashed');
  const prov = B(20, 120, 180, '两个 provider', 'anthropic, google-genai', 'plum');
  const lg = B(240, 120, 180, 'langgraph 1.2.22', '>=1.2.12,<1.3.0', 'indigo');
  const core = B(240, 236, 180, 'langchain-core 1.8.0', '>=1.8.0,<2', 'blue');
  const cp = B(460, 120, 160, 'checkpoint 4.3.2', '>=4.3.0,<5', 'indigo');
  const pb = B(460, 184, 160, 'prebuilt 1.1.2', '>=1.1.0,<1.2.0', 'indigo');
  const sdk = B(460, 248, 160, 'sdk 0.4.14', '>=0.4.6,<0.5.0', 'indigo');
  const ls = B(20, 352, 180, 'langsmith 0.14.17', '>=0.14.9,<1', 'olive');
  const proto = B(240, 352, 180, 'langchain-protocol', '>=0.0.20', 'grey');
  const pyd = B(460, 352, 160, 'pydantic 2.14.3', '>=2.7.4,<3', 'grey');
  const arrow = (a, b) => f.line(a[0], a[1], b[0], b[1] - 1, { style: 'call' });
  f.line(deep.x + deep.w, 36, lc.x - 1, 36, { style: 'call' });
  f.line(lc.x + lc.w, 36, extras.x - 1, 36, { style: 'call', dash: 'dashed' });
  arrow([110, deep.y + deep.h], [110, prov.y]);
  arrow([330, lc.y + lc.h], [330, lg.y]);
  arrow([330, lg.y + lg.h], [330, core.y]);
  f.line(lg.x + lg.w, 142, cp.x - 1, 142, { style: 'call' });
  f.path(`M${lg.x + lg.w} 154 L440 154 L440 206 L${pb.x - 1} 206`, { style: 'call' });
  f.path(`M${lg.x + lg.w} 160 L432 160 L432 270 L${sdk.x - 1} 270`, { style: 'call' });
  f.path(`M${core.x} 270 L110 270 L110 ${ls.y - 1}`, { style: 'call' });
  arrow([330, core.y + core.h], [330, proto.y]);
  f.path(`M${core.x + core.w} 280 L540 330 L540 ${pyd.y - 1}`, { style: 'call' });
  f.text(20, 432, '箭头表示“要求”，每个名称下方是声明的版本范围。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 450, 'deepagents 还要求 langsmith >=0.14.17 和 langchain >=1.5.0。', { size: 11, serif: true, hue: 'ink-soft' });
});
