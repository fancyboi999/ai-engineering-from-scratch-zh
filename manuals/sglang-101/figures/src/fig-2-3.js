'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const LEFT = 70;
const SCALE = 0.12;
const POOL = 4096;
const px = tokens => LEFT + tokens * SCALE;

module.exports = figure('fig-2-3', {
  height: 250,
  title: "4,096 token 能装五个请求，装不下六个",
  desc: "两条表示 4,096-token KV 池。第一条五请求各预留 256 prompt 加 512 输出，共 3,840 token，余 256。第二条第六个请求还需 768，超过池末端 512 token，因此调度器让它等待。",
}, f => {
  const end = px(POOL);
  f.rule(end, 30, end, 176, { hue: 'ink', dash: 'dashed' });
  f.text(end + 4, 26, "池末端", { size: 11, hue: 'ink-soft' });

  f.kicker(LEFT, 26, "准入：五个请求");
  for (let i = 0; i < 5; i += 1) {
    const x = px(i * 768);
    f.rect(x, 36, 256 * SCALE, 28, { hue: 'green' });
    f.rect(x + 256 * SCALE, 36, 512 * SCALE, 28, { hue: 'amber' });
  }
  f.rect(px(3840), 36, 256 * SCALE, 28, { hue: 'grey' });
  f.text(LEFT, 84, "每请求预留 256 输入 + 512 输出 = 768 token", { size: 11, serif: true, hue: 'ink-soft' });

  f.kicker(LEFT, 120, "第六个请求需总计 4,608");
  for (let i = 0; i < 5; i += 1) {
    const x = px(i * 768);
    f.rect(x, 130, 256 * SCALE, 28, { hue: 'green' });
    f.rect(x + 256 * SCALE, 130, 512 * SCALE, 28, { hue: 'amber' });
  }
  f.rect(px(3840), 130, 256 * SCALE, 28, { hue: 'green' });
  f.rect(end, 130, 512 * SCALE, 28, { fill: color('rose-fill'), stroke: color('rose-ink'), dash: 'dashed' });

  f.rule(LEFT, 182, end, 182, { hue: 'ink' });
  f.rule(LEFT, 178, LEFT, 186, { hue: 'ink' });
  f.rule(px(3840), 178, px(3840), 186, { hue: 'ink' });
  f.rule(end, 178, end, 186, { hue: 'ink' });
  f.text(LEFT, 200, '0', { size: 11, hue: 'ink-soft', anchor: 'middle' });
  f.text(px(3840) - 3, 200, '3,840', { size: 11, hue: 'ink-soft', anchor: 'end' });
  f.text(end + 3, 200, '4,096', { size: 11, hue: 'ink-soft' });

  const legend = [['green', "Prompt KV", 70], ['amber', "预留输出", 190], ['grey', '空闲', 350], ['rose', "放不下", 430]];
  for (const [hue, label, x] of legend) {
    f.rect(x, 222, 14, 12, { hue, dash: hue === 'rose' ? 'dashed' : undefined });
    f.text(x + 20, 232, label, { size: 11, serif: true, hue: 'ink-soft' });
  }
});
