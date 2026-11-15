'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/lab/summary/node-loss-x86.json'));
const one = value => value.toFixed(1);
const two = value => value.toFixed(2);
const byCase = key => runs.cases.find(item => item.case === key);
const back = key => runs.node_return.runs.find(item => item.case === key);
const down = runs.detection.workers_unavailable_t;
const rescue = runs.tag_rescue;
const quiet = byCase('a');
const pending = byCase('c-return');
const pendingOk = pending.served.find(item => item.event === 'w1-request-without-revert');
const pendingReverted = pending.served.find(item => item.event === 'v3-request-after-revert');
const crashed = back('b');
const running = back('d');
const last = runs.second_revert[runs.second_revert.length - 1];
const lastOk = byCase('a2').served[0];
const failed = runs.second_revert.filter(item => !item.ok).length;
const stuck = runs.node_return.runs.filter(item => item.actor_state_at_end === 'ACTOR_STATE_REVERTING');
const stuckFrom = Math.floor(Math.min(...stuck.map(item => item.watched_seconds)) / 10) * 10;

const rows = [
  {
    hue: 'teal',
    state: ['任意状态，停机前', '已打好快照标签'],
    act: 'create actor --tag',
    how: ['基于标签创建新 actor，', '再将请求发往新 actor'],
    result: `${one(rescue[0].seconds_after_create)} s 后返回 200`,
    cost: [`在另一节点 ${rescue.length}/${rescue.length} 次救援成功，`, '使用新 actor 名称'],
  },
  {
    hue: 'amber',
    state: ['SUSPENDED, --mode sync,', '停机后未收到请求'],
    act: '先等待，再执行一次回退',
    how: ['等 worker 变为 UNAVAILABLE', `（停机后 ${Math.round(down.min)} 至 ${Math.round(down.max)} s）`],
    result: `回退 ${one(quiet.commands.runs[0].seconds)} s，请求 ${two(quiet.served[0].seconds)} s 返回 200`,
    cost: ['迁移至另一节点，', '未丢失任何状态'],
  },
  {
    hue: 'amber',
    state: ['默认模式 SUSPENDED，', '持久快照处于 PENDING'],
    act: '不执行任何管理命令',
    how: ['等待原节点恢复，', '随后直接发请求即可'],
    result: `请求 ${two(pendingOk.seconds)} s 返回 200`,
    cost: [`节点启动后 ${Math.round(pendingOk.t - pending.node_start_t)} s 恢复服务；`, `若先回退会丢 ${pendingOk.count - 1 - (pendingReverted.count - 1)} 次调用`],
  },
  {
    hue: 'rose',
    state: ['收到过请求：RESUMING 后', 'CRASHED；或原为 RUNNING'],
    act: '停机期不回退、不删除',
    how: ['等待原节点恢复，', '再执行一次回退'],
    result: `回退 ${one(crashed.revert_after_return[0].seconds)} s，请求 ${two(crashed.served_after_return[0].seconds)} s 返回 200`,
    cost: [`RUNNING：${two(running.served_after_return[0].seconds)} s 返回 200，`, '上次快照后的变更丢失'],
  },
  {
    hue: 'rose',
    dash: 'dashed',
    state: ['因早先命令卡在', 'REVERTING 或 DELETING'],
    act: '等待原节点恢复',
    how: [`停机期 ${failed}/${failed} 次回退均失败；`, 'atelet 恢复后再回退'],
    result: `回退 ${one(last.seconds)} s，请求 ${two(lastOk.seconds)} s 返回 200`,
    cost: ['仅 1 次成功；另 4 次在节点', `恢复 ${stuckFrom} s 后仍为 REVERTING`],
  },
];

module.exports = figure('fig-8-2d', {
  height: 498,
  title: '节点停机时如何处理单个 actor',
  desc: `基于双 worker 节点集群节点停机实测的五行决策图。第一行：停机前打好快照标签时，基于该标签创建的新 actor 在执行创建命令 ${one(rescue[0].seconds_after_create)} 秒后即可响应首个请求（${rescue.length}/${rescue.length} 次救援全部成功）。第二行：以 sync 模式挂起且停机后未收到请求的 actor，可在停机 ${Math.round(down.min)} 至 ${Math.round(down.max)} 秒、worker 显示 UNAVAILABLE 后执行回退（耗时 ${one(quiet.commands.runs[0].seconds)} 秒）。第三行：默认模式挂起且持久快照仍为 PENDING 的 actor 无需执行任何命令，在节点启动 ${Math.round(pendingOk.t - pending.node_start_t)} 秒后即可响应请求。第四行：停机期间收到过请求或原处于运行状态的 actor，需等待原节点恢复后再执行一次回退。第五行：中断期间因执行命令而进入 REVERTING 或 DELETING 的 actor 会一直停留在该状态，直至原节点恢复。`,
}, f => {
  f.kicker(20, 18, '停机时的 actor 状态');
  f.kicker(212, 18, '处理方式');
  f.kicker(404, 18, '实测结果');
  rows.forEach((row, index) => {
    const y = 28 + index * 90;
    const state = f.box({ x: 20, y, w: 178, h: 72, hue: row.hue, dash: row.dash, align: 'left', pad: 9, sub: row.state });
    const act = f.box({ x: 212, y, w: 178, h: 72, hue: index === 0 ? 'teal' : 'grey', align: 'left', pad: 9, title: row.act, titleSize: 11.5, sub: row.how });
    const result = f.box({ x: 404, y, w: 216, h: 72, hue: index === 4 ? 'rose' : 'green', align: 'left', pad: 8, title: row.result, titleSize: 11, sub: row.cost });
    f.arrow(state.right(), [act.x - 1, state.cy], { style: 'call' });
    f.arrow(act.right(), [result.x - 1, act.cy], { style: index === 4 ? 'fail' : 'state' });
  });
  f.text(20, 484, '双 worker 节点、Envoy 数据平面、默认计时器下每种情形各实测一次。', { size: 11, serif: true, hue: 'ink-soft' });
});
