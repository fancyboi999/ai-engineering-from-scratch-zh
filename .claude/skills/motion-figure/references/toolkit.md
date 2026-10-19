# LF 工具与两个完整示例

课程运行时在页面提供 window.LF。图模块用它创建 DOM、SVG、控件并按名称注册图表。本文件列出全部函数、挂载顺序、两个完整模块，以及站外预览页。

## window.LF 函数

| 函数 | 行为 |
|---|---|
| `LF.el(tag, attrs, kids)` | 创建 HTML 元素。class 设置 className，html 设置 innerHTML，kids 中字符串变为文本节点 |
| `LF.svgEl(tag, attrs, kids)` | 创建 SVG 元素。没有 repeatCount 的动画补 repeatCount=1、fill=freeze。带 fill=freeze 的循环改为一次。几何属性上的 animate 循环也改为一次 |
| `LF.smil(tag, attrs, kids)` | 同 LF.svgEl，用来强调该节点是动画 |
| `LF.slider(state, key, label, min, max, step, fmt)` | 创建带标签滑块。输入时把 state[key] 设为数值，更新可见值、aria-valuetext 并调用 state._render。fmt 格式化显示值 |
| `LF.select(state, key, label, options)` | 创建带标签选择框。options 是 [文字,值] 列表。改变时更新字符串 state[key] 并调用 state._render |
| `LF.register(map)` | 把 name:function 加入注册表。同名后注册函数替换先前函数 |
| `LF.uid(prefix)` | 返回 lf-3 等新 ID。每图在 render 外调用一次 |
| `LF.clamp(x, lo, hi)`、`LF.lerp(a, b, t)` | 数值辅助函数 |
| `LF.fmtInt(n)`、`LF.fmtSeq(n)` | 将 12345 格式化为 12,345，将 8192 格式化为 8K |
| `LF.motion` | feedback 180ms、enter 220ms、press 160ms 与两种缓动曲线 |
| `LF.autoplay`、`LF.raf` | 旧图的脚本动画辅助函数，新图使用 SMIL，不再使用它们 |
| `LF.registerDisposer(host, fn)` | 注册课程卸载宿主时运行的清理函数 |

## 图函数

签名为 `function (host, cfg)`。

- host 是 div.lesson-figure，向它添加一个 lf 卡片。
- cfg 是围栏名称后面的 JSON。没有 JSON 或 JSON 错误时为 {}。
- 可返回清理函数，课程变化时运行时调用它。
- 需要改变静态帧时，在 SVG 挂载前设置 `host.setAttribute('data-static-time', '3.2')`。

## 滑块渲染契约

LF.slider 和 LF.select 首次调用时包裹 state._render，保留旧 SVG 节点并复制新属性，让 CSS 能在两次渲染间过渡。因此：

1. 首次控件调用前定义 state._render，后定义的不会被包裹，会每次替换节点。
2. render 中每次按相同顺序清空并重建子元素。协调器按位置与标签匹配新旧节点。
3. 每次给节点全部属性，新节点缺少的属性会被删除，包括运行时添加的 ID。

## 挂载顺序

1. Markdown 解析器把 figure 围栏转为 `<div class="lesson-figure" data-figure="name {json}">`。
2. 构建器读取图名，在 figures*.js 中查找带引号名称，写入提供者清单。没有提供者时以 Figure IDs have no provider 停止。
3. 课程页按固定顺序逐个加载所需提供者。
4. mountLessonFigures 查找未挂载宿主，在 try 中调用图函数。
5. 补充缺失的控件标签、SVG title、desc、role=img。
6. 宿主含 SVG 时添加 lf-animated 类。
7. 存在动画则加暂停按钮，有一次性动画则加重播按钮。
8. 观察减少动态效果、打印、标签页可见性与视口位置。threshold=0.02 的 IntersectionObserver 暂停屏幕外图表。

## 示例 1：滑块组件

模块注册 context-budget，遵守全部组件规则。使用 ES5，先定义 render 再创建滑块。ID 只创建一次，每次清空重建子元素，用长度绘制条形。

````markdown
```figure
context-budget {"windowK": 64}
```
````

