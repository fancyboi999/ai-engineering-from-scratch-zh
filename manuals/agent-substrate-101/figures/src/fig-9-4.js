'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const cases = load(path.join(__dirname, '../../capture/lab/summary/demos-x86.json')).failure_drill;
const names = ['删除 worker pod', '移除节点本地快照', '沙箱内进程退出', '超出内存上限', 'worker 池已满', 'Postgres 中断 30 s'];
const fixes = ['回退', '回退', '先挂起，再回退', '回退', '挂起另一个 actor', '恢复 Postgres'];
const two = value => value.toFixed(2);
const X0 = 218;
const PER_SECOND = 24;
const FIX_X = 368;
const OK_X = 552;

module.exports = figure('fig-9-4', {
  height: 330,
  title: '故障演练中的六类故障：从异常现象到首个正常响应',
  desc: `第二台 x86 服务器客户机上故障演练的六行实测结果。每行以玫红色条展示首个失败请求的耗时与状态码、执行的修复动作及其耗时，以及修复后首个返回 200 请求的耗时。${cases.map((c, i) => `${names[i]}：${two(c.symptoms[0].seconds)} s 返回 ${c.symptoms[0].http}，执行“${fixes[i]}”耗时 ${c.fix_seconds} s，随后 ${two(c.recoveries[0].seconds)} s 返回 200`).join('；')}。`,
}, f => {
  f.kicker(16, 28, '注入故障');
  f.kicker(X0, 28, '失败请求', { hue: 'rose' });
  f.kicker(FIX_X, 28, '修复动作', { hue: 'blue' });
  f.kicker(OK_X, 28, '首个 200', { hue: 'green' });
  cases.forEach((item, index) => {
    const y = 48 + index * 44;
    const symptom = item.symptoms[0];
    const recover = item.recoveries[0];
    f.rule(16, y - 8, 624, y - 8, { hue: 'ink-mute', opacity: 0.25 });
    f.text(16, y + 12, `${item.n}  ${names[index]}`, { size: 12, weight: 700 });
    f.rect(X0, y + 2, Math.max(3, symptom.seconds * PER_SECOND), 12, { fill: color('rose-fill'), stroke: color('rose-ink') });
    f.text(X0, y + 28, `${two(symptom.seconds)} s 返回 ${symptom.http}`, { size: 11, hue: 'rose' });
    f.text(FIX_X, y + 12, fixes[index], { size: 11.5, weight: 700, hue: 'blue' });
    f.text(FIX_X, y + 28, `${item.fix_seconds.toFixed(1)} s`, { size: 11, serif: true, hue: 'ink-soft' });
    f.dot(OK_X + 4, y + 8, { hue: 'green', r: 3.5 });
    f.text(OK_X + 14, y + 12, `${two(recover.seconds)} s`, { size: 12, weight: 700, hue: 'green' });
  });
  const base = 48 + cases.length * 44;
  f.rule(16, base - 8, 624, base - 8, { hue: 'ink-mute', opacity: 0.25 });
  f.text(X0, base + 10, '条形长度为收到失败响应前的耗时（0 至 5 s）', { size: 11, serif: true, hue: 'ink-soft' });
});
