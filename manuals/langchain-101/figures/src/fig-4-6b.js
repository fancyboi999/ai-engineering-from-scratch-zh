'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const S = load(path.join(__dirname, '../../capture/lab/bench2/summary-bench2.json'));
const R = S.rubric;
const ids = Object.keys(R.tasks);
const T = R.tasks;
const VERDICT = { satisfied: 'green', needs_revision: 'amber', max_iterations_reached: 'rose' };
const last = t => (T[t].results || []).slice(-1)[0];
const satFail = ids.filter(t => last(t) === 'satisfied' && !T[t].pass);
const sat = ids.filter(t => last(t) === 'satisfied');
const maxIt = ids.filter(t => last(t) === 'max_iterations_reached');
const SQ = 10;
const STEP = 12;
const VX = 84;
const RH = 15;
const Y0 = 74;

module.exports = figure('fig-4-6b', {
  height: Y0 + ids.length * RH + 70,
  title: 'RubricMiddleware 在 Qwen3 8B 用朴素循环失败的 25 项任务上的表现',
  desc: `每行对应 Qwen3 8B 朴素循环失败的 ${ids.length} 项任务之一，用 create_agent 和 RubricMiddleware 重新运行，评分器是 Qwen3 14B。方块按顺序给出评分器的每个裁决。${sat.length} 次运行以裁决 satisfied 结束，其中 ${satFail.length} 次仍然没通过状态检查。${maxIt.length} 次运行达到了三轮的上限。${R.recovered.length} 项任务通过：${R.recovered.join('、')}。`,
}, f => {
  f.kicker(20, 22, '评分器的裁决，按顺序');
  f.text(404, 40, 'worker 调用', { size: 11, anchor: 'end', hue: 'ink-mute' });
  f.text(20, 56, '任务', { size: 11, hue: 'ink-soft' });
  f.text(VX, 56, '裁决', { size: 11, hue: 'ink-soft' });
  f.text(212, 56, '状态检查', { size: 11, hue: 'ink-soft' });
  f.text(350, 56, '朴素', { size: 11, anchor: 'end', hue: 'ink-soft' });
  f.text(404, 56, 'rubric', { size: 11, anchor: 'end', hue: 'ink-soft' });
  f.text(466, 56, '评分器', { size: 11, anchor: 'end', hue: 'ink-soft' });
  f.text(486, 56, '剩余的失败', { size: 11, hue: 'ink-soft' });
  f.rule(20, 62, 620, 62, { hue: 'ink-mute' });
  ids.forEach((t, i) => {
    const y = Y0 + i * RH;
    const v = T[t];
    f.text(20, y + 9, t, { size: 11, hue: 'ink' });
    (v.results || []).slice(0, 9).forEach((r, j) => {
      f.rect(VX + j * STEP, y, SQ, SQ, { fill: color(`${VERDICT[r]}-ink`), stroke: 'none' });
    });
    f.rect(212, y, SQ, SQ, { fill: color(v.pass ? 'blue-ink' : 'rose-ink'), stroke: 'none' });
    f.text(228, y + 9, v.pass ? '通过' : '失败', { size: 11, hue: v.pass ? 'blue' : 'rose', weight: v.pass ? 700 : 400 });
    f.text(350, y + 9, String(v.base_calls), { size: 11, anchor: 'end', hue: 'ink' });
    f.text(404, y + 9, String(v.calls), { size: 11, anchor: 'end', hue: 'ink' });
    f.text(466, y + 9, String(v.judge_calls), { size: 11, anchor: 'end', hue: 'ink' });
    f.text(486, y + 9, v.pass ? '无' : v.cat, { size: 11, hue: 'ink-soft', max: 134 });
  });
  const y = Y0 + ids.length * RH + 16;
  f.beat(1);
  [['satisfied', 'satisfied'], ['needs_revision', '需要修改'], ['max_iterations_reached', '达到轮数上限']].forEach(([k, label], i) => {
    f.rect(20 + i * 130, y - 9, SQ, SQ, { fill: color(`${VERDICT[k]}-ink`), stroke: 'none' });
    f.text(34 + i * 130, y, label, { size: 11, hue: 'ink-soft' });
  });
  f.beat(0);
  f.text(20, y + 20, `${sat.length} 次运行以 satisfied 结束，其中 ${satFail.length} 次没通过检查。${ids.length} 项任务中有 ${R.recovered.length} 项通过。`, { size: 11, serif: true, hue: 'ink' });
  f.text(20, y + 36, `worker 调用 ${R.worker_calls[0]} 到 ${R.worker_calls[1]} 次，另有 ${R.judge_calls} 次评分器调用。`, { size: 11, serif: true, hue: 'ink-soft' });
});
