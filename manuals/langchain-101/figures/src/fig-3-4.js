'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  ['参数错误', "{'command': {'command': 'ls'}}", 'ToolMessage，status 为 error', '模型再试一次', 'green'],
  ['未知的工具名', 'subtract，来自较早的部署', 'ToolMessage，status 为 error', '模型用文字回答', 'green'],
  ['异常，有中间件', 'ToolErrorMiddleware', 'ToolMessage，status 为 error', '内容来自 on_error', 'green'],
  ['异常，无中间件', 'RuntimeError', 'invoke 抛出异常', 'disk on fire', 'rose'],
];

module.exports = figure('fig-3-4', {
  height: 330,
  title: '各类工具失败对一次运行的影响',
  desc: '四行，每行从左侧的失败指向右侧的结果。参数错误，例如把 shell 命令当作对象而不是字符串传入，会变成 status 为 error 的 ToolMessage，模型再试一次。未知的工具名，即来自较早部署的 subtract，会变成 status 为 error 的 ToolMessage，模型用文字回答。有 ToolErrorMiddleware 时的异常，会变成 status 为 error 的 ToolMessage，内容是 on_error 返回的文字。没有中间件时的异常 RuntimeError disk on fire，会从 invoke 抛出，运行结束。',
}, f => {
  f.kicker(20, 20, '失败情形');
  f.kicker(380, 20, '运行得到的结果');
  rows.forEach(([kind, example, result, after, hue], i) => {
    const y = 34 + i * 70;
    const left = f.box({ x: 20, y, w: 250, h: 52, hue: 'grey', title: kind, sub: example, align: 'left' });
    const right = f.box({ x: 380, y, w: 240, h: 52, hue, title: result, sub: after, align: 'left' });
    f.arrow(left.right(), [right.x - 1, left.cy], { style: hue === 'rose' ? 'fail' : 'reply' });
  });
  f.text(20, 322, '前三种会继续进入下一次模型调用。最后一种会结束运行。', { size: 11, serif: true, hue: 'ink-soft' });
});
