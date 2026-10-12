'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const plan = [
  ['+', 'kits: source $CAPTURE/fixtures/kits/hello-mixin'],
  [' ', 'workspace: $CAPTURE/fixtures/env (not recorded as applied, needs your approval)'],
  ['+', 'env: GREETING: hello'],
  ['+', 'sandbox: name m101-env, agent shell'],
  ['+', 'ports: sandbox 8080, protocol tcp4, host 18083'],
  ['+', 'lifecycle: initialize: command echo init, workdir $CAPTURE/fixtures/env'],
  [' ', 'Plan: + 5 to add, ~ 0 to change, - 0 to destroy.'],
  [' ', '以你的权限在本机、沙箱外执行命令'],
];

module.exports = figure('fig-4-4', {
  height: 600,
  title: '环境文件成为计划、批准与状态记录',
  desc: '顶部录制sbxenv.yaml的agent、workspace、args、kits、env、lifecycle、ports。env plan箭头到八行加号计划，包括需批准工作区、总数、宿主命令在沙箱外的warning。下方两分支：左create批准写sbx状态目录记录，后续仅变化行；右greeting=servus计划因未应用仍全部添加。',
}, f => {
  f.kicker(20, 18, '文件（capture/fixtures/env/sbxenv.yaml）');
  const file = f.box({ x: 20, y: 26, w: 600, h: 80, hue: 'green', title: 'sbxenv.yaml', sub: ['schemaVersion 1, name m101-env, agent shell, workspace ., args greeting (default hello),', 'kits ../kits/hello-mixin, env GREETING: ${{ env.args.greeting }},', 'lifecycle initialize echo init, ports sandbox 8080 host 18083'], align: 'left' });
  f.arrow([file.cx, 106], [file.cx, 137], { style: 'call', label: 'sbx env plan ./fixtures/env' });

  f.rect(20, 138, 600, 222, { fill: color('teal-fill'), stroke: color('teal-ink') });
  f.text(32, 158, 'ENVIRONMENT PLAN m101-env (14-env-plan.txt)', { size: 12, weight: 700, hue: 'teal' });
  plan.forEach(([sign, text], index) => {
    const y = 166 + index * 22;
    f.rect(32, y, 576, 20, { fill: color('paper'), stroke: color('panel-edge') });
    if (sign !== ' ') f.text(40, y + 14, sign, { size: 11, weight: 700, hue: 'teal' });
    f.text(54, y + 14, text, { size: 11 });
  });
  f.text(32, 354, '边栏：+添加、~改变、-销毁、>运行、!遗忘（help-sbx sbx env）', { size: 11, serif: true, hue: 'ink-soft' });

  f.kicker(60, 392, '批准后（未录制）');
  f.kicker(380, 392, '改变一个参数（已录制）');
  f.box({ x: 20, y: 402, w: 280, h: 48, hue: 'grey', title: 'sbx env create 回答 y', sub: '每次调用都问宿主命令', titleSize: 12, pad: 8 });
  const state = f.box({ x: 20, y: 480, w: 280, h: 48, hue: 'teal', title: '按环境的状态记录', sub: '位于 sbx 状态目录，不在文件旁', titleSize: 12, pad: 8 });
  f.box({ x: 20, y: 536, w: 280, h: 48, hue: 'teal', dash: 'dashed', title: '后续计划只显示变化', sub: '~ GREETING: hello -> servus，无其他变化', titleSize: 12, pad: 8 });
  f.arrow([40, 360], [40, 401], { style: 'call', label: 'sbx env create' });
  f.arrow([40, 450], [40, 479], { style: 'write', label: '记录计划' });
  f.path(`M${state.cx} 528 V535`, { style: 'state', head: false });
  f.box({ x: 340, y: 402, w: 280, h: 48, hue: 'blue', title: 'sbx env plan --env-arg greeting=servus', sub: '参数替换默认 hello', titleSize: 11.5, pad: 8 });
  f.box({ x: 340, y: 480, w: 280, h: 48, hue: 'teal', title: '+ env: GREETING: servus', sub: '仍 + 5 to add，未应用任何项', titleSize: 12, pad: 8 });
  f.arrow([360, 360], [360, 401], { style: 'call', label: '一个参数' });
  f.arrow([360, 450], [360, 479], { style: 'reply', packet: false });
});
