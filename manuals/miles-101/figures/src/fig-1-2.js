'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-1-2', {
  height: 330,
  title: 'engine 退出不会停止任务',
  desc: '同一时间轴上的两次运行。未启用 watchdog 时，engine 启动即退出。随后 rollout loop 在 63 分钟内记录了 200,533 条 HTTP 503 错误，GPU 一直空闲，直到我们停止容器。启用 watchdog.sh 后，测试容器连续输出同类错误，连续六次检查都发现超过 100 条错误后，在 183 s 时停止。一次健康的 16 答案运行中，这类错误会成批出现，最长持续 60 s，其中两次仅相隔 45 s。回放该运行时，六次检查会误停一半以上的情况，十次检查则不会误停，因此 watchdog 默认使用十次。',
}, f => {
  const x0 = 150;
  const w = 470;
  const px = minutes => x0 + (minutes / 65) * w;
  f.kicker(20, 28, '引擎停止后的分钟数');
  for (const t of [0, 15, 30, 45, 60]) {
    f.rule(px(t), 232, px(t), 240, { hue: 'ink' });
    f.text(px(t), 254, String(t), { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }

  f.text(20, 82, '未启动 watchdog', { size: 12, weight: 700 });
  f.text(20, 100, '任务继续运行', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(px(0), 62, px(63) - px(0), 44, { hue: 'rose', dash: 'dashed' });
  f.text(px(31.5), 82, '/generate 返回 200,533 条 HTTP 503', { size: 11.5, anchor: 'middle', hue: 'rose', weight: 700 });
  f.text(px(31.5), 98, 'GPU 空闲，任务未报告失败', { size: 11, anchor: 'middle', serif: true, hue: 'ink-soft' });
  f.text(px(63), 124, '我们在第 63 分钟停止任务', { size: 11, anchor: 'end', serif: true, hue: 'ink-soft' });

  f.text(20, 172, 'watchdog.sh 测试', { size: 12, weight: 700 });
  f.text(20, 190, '需要连续 6 次错误检查', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(px(0), 152, px(3.05) - px(0), 44, { hue: 'rose', dash: 'dashed' });
  f.arrow([px(3.05) + 2, 174], [px(9), 174], { style: 'state' });
  f.text(px(9) + 2, 214, 'watchdog 停止容器', { size: 11, serif: true, hue: 'amber' });
  f.box({ x: px(9) + 2, y: 152, w: 250, h: 44, hue: 'amber', title: '183 s 后以状态码 1 退出', sub: ['连续 6 次检查均超过 100 条错误'] });

  f.text(20, 290, '无人值守运行前都要启动 watchdog。任务本身不会自动失败退出。', { size: 12, serif: true });
  f.text(20, 312, '健康训练的错误峰值间隔为 45 s，因此连续检查 6 次不够。请设置为 10 次。', { size: 12, serif: true, hue: 'ink-soft' });
});
