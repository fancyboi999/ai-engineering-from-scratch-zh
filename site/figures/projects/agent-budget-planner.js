(function () {
  'use strict';
  const unit = '教学单位';
  const number = (key, label, value) => ({ key, label, type: 'number', value, min: 0, step: 1 });
  const integer = (value, label) => {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(label + '必须是非负安全整数。');
    return value;
  };
  const copy = value => JSON.parse(JSON.stringify(value));
  const item = (id, label, value, detail, tone = 'neutral') => ({ id, label, value, detail, tone });
  const lane = (id, label, items) => ({ id, label, items });
  const finish = frames => Object.assign({}, frames[frames.length - 1], { frames });
  const held = state => Object.values(state.holds).reduce((sum, value) => sum + value, 0);
  const available = state => state.limit - state.spent - held(state);
  const bars = state => [
    { label: '已花费', value: state.spent, max: state.limit, unit },
    { label: '已预留', value: held(state), max: state.limit, unit },
    { label: '可用', value: available(state), max: state.limit, unit },
  ];
  function initialLedger(v, holdKey) {
    const state = {
      limit: integer(v.limit, '限额'), spent: integer(v.spent, '先前花费'),
      holds: { A: integer(v[holdKey], '现有预留 A') }, closed: [],
    };
    integer(state.spent + held(state), '已承诺额度');
    if (available(state) < 0) throw new Error('先前花费与现有预留总额不能超出限额。');
    return state;
  }
  function ledgerLanes(state, pending = []) {
    return [
      lane('spent', '已花费', [item('prior-spend', '先前用量', state.spent, unit)]),
      lane('held', '已预留', Object.entries(state.holds).map(([id, amount]) => item('hold-' + id, '请求 ' + id, amount, unit, 'warn'))),
      lane('available', '可用', [item('free-capacity', '未分配额度', available(state), unit)]),
      lane('pending', '请求', pending),
    ];
  }
  function ledgerFrame(label, explanation, state, pending, extra) {
    return Object.assign({ label, explanation, summary: label, lanes: ledgerLanes(state, pending), bars: bars(state), receipt: copy(state) }, extra);
  }

  window.AIFSProjectFigures.register('pj-agent-budget-planner-1', {
    title: '用整数教学单位估算请求成本',
    caption: '估算由 prompt 成本和输出上限成本组成。这里的费率使用任意设定的教学单位。',
    lab: {
      question: '如果输出上限为零，请求的哪部分仍有成本？',
      controls: [number('inputTokens', '输入 token 数', 120), number('outputLimit', '输出上限（token）', 40), number('inputRate', '输入费率（教学单位/token）', 2), number('outputRate', '输出费率（教学单位/token）', 5)],
      scenarios: [{ label: '默认请求', values: {} }, { label: '无输出 token', values: { outputLimit: 0 } }, { label: '更大的输出上限', values: { outputLimit: 400 } }],
      calculate(v) {
        const inputTokens = integer(v.inputTokens, '输入 token 数'), outputLimit = integer(v.outputLimit, '输出上限');
        const inputRate = integer(v.inputRate, '输入费率'), outputRate = integer(v.outputRate, '输出费率');
        const inputCost = integer(inputTokens * inputRate, '输入乘积'), outputCost = integer(outputLimit * outputRate, '输出乘积');
        const total = integer(inputCost + outputCost, '总估算值');
        const operands = [item('prompt', '输入 token 数', inputTokens, 'tokens'), item('input-rate', '输入费率', inputRate, unit + '/token'), item('output', '输出上限', outputLimit, 'tokens'), item('output-rate', '输出费率', outputRate, unit + '/token')];
        const inputTerm = item('input-term', 'prompt 成本', inputCost, unit, 'active');
        const outputTerm = item('output-term', '输出上限成本', outputCost, unit, 'active');
        return finish([
          { label: '验证操作数', explanation: '四个操作数都必须是非负整数。上限是 token 界限，不是实际回执。', summary: '两个 token 计数和两个整数费率', lanes: [lane('operands', '操作数', operands), lane('products', '乘积', [])], formula: '输入 token 数 × 输入费率 + 输出上限 × 输出费率' },
          { label: '计算 prompt 费用', explanation: '即使输出上限为零，输入 token 仍计费。', summary: '已计算 prompt 成本', lanes: [lane('operands', '操作数', operands), lane('products', '乘积', [inputTerm])], links: [{ from: 'prompt', to: 'input-term', label: '乘以输入费率' }], formula: `${inputTokens} × ${inputRate} = ${inputCost} ${unit}`, metrics: [{ label: 'prompt 成本', value: inputCost + ' ' + unit }] },
          { label: '计算输出上限费用', explanation: '将允许的最大输出 token 数乘以输出费率。此时尚未观察到实际用量。', summary: '已计算两项成本', lanes: [lane('operands', '操作数', operands), lane('products', '乘积', [inputTerm, outputTerm])], links: [{ from: 'output', to: 'output-term', label: '乘以输出费率' }], formula: `${outputLimit} × ${outputRate} = ${outputCost} ${unit}`, metrics: [{ label: 'prompt 成本', value: inputCost }, { label: '输出上限成本', value: outputCost }] },
          { label: '相加得到估算值', explanation: `请求需要 ${total} ${unit} 的上限。后续结算使用实际回执。`, summary: '估算上限：' + total + ' ' + unit, lanes: [lane('products', '成本组成', [inputTerm, outputTerm]), lane('estimate', '估算', [item('total', '请求上限', total, unit, 'good')])], links: [{ from: 'input-term', to: 'total', label: '加上 prompt 成本' }, { from: 'output-term', to: 'total', label: '加上输出上限成本' }], formula: `${inputCost} + ${outputCost} = ${total} ${unit}`, metrics: [{ label: '估算上限', value: total + ' ' + unit }], receipt: { unit: 'teaching_units', input_cost: inputCost, output_ceiling_cost: outputCost, estimate: total } },
        ]);
      },
    },
  });

  window.AIFSProjectFigures.register('pj-agent-budget-planner-2', {
    title: '分派前预留额度',
    caption: '准入计入花费与现有预留。拒绝预留时保留原账本。',
    lab: {
      question: '计入花费和现有预留后，请求的预留是否能放进剩余额度？',
      controls: [number('limit', '限额（教学单位）', 100), number('spent', '先前花费', 20), number('existingHold', '现有预留 A', 30), { key: 'requestId', label: '新请求 ID', type: 'text', value: 'B' }, number('amount', '请求的预留金额', 60)],
      scenarios: [{ label: '额度不足', values: {} }, { label: '占满剩余额度', values: { amount: 50 } }, { label: '重复请求 ID', values: { requestId: 'A', amount: 1 } }, { label: '零预留', values: { amount: 0 } }],
      calculate(v) {
        const before = initialLedger(v, 'existingHold');
        const amount = integer(v.amount, '预留金额');
        const id = v.requestId;
        const validId = typeof id === 'string' && id.length > 0 && !Object.hasOwn(before.holds, id) && !before.closed.includes(id);
        const request = item('new-request', '请求 ' + (id || '（空）'), amount, '请求金额：' + unit, 'active');
        const frames = [ledgerFrame('读取账本', `${before.limit} − ${before.spent} − ${held(before)} = ${available(before)} ${unit} 可用。现有预留 A 仍占用额度。`, before, [request], { formula: `${before.limit} − ${before.spent} − ${held(before)} = ${available(before)}` })];
        frames.push(ledgerFrame('检查请求身份', validId ? `ID ${id} 既未预留也未关闭。接下来检查额度。` : '预留需要新的非空 ID。身份检查失败，不再检查额度。', before, [Object.assign({}, request, { tone: validId ? 'active' : 'bad' })]));
        const reason = !validId ? 'new request id required' : amount > available(before) ? 'budget exceeded' : null;
        if (reason) {
          frames.push(ledgerFrame('拒绝且不改变账本', reason === 'budget exceeded' ? `请求的 ${amount} 超过可用的 ${available(before)}。额度不移动，A 保留其预留。` : '不创建预留。花费、预留 A 和可用额度均保持原值。', before, [Object.assign({}, request, { tone: 'bad', detail: reason === 'budget exceeded' ? '预算超限' : '需要新的请求 ID' })], { receipt: { status: 'rejected', reason, before: copy(before), after: copy(before) } }));
        } else {
          frames.push(ledgerFrame('额度足够', `${amount} ≤ ${available(before)}。准入与预留现在可以组成一次状态转换。`, before, [request], { formula: `${amount} ≤ ${available(before)}` }));
          const after = { ...before, holds: { ...before.holds, [id]: amount }, closed: [...before.closed] };
          const lanes = ledgerLanes(before);
          lanes.find(entry => entry.id === 'available').items[0].value = available(after);
          lanes.find(entry => entry.id === 'held').items.push(Object.assign({}, request, { label: '请求 ' + id, detail: '已预留 ' + unit, tone: 'good' }));
          frames.push(ledgerFrame('已记录预留', `${amount} ${unit} 从可用额度移入预留 ${id}。原账本不变；返回账本包含两笔预留。`, after, [], { lanes, links: [{ from: 'free-capacity', to: 'new-request', label: amount + ' ' + unit + ' 已预留' }], receipt: { status: 'reserved', before: copy(before), after: copy(after) } }));
        }
        return finish(frames);
      },
    },
  });

  window.AIFSProjectFigures.register('pj-agent-budget-planner-3', {
    title: '结算实际用量并释放未用额度',
    caption: '回执缺失或超出上限时，保留预留以待对账。有效的零回执会释放预留。',
    lab: {
      question: '有效回执到达后，实际用量和未用预留分别去哪里？',
      controls: [number('limit', '限额（教学单位）', 100), number('spent', '先前花费', 20), number('hold', '现有预留 A', 70), number('actual', '实际回执（教学单位）', 20), { key: 'missing', label: '回执缺失', type: 'checkbox', value: false }, { key: 'duplicate', label: '投递两次回执', type: 'checkbox', value: false }],
      scenarios: [{ label: '结算 20，释放 50', values: {} }, { label: '确认的零回执', values: { actual: 0 } }, { label: '回执缺失', values: { missing: true } }, { label: '超出上限', values: { actual: 71 } }, { label: '重复回执', values: { duplicate: true } }],
      calculate(v) {
        const before = initialLedger(v, 'hold');
        const actual = v.missing ? null : integer(v.actual, '实际回执');
        const frames = [ledgerFrame('定位预留 A', `A 预留 ${v.hold} ${unit}。最终成本尚未结算；仍有 ${available(before)} 可用。`, before, [])];
        if (v.missing || actual > v.hold) {
          const reason = v.missing ? 'missing receipt' : 'actual cost exceeds reservation';
          frames.push(ledgerFrame('保留预留 A', v.missing ? '没有回执时，任务也可能已经完成。释放 A 会隐藏未知成本；保留全部预留以待对账。' : `${actual} 超过 A 的 ${v.hold} 单位上限。拒绝回执，保持账本不变以待对账。`, before, [], { summary: '需要对账；保留预留 A', receipt: { status: 'needs_reconciliation', reason, ledger: copy(before) } }));
          return finish(frames);
        }
        frames.push(ledgerFrame('验证回执', `${actual} 是不大于 ${v.hold} 单位预留的非负整数。A 仍处于打开状态。`, before, [], { formula: `0 ≤ ${actual} ≤ ${v.hold}`, receipt: { request_id: 'A', actual, ledger: copy(before) } }));
        const unused = v.hold - actual;
        const partition = ledgerLanes(before);
        partition.find(entry => entry.id === 'held').items = [item('hold-A', 'A：实际用量部分', actual, '仍在预留中；尚未计入花费', 'active'), item('unused-A', 'A：未用部分', unused, '仍在预留中；尚不可用', 'active')];
        frames.push(ledgerFrame('拆分预留', `${v.hold} = ${actual} 实际用量 + ${unused} 未用额度。结算提交前，两部分仍属于预留。`, before, [], { lanes: partition, formula: `${v.hold} = ${actual} + ${unused}` }));
        const after = { limit: before.limit, spent: before.spent + actual, holds: {}, closed: ['A'] };
        const settled = copy(partition);
        settled.find(entry => entry.id === 'held').items = [];
        settled.find(entry => entry.id === 'spent').items.push(item('hold-A', 'A：已结算用量', actual, unit, 'good'));
        settled.find(entry => entry.id === 'available').items.push(item('unused-A', 'A：已释放额度', unused, unit, 'good'));
        const receipt = { status: 'settled', actual, released: unused, before: copy(before), after: copy(after) };
        frames.push(ledgerFrame('仅提交一次结算', `${actual} 计入花费，${unused} 回到可用额度。A 关闭；当前可用额度为 ${available(after)}。`, after, [], { lanes: settled, metrics: [{ label: '实际用量', value: actual + ' ' + unit }, { label: '已释放', value: unused + ' ' + unit }], receipt }));
        if (v.duplicate) {
          frames.push(ledgerFrame('拒绝第二次回执', 'A 已关闭，不再有预留。第二次回执不能对同一任务重复计费；已结算账本保持不变。', after, [], { lanes: settled, receipt: { ...receipt, second_receipt: { status: 'rejected', reason: 'unknown reservation', before: copy(after), after: copy(after) } } }));
        }
        return finish(frames);
      },
    },
  });

  window.AIFSProjectFigures.register('pj-agent-budget-planner-4', {
    title: '在预算与截止时间限制下回放有序任务',
    caption: '确定性准入回放使用已知成本和时长，不会中断同步的实时回调。',
    lab: {
      question: '每道检查准入或拒绝哪些任务？这些决定如何改变花费和已用时间？',
      controls: [
        number('limit', '预算限额（教学单位）', 100), number('deadline', '截止时间（ms）', 100),
        number('costA', 'A 成本（教学单位）', 60), number('durationA', 'A 时长（ms）', 40),
        number('costB', 'B 成本（教学单位）', 50), number('durationB', 'B 时长（ms）', 30),
        number('costC', 'C 成本（教学单位）', 30), number('durationC', 'C 时长（ms）', 80),
        number('costD', 'D 成本（教学单位）', 20), number('durationD', 'D 时长（ms）', 20),
        { key: 'order', label: '任务顺序', type: 'select', value: 'ABCD', options: [{ value: 'ABCD', label: 'A, B, C, D' }, { value: 'DCBA', label: 'D, C, B, A' }, { value: 'ACBD', label: 'A, C, B, D' }] },
      ],
      scenarios: [{ label: '两种不同的拒绝', values: {} }, { label: '恰好到截止时间', values: { deadline: 60 } }, { label: '所有任务都能容纳', values: { limit: 160, deadline: 170 } }, { label: '反转顺序', values: { order: 'DCBA' } }, { label: '先检查截止时间，再检查预算', values: { deadline: 10, limit: 10 } }],
      calculate(v) {
        const limit = integer(v.limit, '预算限额'), deadline = integer(v.deadline, '截止时间');
        if (!['ABCD', 'DCBA', 'ACBD'].includes(v.order)) throw new Error('请选择列表中的任务顺序。');
        const jobs = [...v.order].map(id => ({ id, cost: integer(v['cost' + id], id + ' 成本'), duration_ms: integer(v['duration' + id], id + ' 时长') }));
        let state = { limit, spent: 0, holds: {}, closed: [] }, elapsed = 0;
        const events = [], locations = Object.fromEntries(jobs.map(job => [job.id, 'queue'])), notes = {}, frames = [];
        function snapshot(label, explanation, formula) {
          const lanes = ['queue', 'deadline', 'budget', 'completed', 'rejected'].map(id => lane(id, { queue: '有序队列', deadline: '截止时间检查', budget: '预算检查', completed: '已完成', rejected: '已拒绝' }[id], jobs.filter(job => locations[job.id] === id).map(job => item('job-' + job.id, '任务 ' + job.id, `${job.cost} 单位 / ${job.duration_ms} ms`, notes[job.id] || '等待中', id === 'completed' ? 'good' : id === 'rejected' ? 'bad' : id === 'queue' ? 'neutral' : 'active'))));
          frames.push({ label, explanation, summary: `已花费 ${state.spent} ${unit}；已用 ${elapsed} ms`, formula, lanes, bars: [...bars(state), { label: '已用时间', value: elapsed, max: deadline, unit: 'ms' }], receipt: { ledger: copy(state), events: copy(events), elapsed_ms: elapsed } });
        }
        snapshot('读取有序队列', '每个任务先检查截止时间，再检查预算。只有完成任务才推进时间并增加花费。');
        for (const job of jobs) {
          const predicted = integer(elapsed + job.duration_ms, '预测完成时间');
          locations[job.id] = 'deadline';
          notes[job.id] = `${elapsed} + ${job.duration_ms} = ${predicted} ms`;
          snapshot(job.id + '：检查截止时间', `预测完成时间为 ${predicted} ms，截止时间为 ${deadline} ms。允许恰好相等。`, `${elapsed} + ${job.duration_ms} = ${predicted} ms`);
          if (predicted > deadline) {
            locations[job.id] = 'rejected'; notes[job.id] = '截止时间超限';
            events.push({ id: job.id, status: 'rejected', reason: 'deadline' });
            snapshot(job.id + '：因截止时间拒绝', `${predicted} > ${deadline}。跳过预算检查。此次拒绝不增加花费或推进时间。`);
            continue;
          }
          locations[job.id] = 'budget'; notes[job.id] = `请求 ${job.cost} / 可用 ${available(state)}`;
          snapshot(job.id + '：检查预算', `截止时间检查通过。比较成本 ${job.cost} 与可用额度 ${available(state)}。`, `${job.cost} ≤ ${available(state)}?`);
          if (job.cost > available(state)) {
            locations[job.id] = 'rejected'; notes[job.id] = '预算超限';
            events.push({ id: job.id, status: 'rejected', reason: 'budget exceeded' });
            snapshot(job.id + '：因预算拒绝', `${job.cost} 超过可用额度。花费与已用时间保持不变。`);
            continue;
          }
          state = { ...state, holds: { [job.id]: job.cost } };
          notes[job.id] = `完成前预留 ${job.cost}`;
          snapshot(job.id + '：预留额度', `${job.cost} ${unit} 从可用移入预留。任务尚未完成，时间尚未推进。`);
          state = { ...state, spent: state.spent + job.cost, holds: {}, closed: [...state.closed, job.id] };
          elapsed = predicted;
          locations[job.id] = 'completed'; notes[job.id] = `在 ${elapsed} ms 完成`;
          events.push({ id: job.id, status: 'completed', cost: job.cost, elapsed_ms: elapsed });
          snapshot(job.id + '：完成', `结算已知的 ${job.cost} 单位成本，时间推进 ${job.duration_ms} ms。不再有未解决的预留。`);
        }
        return finish(frames);
      },
    },
  });
}());