```js
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl, slider = LF.slider;
  var INK = 'var(--ink,#1a1a1a)', MUTE = 'var(--ink-mute,#7a7a78)';
  var BP = 'var(--blueprint,#3553ff)', WARN = 'var(--warn,#b8870f)';
  var RULE = 'var(--rule-soft,rgba(26,26,26,0.16))';

  function contextBudget(host, cfg) {
    var WINDOW = (cfg && cfg.windowK) || 128;
    var state = { prompt: 24, reserve: 8 };
    var W = 520, H = 120, X0 = 20, BAR = 480, Y = 56;
    var titleId = LF.uid('lf-context-budget-title');
    var descId = LF.uid('lf-context-budget-desc');
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-labelledby': titleId + ' ' + descId });
    var num = el('span', { class: 'lf-num' });
    var meta = el('div', { class: 'lf-meta' });
    var formula = el('div', { class: 'lf-formula' });

    function bar(from, len, color) {
      var start = Math.min(from, WINDOW);
      var size = Math.max(0, Math.min(len, WINDOW - start));
      var x = X0 + start / WINDOW * BAR;
      var w = size / WINDOW * BAR;
      return svgEl('path', { d: 'M' + x.toFixed(1) + ' ' + Y + 'h' + w.toFixed(1), stroke: color, 'stroke-width': '18', fill: 'none' });
    }
    function label(x, y, s, fill, anchor) {
      return svgEl('text', { x: x, y: y, 'text-anchor': anchor, 'font-family': 'var(--font-mono,monospace)', 'font-size': '14', fill: fill }, [document.createTextNode(s)]);
    }

    state._render = function () {
      var free = WINDOW - state.prompt - state.reserve;
      var over = free < 0;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.appendChild(svgEl('title', { id: titleId }, [document.createTextNode('Context window budget')]));
      svg.appendChild(svgEl('desc', { id: descId }, [document.createTextNode('A prompt of ' + state.prompt + 'K tokens and an output reserve of ' + state.reserve + 'K tokens inside a ' + WINDOW + 'K window.')]));
      svg.appendChild(bar(0, WINDOW, RULE));
      svg.appendChild(bar(0, state.prompt, BP));
      svg.appendChild(bar(state.prompt, state.reserve, over ? WARN : MUTE));
      svg.appendChild(label(X0, 34, 'prompt ' + state.prompt + 'K', BP, 'start'));
      svg.appendChild(label(X0 + BAR, 34, 'window ' + WINDOW + 'K', MUTE, 'end'));
      svg.appendChild(label(X0, 94, over ? 'over the window by ' + (-free) + 'K' : free + 'K free for history and tools', over ? WARN : INK, 'start'));
      num.innerHTML = Math.max(0, free) + ' <small>K tokens free</small>';
      meta.textContent = over ? 'the request does not fit: cut the prompt or the reserve' : Math.round(free / WINDOW * 100) + '% of the window is free';
      formula.textContent = 'free = window - prompt - reserve = ' + WINDOW + ' - ' + state.prompt + ' - ' + state.reserve;
    };

    var grid = el('div', { class: 'lf-grid' }, [
      slider(state, 'prompt', 'prompt (K tokens)', 1, 64, 1),
      slider(state, 'reserve', 'output reserve (K tokens)', 1, 32, 1)
    ]);
    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['CONTEXT BUDGET']), el('span', {}, ['drag the prompt size'])]),
      el('div', { class: 'lf-body' }, [grid, el('div', { class: 'lf-out' }, [svg, el('div', { style: 'margin-top:10px' }, [num]), meta, formula])]),
      el('div', { class: 'lf-cap' }, ['Blue is the prompt and grey is the space kept for the answer. The rest of the window holds history and tool results. When the two parts do not fit in the window, the reserve turns amber and the line under the bar gives the overflow.'])
    ]));
    state._render();
  }

  LF.register({ 'context-budget': contextBudget });
})();
```

测试应观察到：

- prompt=64、reserve=32 时，数值为 0，条下说明溢出量。
- 两个滑块都为 1，64K 窗口剩余 62。
- 每次移动后 desc ID 不变。

## 示例 2：SMIL 动画图

模块注册 request-path，含 25 个 SVG 元素。三个框错开 0.2 秒入场。4 秒循环使点沿路径运动，并用覆盖层把中间框变蓝。默认 1.5 秒静态帧中全部框可见，点位于路径左端。

````markdown
```figure
request-path
```
````

