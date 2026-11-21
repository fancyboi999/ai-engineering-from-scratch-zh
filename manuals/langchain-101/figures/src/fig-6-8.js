'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-6-8', {
  height: 420,
  title: '节点一次尝试失败后的路径',
  desc: '一张决策图。节点的一次尝试抛出异常，或超过超时而以 NodeTimeoutError 失败。第一道判断是 retry_on 是否匹配且还有剩余尝试：是，则再次运行节点，如 flaky 在 retry_on 为 ValueError 时的第 1 到 3 次尝试。若没有剩余尝试，或异常不被 retry_on 接受，下一道判断是 error_handler。有处理器时，运行节点 __error_handler__flaky，它的 Command 转到 report。没有处理器时，invoke 抛出异常，如默认 retry_on 下第 1 次尝试就失败的 ValueError upstream failed。',
}, f => {
  const attempt = f.box({ x: 170, y: 14, w: 300, h: 44, hue: 'indigo', title: '节点一次尝试失败', sub: '抛出异常，或 NodeTimeoutError' });
  f.box({ x: 500, y: 14, w: 126, h: 44, hue: 'grey', title: '超时', sub: 'slow，0.05 s', titleSize: 12, pad: 6 });
  f.arrow([499, 36], [attempt.x + attempt.w + 1, 36], { style: 'fail' });
  const retry = f.box({ x: 170, y: 100, w: 300, h: 44, hue: 'grey', title: 'retry_on 匹配且还有尝试次数？', sub: '节点的 RetryPolicy' });
  f.arrow([320, 58], [320, 99], { style: 'fail' });
  f.path('M170 122 H150 V36 H169', { style: 'call' });
  f.text(20, 74, '是：再次运行', { size: 11.5, weight: 700 });
  f.text(20, 90, 'flaky，第 1 到 3 次尝试', { size: 11, serif: true, hue: 'ink-soft' });
  f.box({ x: 170, y: 196, w: 300, h: 44, hue: 'grey', title: '设置了 error_handler？', sub: '设在节点上，或经 set_node_defaults 设置' });
  f.arrow([320, 144], [320, 195], { style: 'call', label: '否', note: '默认 retry_on 下的 ValueError' });
  const node = f.box({ x: 20, y: 296, w: 280, h: 44, hue: 'indigo', title: '__error_handler__flaky', sub: "Command(goto='report')" });
  f.path(`M260 240 V268 H160 V${node.y - 1}`, { style: 'call' });
  f.text(150, 262, '是', { size: 11.5, weight: 700, anchor: 'end' });
  const raise = f.box({ x: 340, y: 296, w: 280, h: 44, hue: 'rose', title: 'invoke 抛出异常', sub: 'ValueError: upstream failed on try 1' });
  f.path(`M380 240 V268 H480 V${raise.y - 1}`, { style: 'fail' });
  f.text(490, 262, '否', { size: 11.5, weight: 700 });
  f.box({ x: 20, y: 364, w: 280, h: 44, hue: 'indigo', title: 'report', sub: 'status: recovered from flaky' });
  f.arrow([160, 340], [160, 363], { style: 'call' });
  f.text(340, 392, '只有左侧路径让运行继续。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(340, 408, '右侧路径让运行终止。', { size: 11, serif: true, hue: 'ink-soft' });
});
