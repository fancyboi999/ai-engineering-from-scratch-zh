'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const history = [
  { slot: 'history[0]', role: 'ROLE_USER', text: 'Review this diff of payments-api. + refunds.diff', one: false },
  { slot: 'history[1]', role: 'ROLE_AGENT', text: 'Which base branch should I compare this diff against?', one: false },
  { slot: 'history[2]', role: 'ROLE_USER', text: 'main', one: false },
  { slot: 'history[3]', role: 'ROLE_AGENT', text: 'Comparing the diff against main', one: true },
];

const tasks = [
  { id: 'f22ed7af', state: 'TASK_STATE_CANCELED', at: '09:00:03.750' },
  { id: '8ae21dcb', state: 'TASK_STATE_FAILED', at: '09:00:03.000' },
  { id: '728ba084', state: 'TASK_STATE_COMPLETED', at: '09:00:02.250' },
  { id: 'd0c28826', state: 'TASK_STATE_COMPLETED', at: '09:00:01.500' },
  { id: '3d8f7801', state: 'TASK_STATE_COMPLETED', at: '09:00:00.750' },
];

const pages = [
  { first: 0, count: 2, title: "第 1 页", sub: "返回游标 1", dash: undefined, hue: 'indigo' },
  { first: 2, count: 2, title: "第 2 页", sub: "返回游标 2", dash: undefined, hue: 'indigo' },
  { first: 4, count: 1, title: "未请求", sub: null, dash: 'dashed', hue: 'grey' },
];

const rowY = index => 44 + index * 24;
const taskY = index => 280 + index * 24;

module.exports = figure('fig-history-and-pages', {
  height: 452,
  title: "历史规则与列表分页",
  desc: "顶部为审查任务 e5c95b09 的存储历史，history[0] 至 history[3] 四条消息，另有从不属于历史的当前状态消息 2 findings。historyLength 未设置时 GetTask 返回全部四条，值为 1 时只返回 history[3]，为 0 时无 history 字段。底部为 test-runner 的五个任务，按状态时间戳最新优先排序。pageSize 2 的 ListTasks 先返回 f22ed7af、8ae21dcb，再返回 728ba084、d0c28826，每页末尾是不透明的下一页游标 token。第五个任务 3d8f7801 未被请求。两页都没有产物或历史。第三次调用按 TASK_STATE_CANCELED 过滤，不带 historyLength，得到 f22ed7af 及完整历史。",
}, f => {
  f.kicker(20, 16, "A · 历史");
  f.text(126, 16, "GetTask 读取 code-reviewer 的审查任务 e5c95b09", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(560, 16, 'historyLength', { size: 11, anchor: 'middle', hue: 'ink-mute' });
  f.text(530, 36, '未设置', { size: 11, anchor: 'middle', hue: 'ink-soft' });
  f.text(590, 36, '1', { size: 11, anchor: 'middle', hue: 'ink-soft' });
  f.rule(20, 230, 620, 230, { hue: 'ink-mute', dash: 'dashed' });
  f.kicker(20, 250, "B · 分页");
  f.text(112, 250, "ListTasks 读取 test-runner，pageSize 2、historyLength 0", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(32, 272, 'id', { size: 11, hue: 'ink-mute' });
  f.text(118, 272, 'state', { size: 11, hue: 'ink-mute' });
  f.text(300, 272, 'status.timestamp', { size: 11, hue: 'ink-mute' });

  f.beat(1);
  history.forEach((row, index) => {
    const y = rowY(index);
    f.rect(20, y, 600, 24, { fill: color('paper'), stroke: color('panel-edge') });
    f.text(30, y + 16, row.slot, { size: 11, hue: 'teal' });
    f.text(104, y + 16, row.role, { size: 11, hue: row.role === 'ROLE_USER' ? 'violet' : 'blue' });
    f.text(184, y + 16, row.text, { size: 11, serif: true });
  });

  f.beat(2);
  f.rect(20, 148, 600, 24, { fill: color('blue-fill'), stroke: color('blue-ink') });
  f.text(30, 164, 'status.message', { size: 11, hue: 'blue' });
  f.text(184, 164, "2 findings，每次返回，不在历史中", { size: 11, serif: true });

  f.beat(3);
  f.text(30, 192, "返回的历史消息", { size: 11, serif: true, hue: 'ink-soft' });
  history.forEach((row, index) => f.dot(530, rowY(index) + 12, { r: 3.5 }));
  f.dot(530, 160, { r: 3.5 });
  f.text(530, 192, '4', { size: 12, anchor: 'middle', weight: 700 });

  f.beat(4);
  history.forEach((row, index) => { if (row.one) f.dot(590, rowY(index) + 12, { r: 3.5 }); });
  f.dot(590, 160, { r: 3.5 });
  f.text(590, 192, '1', { size: 12, anchor: 'middle', weight: 700 });

  f.beat(5);
  f.text(30, 214, "04-polling.http 的任务 d0c28826，historyLength 0：回复完全没有 history 字段", { size: 11, serif: true, hue: 'ink-soft' });

  f.beat(6);
  tasks.forEach((task, index) => {
    const y = taskY(index);
    const missing = index === 4;
    f.rect(20, y, 440, 24, { fill: color('paper'), stroke: color('panel-edge'), dash: missing ? 'dashed' : undefined });
    f.text(32, y + 16, task.id, { size: 11.5, hue: missing ? 'ink-mute' : undefined });
    f.text(118, y + 16, task.state, { size: 11.5, hue: missing ? 'ink-mute' : 'amber' });
    f.text(300, y + 16, task.at, { size: 11.5, hue: missing ? 'ink-mute' : 'teal' });
  });

  pages.forEach((page, index) => {
    f.beat(7 + index);
    f.box({ x: 470, y: taskY(page.first), w: 150, h: page.count * 24, hue: page.hue, dash: page.dash, title: page.title, titleSize: 11.5, sub: page.sub || [] });
  });
  f.text(30, 418, "两页 totalSize 都为 5，任务均无产物或历史", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(30, 438, "按 TASK_STATE_CANCELED 过滤，不带 historyLength：f22ed7af、完整历史、token \"\"", { size: 11, serif: true, hue: 'ink-soft' });
});