```js
(function () {
  'use strict';
  var LF = window.LF;
  if (!LF) { return; }
  var el = LF.el, svgEl = LF.svgEl;
  var SPL = '0.23 1 0.32 1';
  var INK = 'var(--ink,#1a1a1a)', MUTE = 'var(--ink-mute,#7a7a78)';
  var BP = 'var(--blueprint,#3553ff)', SURF = 'var(--bg-surface,#f3f1e8)';
  var RULE = 'var(--rule-soft,rgba(26,26,26,0.16))';

  function txt(x, y, s, fill) {
    return svgEl('text', { x: x, y: y, 'text-anchor': 'middle', 'font-family': 'var(--font-mono,monospace)', 'font-size': '14', fill: fill || INK }, [document.createTextNode(s)]);
  }
  function enter(node, begin) {
    node.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1', keyTimes: '0;1', dur: '0.5s', begin: begin, fill: 'freeze', calcMode: 'spline', keySplines: SPL }));
    node.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'scale', additive: 'sum', values: '0.95;1', keyTimes: '0;1', dur: '0.5s', begin: begin, fill: 'freeze', calcMode: 'spline', keySplines: SPL }));
  }
  function stage(cx, cy, name) {
    var g = svgEl('g', { transform: 'translate(' + cx + ' ' + cy + ')', opacity: '0' });
    g.appendChild(svgEl('rect', { x: -70, y: -26, width: 140, height: 52, rx: 4, fill: SURF, stroke: RULE, 'stroke-width': '1.5' }));
    g.appendChild(txt(0, 5, name));
    return g;
  }

  function requestPath(host) {
    var svg = svgEl('svg', { viewBox: '0 0 520 160' });
    svg.appendChild(svgEl('title', { id: 'lf-request-path-title' }, [document.createTextNode('One request through a tool call')]));
    svg.appendChild(svgEl('desc', { id: 'lf-request-path-desc' }, [document.createTextNode('A request leaves the model, passes through the tool, and reaches the result. The tool box turns blue while the request is inside it.')]));
    svg.appendChild(svgEl('path', { d: 'M160 70 L360 70', stroke: RULE, 'stroke-width': '1.5', 'stroke-dasharray': '4 3', fill: 'none' }));

    var model = stage(90, 70, 'model');
    var tool = stage(260, 70, 'tool');
    var result = stage(430, 70, 'result');
    var lit = svgEl('rect', { x: -70, y: -26, width: 140, height: 52, rx: 4, fill: BP, 'fill-opacity': '0' });
    lit.appendChild(svgEl('animate', { attributeName: 'fill-opacity', values: '0;0;0.18;0.18;0;0', keyTimes: '0;0.2;0.25;0.65;0.7;1', dur: '4s', begin: '1s', repeatCount: 'indefinite' }));
    tool.insertBefore(lit, tool.lastChild);
    enter(model, '0.1s');
    enter(tool, '0.3s');
    enter(result, '0.5s');
    svg.appendChild(model);
    svg.appendChild(tool);
    svg.appendChild(result);

    var dot = svgEl('circle', { r: 6, fill: BP, opacity: '0' });
    dot.appendChild(svgEl('animateMotion', { path: 'M160 70 L360 70', dur: '4s', begin: '1s', repeatCount: 'indefinite', calcMode: 'linear', keyPoints: '0;0;1;1', keyTimes: '0;0.1;0.8;1' }));
    dot.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1;1;0', keyTimes: '0;0.1;0.8;1', dur: '4s', begin: '1s', repeatCount: 'indefinite' }));
    svg.appendChild(dot);
    svg.appendChild(txt(260, 136, 'one request, one tool call, one result', MUTE));

    host.appendChild(el('div', { class: 'lf' }, [
      el('div', { class: 'lf-head' }, [el('span', { class: 'lf-label' }, ['REQUEST PATH']), el('span', {}, ['watch one call'])]),
      el('div', { class: 'lf-body' }, [el('div', { class: 'lf-out' }, [svg])]),
      el('div', { class: 'lf-cap' }, ['The blue dot is one request. It leaves the model, passes through the tool, and reaches the result. The tool box turns blue while the request is inside it. The loop repeats every 4 seconds.'])
    ]));
  }

  LF.register({ 'request-path': requestPath });
})();
```

可复用的要点：

- 每组用 translate 移动，围绕 (0,0) 绘制，使 0.95 缩放从中心增长。
- 蓝色状态由第二矩形 fill-opacity 从 0 到 0.18 实现，颜色始终为 var(--blueprint)。
- 点的运动和透明度使用同一 keyTimes，只有移动时可见。
- 入场在 1.0 秒完成，循环从 1 秒开始。

## 站外预览

课程外没有 LF 运行时。以下小型替代实现使用相同函数名，但不保留渲染间节点，不添加暂停或重播，也不改变几何循环。最终仍需尽可能在课程运行时测试。

保存为 lf-shim.js：

