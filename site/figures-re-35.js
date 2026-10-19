/* figures-re-35.js - evidence ledger lab for lesson 35 (reverse engineering).
   Every record below is real. The rea record comes from rea-agents 6.5.0 with
   the Ghidra 12.1.4 provider on ledger-x86_64-O1.o. The other records come from
   the lesson's own reader, byte model, predictions, and host runs
   (phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns/code/fixtures). */
(function () {
  'use strict';

  var LF = window.LF;
  if (!LF) return;

  var el = LF.el;
  var labCount = 0;

  function ensureStyles() {
    if (document.getElementById('re35-lab-styles')) return;
    var style = document.createElement('style');
    style.id = 're35-lab-styles';
    style.textContent = [
      '.re35-lab{margin:0;border:0;background:transparent;color:var(--ink,#1a1a1a)}',
      '.re35-lab *{box-sizing:border-box}',
      '.re35-lab__head{align-items:flex-start}',
      '.re35-lab__head .re35-lab__title{color:var(--blueprint,#3553ff)}',
      '.re35-lab__body{padding:16px;display:grid;gap:16px}',
      '.re35-lab__prompt{margin:0!important;color:var(--ink-soft,#555)!important;font-family:var(--font-body,serif)!important;font-size:.96rem!important;line-height:1.55!important;text-align:left!important}',
      '.re35-lab__label{font-family:var(--font-mono,monospace);font-size:.72rem;line-height:1.4;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-mute,#777)}',
      '.re35-lab__toggles{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}',
      '.re35-lab button{min-height:40px;padding:8px 10px;border:1px solid var(--rule-soft,#ddd);background:var(--bg,#fafaf5);color:var(--ink,#1a1a1a);font-family:var(--font-mono,monospace);font-size:.74rem;line-height:1.4;text-align:left;cursor:pointer;display:grid;gap:3px}',
      '.re35-lab__toggle{transition:transform var(--motion-press,160ms) var(--ease-out,cubic-bezier(.23,1,.32,1)),opacity var(--motion-feedback,180ms) var(--ease-out,cubic-bezier(.23,1,.32,1)),border-color var(--motion-feedback,180ms) ease,background-color var(--motion-feedback,180ms) ease}',
      '.re35-lab button:active{transform:scale(.97)}',
      '.re35-lab button:focus-visible{outline:2px solid var(--blueprint,#3553ff);outline-offset:2px}',
      '@media(hover:hover) and (pointer:fine){.re35-lab button:hover{border-color:var(--blueprint,#3553ff)}}',
      '.re35-lab__toggle[aria-pressed="true"]{border-color:var(--blueprint,#3553ff);background:var(--blueprint-tint,rgba(53,83,255,.08))}',
      '.re35-lab__toggle[aria-pressed="false"]{opacity:.62}',
      '.re35-lab__toggle-id{color:var(--blueprint,#3553ff);font-weight:600}',
      '.re35-lab__toggle[aria-pressed="false"] .re35-lab__toggle-id{color:var(--ink-mute,#777);text-decoration:line-through}',
      '.re35-lab__toggle-meta{color:var(--ink-mute,#777);font-size:.68rem;letter-spacing:.04em}',
      '.re35-lab__toggle-text{color:var(--ink,#1a1a1a)}',
      '.re35-lab__workspace{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:14px;align-items:start}',
      '.re35-lab__panel{min-width:0;border:1px solid var(--rule-soft,#ddd);background:var(--bg-surface,#f1f1eb)}',
      '.re35-lab__panel-head{padding:8px 12px;border-bottom:1px solid var(--rule-soft,#ddd);font-family:var(--font-mono,monospace);font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--blueprint,#3553ff)}',
      '.re35-lab__row{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start;padding:10px 12px;border-bottom:1px solid var(--rule-soft,#ddd);transition:opacity var(--motion-feedback,180ms) var(--ease-out,cubic-bezier(.23,1,.32,1)),transform var(--motion-feedback,220ms) var(--ease-out,cubic-bezier(.23,1,.32,1))}',
      '.re35-lab__row:last-child{border-bottom:0}',
      '.re35-lab__status{display:inline-flex;align-items:center;min-height:24px;padding:2px 7px;border:1px solid var(--ink-mute,#777);color:var(--ink-mute,#777);font-family:var(--font-mono,monospace);font-size:.68rem;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}',
      '.re35-lab__status[data-tone="pass"]{border-color:var(--blueprint,#3553ff);color:var(--blueprint,#3553ff)}',
      '.re35-lab__status[data-tone="derived"]{border-color:var(--blueprint,#3553ff);color:var(--blueprint,#3553ff);border-style:dashed}',
      '.re35-lab__status[data-tone="unknown"]{border-color:var(--warn,#b8870f);color:var(--warn,#b8870f);border-style:dashed}',
      '.re35-lab__status[data-tone="fail"],.re35-lab__status[data-tone="dangling"]{border-color:var(--warn,#b8870f);color:var(--warn,#b8870f)}',
      '.re35-lab__claim{font-family:var(--font-mono,monospace);font-size:.78rem;line-height:1.4;color:var(--ink,#1a1a1a);word-break:break-word}',
      '.re35-lab__detail{margin-top:3px;font-family:var(--font-body,serif);font-size:.86rem;line-height:1.45;color:var(--ink-soft,#555)}',
      '.re35-lab__ids{margin-top:3px;font-family:var(--font-mono,monospace);font-size:.68rem;line-height:1.5;color:var(--ink-mute,#777);word-break:break-all}',
      '.re35-lab__verdict{padding:12px;border:1px solid var(--rule-soft,#ddd);background:var(--bg-surface,#f1f1eb);font-family:var(--font-mono,monospace);font-size:.86rem;line-height:1.5;color:var(--ink,#1a1a1a)}',
      '.re35-lab figcaption{padding:12px 16px;border-top:1px solid var(--rule-soft,#ddd);font-family:var(--font-body,serif);font-size:.92rem;line-height:1.5;color:var(--ink-soft,#555)}',
      '@media(max-width:640px){.re35-lab__body{padding:12px}.re35-lab__workspace{grid-template-columns:1fr}.re35-lab__toggles{grid-template-columns:1fr}.re35-lab__row{grid-template-columns:1fr}.re35-lab__claim{font-size:.8rem}.re35-lab__detail{font-size:.88rem}}',
      '@media(prefers-reduced-motion:reduce){.re35-lab__toggle,.re35-lab__row{transition:none!important;transform:none!important}.re35-lab button:active{transform:none!important}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  var EVIDENCE = [
    {
      key: 'bytes',
      id: 'ev_a467c2427bfc0c5647d4468a2bcc2d8f1af6877400df96437d8441f8b446d27d',
      confidence: 'observed',
      authority: 'shipped-artifact',
      text: 'read_function_bytes grade：.text+0x10 的 46 字节',
      on: true
    },
    {
      key: 'model',
      id: 'ev_605106bff2d9998f58690b6314cf2d976d114c60090b7684a7cda838fb6fc59b',
      confidence: 'derived',
      authority: 'shipped-artifact',
      text: 'derive_switch_model grade：.rodata+0x14 的表 1,2,3,4,4，index = score/10 - 6',
      links: ['bytes'],
      on: true
    },
    {
      key: 'ghidra',
      id: 'ev_67b6d3f992eaf49a2e16de084b6ebfdd9884e8c5c7f75e175b7bb20f4f748ce1',
      confidence: 'observed',
      authority: 'shipped-artifact',
      text: 'Ghidra 12.1.4 analyze_function grade：伪代码与 14 条指令',
      on: true
    },
    {
      key: 'run95',
      id: 'ev_f4ffbe8f922ec7fe9b2b260593635e70163f20942a895d500832a27f0d4c992f',
      confidence: 'observed',
      authority: 'controlled-replay',
      text: 'execute_function grade(95): 本机构建输出 4',
      run: { fn: 'grade', args: [95], result: 4 },
      on: true
    },
    {
      key: 'run55',
      id: 'ev_7be90c0c1403272f28f4f3b839307371548c4cfdd7dff2416bb52e088cf59462',
      confidence: 'observed',
      authority: 'controlled-replay',
      text: 'execute_function grade(55): 本机构建输出 0',
      run: { fn: 'grade', args: [55], result: 0 },
      on: false
    },
    {
      key: 'run100',
      id: 'ev_7372c4f8330bdd8ef8246ddcb5bd8347dd71f4e416c635d5dcacabb16448d55a',
      confidence: 'observed',
      authority: 'controlled-replay',
      text: 'execute_function grade(100): 本机构建输出 4',
      run: { fn: 'grade', args: [100], result: 4 },
      on: false
    },
    {
      key: 'runpc',
      id: 'ev_7eb6b4589c40278645428875c62c202667343df133f83dc765d9f20a4b1b826a',
      confidence: 'observed',
      authority: 'controlled-replay',
      text: 'execute_function percent_change(12400, 15500): 本机构建输出 25',
      run: { fn: 'percent_change', args: [12400, 15500], result: 25 },
      on: true
    }
  ];

  var RANGE_CASES = [];
  for (var score = 90; score <= 100; score++) RANGE_CASES.push([[score], 4]);

  var CLAIMS = [
    {
      id: 'grade(95)',
      text: 'grade(95) == 4',
      kind: 'run',
      fn: 'grade',
      cases: [[[95], 4]],
      prediction: 'ev_ef89eea46fd892feaef1b7e323381d842753c07784311e408c7058724104aa19',
      unknown: 'unk_8471cd5e61a7c5800a5223fba5b537b4d848c18a0e012482d2ae1f1ce521299f'
    },
    {
      id: 'grade(55)',
      text: 'grade(55) == 0',
      kind: 'run',
      fn: 'grade',
      cases: [[[55], 0]],
      prediction: 'ev_d51dd456405897203f403a6c27538d998e7f1d31cba4cd8f9f9d41a6840e61e4',
      unknown: 'unk_1175ff2086d60f52a12e62667238f5f92de8cb38adb21ec8b2e085ca4afe10c7',
      note: 'Ghidra 将默认路径写为 -(param_1 >> 0x1f) ^ (uint)(...)，字节却是 xor eax, eax。只有执行才能观察到 0。'
    },
    {
      id: 'percent_change(12400, 15500)',
      text: 'percent_change(12400, 15500) == 25',
      kind: 'run',
      fn: 'percent_change',
      cases: [[[12400, 15500], 25]],
      prediction: 'ev_3bc03ec0b9352c58a68d56b300e6c5707d7d14bcff05ffd1f431e73766080bea',
      unknown: 'unk_c8d398aecc691d3ecd47dfd57198ffe87b228f67387ebc958673db7cdfca8b35'
    },
    {
      id: 'grade(90..100)',
      text: '90 到 100 每个分数均满足 grade(score) == 4',
      kind: 'run',
      fn: 'grade',
      cases: RANGE_CASES,
      prediction: 'ev_16a0c37372f930202fae53c3cd5d16e63af3c40fdca2767e7983a4203c0ca522',
      unknown: 'unk_f2eb0d7f84c80a19f1fa95a91e9ef90da1827816a34a57f160be23aee5cddd2d'
    },
    {
      id: 'table',
      text: '.rodata+0x14 的 grade 表保存 1,2,3,4,4',
      kind: 'derived'
    }
  ];

  function shortId(id) {
    return id.slice(0, 16);
  }

  function sameArgs(left, right) {
    var index;
    if (left.length !== right.length) return false;
    for (index = 0; index < left.length; index++) {
      if (left[index] !== right[index]) return false;
    }
    return true;
  }

  function byKey(key) {
    var index;
    for (index = 0; index < EVIDENCE.length; index++) {
      if (EVIDENCE[index].key === key) return EVIDENCE[index];
    }
    return null;
  }

  function evaluateClaim(claim, state) {
    var support = [];
    var contra = [];
    var covered = 0;
    var status;
    var detail;
    if (claim.kind === 'derived') {
      if (state.model && state.bytes) {
        return { status: 'derived', detail: '从观察字节计算，只读取文件，不声称行为。', ids: [byKey('model').id, byKey('bytes').id], covered: 1, total: 1 };
      }
      if (state.model) {
        return { status: 'dangling', detail: '推导记录存在，但链接的字节记录缺失，无法检查依据。', ids: [byKey('model').id], covered: 0, total: 1 };
      }
      return { status: 'unsupported', detail: '没有推导记录说明此表。', ids: [], covered: 0, total: 1 };
    }
    claim.cases.forEach(function (one) {
      var agree = false;
      var disagree = false;
      EVIDENCE.forEach(function (item) {
        if (!item.run || !state[item.key]) return;
        if (item.run.fn !== claim.fn || !sameArgs(item.run.args, one[0])) return;
        if (item.run.result === one[1]) {
          agree = true;
          support.push(item.id);
        } else {
          disagree = true;
          contra.push(item.id);
        }
      });
      if (agree && !disagree) covered += 1;
    });
    if (contra.length) {
      status = 'fail';
      detail = '观察执行与预测不一致。';
    } else if (covered === claim.cases.length) {
      status = 'pass';
      detail = '每个输入都有一致观察执行。运行的是相同源码的本机构建，该限制随主张保留。';
    } else if (covered === 0) {
      status = 'unsupported';
      if (claim.fn === 'grade' && (state.model || state.ghidra)) {
        detail = '推导和 provider 记录存在，但均非运行。预测仍为 inferred。';
      } else {
        detail = '没有此函数和这些参数的观察执行。';
      }
      if (claim.note) detail += ' ' + claim.note;
    } else {
      status = 'unknown';
      detail = covered + ' / ' + claim.cases.length + ' 个输入有观察执行。部分覆盖仍为 unknown。';
    }
    return { status: status, detail: detail, ids: support.concat(contra), covered: covered, total: claim.cases.length };
  }

  function unknownState(status) {
    if (status === 'pass') {
      return { status: 'resolved', revision: 2, tone: 'pass', detail: '通过运行 ID 解决，版本 2 引用版本 1 摘要。' };
    }
    if (status === 'unknown') {
      return { status: 'investigating', revision: 2, tone: 'unknown', detail: '部分输入有运行，其余应在本机构建上用 execute_function 探测。' };
    }
    if (status === 'fail') {
      return { status: 'contradicted', revision: 2, tone: 'fail', detail: '需要 observed、controlled-replay 证据。' };
    }
    return { status: 'open', revision: 1, tone: 'open', detail: '需要 observed、controlled-replay 证据。' };
  }

  function evidenceLedgerLab(host) {
    ensureStyles();
    labCount += 1;
    var titleId = 're35-lab-title-' + labCount;
    var state = {};
    EVIDENCE.forEach(function (item) { state[item.key] = item.on; });

    var title = el('span', { id: titleId, class: 're35-lab__title' }, ['证据账本']);
    var header = el('div', { class: 'lf-head re35-lab__head' }, [title, el('span', {}, ['切换记录是否存在'])]);
    var prompt = el('p', { class: 're35-lab__prompt' }, [
      '每项主张都是对 ledger-x86_64-O1.o 的预测。切换记录是否存在，账本会用剩余记录重算各主张与未知项。ID 显示前 16 字符。'
    ]);

    var toggles = el('div', { class: 're35-lab__toggles', role: 'group', 'aria-label': '证据记录' });
    var toggleButtons = {};
    EVIDENCE.forEach(function (item) {
      var button = el('button', { type: 'button', class: 're35-lab__toggle', 'aria-pressed': item.on ? 'true' : 'false' }, [
        el('span', { class: 're35-lab__toggle-id' }, [shortId(item.id)]),
        el('span', { class: 're35-lab__toggle-meta' }, [item.confidence + ' · ' + item.authority]),
        el('span', { class: 're35-lab__toggle-text' }, [item.text])
      ]);
      button.addEventListener('click', function () {
        state[item.key] = !state[item.key];
        render();
      });
      toggleButtons[item.key] = button;
      toggles.appendChild(button);
    });
    var toggleBlock = el('div', { style: 'display:grid;gap:8px' }, [el('div', { class: 're35-lab__label' }, ['账本中的证据记录']), toggles]);

    var claimList = el('div', { 'aria-label': 'Claims' });
    var unknownList = el('div', { 'aria-label': '残留未知项' });
    var claimPanel = el('div', { class: 're35-lab__panel' }, [el('div', { class: 're35-lab__panel-head' }, ['主张']), claimList]);
    var unknownPanel = el('div', { class: 're35-lab__panel' }, [el('div', { class: 're35-lab__panel-head' }, ['残留未知项']), unknownList]);
    var workspace = el('div', { class: 're35-lab__workspace' }, [claimPanel, unknownPanel]);
    var verdict = el('div', { class: 're35-lab__verdict', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    var caption = el('figcaption', {}, [
      '蓝实线表示 pass 或观察记录，蓝虚线为 derived，琥珀虚线为 unknown（仅部分执行），琥珀实线为悬空链接，灰色为 unsupported 或 open。结论统计上方各行。'
    ]);
    var body = el('div', { class: 're35-lab__body' }, [prompt, toggleBlock, workspace, verdict]);
    var figure = el('figure', { class: 're35-lab lf', 'aria-labelledby': titleId }, [header, body, caption]);

    function clear(node) {
      while (node.firstChild) node.removeChild(node.firstChild);
    }

    function render() {
      var counts = { pass: 0, fail: 0, unknown: 0, unsupported: 0, derived: 0, dangling: 0 };
      var openUnknowns = 0;
      var records = 0;
      EVIDENCE.forEach(function (item) {
        toggleButtons[item.key].setAttribute('aria-pressed', state[item.key] ? 'true' : 'false');
        if (state[item.key]) records += 1;
      });
      clear(claimList);
      clear(unknownList);
      CLAIMS.forEach(function (claim) {
        var result = evaluateClaim(claim, state);
        var ids = result.ids.map(shortId);
        var idLine;
        counts[result.status] += 1;
        if (claim.prediction) ids.unshift(shortId(claim.prediction) + ' (inferred prediction)');
        idLine = ids.length ? ids.join('  ') : '无证据 ID';
        claimList.appendChild(el('div', { class: 're35-lab__row', 'data-status': result.status }, [
          el('span', { class: 're35-lab__status', 'data-tone': result.status }, [result.status + (result.total > 1 ? ' ' + result.covered + '/' + result.total : '')]),
          el('div', {}, [
            el('div', { class: 're35-lab__claim' }, [claim.text]),
            el('div', { class: 're35-lab__detail' }, [result.detail]),
            el('div', { class: 're35-lab__ids' }, [idLine])
          ])
        ]));
        if (claim.kind === 'run') {
          var unknown = unknownState(result.status);
          if (unknown.status !== 'resolved') openUnknowns += 1;
          unknownList.appendChild(el('div', { class: 're35-lab__row', 'data-status': unknown.status }, [
            el('span', { class: 're35-lab__status', 'data-tone': unknown.tone }, [unknown.status + ' 版本 ' + unknown.revision]),
            el('div', {}, [
              el('div', { class: 're35-lab__claim' }, ['Does ' + claim.text + ' hold when the compiled function runs?']),
              el('div', { class: 're35-lab__detail' }, [unknown.detail]),
              el('div', { class: 're35-lab__ids' }, [shortId(claim.unknown)])
            ])
          ]));
        }
      });
      verdict.textContent = records + ' / ' + EVIDENCE.length + ' 条记录存在。' +
        counts.pass + ' pass, ' + counts.unknown + ' unknown, ' + counts.unsupported + ' unsupported, ' +
        counts.derived + ' derived, ' + counts.dangling + ' dangling. ' + openUnknowns + ' of 4 个未知项仍开启。';
      figure.setAttribute('data-open-unknowns', String(openUnknowns));
    }

    host.appendChild(figure);
    render();
  }

  LF.register({
    're-evidence-ledger': evidenceLedgerLab
  });
}());
