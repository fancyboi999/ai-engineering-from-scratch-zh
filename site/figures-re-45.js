/* figures-re-45.js - lesson 45: the six-field scorecard of eight hand-written candidate
   reconstructions of f1 and f2 in ledger-x86_64-O1-renamed.o. DATA is the output of
   python3 code/main.py figure-data in the lesson folder, read from the recorded run in
   code/fixtures/runs. The candidates are test inputs written for the lesson and are not
   the output of any model. The test suite checks that this copy matches. */
(function () {
  'use strict';

  var LF = window.LF;
  if (!LF) return;

  var el = LF.el;

  var DATA = {"host":"aarch64 Darwin","target":"ledger-x86_64-O1-renamed.o","fields":["bytes","grid","fuzz","names","citations","provenance"],"candidates":[{"id":"f1_base_64","kind":"wrong constant","fn":"f1","name":"percent_change","verdict":"fail","fields":[{"f":"bytes","s":"fail","e":"size 16 vs 18 bytes"},{"f":"grid","s":"fail","e":"49 of 70 cells differ, first (1, 0) original -100 rebuilt -64"},{"f":"fuzz","s":"fail","e":"198 of 256 seeded inputs diverge (72 wide, 126 narrow), first (-979787644, -51418461) original 1 rebuilt 0"},{"f":"names","s":"pass","e":"name, 2 parameter names, and every type match int percent_change(int before, int after)"},{"f":"citations","s":"fail","e":"1 of 4 citations do not resolve: immediate 64 (0x40) is not an operand in f1, present: [100]"},{"f":"provenance","s":"pass","e":"rep_86e8cfcf0d0f by hand-written about sha256 3561e8175748, tokens not reported, harness seconds in detail"}]},{"id":"f1_mul_first","kind":"correct","fn":"f1","name":"percent_change","verdict":"pass","fields":[{"f":"bytes","s":"pass","e":"16 bytes equal after masking 0 relocation bytes"},{"f":"grid","s":"pass","e":"all 70 cells agree on aarch64 Darwin"},{"f":"fuzz","s":"pass","e":"0 of 256 seeded inputs diverge (seed 45)"},{"f":"names","s":"pass","e":"name, 2 parameter names, and every type match int percent_change(int before, int after)"},{"f":"citations","s":"pass","e":"all 6 cited addresses, callees, strings, and immediates exist in f1"},{"f":"provenance","s":"pass","e":"rep_e9465b6d9ae2 by hand-written about sha256 3561e8175748, tokens not reported, harness seconds in detail"}]},{"id":"f1_safe_div","kind":"invented helper","fn":"f1","name":"percent_change","verdict":"fail","fields":[{"f":"bytes","s":"pass","e":"16 bytes equal after masking 0 relocation bytes"},{"f":"grid","s":"pass","e":"all 70 cells agree on aarch64 Darwin"},{"f":"fuzz","s":"pass","e":"0 of 256 seeded inputs diverge (seed 45)"},{"f":"names","s":"pass","e":"name, 2 parameter names, and every type match int percent_change(int before, int after)"},{"f":"citations","s":"fail","e":"3 of 6 citations do not resolve: address 0x40 is outside f1 (0x0-0x10), inside f3; callee safe_div is not a symbol in the object; string 'division by zero' is not in any read-only data section"},{"f":"provenance","s":"pass","e":"rep_043eae10784b by hand-written about sha256 3561e8175748, tokens not reported, harness seconds in detail"}]},{"id":"f1_wide_long","kind":"plausible but wrong","fn":"f1","name":"percent_change","verdict":"fail","fields":[{"f":"bytes","s":"fail","e":"size 16 vs 26 bytes"},{"f":"grid","s":"fail","e":"26 of 70 cells differ, first (3, 2147483647) original -133 rebuilt -1431655899"},{"f":"fuzz","s":"fail","e":"125 of 256 seeded inputs diverge (125 wide, 0 narrow), first (-979787644, -51418461) original 1 rebuilt -94"},{"f":"names","s":"partial","e":"types agree, names differ: old_value for before (CER 1.333), new_value for after (CER 1.6)"},{"f":"citations","s":"pass","e":"all 4 cited addresses, callees, strings, and immediates exist in f1"},{"f":"provenance","s":"pass","e":"rep_101368ad24ca by hand-written about sha256 3561e8175748, tokens not reported, harness seconds in detail"}]},{"id":"f2_case10_wrong","kind":"wrong constant","fn":"f2","name":"grade","verdict":"fail","fields":[{"f":"bytes","s":"fail","e":"referenced constants differ: [1, 2, 3, 4, 4] vs [1, 2, 3, 4, 3]"},{"f":"grid","s":"fail","e":"3 of 22 cells differ, first (100,) original 4 rebuilt 3"},{"f":"fuzz","s":"fail","e":"2 of 256 seeded inputs diverge (0 wide, 2 narrow), first (105,) original 4 rebuilt 3"},{"f":"names","s":"pass","e":"name, 1 parameter names, and every type match int grade(int score)"},{"f":"citations","s":"pass","e":"all 8 cited addresses, callees, strings, and immediates exist in f2"},{"f":"provenance","s":"pass","e":"rep_805dbdaedf3d by hand-written about sha256 3561e8175748, tokens not reported, harness seconds in detail"}]},{"id":"f2_clamp","kind":"invented helper","fn":"f2","name":"grade","verdict":"fail","fields":[{"f":"bytes","s":"fail","e":"size 46 vs 50 bytes; relocation records differ in count, offset, type, or target section"},{"f":"grid","s":"fail","e":"2 of 22 cells differ, first (110,) original 0 rebuilt 4"},{"f":"fuzz","s":"fail","e":"102 of 256 seeded inputs diverge (69 wide, 33 narrow), first (536602723,) original 0 rebuilt 4"},{"f":"names","s":"pass","e":"name, 1 parameter names, and every type match int grade(int score)"},{"f":"citations","s":"fail","e":"5 of 8 citations do not resolve: address 0x40 is outside f2 (0x10-0x3e), inside f3; address 0x3e is outside f2 (0x10-0x3e), in no function; callee clamp_score is not a symbol in the object; string 'score out of range' is not in any read-only data section; immediate 100 (0x64) is not an operand in f2, present: [-6, 4, 34, 63, 1717986919]"},{"f":"provenance","s":"pass","e":"rep_8ac62f2c3425 by hand-written about sha256 3561e8175748, tokens not reported, harness seconds in detail"}]},{"id":"f2_switch","kind":"correct","fn":"f2","name":"grade","verdict":"pass","fields":[{"f":"bytes","s":"pass","e":"46 bytes equal after masking 4 relocation bytes, constants [1, 2, 3, 4, 4] equal"},{"f":"grid","s":"pass","e":"all 22 cells agree on aarch64 Darwin"},{"f":"fuzz","s":"pass","e":"0 of 256 seeded inputs diverge (seed 45)"},{"f":"names","s":"pass","e":"name, 1 parameter names, and every type match int grade(int score)"},{"f":"citations","s":"pass","e":"all 12 cited addresses, callees, strings, and immediates exist in f2"},{"f":"provenance","s":"pass","e":"rep_f6c3100bed16 by hand-written about sha256 3561e8175748, tokens not reported, harness seconds in detail"}]},{"id":"f2_thresholds","kind":"plausible but wrong","fn":"f2","name":"grade_points","verdict":"fail","fields":[{"f":"bytes","s":"fail","e":"size 46 vs 39 bytes; relocation records differ in count, offset, type, or target section"},{"f":"grid","s":"fail","e":"2 of 22 cells differ, first (110,) original 0 rebuilt 4"},{"f":"fuzz","s":"fail","e":"102 of 256 seeded inputs diverge (69 wide, 33 narrow), first (536602723,) original 0 rebuilt 4"},{"f":"names","s":"partial","e":"types agree, names differ: grade_points for grade (CER 1.4)"},{"f":"citations","s":"pass","e":"all 5 cited addresses, callees, strings, and immediates exist in f2"},{"f":"provenance","s":"pass","e":"rep_32cfaa985695 by hand-written about sha256 3561e8175748, tokens not reported, harness seconds in detail"}]}]};

  var FIELD_LABELS = {
    bytes: ['字节', '重编译、屏蔽重定位、比较'],
    grid: ['网格', '92 单元差分网格'],
    fuzz: ['模糊测试', '256 个带种子输入'],
    names: ['名称', 'DWARF 名称与类型'],
    citations: ['引用', '引用的地址、被调用函数、字符串、立即数'],
    provenance: ['来源', '摘要、标签、工具、成本']
  };

  var STATUS_GLYPH = { pass: '通过', fail: '失败', partial: '部分', unknown: '?' };

  function kindLabel(kind) {
    return { 'correct': '正确', 'wrong constant': '常量错误', 'invented helper': '虚构辅助函数', 'plausible but wrong': '合理但错误' }[kind] || kind;
  }

  function evidenceText(value) {
    return value
      .replace(/size (\d+) vs (\d+) bytes/g, '大小 $1 对 $2 字节')
      .replace(/(\d+) of (\d+) cells differ, first (.*?) original (-?\d+) rebuilt (-?\d+)/g, '$2 个单元中 $1 个不同，首项 $3：原始 $4，重建 $5')
      .replace(/(\d+) of (\d+) seeded inputs diverge \((\d+) wide, (\d+) narrow\), first (.*?) original (-?\d+) rebuilt (-?\d+)/g, '$2 个带种子输入中 $1 个分歧（宽范围 $3、窄范围 $4），首项 $5：原始 $6，重建 $7')
      .replace(/name, (\d+) parameter names, and every type match /g, '函数名、$1 个参数名和所有类型匹配 ')
      .replace(/(\d+) of (\d+) citations do not resolve: /g, '$2 项引用中 $1 项无法解析：')
      .replace(/immediate (.*?) is not an operand in (.*?), present: /g, '立即数 $1 不是 $2 的操作数，实际有：')
      .replace(/(rep_\w+) by hand-written about sha256 (\w+), tokens not reported, harness seconds in detail/g, '$1，手写，针对 sha256 $2，未报告 token，框架耗时见详情')
      .replace(/(\d+) bytes equal after masking (\d+) relocation bytes/g, '屏蔽 $2 个重定位字节后，$1 字节相等')
      .replace(/all (\d+) cells agree on /g, '全部 $1 个单元一致，主机 ')
      .replace(/0 of 256 seeded inputs diverge \(seed 45\)/g, '256 个带种子输入均无分歧（种子 45）')
      .replace(/all (\d+) cited addresses, callees, strings, and immediates exist in (\w+)/g, '全部 $1 项引用的地址、被调用函数、字符串和立即数都存在于 $2')
      .replace(/address (\w+) is outside (\w+) \((.*?)\), inside (\w+)/g, '地址 $1 在 $2（$3）外，位于 $4 内')
      .replace(/address (\w+) is outside (\w+) \((.*?)\), in no function/g, '地址 $1 在 $2（$3）外，不属于任何函数')
      .replace(/callee (\w+) is not a symbol in the object/g, '被调用函数 $1 不是对象中的符号')
      .replace(/string (.*?) is not in any read-only data section/g, '字符串 $1 不在任何只读数据节中')
      .replace(/types agree, names differ: /g, '类型一致，名称不同：')
      .replace(/ for /g, ' 对应 ')
      .replace(/referenced constants differ: /g, '引用常量不同：')
      .replace(/ vs /g, ' 对 ')
      .replace(/relocation records differ in count, offset, type, or target section/g, '重定位记录的数量、偏移、类型或目标节不同')
      .replace(/, constants (.*?) equal/g, '，常量 $1 相同');
  }

  function ensureStyles() {
    if (document.getElementById('re45-styles')) return;
    var style = document.createElement('style');
    style.id = 're45-styles';
    style.textContent = [
      '.re45 *{box-sizing:border-box}',
      '.re45__body{display:grid;gap:12px}',
      '.re45__note{margin:0;font-family:var(--font-body,serif);font-size:.95rem;line-height:1.5;color:var(--ink-soft,#4a4a4a)}',
      '.re45__scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}',
      '.re45__grid{display:grid;grid-template-columns:minmax(150px,1.6fr) repeat(6,minmax(64px,1fr)) minmax(64px,1fr);gap:3px;min-width:640px;font-family:var(--font-mono,monospace);font-size:.72rem}',
      '.re45__hdr{padding:6px 4px;color:var(--ink-mute,#7a7a78);text-align:center;font-size:.66rem;letter-spacing:.06em;text-transform:uppercase;line-height:1.3}',
      '.re45__hdr--row{text-align:left}',
      '.re45__fn{padding:8px 4px 2px;color:var(--blueprint,#3553ff);font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;grid-column:1 / -1;border-top:1px solid var(--rule-soft,rgba(26,26,26,.16))}',
      '.re45__row{display:flex;flex-direction:column;justify-content:center;padding:4px 6px;border:1px solid var(--rule-soft,rgba(26,26,26,.16));background:var(--bg-surface,#f3f1e8);color:var(--ink,#1a1a1a);min-height:44px}',
      '.re45__row b{font-weight:600}',
      '.re45__row span{font-size:.64rem;color:var(--ink-mute,#7a7a78);word-break:break-word}',
      '.re45 button.re45__cell{min-height:44px;width:100%;padding:4px;border:1px solid var(--rule-soft,rgba(26,26,26,.16));background:var(--bg,#fafaf5);color:var(--ink,#1a1a1a);font-family:var(--font-mono,monospace);font-size:.72rem;cursor:pointer;transition:transform 140ms cubic-bezier(.23,1,.32,1),border-color 180ms ease,background-color 180ms ease}',
      '.re45 button.re45__cell[data-status="pass"]{background:var(--blueprint-tint,rgba(53,83,255,.08));border-color:var(--blueprint,#3553ff);color:var(--blueprint,#3553ff)}',
      '.re45 button.re45__cell[data-status="fail"]{background:color-mix(in srgb,var(--warn,#b8870f) 18%,var(--bg,#fafaf5));border-color:var(--warn,#b8870f);color:var(--warn,#b8870f)}',
      '.re45 button.re45__cell[data-status="partial"]{border-style:dashed;border-color:var(--warn,#b8870f);color:var(--warn,#b8870f)}',
      '.re45 button.re45__cell[data-status="unknown"]{border-style:dotted;color:var(--ink-mute,#7a7a78)}',
      '.re45 button.re45__cell[aria-pressed="true"]{outline:2px solid var(--ink,#1a1a1a);outline-offset:-2px}',
      '.re45 button.re45__cell:active{transform:scale(.96)}',
      '.re45 button.re45__cell:focus-visible{outline:2px solid var(--blueprint,#3553ff);outline-offset:2px}',
      '@media(hover:hover) and (pointer:fine){.re45 button.re45__cell:hover{border-color:var(--ink,#1a1a1a)}}',
      '.re45__verdict{display:flex;align-items:center;justify-content:center;min-height:44px;padding:4px;border:1px solid var(--blueprint,#3553ff);color:var(--blueprint,#3553ff);font-weight:600}',
      '.re45__verdict[data-status="fail"]{border-color:var(--warn,#b8870f);color:var(--warn,#b8870f)}',
      '.re45__verdict[data-status="unknown"]{border-style:dotted;color:var(--ink-mute,#7a7a78)}',
      '.re45__detail{padding:10px 12px;border:1px solid var(--blueprint,#3553ff);background:var(--bg,#fafaf5);font-family:var(--font-mono,monospace);font-size:.78rem;line-height:1.55;color:var(--ink,#1a1a1a);min-height:72px;word-break:break-word}',
      '.re45__detail[data-status="fail"],.re45__detail[data-status="partial"]{border-color:var(--warn,#b8870f)}',
      '.re45__detail-head{font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-mute,#7a7a78);margin-bottom:4px}',
      '.re45__detail-head b{color:var(--ink,#1a1a1a)}',
      '.re45__legend{display:flex;flex-wrap:wrap;gap:12px;font-family:var(--font-mono,monospace);font-size:.68rem;color:var(--ink-mute,#7a7a78)}',
      '.re45__legend i{display:inline-block;width:12px;height:12px;vertical-align:-2px;margin-right:4px;border:1px solid var(--rule-soft,rgba(26,26,26,.16))}',
      '.re45__legend i[data-status="pass"]{background:var(--blueprint-tint,rgba(53,83,255,.08));border-color:var(--blueprint,#3553ff)}',
      '.re45__legend i[data-status="fail"]{background:color-mix(in srgb,var(--warn,#b8870f) 18%,var(--bg,#fafaf5));border-color:var(--warn,#b8870f)}',
      '.re45__legend i[data-status="partial"]{border-style:dashed;border-color:var(--warn,#b8870f)}',
      '@media(max-width:640px){.re45__grid{font-size:.68rem}}',
      '@media(prefers-reduced-motion:reduce){.re45 button.re45__cell{transition:none!important}.re45 button.re45__cell:active{transform:none!important}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function text(tag, className, content) {
    return el(tag, { class: className }, [content]);
  }

  function fieldEntry(candidate, fieldName) {
    var i;
    for (i = 0; i < candidate.fields.length; i++) if (candidate.fields[i].f === fieldName) return candidate.fields[i];
    return null;
  }

  function failingCount(candidate) {
    var count = 0;
    var i;
    for (i = 0; i < candidate.fields.length; i++) if (candidate.fields[i].s !== 'pass') count++;
    return count;
  }

  function scorecard(host) {
    ensureStyles();
    var pinned = null;
    var detail = el('div', { class: 're45__detail', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    var cells = [];

    function showEntry(candidate, entry, isPinned) {
      while (detail.firstChild) detail.removeChild(detail.firstChild);
      detail.setAttribute('data-status', entry.s);
      var head = el('div', { class: 're45__detail-head' }, [
        el('b', {}, [candidate.id]),
        ' · ' + candidate.fn + ' 声称为 ' + candidate.name + ' · ' + kindLabel(candidate.kind) + ' · ' + FIELD_LABELS[entry.f][0] + ': ' + STATUS_GLYPH[entry.s] + (isPinned ? ' · 已固定' : '')
      ]);
      detail.appendChild(head);
      detail.appendChild(el('div', {}, [evidenceText(entry.e)]));
    }

    function showDefault() {
      while (detail.firstChild) detail.removeChild(detail.firstChild);
      detail.removeAttribute('data-status');
      detail.appendChild(el('div', { class: 're45__detail-head' }, ['证据']));
      detail.appendChild(el('div', {}, ['将指针移到单元格或点击它，查看验证框架为该字段记录的证据译文。再次点击单元格可取消固定。']));
    }

    function refreshPressed() {
      var i;
      for (i = 0; i < cells.length; i++) {
        var pressed = pinned !== null && cells[i].candidate.id === pinned.candidate.id && cells[i].entry.f === pinned.entry.f;
        cells[i].button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      }
    }

    function restore() {
      if (pinned) showEntry(pinned.candidate, pinned.entry, true); else showDefault();
    }

    var grid = el('div', { class: 're45__grid', role: 'table', 'aria-label': '八个候选、六个字段的评分卡' });
    grid.appendChild(text('div', 're45__hdr re45__hdr--row', '候选'));
    var f;
    for (f = 0; f < DATA.fields.length; f++) {
      var label = FIELD_LABELS[DATA.fields[f]];
      grid.appendChild(el('div', { class: 're45__hdr', title: label[1] }, [label[0]]));
    }
    grid.appendChild(text('div', 're45__hdr', '结论'));

    var lastFn = null;
    var c;
    for (c = 0; c < DATA.candidates.length; c++) {
      var candidate = DATA.candidates[c];
      if (candidate.fn !== lastFn) {
        lastFn = candidate.fn;
        grid.appendChild(text('div', 're45__fn', candidate.fn + ' · ' + (candidate.fn === 'f1' ? '.text+0x0 处的 16 字节' : '.text+0x10 处的 46 字节') + ' · 四个候选'));
      }
      grid.appendChild(el('div', { class: 're45__row', role: 'rowheader' }, [
        el('b', {}, [candidate.id]),
        el('span', {}, [kindLabel(candidate.kind) + ' · 声称 ' + candidate.name])
      ]));
      for (f = 0; f < DATA.fields.length; f++) {
        var entry = fieldEntry(candidate, DATA.fields[f]);
        var button = el('button', {
          type: 'button',
          class: 're45__cell',
          'data-status': entry.s,
          'aria-pressed': 'false',
          'aria-label': candidate.id + ' ' + FIELD_LABELS[entry.f][0] + ' ' + STATUS_GLYPH[entry.s] + '。' + evidenceText(entry.e)
        }, [STATUS_GLYPH[entry.s] || entry.s]);
        (function (candidateRef, entryRef, buttonRef) {
          buttonRef.addEventListener('mouseenter', function () { if (!pinned) showEntry(candidateRef, entryRef, false); });
          buttonRef.addEventListener('focus', function () { if (!pinned) showEntry(candidateRef, entryRef, false); });
          buttonRef.addEventListener('mouseleave', restore);
          buttonRef.addEventListener('blur', restore);
          buttonRef.addEventListener('click', function () {
            if (pinned && pinned.candidate.id === candidateRef.id && pinned.entry.f === entryRef.f) pinned = null;
            else pinned = { candidate: candidateRef, entry: entryRef };
            refreshPressed();
            if (pinned) showEntry(candidateRef, entryRef, true); else showEntry(candidateRef, entryRef, false);
          });
        })(candidate, entry, button);
        cells.push({ candidate: candidate, entry: entry, button: button });
        grid.appendChild(button);
      }
      grid.appendChild(el('div', { class: 're45__verdict', 'data-status': candidate.verdict, title: failingCount(candidate) + ' / 6 个字段未通过' }, [STATUS_GLYPH[candidate.verdict]]));
    }

    var legend = el('div', { class: 're45__legend' }, [
      el('span', {}, [el('i', { 'data-status': 'pass' }), '通过']),
      el('span', {}, [el('i', { 'data-status': 'fail' }), '失败']),
      el('span', {}, [el('i', { 'data-status': 'partial' }), '部分：类型一致，名称不同']),
      el('span', {}, ['结论优先级：失败、未知、部分'])
    ]);

    host.appendChild(el('div', { class: 'lf re45' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['AI 评分卡']), el('span', {}, [DATA.candidates.length + ' 个候选，' + DATA.fields.length + ' 个字段，' + DATA.target])]),
      el('div', { class: 'lf-body re45__body' }, [
        el('p', { class: 're45__note' }, ['每行是 f1 或 f2 的一个手写候选重建，每列是评分卡的一个字段。悬停或点击单元格，阅读验证框架在 ' + DATA.host + ' 上记录的证据。结论列汇总六个字段，不能确认时拒绝通过。']),
        el('div', { class: 're45__scroll' }, [grid]),
        detail,
        legend
      ]),
      el('div', { class: 'lf-cap' }, ['蓝色单元格通过。琥珀色单元格失败，证据给出首个差异单元、字节数、无法解析的引用或不匹配的摘要。琥珀色虚线单元格表示部分匹配：类型全部一致，但至少一个名称不同，并显示字符错误率。两个候选的所有字段都通过。还有一个候选编译后字节与原始代码相同、所有输入都通过，却因报告引用对象中不存在的辅助函数、地址和字符串而失败。'])
    ]));
    showDefault();
  }

  LF.register({ 're-45-scorecard': scorecard });
})();
