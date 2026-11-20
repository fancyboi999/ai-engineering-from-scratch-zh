'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const S = load(path.join(__dirname, '../../capture/lab/bench/summary-mac.json'));
const M = S.main;
const Q4 = 'qwen3:4b-instruct-2507-q4_K_M';
const MODELS = [['claude-haiku-5-5', 'Haiku 5.5'], ['qwen3:8b', 'Qwen3 8B'], [Q4, 'Qwen3 4B']];
const HARN = [
  ['plain', 'plain 循环', 'violet'],
  ['deep_agent', 'deep，默认', 'blue'],
  ['deep_agent_fs', 'deep，落盘', 'blue'],
];
const WRITERS = new Set(['write_file', 'edit_file', 'delete']);
const files = M.order.filter(t => M.family[t] === 'files');
if (files.length !== 20) throw new Error('fig-7-4c: expected 20 file tasks');
const cell = (m, h) => {
  const c = M.cells[`${m}|${h}|0`];
  if (!c) throw new Error(`fig-7-4c: no cell ${m} ${h}`);
  return c;
};
const pass = (m, h) => files.filter(t => cell(m, h).tasks[t].p).length;
const used = (m, h) => files.filter(t => cell(m, h).tasks[t].bi.length).length;

const X0 = 204;
const SQ = 14;
const RH = 26;
const Y0 = 54;
const SEP = 12;

module.exports = figure('fig-7-4c', {
  height: Y0 + 9 * RH + 2 * SEP + 70,
  title: '20 个文件任务：plain 循环、deep agent 与落盘的 deep agent',
  desc: `三个模型、三种框架在 20 个文件任务上的网格。实心方块表示通过，玫红方块表示失败。方块下方的绿点表示该次运行中模型用 Deep Agents 的文件工具写入过，灰点表示只用它读取过。默认后端下，这些工具写入智能体状态，而检查器读取磁盘。Qwen3 4B 在 plain 下通过 ${pass(Q4, 'plain')} 个，作为默认 deep agent 通过 ${pass(Q4, 'deep_agent')} 个，使用 FilesystemBackend 时通过 ${pass(Q4, 'deep_agent_fs')} 个。Qwen3 8B 通过 ${pass('qwen3:8b', 'plain')}、${pass('qwen3:8b', 'deep_agent')} 和 ${pass('qwen3:8b', 'deep_agent_fs')} 个。Claude Haiku 5.5 通过 ${pass('claude-haiku-5-5', 'plain')}、${pass('claude-haiku-5-5', 'deep_agent')} 和 ${pass('claude-haiku-5-5', 'deep_agent_fs')} 个。`,
}, f => {
  f.kicker(20, 22, '模型，框架');
  f.kicker(X0, 22, 'files01 至 files20');
  f.kicker(620, 22, '通过', { anchor: 'end' });
  f.kicker(566, 22, '内置工具', { anchor: 'end' });
  let y = Y0;
  MODELS.forEach(([m, name], g) => {
    if (g) y += SEP;
    f.beat(g + 1);
    f.text(20, y + 11, name, { size: 11, weight: 700, hue: 'plum' });
    HARN.forEach(([h, label, hue], r) => {
      const c = cell(m, h);
      f.text(100, y + 11, label, { size: 11, hue });
      files.forEach((t, k) => {
        const run = c.tasks[t];
        const bx = X0 + k * (SQ + 1);
        f.rect(bx, y, SQ - 2, 13, { fill: color(run.p ? `${hue}-ink` : 'rose-ink'), stroke: 'none' });
        if (run.bi.some(b => WRITERS.has(b))) f.dot(bx + (SQ - 2) / 2, y + 19, { hue: 'green', r: 2.6 });
        else if (run.bi.length) f.dot(bx + (SQ - 2) / 2, y + 19, { hue: 'ink-mute', r: 2 });
      });
      f.text(560, y + 11, h === 'plain' ? '' : `${used(m, h)}/20`, { size: 11, anchor: 'end', hue: 'green' });
      f.text(620, y + 11, `${pass(m, h)}/20`, { size: 11, hue: 'ink', anchor: 'end', weight: 700 });
      y += RH;
    });
  });
  f.beat(0);
  const ly = y + 18;
  f.dot(24, ly - 4, { hue: 'green', r: 2.6 });
  f.text(34, ly, '用 write_file、edit_file 或 delete 写入过', { size: 11, serif: true, hue: 'ink-soft' });
  f.dot(344, ly - 4, { hue: 'ink-mute', r: 2 });
  f.text(354, ly, '只读过：ls、glob、read_file', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, ly + 22, '默认：StateBackend，文件存放在智能体状态里。落盘：任务文件夹上的 FilesystemBackend。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, ly + 40, '每一行还都有五个写入该文件夹的任务工具。检查器读取这个文件夹。', { size: 11, serif: true, hue: 'ink-soft' });
});
