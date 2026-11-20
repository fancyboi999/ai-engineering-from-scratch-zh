'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/structured-output-mac.json'));
const models = [['qwen3:0.6b', '0.6B, n=20'], ['qwen3:1.7b', '1.7B, n=10'], ['qwen3:4b-instruct-2507-q4_K_M', '4B, n=10'], ['qwen3:8b', '8B, n=10']];
const schemas = ['flat', 'nested', 'union', 'enum'];
const strategies = [['tool', 'ToolStrategy'], ['provider', 'ProviderStrategy']];
const hueOf = { valid: 'blue', retried_valid: 'amber', raised: 'rose', missing: 'rose' };
const count = (key, outcome) => data.cells[key].outcomes.filter(o => o === outcome).length;

module.exports = figure('fig-4-2b', {
  height: 400,
  title: '每次结构化输出运行的结果',
  desc: `400 次运行的点阵，在 Mac 上用 Ollama 里的四个 Qwen3 模型。行是 ToolStrategy 与 ProviderStrategy 下的 flat、nested、union 和 enum 四种 schema，列是 0.6B、1.7B、4B 和 8B 模型。蓝点表示第一次调用就有效，琥珀点表示重试后有效，玫红点表示抛出异常。ProviderStrategy 在每次 union 运行中都于构建时抛出异常，在 4B 模型上有 ${count('qwen3:4b-instruct-2507-q4_K_M enum provider', 'raised')} 次 enum 运行抛出异常，其余有效。ToolStrategy 在 0.6B 的 20 次 nested 运行中有 ${count('qwen3:0.6b nested tool', 'raised')} 次抛出异常，在 8B 的 10 次中有 ${count('qwen3:8b nested tool', 'raised')} 次。汇总文件共有 ${data.runs} 次运行，其余使用 AutoStrategy。`,
}, f => {
  const x0 = 170;
  const colW = 112;
  models.forEach(([, label], c) => f.text(x0 + c * colW + 48, 26, label, { size: 11, anchor: 'middle', hue: 'ink-soft' }));
  let y = 42;
  strategies.forEach(([strategy, strategyLabel], s) => {
    f.kicker(20, y + 12, strategyLabel, { hue: 'ink-soft' });
    y += 20;
    schemas.forEach(schema => {
      f.text(30, y + 14, schema, { size: 11.5 });
      f.rule(x0 - 8, y + 30, 620, y + 30, { hue: 'ink-mute', opacity: 0.25 });
      models.forEach(([model], c) => {
        const outcomes = data.cells[`${model} ${schema} ${strategy}`].outcomes;
        outcomes.forEach((outcome, i) => {
          const dx = (i % 10) * 10;
          const dy = outcomes.length > 10 ? (i < 10 ? 5 : 17) : 11;
          f.dot(x0 + c * colW + dx, y + dy, { hue: hueOf[outcome], r: 3.4 });
        });
      });
      y += 32;
    });
    y += 4;
  });
  const legend = [['第一次调用就有效', 'blue'], ['重试后有效', 'amber'], ['抛出异常', 'rose']];
  let lx = 20;
  legend.forEach(([label, hue]) => {
    f.dot(lx + 4, y + 16, { hue, r: 3.8 });
    const box = f.text(lx + 14, y + 20, label, { size: 11.5, hue });
    lx = box.right + 24;
  });
  f.text(20, y + 42, '每个点是在 Mac 上的一次运行。ProviderStrategy 的每次 union 运行都在 create_agent 中抛出异常。', { size: 11, serif: true, hue: 'ink-soft' });
});