```js
(function () {
  'use strict';
  var FIGS = {};
  var n = 0;
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'class') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function svgEl(tag, attrs, kids) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    var smil = ['animate', 'animateMotion', 'animateTransform'].indexOf(tag) !== -1;
    if (smil && attrs && attrs.repeatCount === undefined) { attrs.repeatCount = '1'; if (attrs.fill === undefined) attrs.fill = 'freeze'; }
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function uid(prefix) { n += 1; return (prefix || 'lf') + '-' + n; }
  function slider(state, key, label, min, max, step, fmt) {
    var id = uid('lf-range');
    var show = function () { return fmt ? fmt(state[key]) : String(state[key]); };
    var val = el('b', {}, [show()]);
    var input = el('input', { id: id, type: 'range', min: min, max: max, step: step, value: state[key] });
    input.addEventListener('input', function () { state[key] = Number(input.value); val.textContent = show(); state._render(); });
    return el('div', { class: 'lf-ctrl' }, [el('div', { class: 'lf-ctrl-head' }, [el('label', { for: id }, [label]), val]), input]);
  }
  function select(state, key, label, options) {
    var id = uid('lf-select');
    var sel = el('select', { id: id });
    options.forEach(function (o) { sel.appendChild(el('option', { value: o[1] }, [o[0]])); });
    sel.value = state[key];
    sel.addEventListener('change', function () { state[key] = sel.value; state._render(); });
    return el('div', { class: 'lf-ctrl' }, [el('label', { for: id }, [label]), sel]);
  }
  function register(obj) { for (var k in obj) FIGS[k] = obj[k]; }
  function mount() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    Array.prototype.forEach.call(document.querySelectorAll('.lesson-figure[data-figure]'), function (host) {
      var text = host.getAttribute('data-figure').trim();
      var name = text.split(/\s+/)[0];
      var cfg = {};
      try { cfg = JSON.parse(text.slice(name.length).trim() || '{}'); } catch (e) {}
      if (!FIGS[name]) { console.warn('no figure named ' + name); return; }
      FIGS[name](host, cfg);
      if (!reduce) return;
      var t = Number(host.getAttribute('data-static-time') || 1.5);
      Array.prototype.forEach.call(host.querySelectorAll('svg'), function (svg) { svg.setCurrentTime(t); svg.pauseAnimations(); });
    });
  }
  window.LF = {
    el: el, svgEl: svgEl, uid: uid, slider: slider, select: select, register: register,
    clamp: function (x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    mount: mount
  };
})();
```

将下列页面与 lf-shim.js、图模块（此例名为 figures-demo.js）放在同目录，保存为 preview.html：

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Figure preview</title>
<style>
:root { --bg: #fafaf5; --bg-surface: #f3f1e8; --ink: #1a1a1a; --ink-soft: #4a4a4a; --ink-mute: #7a7a78; --rule-soft: rgba(26, 26, 26, 0.16); --blueprint: #3553ff; --warn: #b8870f; --font-mono: 'JetBrains Mono', ui-monospace, monospace; --font-body: Georgia, serif; }
[data-theme="dark"] { --bg: #0a0d1a; --bg-surface: #131830; --ink: #e8e6dc; --ink-soft: #a8a6a0; --ink-mute: #7a7878; --rule-soft: rgba(232, 230, 220, 0.18); --blueprint: #6b8eff; --warn: #d4a83d; }
body { margin: 0; padding: 16px; background: var(--bg); color: var(--ink); font-family: var(--font-body); }
.lf { max-width: 760px; margin: 28px auto; border: 1px solid var(--rule-soft); }
.lf-head { display: flex; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--rule-soft); font: 0.68rem var(--font-mono); letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-mute); }
.lf-label { color: var(--blueprint); }
.lf-body { padding: 16px; }
.lf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
@media (max-width: 640px) { .lf-grid { grid-template-columns: 1fr; } }
.lf-ctrl-head { display: flex; justify-content: space-between; font: 0.7rem var(--font-mono); text-transform: uppercase; color: var(--ink-soft); }
.lf-ctrl-head b { color: var(--blueprint); }
.lf-ctrl input[type=range] { width: 100%; accent-color: var(--blueprint); }
.lf-out { margin-top: 18px; padding-top: 14px; border-top: 1px dashed var(--rule-soft); }
.lf-out svg { display: block; width: 100%; height: auto; }
.lf-num { font: 2rem var(--font-mono); color: var(--blueprint); }
.lf-num small { font-size: 0.9rem; color: var(--ink-soft); }
.lf-meta, .lf-formula { font: 0.72rem var(--font-mono); color: var(--ink-mute); margin-top: 6px; }
.lf-cap { padding: 12px 16px; border-top: 1px solid var(--rule-soft); color: var(--ink-soft); line-height: 1.5; }
</style>
</head>
<body>
<button type="button" onclick="var r = document.documentElement; r.dataset.theme = r.dataset.theme === 'dark' ? 'light' : 'dark';">Theme</button>
<div class="lesson-figure" data-figure="request-path"></div>
<div class="lesson-figure" data-figure='context-budget {"windowK": 64}'></div>
<script src="lf-shim.js"></script>
<script src="figures-demo.js"></script>
<script>LF.mount();</script>
</body>
</html>
```

在浏览器打开 preview.html。点击 Theme 检查深色模式，在系统设置开启减少动态效果，检查静态帧。
