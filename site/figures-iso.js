(function () {
  'use strict';

  var LF = window.LF;
  if (!LF) return;

  var el = LF.el;
  var svgEl = LF.svgEl;
  var AX = 0.8660254;
  var AY = 0.5;
  var SHINE = 0.45;
  var SHADE = 0.16;
  var SCALE = 1.5;
  var ROW_SPREAD = 1.6;

  var MACHINES = {
    'self-attention': {
      title: '自注意力：逐个部件看',
      parts: [
        { id: 'x', label: 'X', note: 'token 嵌入', col: 40, row: 0, size: 34, h: 26, kind: 'stack' },
        { id: 'wq', label: 'Wq', note: 'query 投影', col: 150, row: -52, size: 26, h: 10 },
        { id: 'wk', label: 'Wk', note: 'key 投影', col: 150, row: 0, size: 26, h: 10 },
        { id: 'wv', label: 'Wv', note: 'value 投影', col: 150, row: 52, size: 26, h: 10 },
        { id: 'scores', label: 'Q·Kᵀ/√d', note: '缩放后的分数', col: 270, row: -26, size: 36, h: 14 },
        { id: 'softmax', label: 'softmax', note: '每行之和为 1', col: 375, row: -26, size: 15, h: 22, kind: 'drum' },
        { id: 'mix', label: '权重·V', note: '加权后的 value', col: 470, row: 26, size: 32, h: 20 },
        { id: 'out', label: '输出', note: '每个 token 一个向量', col: 565, row: 26, size: 28, h: 26, kind: 'stack' }
      ],
      flows: [
        { id: 'x-wq', from: 'x', to: 'wq' }, { id: 'x-wk', from: 'x', to: 'wk' }, { id: 'x-wv', from: 'x', to: 'wv' },
        { id: 'wq-scores', from: 'wq', to: 'scores' }, { id: 'wk-scores', from: 'wk', to: 'scores' },
        { id: 'scores-softmax', from: 'scores', to: 'softmax' }, { id: 'softmax-mix', from: 'softmax', to: 'mix' },
        { id: 'wv-mix', from: 'wv', to: 'mix' }, { id: 'mix-out', from: 'mix', to: 'out' }
      ],
      intro: '共八个部件。滚动到“动手构建”中的对应步骤时，该步骤构建的部件会亮起。',
      steps: [
        { focus: ['softmax'], flows: [], caption: 'softmax：减去每行最大值，再求指数并除以总和' },
        { focus: ['scores', 'softmax', 'mix'], flows: ['wq-scores', 'wk-scores', 'scores-softmax', 'softmax-mix', 'wv-mix'], caption: 'scores = Q·Kᵀ / √d，逐行计算 softmax，再与 V 加权求和' },
        { focus: ['wq', 'wk', 'wv'], flows: ['x-wq', 'x-wk', 'x-wv'], caption: '可训练矩阵 Wq、Wk、Wv 将 X 投影为 Q、K 和 V' },
        { focus: ['x', 'wq', 'wk', 'wv', 'scores', 'softmax', 'mix', 'out'], flows: 'all', caption: '对一个真实句子执行一次前向计算' },
        { focus: ['softmax', 'out'], flows: ['scores-softmax'], caption: '读取权重矩阵：每个 token 会关注哪些 token' }
      ]
    },
    'mini-gpt': {
      title: '迷你 GPT：逐个部件看',
      parts: [
        { id: 'tokens', label: 'ID', note: 'token ID', col: 30, row: 0, size: 26, h: 12, kind: 'stack' },
        { id: 'tok', label: 'wte', note: 'token 嵌入', col: 115, row: -30, size: 26, h: 18 },
        { id: 'pos', label: 'wpe', note: '位置嵌入', col: 115, row: 30, size: 26, h: 18 },
        { id: 'attn', label: '掩码', note: '因果自注意力', col: 215, row: 0, size: 30, h: 22 },
        { id: 'heads', label: '12 个头', note: '多头注意力', col: 305, row: 0, size: 30, h: 22, kind: 'stack' },
        { id: 'block', label: '模块', note: 'LayerNorm、注意力、MLP、残差', col: 395, row: 0, size: 32, h: 34, kind: 'stack' },
        { id: 'head', label: 'lm_head', note: '词表上的 logits', col: 480, row: 0, size: 26, h: 16 },
        { id: 'loss', label: '损失', note: '下一个 token 的交叉熵', col: 570, row: -34, size: 14, h: 18, kind: 'drum' },
        { id: 'sample', label: '采样', note: '选出下一个 token', col: 570, row: 34, size: 14, h: 18, kind: 'drum' }
      ],
      flows: [
        { id: 'tokens-tok', from: 'tokens', to: 'tok' }, { id: 'tokens-pos', from: 'tokens', to: 'pos' },
        { id: 'tok-attn', from: 'tok', to: 'attn' }, { id: 'pos-attn', from: 'pos', to: 'attn' },
        { id: 'attn-heads', from: 'attn', to: 'heads' }, { id: 'heads-block', from: 'heads', to: 'block' },
        { id: 'block-head', from: 'block', to: 'head' }, { id: 'head-loss', from: 'head', to: 'loss' },
        { id: 'head-sample', from: 'head', to: 'sample' }
      ],
      intro: '共九个部件，从 token ID 一直到下一个 token。下面的每一步都会构建其中一个部件。',
      steps: [
        { focus: ['tokens', 'tok', 'pos'], flows: ['tokens-tok', 'tokens-pos'], caption: '将 token 嵌入与位置嵌入相加' },
        { focus: ['attn'], flows: ['tok-attn', 'pos-attn'], caption: '单个注意力头；softmax 前将未来位置遮蔽为 -inf' },
        { focus: ['heads'], flows: ['attn-heads'], caption: '将 768 维拆成 12 个 64 维注意力头，再拼接' },
        { focus: ['block'], flows: ['heads-block'], caption: 'LayerNorm、注意力、残差、LayerNorm、MLP、残差' },
        { focus: ['tokens', 'tok', 'pos', 'attn', 'heads', 'block', 'head'], flows: ['tokens-tok', 'tokens-pos', 'tok-attn', 'pos-attn', 'attn-heads', 'heads-block', 'block-head'], caption: '堆叠模块，再添加输出投影' },
        { focus: ['head', 'loss'], flows: ['head-loss'], caption: '训练：计算下一个 token 的交叉熵，再执行一次梯度更新' },
        { focus: ['head', 'sample'], flows: ['head-sample'], caption: '生成：采样一个 token，将它追加到输入，再次运行' }
      ]
    },
    'kv-cache': {
      title: '使用 KV 缓存解码',
      parts: [
        { id: 'token', label: 'x_t', note: '最新的 token', col: 40, row: 0, size: 22, h: 12 },
        { id: 'proj', label: 'q k v', note: '只投影新 token', col: 145, row: 0, size: 30, h: 18 },
        { id: 'kc', label: 'K 缓存', note: '所有历史 token 的 key', col: 265, row: -40, size: 17, h: 30, kind: 'drum' },
        { id: 'vc', label: 'V 缓存', note: '所有历史 token 的 value', col: 265, row: 40, size: 17, h: 30, kind: 'drum' },
        { id: 'attn', label: '注意力', note: '用一个 query 与全部 key 计算注意力', col: 380, row: 0, size: 32, h: 18 },
        { id: 'tiles', label: '分块', note: '每次对一个块计算 softmax', col: 480, row: 0, size: 30, h: 10, kind: 'stack' },
        { id: 'out', label: '输出', note: '作为下一个 token 的上下文', col: 570, row: 0, size: 24, h: 18 }
      ],
      flows: [
        { id: 'token-proj', from: 'token', to: 'proj' }, { id: 'proj-kc', from: 'proj', to: 'kc' }, { id: 'proj-vc', from: 'proj', to: 'vc' },
        { id: 'proj-attn', from: 'proj', to: 'attn' }, { id: 'kc-attn', from: 'kc', to: 'attn' }, { id: 'vc-attn', from: 'vc', to: 'attn' },
        { id: 'attn-tiles', from: 'attn', to: 'tiles' }, { id: 'tiles-out', from: 'tiles', to: 'out' }
      ],
      intro: '共七个部件。每生成一个 token，缓存就增加一行，无须重新计算历史内容。',
      steps: [
        { focus: ['token', 'proj', 'kc', 'vc', 'attn'], flows: ['token-proj', 'proj-kc', 'proj-vc', 'proj-attn', 'kc-attn', 'vc-attn'], caption: '追加新的 k 和 v；用一个 query 计算注意力' },
        { focus: ['attn', 'tiles'], flows: ['attn-tiles'], caption: '在线 softmax：持续更新最大值和总和，无须构造完整 N×N 矩阵' },
        { focus: ['token', 'proj', 'kc', 'vc', 'attn', 'tiles', 'out'], flows: 'all', caption: '100 个 token：朴素计算需 5,050 次注意力运算，使用缓存只需 100 次' }
      ]
    },
    'multi-token-prediction': {
      title: '多 token 预测（MTP）',
      parts: [
        { id: 'h', label: 'h_t', note: '主模型的隐藏状态', col: 30, row: 0, size: 26, h: 20, kind: 'stack' },
        { id: 'embed', label: 'e_t', note: '当前 token 的嵌入', col: 130, row: -34, size: 24, h: 16 },
        { id: 'norm', label: 'Norm', note: '归一化隐藏状态', col: 130, row: 34, size: 24, h: 16 },
        { id: 'shared', label: '共享模块', note: '共享注意力与前馈权重', col: 255, row: 0, size: 34, h: 24, kind: 'stack' },
        { id: 'head1', label: '预测 t+1', note: '下一 token 的预测头', col: 395, row: -40, size: 28, h: 18 },
        { id: 'head2', label: '预测 t+2', note: '后续 token 的预测头', col: 395, row: 0, size: 28, h: 18 },
        { id: 'head3', label: '预测 t+3', note: '更远 token 的预测头', col: 395, row: 40, size: 28, h: 18 },
        { id: 'loss', label: '辅助损失', note: '加权训练损失', col: 525, row: 0, size: 30, h: 18, kind: 'drum' },
        { id: 'verify', label: '校验', note: '推理时仍由主模型验证', col: 640, row: 0, size: 25, h: 18 }
      ],
      flows: [
        { id: 'h-embed', from: 'h', to: 'embed' }, { id: 'h-norm', from: 'h', to: 'norm' },
        { id: 'embed-shared', from: 'embed', to: 'shared' }, { id: 'norm-shared', from: 'norm', to: 'shared' },
        { id: 'shared-head1', from: 'shared', to: 'head1' }, { id: 'shared-head2', from: 'shared', to: 'head2' }, { id: 'shared-head3', from: 'shared', to: 'head3' },
        { id: 'head1-loss', from: 'head1', to: 'loss' }, { id: 'head2-loss', from: 'head2', to: 'loss' }, { id: 'head3-loss', from: 'head3', to: 'loss' },
        { id: 'head1-verify', from: 'head1', to: 'verify' }, { id: 'head2-verify', from: 'head2', to: 'verify' }, { id: 'head3-verify', from: 'head3', to: 'verify' }
      ],
      intro: 'MTP 训练时用多个轻量预测头预测后续 token。推理阶段仍由主模型验证预测结果。',
      steps: [
        { focus: ['h', 'embed', 'norm'], flows: ['h-embed', 'h-norm'], caption: '把主模型隐藏状态与当前 token 嵌入组合起来' },
        { focus: ['embed', 'norm', 'shared'], flows: ['embed-shared', 'norm-shared'], caption: '预测模块复用主模型的注意力和前馈权重' },
        { focus: ['shared', 'head1', 'head2', 'head3'], flows: ['shared-head1', 'shared-head2', 'shared-head3'], caption: '多个预测头分别预测 t+1、t+2 等后续 token' },
        { focus: ['head1', 'head2', 'head3', 'loss'], flows: ['head1-loss', 'head2-loss', 'head3-loss'], caption: '训练时对多个位置计算辅助损失，并按权重合并' },
        { focus: ['head1', 'head2', 'head3', 'verify'], flows: ['head1-verify', 'head2-verify', 'head3-verify'], caption: '推理时由主模型验证预测 token；MTP 头本身不会直接提交结果' }
      ]
    }
  };

  function ensureStyles() {
    if (document.getElementById('lf-iso-styles')) return;
    var style = document.createElement('style');
    style.id = 'lf-iso-styles';
    style.textContent = [
      '.lf-iso{--iso-shine:#ffffff;--iso-shade:#1a1a1a}',
      '[data-theme="dark"] .lf-iso{--iso-shine:#3a4266;--iso-shade:#000000}',
      '.lesson-figure.lf-animated:has(> .lf-iso){border:0;padding:0;background:none}',
      '.lf-iso{margin:0}',
      '.lf-iso .lf-body{padding:12px 16px 16px}',
      '.iso-caption{min-height:2.6em;margin:0 0 8px;font-family:var(--font-mono,monospace);font-size:.78rem;line-height:1.5;color:var(--ink-soft,#4a4a4a)}',
      '.iso-caption b{color:var(--blueprint,#3553ff);font-weight:500;letter-spacing:.08em;margin-right:8px}',
      '.iso-stage{overflow-x:auto;overscroll-behavior-x:contain}',
      '.iso-stage svg{display:block;width:100%;min-width:500px;height:auto}',
      '.iso-part{transition:opacity 220ms var(--ease-out,cubic-bezier(.23,1,.32,1))}',
      '.iso-part .iso-ink{stroke:var(--ink-soft,#4a4a4a);stroke-width:1.2;fill:none;stroke-linejoin:round;transition:stroke 220ms var(--ease-out,cubic-bezier(.23,1,.32,1))}',
      '.iso-part .iso-edge{stroke:var(--ink-soft,#4a4a4a);stroke-opacity:.45;stroke-width:.8;fill:none}',
      '.iso-part .iso-face{fill:var(--bg-surface,#f3f1e8)}',
      '.iso-part .iso-base{fill:var(--bg,#fafaf5)}',
      '.iso-part .iso-shine{fill:var(--iso-shine);fill-opacity:' + SHINE + '}',
      '.iso-part .iso-shade{fill:var(--iso-shade);fill-opacity:' + SHADE + '}',
      '.iso-part .iso-tint{fill:var(--blueprint,#3553ff);fill-opacity:0;transition:fill-opacity 220ms var(--ease-out,cubic-bezier(.23,1,.32,1))}',
      '.iso-part .iso-shadow{fill:var(--blueprint,#3553ff);fill-opacity:.1}',
      '.iso-part .iso-num{fill:var(--bg,#fafaf5);stroke:var(--ink-soft,#4a4a4a);stroke-width:1}',
      '.iso-part .iso-num-text{font-family:var(--font-mono,monospace);font-size:14px;fill:var(--ink,#1a1a1a);text-anchor:middle}',
      '.iso-part.is-on .iso-ink{stroke:var(--blueprint,#3553ff);stroke-width:1.8}',
      '.iso-part.is-on .iso-tint{fill-opacity:.2}',
      '.iso-part.is-on .iso-num{stroke:var(--blueprint,#3553ff);fill:var(--blueprint,#3553ff)}',
      '.iso-part.is-on .iso-num-text{fill:var(--bg,#fafaf5)}',
      '.lf-iso.has-step .iso-part:not(.is-on){opacity:.42}',
      '.iso-flow{fill:none;stroke:var(--ink-mute,#7a7a78);stroke-width:1;stroke-dasharray:3 3;transition:opacity 220ms var(--ease-out,cubic-bezier(.23,1,.32,1))}',
      '.lf-iso.has-step .iso-flow:not(.is-on){opacity:.3}',
      '.iso-flow.is-on{stroke:var(--blueprint,#3553ff);stroke-width:1.8;stroke-dasharray:none;animation:iso-draw 420ms var(--ease-out,cubic-bezier(.23,1,.32,1)) both}',
      '.iso-head{fill:var(--ink-mute,#7a7a78)}',
      '.iso-head.is-on{fill:var(--blueprint,#3553ff)}',
      '@keyframes iso-draw{from{stroke-dasharray:var(--iso-len,200);stroke-dashoffset:var(--iso-len,200)}to{stroke-dasharray:var(--iso-len,200);stroke-dashoffset:0}}',
      '.iso-steps{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0}',
      '.iso-steps button{min-width:40px;min-height:32px;padding:4px 8px;border:1px solid var(--rule-soft,#ddd);background:var(--bg,#fafaf5);color:var(--ink-soft,#4a4a4a);font-family:var(--font-mono,monospace);font-size:.72rem;cursor:pointer;transition:transform 160ms var(--ease-out,cubic-bezier(.23,1,.32,1))}',
      '.iso-steps button:active{transform:scale(.96)}',
      '.iso-steps button[aria-pressed="true"]{border-color:var(--blueprint,#3553ff);background:var(--blueprint,#3553ff);color:var(--bg,#fafaf5)}',
      '.iso-key{list-style:none;margin:12px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:4px 16px;font-family:var(--font-mono,monospace);font-size:.74rem;line-height:1.45;color:var(--ink-mute,#7a7a78)}',
      '.iso-key li{display:flex;gap:8px;transition:color 220ms var(--ease-out,cubic-bezier(.23,1,.32,1))}',
      '.iso-key .iso-key-n{color:var(--ink-mute,#7a7a78);min-width:2ch}',
      '.iso-key .iso-key-label{color:var(--ink,#1a1a1a)}',
      '.iso-key li.is-on .iso-key-n,.iso-key li.is-on .iso-key-label{color:var(--blueprint,#3553ff)}',
      '@media (prefers-reduced-motion: reduce){.iso-part,.iso-part *,.iso-flow,.iso-key li{transition:none!important}.iso-flow.is-on{animation:none}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function view(ox, oy) {
    function P(x, y, z) { return [ox + (x - y) * AX, oy + (x + y) * AY - (z || 0)]; }
    function at(sx, c) {
      var diff = (sx - ox) / AX;
      return [(diff + c) / 2, (c - diff) / 2];
    }
    return { P: P, at: at };
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function centerOf(v, part) { return v.at(part.col, part.row * ROW_SPREAD); }

  function pts(list) {
    return list.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
  }

  function poly(cls, list) { return svgEl('polygon', { 'class': cls, points: pts(list) }); }

  function hull(points) {
    var sorted = points.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    function half(list) {
      var out = [];
      list.forEach(function (p) {
        while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
        out.push(p);
      });
      out.pop();
      return out;
    }
    return half(sorted).concat(half(sorted.slice().reverse()));
  }

  function shadow(g, v, x, y, w, d, h, z) {
    var reach = Math.min(h * 0.6, 18);
    var corners = [];
    [[x, y], [x + w, y], [x + w, y + d], [x, y + d]].forEach(function (c) {
      corners.push(v.P(c[0], c[1], z), v.P(c[0] + reach, c[1] - reach * 0.35, z));
    });
    g.appendChild(poly('iso-shadow', hull(corners)));
  }

  function box(g, v, x, y, z, w, d, h) {
    var x1 = x + w, y1 = y + d, z1 = z + h;
    var P = v.P;
    var top = [P(x, y, z1), P(x1, y, z1), P(x1, y1, z1), P(x, y1, z1)];
    var end = [P(x1, y, z), P(x1, y1, z), P(x1, y1, z1), P(x1, y, z1)];
    var front = [P(x, y1, z), P(x1, y1, z), P(x1, y1, z1), P(x, y1, z1)];
    var outline = [P(x, y, z1), P(x1, y, z1), P(x1, y, z), P(x1, y1, z), P(x, y1, z), P(x, y1, z1)];
    g.appendChild(poly('iso-base', outline));
    [[top, 'iso-shine'], [front, ''], [end, 'iso-shade']].forEach(function (pair) {
      g.appendChild(poly('iso-face', pair[0]));
      if (pair[1]) g.appendChild(poly(pair[1], pair[0]));
      g.appendChild(poly('iso-tint', pair[0]));
    });
    var near = P(x1, y1, z1);
    [P(x1, y, z1), P(x, y1, z1), P(x1, y1, z)].forEach(function (far) {
      g.appendChild(svgEl('polyline', { 'class': 'iso-edge', points: pts([near, far]) }));
    });
    g.appendChild(poly('iso-ink', outline));
  }

  function drum(g, v, cx, cy, z, r, h) {
    var rx = r * Math.SQRT2 * AX;
    var ry = r * Math.SQRT2 * AY;
    var t = v.P(cx, cy, z + h);
    var b = v.P(cx, cy, z);
    var side = [[t[0] - rx, t[1]]];
    for (var i = 0; i <= 16; i++) {
      var a = Math.PI - (Math.PI * i) / 16;
      side.push([b[0] + rx * Math.cos(a), b[1] + ry * Math.sin(a)]);
    }
    side.push([t[0] + rx, t[1]]);
    g.appendChild(poly('iso-base', side));
    g.appendChild(poly('iso-face', side));
    g.appendChild(poly('iso-shade', side));
    g.appendChild(poly('iso-tint', side));
    g.appendChild(poly('iso-ink', side));
    var attrsTop = { cx: t[0].toFixed(1), cy: t[1].toFixed(1), rx: rx.toFixed(1), ry: ry.toFixed(1) };
    ['iso-face', 'iso-shine', 'iso-tint', 'iso-ink'].forEach(function (cls) {
      var e = svgEl('ellipse', attrsTop);
      e.setAttribute('class', cls);
      g.appendChild(e);
    });
    var mid = v.P(cx, cy, z + h / 2);
    return { top: t, left: mid[0] - rx, right: mid[0] + rx, mid: mid[1] };
  }

  function drawPart(svg, v, part, index) {
    var g = svgEl('g', { 'class': 'iso-part', 'data-part': part.id });
    var c = centerOf(v, part);
    var s = part.size * SCALE;
    var ph = part.h * SCALE;
    var anchor;
    if (part.kind === 'drum') {
      shadow(g, v, c[0] - s, c[1] - s, s * 2, s * 2, ph, 0);
      var dr = drum(g, v, c[0], c[1], 0, s, ph);
      anchor = { top: dr.top, left: [dr.left, dr.mid], right: [dr.right, dr.mid] };
    } else {
      var x = c[0] - s / 2, y = c[1] - s / 2;
      shadow(g, v, x, y, s, s, ph, 0);
      if (part.kind === 'stack') {
        var layer = ph / 3;
        for (var k = 0; k < 3; k++) box(g, v, x, y, k * layer, s, s, layer - 2);
      } else {
        box(g, v, x, y, 0, s, s, ph);
      }
      anchor = { top: v.P(x + s / 2, y + s / 2, ph), left: v.P(x, y + s, ph / 2), right: v.P(x + s, y, ph / 2) };
    }
    g.appendChild(svgEl('circle', { 'class': 'iso-num', cx: anchor.top[0].toFixed(1), cy: (anchor.top[1] - 3).toFixed(1), r: 12 }));
    var label = svgEl('text', { 'class': 'iso-num-text', x: anchor.top[0].toFixed(1), y: (anchor.top[1] + 2).toFixed(1) });
    label.textContent = pad2(index + 1);
    g.appendChild(label);
    svg.appendChild(g);
    return anchor;
  }

  function drawFlow(layer, a, b, id) {
    var from = a.right, to = b.left;
    var dx = to[0] - from[0], dy = to[1] - from[1];
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len;
    var start = [from[0] + ux * 3, from[1] + uy * 3];
    var end = [to[0] - ux * 7, to[1] - uy * 7];
    var path = svgEl('path', { 'class': 'iso-flow', 'data-flow': id, d: 'M' + start[0].toFixed(1) + ' ' + start[1].toFixed(1) + ' L' + end[0].toFixed(1) + ' ' + end[1].toFixed(1) });
    path.style.setProperty('--iso-len', Math.round(len));
    var tip = [to[0] - ux * 2, to[1] - uy * 2];
    var px = -uy * 3.5, py = ux * 3.5;
    var head = svgEl('polygon', { 'class': 'iso-head', 'data-flow': id, points: pts([tip, [end[0] + px, end[1] + py], [end[0] - px, end[1] - py]]) });
    layer.appendChild(path);
    layer.appendChild(head);
  }

  function bounds(svg) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    Array.prototype.forEach.call(svg.querySelectorAll('polygon, polyline'), function (node) {
      node.getAttribute('points').split(' ').forEach(function (pair) {
        var p = pair.split(',');
        var x = +p[0], y = +p[1];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });
    });
    return [Math.floor(minX - 14), Math.floor(minY - 16), Math.ceil(maxX - minX + 28), Math.ceil(maxY - minY + 30)];
  }

  function isoMachine(host, cfg) {
    ensureStyles();
    var spec = MACHINES[(cfg && cfg.machine) || ''];
    if (!spec) throw new Error('unknown iso machine ' + (cfg && cfg.machine));
    var root = el('div', { 'class': 'lf lf-iso' });
    var head = el('div', { 'class': 'lf-head' }, [el('span', { 'class': 'lf-label' }, [spec.title]), el('span', {}, ['等距图解 · 随课程步骤联动'])]);
    var body = el('div', { 'class': 'lf-body' });
    var caption = el('p', { 'class': 'iso-caption', 'aria-live': 'polite' });
    var stage = el('div', { 'class': 'iso-stage' });
    var svg = svgEl('svg', { role: 'img', 'aria-label': spec.title + ': ' + spec.parts.map(function (p) { return p.label + ' (' + p.note + ')'; }).join(', ') });
    var v = view(0, 140);
    var flowLayer = svgEl('g', {});
    svg.appendChild(flowLayer);
    var anchors = {};
    var order = spec.parts.map(function (p, i) { return { part: p, index: i }; });
    order.sort(function (a, b) {
      var ca = centerOf(v, a.part), cb = centerOf(v, b.part);
      return (ca[0] + ca[1]) - (cb[0] + cb[1]);
    });
    order.forEach(function (item) { anchors[item.part.id] = drawPart(svg, v, item.part, item.index); });
    spec.flows.forEach(function (flow) { drawFlow(flowLayer, anchors[flow.from], anchors[flow.to], flow.id); });
    stage.appendChild(svg);
    var key = el('ol', { 'class': 'iso-key' });
    spec.parts.forEach(function (p, i) {
      key.appendChild(el('li', { 'data-part': p.id }, [
        el('span', { 'class': 'iso-key-n' }, [pad2(i + 1)]),
        el('span', {}, [el('span', { 'class': 'iso-key-label' }, [p.label]), ' ' + p.note])
      ]));
    });
    var stepRow = el('div', { 'class': 'iso-steps', role: 'group', 'aria-label': '步骤' });
    var buttons = spec.steps.map(function (step, i) {
      var b = el('button', { type: 'button', 'aria-pressed': 'false', title: step.caption }, ['第 ' + (i + 1) + ' 步']);
      b.addEventListener('click', function () {
        var next = state === i ? -1 : i;
        set(next);
        host.dispatchEvent(new CustomEvent('lf:step-request', { bubbles: true, detail: { index: next } }));
      });
      stepRow.appendChild(b);
      return b;
    });
    body.appendChild(caption);
    body.appendChild(stage);
    body.appendChild(stepRow);
    body.appendChild(key);
    root.appendChild(head);
    root.appendChild(body);
    host.appendChild(root);
    svg.setAttribute('viewBox', bounds(svg).join(' '));

    var state = -2;
    function set(i) {
      if (i === state) return;
      state = i;
      var step = spec.steps[i];
      root.classList.toggle('has-step', !!step);
      var focus = step ? step.focus : [];
      var flows = step ? (step.flows === 'all' ? spec.flows.map(function (f) { return f.id; }) : step.flows) : [];
      Array.prototype.forEach.call(root.querySelectorAll('[data-part]'), function (node) {
        node.classList.toggle('is-on', focus.indexOf(node.getAttribute('data-part')) !== -1);
      });
      Array.prototype.forEach.call(root.querySelectorAll('[data-flow]'), function (node) {
        node.classList.toggle('is-on', flows.indexOf(node.getAttribute('data-flow')) !== -1);
      });
      buttons.forEach(function (b, n) { b.setAttribute('aria-pressed', String(n === i)); });
      caption.innerHTML = '';
      if (step) {
        caption.appendChild(el('b', {}, ['步骤 ' + (i + 1) + ' / ' + spec.steps.length]));
        caption.appendChild(document.createTextNode(step.caption));
      } else {
        caption.appendChild(document.createTextNode(spec.intro));
      }
    }
    set(-1);

    function onStep(e) { set(e.detail && typeof e.detail.index === 'number' ? e.detail.index : -1); }
    host.addEventListener('lf:step', onStep);
    host.setAttribute('data-sync', 'steps');
    host.setAttribute('data-step-count', String(spec.steps.length));
    setTimeout(function () {
      host.dispatchEvent(new CustomEvent('lf:sync-ready', { bubbles: true, detail: { steps: spec.steps.length } }));
    }, 0);
    return function () { host.removeEventListener('lf:step', onStep); };
  }

  window.AIFS_ISO_MACHINES = MACHINES;
  LF.register({ 'iso-machine': isoMachine });
})();
