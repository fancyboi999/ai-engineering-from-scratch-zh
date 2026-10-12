'use strict';

const { figure, color } = require('../figkit.js');

module.exports = figure('tpl-layers', {
  height: 362,
  title: '库的分层',
  desc: '顶层宿主应用调用由四个组件组成的库；所有变化经过同一内核队列，写入三个存储后端之一。右侧一列是宿主提供的可选组件，分别负责工具、模型与环境。',
}, f => {
  f.kicker(20, 18, '你的进程');
  f.box({ x: 20, y: 26, w: 440, h: 42, hue: 'grey', title: '宿主应用', sub: 'open() · submit() · watch() · close()' });
  f.kicker(20, 96, '库 · src/core');
  f.rect(20, 104, 440, 110, { fill: color('paper'), stroke: color('ink-mute') });
  const components = [['Sessions', 'submit, fork', 'blue'], ['Requests', '准入', 'violet'], ['Scheduler', '执行任务', 'amber'], ['Views', 'watch()', 'indigo']];
  components.forEach(([title, sub, hue], index) => f.box({ x: 32 + index * 106, y: 116, w: 98, h: 50, hue, title, sub, pad: 8 }));
  f.box({ x: 32, y: 176, w: 416, h: 28, hue: 'amber', title: '内置任务：generate · tool · compact', titleSize: 11.5, weight: 400 });
  f.arrow([240, 68], [240, 103], { style: 'call' });
  f.kicker(20, 242, '内核');
  f.box({ x: 20, y: 250, w: 440, h: 34, hue: 'teal', title: '一个写队列 · 事务 · 跟踪器' });
  f.arrow([240, 214], [240, 249], { style: 'write', label: '每项变化都是提交' });
  f.kicker(20, 312, '存储 · 每进程一个');
  [['MemoryStore', '不持久化'], ['SqliteStore', '一个数据库文件'], ['JsonlStore', '目录中的文件']].forEach(([title, sub], index) => f.box({ x: 20 + index * 150, y: 320, w: 140, h: 36, hue: 'teal', title, sub, titleSize: 12 }));
  f.arrow([240, 284], [240, 319], { style: 'write' });
  f.kicker(480, 96, '可选组件');
  [['registry', '工具、hook', 104], ['models', 'provider API', 158], ['env', '构建环境', 212]].forEach(([title, sub, y]) => {
    f.box({ x: 480, y, w: 140, h: 44, hue: 'grey', title, sub });
    f.rule(460, y + 22, 480, y + 22, { dash: 'dashed' });
  });
});
