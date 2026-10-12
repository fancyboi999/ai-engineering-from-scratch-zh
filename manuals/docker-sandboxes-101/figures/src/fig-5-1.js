'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-5-1', {
  height: 372,
  title: 'docker-agent run 从文件到输出',
  desc: '顶：files.yaml唯一root、local模型、两工具集由run --exec及两消息加载，无exec则TUI。中：root循环调用localhost:12434的dmr/ai/qwen3:4b与filesystem/shell十工具。底：stdout最终答案、--json67事件、session.db一会话；record写18-files.yaml模型交互，fake代替runner重放。',
}, f => {
  f.kicker(20, 18, 'capture/fixtures/agents/files.yaml 的一次运行');
  const file = f.box({ x: 20, y: 34, w: 165, h: 56, hue: 'violet', title: 'files.yaml', sub: ['一个 agent：root', '模型 local，2工具集'] });
  const run = f.box({ x: 237, y: 34, w: 165, h: 56, hue: 'violet', title: 'docker-agent run', sub: ['--exec，两条消息'] });
  const tui = f.box({ x: 455, y: 34, w: 165, h: 56, hue: 'grey', dash: 'dashed', title: 'TUI', sub: ['无 --exec'] });
  f.arrow(file.right(), [run.x - 1, file.cy], { style: 'call', label: '加载' });
  f.arrow(run.right(), [tui.x - 1, run.cy], { style: 'reply' });

  const model = f.box({ x: 20, y: 150, w: 165, h: 60, hue: 'plum', title: 'dmr/ai/qwen3:4b', sub: ['Model Runner', 'localhost:12434'] });
  const loop = f.box({ x: 237, y: 150, w: 165, h: 60, hue: 'violet', title: 'agent 循环：root', sub: ['每模型调用一轮'] });
  const tools = f.box({ x: 455, y: 150, w: 165, h: 60, hue: 'olive', title: 'filesystem, shell', sub: ['10工具，例如', 'list_directory, shell'] });
  f.arrow([run.cx, 90], [run.cx, 149], { style: 'call', label: '第1、2轮' });
  f.arrow([loop.x, 170], [model.x + model.w + 1, 170], { style: 'model' });
  f.arrow([model.x + model.w, 190], [loop.x - 1, 190], { style: 'reply' });
  f.arrow([loop.x + loop.w, 170], [tools.x - 1, 170], { style: 'effect' });
  f.arrow([tools.x, 190], [loop.x + loop.w + 1, 190], { style: 'reply' });

  const cassette = f.box({ x: 20, y: 276, w: 140, h: 56, hue: 'teal', title: '18-files.yaml', sub: ['cassette 文件'] });
  const stdout = f.box({ x: 175, y: 276, w: 140, h: 56, hue: 'grey', title: 'stdout', sub: ['仅最终答案', '带 --last'] });
  const events = f.box({ x: 330, y: 276, w: 140, h: 56, hue: 'indigo', title: '--json', sub: ['NDJSON，67事件'] });
  const db = f.box({ x: 485, y: 276, w: 135, h: 56, hue: 'teal', title: 'session.db', sub: ['每运行一个会话'] });
  f.arrow([60, 210], [60, 275], { style: 'write', label: '--record' });
  f.arrow([140, 275], [140, 211], { style: 'reply', label: '--fake' });
  f.arrow([270, 210], [stdout.cx, 275], { style: 'reply' });
  f.arrow([370, 210], [events.cx, 275], { style: 'event' });
  f.arrow([402, 204], [db.cx, 275], { style: 'write' });
  f.text(20, 360, '虚线框未运行；实线框来自 capture/out/18-*。', { size: 11, serif: true, hue: 'ink-soft' });
});
