'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/agent-executor-followups-x86.json'));
const one = value => value.toFixed(1);
const two = value => value.toFixed(2);
const pending = data.worker_loss.snapshot_pending;
const durable = data.worker_loss.snapshot_durable;
const short = state => state.replace('SNAPSHOT_STORAGE_STATE_', '');

const rows = [
  {
    run: pending,
    hue: 'rose',
    wait: [`丢失前 ${one(pending.suspend_to_loss_seconds)} s 挂起，`, '快照仍在 worker 上'],
    result: '两个文件均丢失',
    cost: ['连同挂起已保存的', '那个文件也一并丢失'],
  },
  {
    run: durable,
    hue: 'green',
    wait: [`丢失前 ${Math.round(durable.suspend_to_loss_seconds)} s 挂起，`, `${Math.round(durable.durable_snapshot_completed_after_seconds)} s 后完成上传`],
    result: '已存文件得以保留',
    cost: ['挂起后新写的', '文件丢失'],
  },
];

module.exports = figure('fig-7-5c', {
  height: 232,
  title: '运行中的 Agent Executor 任务遭遇底层 worker pod 被删除',
  desc: `两次运行，每行一次。两次中 task 均先写入第一个文件，经挂起并恢复后再写入第二个文件，随后其 worker pod 被删除。第一次运行中，挂起发生在丢失前 ${one(pending.suspend_to_loss_seconds)} 秒，快照仍处于 ${short(pending.durable_snapshot_at_loss)} 状态：执行耗时 ${two(pending.ax_resume_seconds)} 秒的 ax resume task 后，两个文件均丢失。第二次运行中，挂起发生在丢失前 ${Math.round(durable.suspend_to_loss_seconds)} 秒，快照在对象存储中已处于 ${short(durable.durable_snapshot_at_loss)} 状态：执行耗时 ${two(durable.ax_resume_seconds)} 秒的 ax resume task 后，第一个文件保留，第二个文件丢失。两次运行中 task 在恢复前阶段均显示为 ${pending.phase_after_loss}，且无需手动执行回退命令。`,
}, f => {
  f.kicker(20, 18, '最近一次挂起');
  f.kicker(184, 18, '删除 worker pod');
  f.kicker(348, 18, 'ax resume task');
  f.kicker(492, 18, '/workspace 目录');
  rows.forEach((row, index) => {
    const y = 28 + index * 90;
    const run = row.run;
    const wait = f.box({ x: 20, y, w: 150, h: 72, hue: 'amber', align: 'left', pad: 8, title: short(run.durable_snapshot_at_loss), titleSize: 11.5, sub: row.wait });
    const loss = f.box({ x: 184, y, w: 150, h: 72, hue: 'rose', align: 'left', pad: 8, title: `${one(run.crashed_seen_after_seconds)} s 后 CRASHED`, titleSize: 11.5, sub: [`阶段保持 ${run.phase_after_loss}`, `无命令观察 ${Math.round(run.watched_with_no_command_seconds)} s`] });
    const resume = f.box({ x: 348, y, w: 130, h: 72, hue: 'blue', align: 'left', pad: 8, title: `RUNNING, ${two(run.ax_resume_seconds)} s`, titleSize: 11.5, sub: ['迁至另一 worker，', '无需手动回退'] });
    const result = f.box({ x: 492, y, w: 128, h: 72, hue: row.hue, align: 'left', pad: 8, title: row.result, titleSize: 11.5, sub: row.cost });
    f.arrow(wait.right(), [loss.x - 1, wait.cy], { style: 'state' });
    f.arrow(loss.right(), [resume.x - 1, loss.cy], { style: 'call' });
    f.arrow(resume.right(), [result.x - 1, resume.cy], { style: index ? 'state' : 'fail' });
  });
  f.text(20, 218, '每行对应一次运行（单 kind 节点、含 2 个 worker 的池）。每个 task 均运行 sleep infinity。', { size: 11, serif: true, hue: 'ink-soft' });
});
