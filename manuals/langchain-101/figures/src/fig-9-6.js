'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/prodapp-mac/summary/evals-mac.json'));

const ROWS = [
  ['test_eval[faq_return_window]', 'faq：退货期限'],
  ['test_eval[faq_shipping_time]', 'faq：送达时间'],
  ['test_eval[order_status]', '订单状态'],
  ['test_eval[order_unknown]', '未知订单'],
  ['test_eval[order_of_other_customer_is_hidden]', '其他客户的订单被隐藏'],
  ['test_eval[refund_approved_once]', '退款已批准一次'],
  ['test_eval[refund_rejected_has_no_side_effect]', '退款被拒绝，没有行'],
  ['test_eval[refund_asked_twice]', '退款被询问两次'],
  ['test_eval[refund_tool_replay_is_idempotent]', '退款工具重放'],
  ['test_eval[ticket_for_a_human]', '转人工工单'],
  ['test_eval[memory_saved_and_recalled]', '记忆已保存并召回'],
  ['test_eval[memory_of_other_user_is_invisible]', '其他用户的记忆'],
  ['test_eval[flaky_faq_is_retried]', 'flaky faq 被重试'],
  ['test_eval[hung_tool_times_out]', '挂起的工具超时'],
  ['test_eval[failed_ticket_is_not_retried]', '失败的工单不重试'],
  ['test_eval[primary_outage_uses_backup]', '主模型宕机，使用备用'],
  ['test_eval[runaway_loop_hits_call_limit]', '失控循环，调用上限'],
  ['test_eval[long_thread_is_summarized]', '长线程被摘要'],
  ['test_eval[new_message_while_waiting_for_approval]', '审批期间的消息'],
  ['test_eval[status_then_refund_in_one_thread]', '先查状态，再退款'],
  ['test_one_user_cannot_read_another_users_thread_or_memory', '隔离：线程、记忆'],
  ['test_missing_or_wrong_token_is_rejected', '隔离：错误 token 401'],
  ['test_kill_mid_refund_then_resume_refunds_once', '退款中途崩溃，恢复'],
  ['test_sigterm_lets_in_flight_run_finish', 'SIGTERM，运行完成'],
  ['test_sigterm_past_deadline_checkpoints_and_resumes', 'SIGTERM 超过期限'],
  ['test_two_workers_racing_on_one_thread_give_one_run_and_one_409', '两个 worker，一个线程'],
  ['test_langsmith_receives_nothing_unless_enabled', 'LangSmith 关闭'],
];
const LETTER = { ask: 'a', guess: 'g', zero: 'z', ticket: 't', nonote: 'n', nofaq: 'f', slow: 's', stream: 'c', harness: 'h', timing: 'w', other: 'o' };

const TOP = 62;
const ROW = 16;
const CELL = 18;
const GAP = 4;
const groups = [];
let x = 262;
for (const model of data.models) {
  const reps = Math.max(1, model.reps.length);
  groups.push({ model, x, reps });
  x += reps * (CELL + GAP) + 40;
}
const bottom = TOP + ROWS.length * ROW;
const CAUSE = {
  ask: '模型询问了金额和原因，没有提出 refund_order 调用',
  zero: '模型提出 amount_cents 0，审批人批准了它，于是写入了一行 0 cent 退款',
  ticket: '模型用 create_ticket 开了工单，没有调用 refund_order',
  nonote: '模型没有调用 save_note，所以没有可召回的记忆',
  nofaq: '模型没有调用 search_faq 就作答',
  harness: '测试在没有提出退款后发出 approve，得到 409，并把 409 响应体当作 SSE 解析',
  timing: '测试假定运行超过 3.5 s，而真实运行在 SIGTERM 之前就结束了',
  guess: '模型没有读取订单就编造了 amount_cents 10000',
  slow: '测试把整个运行限制在 5 s，而真实的模型调用花得更久',
  stream: 'uvicorn 在 10 s 上限处关闭了流，11.6 到 12.1 s 的运行在排空阶段完成',
};
const keys = Object.entries(data.causes.codes).map(([code, text]) => [code, CAUSE[code] || text]);

module.exports = figure('fig-9-6', {
  height: bottom + 40 + keys.length * 15 + 8,
  title: '三个真实模型上的同样 27 个测试',
  desc: `每行是参考服务的一个测试，每列是整个套件的一次运行。${data.models.map(m => `${m.label}：${m.reps.map(r => `${r.total} 个中通过 ${r.passed} 个`).join('，')}`).join('。')}。失败格中的字母标明原因，对照表在网格下方。`,
}, f => {
  for (const g of groups) {
    const width = g.reps * (CELL + GAP) - GAP;
    f.text(g.x + width / 2, 22, g.model.label.replace('Claude ', ''), { size: 11, anchor: 'middle', weight: 700 });
    g.model.reps.forEach((rep, i) => {
      const cx = g.x + i * (CELL + GAP) + CELL / 2;
      f.text(cx, 40, String(i + 1), { size: 11, anchor: 'middle', hue: 'ink-soft' });
      f.text(cx, 54, String(rep.passed), { size: 11, anchor: 'middle', hue: 'plum' });
    });
  }
  f.text(16, 40, '套件的第几次运行', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(16, 54, '该次运行通过的测试数', { size: 11, serif: true, hue: 'plum' });
  ROWS.forEach(([name, label], r) => {
    const y = TOP + r * ROW;
    if (r === 20) f.rule(16, y - 2, 630, y - 2, { hue: 'ink-mute', dash: 'dashed' });
    f.text(16, y + 11, label, { size: 11 });
    for (const g of groups) {
      const causes = data.causes[g.model.key] || {};
      g.model.reps.forEach((rep, i) => {
        const cx = g.x + i * (CELL + GAP);
        const outcome = rep.cases[name];
        if (!outcome) {
          f.rect(cx, y + 1, CELL, ROW - 2, { fill: 'none', stroke: color('ink-mute'), dash: 'dotted' });
          return;
        }
        if (outcome === 'passed') {
          f.rect(cx, y + 1, CELL, ROW - 2, { hue: 'plum' });
          return;
        }
        f.rect(cx, y + 1, CELL, ROW - 2, { hue: 'rose' });
        f.text(cx + CELL / 2, y + 11.5, LETTER[causes[name] || 'other'], { size: 11, anchor: 'middle', hue: 'rose', weight: 700 });
      });
    }
  });
  f.text(groups[groups.length - 1].x + 32, TOP + 21 * ROW + 12, '服务测试，', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(groups[groups.length - 1].x + 32, TOP + 22 * ROW + 12, '未在 Claude 上运行', { size: 11, serif: true, hue: 'ink-soft' });
  keys.forEach(([code, text], k) => {
    const y = bottom + 30 + k * 15;
    f.text(16, y, LETTER[code], { size: 11, weight: 700, hue: 'rose' });
    f.text(32, y, text, { size: 11, serif: true, hue: 'ink-soft', max: 600 });
  });
});
