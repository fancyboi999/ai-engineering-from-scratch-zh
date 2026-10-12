'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  { y: 50, hue: 'olive', question: 'preempt_yolo hook', ask: 'log-hook.sh，每次调用', style: 'reply', outHue: 'grey', out: 'allow，仅建议', detail: ['pre_tool_use_pre_yolo, allowed: true', '此处 deny/ask 会结束判断'], next: '继续' },
  { y: 122, hue: 'teal', question: '匹配 deny？', ask: 'shell:cmd=rm*', style: 'fail', outHue: 'rose', out: 'rm -rf work/m101-nothing', detail: ['Tool \'shell\' is denied by', 'permissions configuration.'], next: 'no' },
  { y: 194, hue: 'teal', question: '匹配 allow？', ask: 'shell:cmd=echo*', style: 'effect', outHue: 'olive', out: '执行 echo m101-ok', detail: ['两模式结果 m101-ok'], next: 'no' },
  { y: 266, hue: 'teal', question: '匹配 ask？', ask: 'guarded.yaml 没有', next: 'no' },
  { y: 338, hue: 'amber', question: '按标签应用安全模式', ask: 'pwd 标签 safe', style: 'effect', outHue: 'olive', out: 'restricted：执行 pwd', detail: ['结果 $CAPTURE'], next: 'strict' },
  { y: 410, hue: 'amber', question: 'strict：询问用户', ask: '先默认 hooks，此处无', style: 'fail', outHue: 'rose', out: '--exec 下无终端', detail: ['The user rejected the tool call.'] },
];

module.exports = figure('fig-5-5', {
  height: 482,
  title: '三次 shell 调用经过批准顺序',
  desc: '从上向下是guarded.yaml的shell批准顺序。preempt_yolo的log-hook.sh每次回allow，仅建议。deny shell:cmd=rm*拒绝rm -rf work/m101-nothing；allow shell:cmd=echo*在两模式执行echo。无ask模式。pwd标签safe由安全模式决定：restricted执行并输出目录，strict询问，无终端--exec转为用户拒绝。',
}, f => {
  f.kicker(20, 18, 'guarded.yaml 的 shell，--safety strict/restricted');
  f.kicker(20, 36, '20-strict.ndjson, 20-restricted.ndjson');
  rows.forEach((row, index) => {
    const ask = f.box({ x: 20, y: row.y, w: 250, h: 52, hue: row.hue, title: row.question, sub: row.ask, titleSize: 12 });
    if (row.out) {
      const out = f.box({ x: 300, y: row.y, w: 320, h: 52, hue: row.outHue, title: row.out, sub: row.detail, titleSize: 12 });
      f.arrow(ask.right(), [out.x - 1, ask.cy], { style: row.style });
    }
    if (index < rows.length - 1) f.arrow([80, row.y + 52], [80, row.y + 71], { style: 'call', label: row.next, labelSize: 11 });
  });
});
