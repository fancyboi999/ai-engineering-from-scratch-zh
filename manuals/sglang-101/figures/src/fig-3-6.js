'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-6', {
  height: 290,
  title: "Mamba 前缀只能从快照恢复",
  desc: "缓存会话用 0 至 2,048-token 带表示，每 256 token 有 Mamba 状态快照。新请求匹配前 1,800 token。全注意力 KV 覆盖全部 1,800 token，但递归状态只在快照处存在，因此从 1,792-token 快照恢复，重新 prefill 1,792 至 1,800。",
}, f => {
  const scale = 560 / 2048;
  f.kicker(20, 20, "缓存会话 · 2,048 token");
  f.rect(40, 32, 560, 26, { hue: 'green' });
  for (let token = 0; token <= 2048; token += 256) {
    const x = 40 + token * scale;
    f.rule(x, 58, x, 70, { hue: 'teal', width: 2 });
    if (token % 512 === 0) f.text(x, 86, token.toLocaleString('en-US'), { size: 11, anchor: 'middle', hue: 'ink-mute' });
  }
  f.text(40, 106, "青绿刻度：每 256 token 的 Mamba 状态快照", { size: 11, serif: true, hue: 'ink-soft' });
  f.kicker(20, 140, "新请求 · 匹配 1,800 token");
  const resume = 40 + 1792 * scale;
  const match = 40 + 1800 * scale;
  f.rect(40, 152, resume - 40, 26, { hue: 'green' });
  f.rect(resume, 152, match - resume, 26, { hue: 'plum' });
  f.rule(resume, 146, resume, 186, { hue: 'teal', width: 2 });
  f.text(40, 204, "复用：截至最后快照的 1,792 token", { size: 11.5, hue: 'green' });
  f.text(40, 224, "重新 prefill：1,792 至 1,800 的八个 token", { size: 11.5, hue: 'plum' });
  f.text(40, 256, "每个 token 都有全注意力 KV。递归状态", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(40, 274, "只存在于保存了快照的位置。", { size: 11, serif: true, hue: 'ink-soft' });
});
