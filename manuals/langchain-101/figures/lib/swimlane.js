'use strict';

const CONTROL = new Set(['task', 'load_skill', 'submit_answer']);
const LABEL = { single: '智能体', skills: '智能体', orders_db: '订单库', synthesize: '汇总' };
const PATTERN_NAME = { single: '单智能体', subagents: '子智能体（Deep Agents）', handoffs: '智能体转交', skills: 'skills', router: '路由' };
const LANE_H = 24;
const HEAD_H = 24;
const GAP = 10;
const LABEL_W = 92;

function laneOrder(run) {
  const order = [];
  for (const e of run.events) if (!order.includes(e.lane)) order.push(e.lane);
  return order;
}

function panelHeight(run) {
  return HEAD_H + laneOrder(run).length * LANE_H + GAP;
}

function isControl(name) {
  return CONTROL.has(name) || /^transfer_to_/.test(name || '');
}

function turnStarts(run) {
  const starts = [];
  const models = run.events.filter(e => e.k === 'm');
  let seen = 0;
  for (const n of run.turn_calls.slice(0, -1)) {
    seen += n;
    if (models[seen]) starts.push(models[seen].t0);
  }
  return starts;
}

function panel(f, { x, y, w, run, tmax, beat }) {
  const lanes = laneOrder(run);
  const left = x + LABEL_W;
  const width = w - LABEL_W;
  const px = t => left + (t / tmax) * width;
  f.beat(beat);
  f.text(x, y + 14, PATTERN_NAME[run.pattern] || run.pattern, { size: 12, weight: 700 });
  const verdict = run.passed ? '通过' : '失败';
  f.text(x + w, y + 14, `${run.calls} 次模型调用，输入 ${(run.in / 1000).toFixed(1)}k token，${verdict}`, { size: 11, anchor: 'end', hue: run.passed ? 'ink-soft' : 'rose' });
  const top = y + HEAD_H;
  lanes.forEach((lane, i) => {
    const ly = top + i * LANE_H;
    f.text(x + 8, ly + 17, LABEL[lane] || lane, { size: 11, hue: lane === 'router' || lane === 'coordinator' ? 'blue' : 'ink-soft' });
    f.rule(left, ly + LANE_H - 2, x + w, ly + LANE_H - 2, { hue: 'ink-mute', opacity: 0.3 });
  });
  for (const t of turnStarts(run)) {
    f.rule(px(t) - 1, top - 4, px(t) - 1, top + lanes.length * LANE_H, { hue: 'amber', dash: 'dashed' });
  }
  let n = 0;
  for (const e of run.events) {
    const ly = top + lanes.indexOf(e.lane) * LANE_H;
    if (e.k === 'm') {
      n += 1;
      const x0 = px(e.t0);
      const bw = Math.max(3, px(e.t1) - x0 - 1);
      f.rect(x0, ly + 3, bw, LANE_H - 7, { hue: 'plum' });
      const label = String(n);
      if (bw >= label.length * 7.2 + 8) f.text(x0 + bw / 2, ly + 16, label, { size: 11, anchor: 'middle', hue: 'plum' });
    } else {
      const tx = px(e.t0);
      const hue = isControl(e.name) ? 'amber' : 'green';
      f.mark(`M${(tx - 3).toFixed(1)} ${(ly + LANE_H - 2).toFixed(1)}l3 -5l3 5z`, { hue });
    }
  }
  return panelHeight(run);
}

function axis(f, { x, y, w, tmax, step }) {
  const left = x + LABEL_W;
  const width = w - LABEL_W;
  f.rule(left, y, x + w, y, { hue: 'ink' });
  for (let t = 0; t <= tmax + 1e-9; t += step) {
    const tx = left + (t / tmax) * width;
    f.rule(tx, y, tx, y + 4, { hue: 'ink' });
    f.text(tx, y + 17, `${t} s`, { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  return 24;
}

function legend(f, { x, y, turns }) {
  f.rect(x, y - 9, 16, 10, { hue: 'plum' });
  f.text(x + 22, y, '模型调用，按顺序编号', { size: 11, hue: 'ink-soft' });
  f.mark(`M${x + 236} ${y}l4 -7l4 7z`, { hue: 'green' });
  f.text(x + 250, y, '业务工具', { size: 11, hue: 'ink-soft' });
  f.mark(`M${x + 342} ${y}l4 -7l4 7z`, { hue: 'amber' });
  f.text(x + 356, y, 'task、转交、技能、提交', { size: 11, hue: 'ink-soft' });
  if (turns) {
    f.rule(x, y + 12, x + 16, y + 12, { hue: 'amber', dash: 'dashed' });
    f.text(x + 22, y + 16, '下一轮用户消息的起点', { size: 11, hue: 'ink-soft' });
  }
}

module.exports = { panel, panelHeight, axis, legend, laneOrder, PATTERN_NAME, LABEL_W };
