'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/store-namespace-mac.json'));

const CONFIGS = [
  ['shared-docs', '文档示例', ["namespace=lambda _rt:", "('memories',)"], ['alice 写入 ("memories")', 'bob 读取 ("memories")']],
  ['per-user', '按用户', ["namespace=lambda rt:", "('users', rt.context.user_id)"], ['alice 写入 ("users","alice")', 'bob 读取 ("users","bob")']],
  ['per-user+naive-recall', '按用户 + recall 工具', ['同样的文件，另加一个工具，', "搜索 ('users',)"], ['bob 请求 /memories/；', '模型只列出他自己的文件夹']],
  ['per-user+naive-recall-asked', '同上，bob 要求使用 recall', ['同样的文件和工具；', 'bob 说：用你的 recall 工具'], ['recall 读取 ("users",)，', '其下的每个用户']],
];
const STORES = [['memory', 'InMemoryStore'], ['postgres', 'PostgresStore']];

const sessions = (store, cfg) => {
  const key = `${store}|${cfg}`;
  const v = data.agent[key];
  if (!v || v.n !== 10) throw new Error(`fig-5-4b: ${key} has n=${v && v.n}, expected 10`);
  return v;
};

const LX = 20;
const SX = 262;
const SQ = 17;
const BLOCK = 92;
const TOP = 40;

module.exports = figure('fig-5-4b', {
  height: TOP + CONFIGS.length * BLOCK + 58,
  title: '两个用户、一个 deep agent，以及记忆文件存放的位置',
  desc: `StoreBackend 在 /memories/ 下的四种命名空间设置，每种在 InMemoryStore 和 PostgresStore 上各运行 10 个会话，模型为 Qwen3 8B。每个会话里，alice 先让 agent 保存一个储物柜密码，然后 bob 在新线程里索要储物柜密码：前三行通过 /memories/ 下的文件，最后一行通过 recall 工具。每个会话一个方块。${CONFIGS.map(([c, l]) => `${l}：${STORES.map(([s, n]) => `${n} 上，已保存的 ${sessions(s, c).saved} 个密码中有 ${sessions(s, c).leaked_to_bob} 个被告诉了 bob`).join('，')}`).join('。')}。`,
}, f => {
  f.kicker(LX, 18, '命名空间工厂');
  f.kicker(SX, 18, '每个会话一个方块，先 alice 后 bob');
  CONFIGS.forEach(([cfg, label, code, flow], i) => {
    const y = TOP + i * BLOCK;
    f.text(LX, y + 14, label, { size: 12.5, weight: 700 });
    f.text(LX, y + 30, code[0], { size: 11, hue: 'ink-soft' });
    f.text(LX, y + 44, code[1], { size: 11, hue: 'ink-soft' });
    f.text(LX, y + 62, flow[0], { size: 11, serif: true, hue: 'ink-soft' });
    f.text(LX, y + 76, flow[1], { size: 11, serif: true, hue: 'ink-soft' });
    STORES.forEach(([store, name], k) => {
      const v = sessions(store, cfg);
      const ry = y + 6 + k * 34;
      f.text(SX, ry + 13, name, { size: 11, hue: 'ink-soft' });
      v.per_session.forEach((s, j) => {
        let hue = 'violet';
        if (!s.saved) hue = 'grey';
        else if (s.leaked) hue = 'rose';
        else if (s.visible) hue = 'amber';
        f.rect(SX + 104 + j * (SQ + 3), ry, SQ, SQ, { fill: color(`${hue}-fill`), stroke: color(`${hue}-ink`) });
      });
      f.text(SX + 104 + 10 * (SQ + 3) + 6, ry + 13, `${v.leaked_to_bob}/${v.saved}`, { size: 11.5, weight: 700, hue: v.leaked_to_bob ? 'rose' : 'ink-soft' });
    });
    if (i) f.rule(LX, y - 6, 620, y - 6, { hue: 'ink-mute', dash: 'dotted' });
  });
  const by = TOP + CONFIGS.length * BLOCK + 8;
  f.text(LX, by + 4, '玫红：bob 的回答里含有 alice 的密码。琥珀：bob 的工具够得着它，但没有使用。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(LX, by + 19, '紫色：bob 够不着它。灰色：alice 保存失败。计数为“被告知数/已保存数”。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(LX, by + 34, 'Qwen3 8B 在 Mac 上运行，温度 0，每个会话使用一个全新的 store。', { size: 11, serif: true, hue: 'ink-soft' });
});
