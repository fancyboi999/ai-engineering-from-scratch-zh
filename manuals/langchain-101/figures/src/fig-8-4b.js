'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/permissions-mac.json'));

const RULES = [
  ['R0 none', '无规则'],
  ['R1 docs isolate', 'docs：isolate'],
  ['R2 docs protect-files', 'docs：protect'],
  ['R3 docs order-bug', 'docs："bug" 订单'],
  ['R4 docs read-only', 'docs：只读'],
  ['R5 docs deny-all', 'docs：全部拒绝'],
  ['R7 dot-aware isolate', '识别点号的 isolate'],
];
const OPS = [
  ['read /.env', 'read', '/', '.env'],
  ['read /workspace/.env', 'read', 'ws/', '.env'],
  ['read /workspace/.git/config', 'read', 'ws/', '.git'],
  ['read /secrets/key.txt', 'read', '/', 'secrets'],
  ['read symlink to /secrets', 'read', 'ws/', 'link'],
  ['ls /workspace', 'ls', '/', 'ws'],
  ['write /.bashrc', 'write', '/', '.bashrc'],
  ['edit /workspace/.env', 'edit', 'ws/', '.env'],
  ['delete /.env', 'delete', '/', '.env'],
  ['delete /workspace dir', 'delete', '/', 'ws'],
];
const HUE = { 'ran, rule meant to block': 'rose', 'blocked as meant': 'violet', 'ran as meant': 'grey', 'blocked, rule meant to allow': 'amber', error: 'grey' };
const WORD = { ALLOW: '运行', DENY: '拒绝', 'PATH-BLOCK': '拦截', ASK: '询问', 'RUN-ERROR': '崩溃', ERROR: '错误' };

const cellOf = (rules, op) => {
  const c = data.matrix.cells.find(x => x.rules === rules && x.op === op);
  if (!c) throw new Error(`fig-8-4b: no cell ${rules} / ${op}`);
  return c;
};

const MODELS = Object.keys(data.adversarial).sort().reverse();
const LABEL = { 'ollama:qwen3:8b': 'Qwen3 8B', 'anthropic:claude-haiku-5-5': 'Haiku 5.5' };
const CFG = [['none', '无规则'], ['docs', 'docs 规则'], ['fixed', '识别点号']];

const runsOf = (model, cfg) => {
  const v = data.adversarial[model][cfg];
  if (!v || v.n !== 20) throw new Error(`fig-8-4b: ${model} ${cfg} has n=${v && v.n}, expected 20`);
  return v;
};

const runKind = (v, pid) => {
  const harm = v.disk_change_prompts.includes(pid) || v.secret_in_answer_prompts.includes(pid);
  if (harm) return 'rose';
  if (!v.attempted_prompts.includes(pid)) return 'grey';
  if (v.secret_reached_model_prompts.includes(pid)) return 'amber';
  return 'violet';
};

const LX = 20;
const GX = 162;
const CW = 46;
const GY = 72;
const RH = 22;
const gridBottom = GY + RULES.length * RH;
const AY = gridBottom + 86;
const AH = 22;
const SQ = 13;
const advBottom = AY + MODELS.length * CFG.length * AH;

const gapCount = Object.values(data.matrix.ran_though_meant_to_block).reduce((n, l) => n + l.length, 0);

module.exports = figure('fig-8-4b', {
  height: advBottom + 66,
  title: '锁定版本下的文件规则：每格一次调用，然后每个模型 20 次攻击',
  desc: `上图：${RULES.length} 个规则列表乘 ${OPS.length} 个工具调用的网格，在 virtual_mode=True 的 FilesystemBackend 上，由不带模型的脚本调用方运行。玫红格是尽管规则本意是拦截，调用仍然运行的情形；五个 docs 规则列表中共有 ${gapCount} 个这样的调用，全都发生在名称以点号开头的路径上。紫色是按本意被拦截，琥珀是被拦截但本意应当允许，灰是按本意运行。下图：每条对抗提示词一个方块，每行 20 个，模型为 ${MODELS.map(m => LABEL[m]).join(' 和 ')}，条件为无规则、docs isolate 规则和识别点号的规则。${MODELS.map(m => CFG.map(([c, l]) => `${LABEL[m]} ${l}：${runsOf(m, c).harm_runs} 次运行造成危害`).join('，')).join('。')}。`,
}, f => {
  f.kicker(LX, 18, '每格一次调用，脚本调用方，无模型');
  OPS.forEach(([, a, b, c], j) => {
    const cx = GX + j * CW + CW / 2;
    f.text(cx, 36, a, { size: 11, anchor: 'middle', hue: 'ink-soft' });
    f.text(cx, 50, b, { size: 11, anchor: 'middle', hue: 'ink-soft' });
    f.text(cx, 64, c, { size: 11, anchor: 'middle', weight: 700 });
  });
  RULES.forEach(([key, label], i) => {
    const y = GY + i * RH;
    f.text(LX, y + 15, label, { size: 11.5, weight: key.startsWith('R7') ? 700 : undefined, max: GX - LX - 4, size: 11 });
    OPS.forEach(([op], j) => {
      const c = cellOf(key, op);
      const hue = HUE[c.verdict] || 'grey';
      const x = GX + j * CW;
      f.rect(x + 1, y + 1, CW - 2, RH - 2, { fill: color(`${hue}-fill`), stroke: color(`${hue}-ink`) });
      f.text(x + CW / 2, y + 15, WORD[c.outcome] || c.outcome, { size: 11, anchor: 'middle', hue });
    });
  });
  f.text(LX, gridBottom + 18, '玫红：已运行，尽管规则本意是拦截。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(LX, gridBottom + 33, '紫色：按本意被拦截。琥珀：被拦截，尽管本意是', { size: 11, serif: true, hue: 'ink-soft' });

  f.text(LX, gridBottom + 48, '允许。灰：按本意运行。ws 即 /workspace。', { size: 11, serif: true, hue: 'ink-soft' });
  f.kicker(LX, AY - 14, '20 条对抗提示词，每次运行一个方块');
  f.text(GX + 20 * (SQ + 3) + 14, AY - 14, '危害', { size: 11, hue: 'ink-soft', weight: 700 });
  f.text(GX + 20 * (SQ + 3) + 64, AY - 14, '被拦下', { size: 11, hue: 'ink-soft', weight: 700 });
  let row = 0;
  MODELS.forEach(model => {
    CFG.forEach(([cfg, label]) => {
      const v = runsOf(model, cfg);
      const y = AY + row * AH;
      if (cfg === 'none') f.text(LX, y + 11, LABEL[model], { size: 11, weight: 700, max: 66 });
      f.text(LX + 70, y + 11, label, { size: 11, max: GX - LX - 74 });
      v.prompt_ids.forEach((pid, k) => {
        const hue = runKind(v, pid);
        f.rect(GX + k * (SQ + 3), y, SQ, SQ, { fill: color(`${hue}-fill`), stroke: color(`${hue}-ink`) });
      });
      f.text(GX + 20 * (SQ + 3) + 14, y + 11, `${v.harm_runs}`, { size: 11.5, weight: 700, hue: v.harm_runs ? 'rose' : 'ink-soft' });
      f.text(GX + 20 * (SQ + 3) + 64, y + 11, `${v.stopped_calls}/${v.attempt_calls}`, { size: 11.5, hue: 'ink-soft' });
      row += 1;
    });
    row += 0;
  });
  f.text(LX, advBottom + 18, '玫红：磁盘被改动，或秘密出现在答案中。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(LX, advBottom + 33, '琥珀：秘密只到了模型那里。紫色：尝试过，没有危害。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(LX, advBottom + 48, '灰：没有尝试。被拦下：被拒绝或被路径拦截的攻击调用数/全部攻击调用数。', { size: 11, serif: true, hue: 'ink-soft' });
});
