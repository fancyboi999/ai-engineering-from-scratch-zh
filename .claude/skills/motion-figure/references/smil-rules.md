# 课程动画图的 SMIL 规则

以下十二条来自课程图的实际验证。违反规则的图可能没有控制台错误，却仍然播放错误。随后给出各条说明和校验器。

## 完整规则

```text
课程动画图使用声明式 SVG。
1. 只用 SMIL：animate、animateTransform、animateMotion。不用 setInterval 或 requestAnimationFrame。每图最多约 55 个 SVG 元素，避免长课程卡顿。
2. 入场从 opacity 0、约 95% 缩放开始，不从 0 缩放开始。使用 calcMode=spline、keySplines="0.23 1 0.32 1"。错开 0.05 至 0.4 秒。退出短于入场。循环为 2.5 至 6 秒，repeatCount=indefinite。
3. keyTimes 与 values 项数相同，首项 0、末项 1、单调不减。浏览器会静默忽略错误列表，改为均匀间隔，所以必须检查标记，不能只检查挂载。
4. keySplines 项数等于 keyTimes 项数减一，且只与 calcMode=spline 一起使用。
5. animateMotion 带 keyPoints 时需要 calcMode=linear，两组项数相同。路径运动不能残留两项 values。
6. SMIL 不能插值动画 fill、stroke 中的 CSS var()。保留静态 var()，叠加目标色元素，再改变其 fill-opacity 或 stroke-opacity。字面十六进制值只作最后选择。
7. 运行时把 x、y、width、height、r、cx、cy、rx、ry 动画改为一次播放并冻结，并加重播按钮。循环只动画 opacity、transform、stroke-dashoffset 或 animateMotion。
8. 静态帧读取宿主 data-static-time，默认 1.5 秒。该时刻画面必须完整可读。
9. 滑块重绘后运行时协调节点，移除新节点缺少的属性，包括运行时设置的 ID。desc 应有稳定 ID。协调后节点使用 transform-box:fill-box、transform-origin:center。条形用 stroke-dash 增长，不用 scale。
10. lesson-figure.lf-animated svg 最大 760px。375px 手机中，560 单位图的 11 单位标签实际约 5px。标签至少 12 单位，或给图至少 500px 宽并允许图内滚动。
11. 颜色只来自 CSS 变量，支持明暗两种主题。
12. 组件使用 ES5：var、函数表达式，不用箭头、let、const、模板字符串。viewBox 为 0 0 520 H，state._render 清空并重建 SVG 子元素。
```

## 逐条说明

**规则 1。**统计元素，不统计文本节点。55 包含 svg、组、形状、文字、动画元素。长课可能包含十张以上图，每张必须保持小型。

**规则 2。**课程模块使用的入场值：

```js
var SPL = '0.23 1 0.32 1';
node.appendChild(svgEl('animate', { attributeName: 'opacity', values: '0;1', keyTimes: '0;1', dur: '0.5s', begin: begin, fill: 'freeze', calcMode: 'spline', keySplines: SPL }));
node.appendChild(svgEl('animateTransform', { attributeName: 'transform', type: 'scale', additive: 'sum', values: '0.95;1', keyTimes: '0;1', dur: '0.5s', begin: begin, fill: 'freeze', calcMode: 'spline', keySplines: SPL }));
```

additive=sum 保留组的 translate。缺少它，scale 会覆盖 translate，组跳到原点。围绕 (0,0) 绘制组内容，使其从组中心缩放。

**规则 3。**错误 keyTimes 不产生浏览器报错，而是被忽略并均匀分布。因此挂载成功、控制台无报错仍不能证明时间正确。用下方校验器检查属性。

**规则 4。**两个值对应一条样条，四个值对应三条，以分号分隔。缺少 calcMode=spline 时，keySplines 无效果，会隐藏错误。

**规则 5。**`keyPoints="0;0;1;1"` 与 `keyTimes="0;0.1;0.8;1"` 表示等待、移动、等待。残留 values 会替换路径，造成错误运动。

**规则 6。**灰框变蓝时，在灰框上叠加 fill-opacity=0 的蓝框，动画其 fill-opacity。颜色仍是 var()，两种主题均有效。

**规则 7。**运行时的几何属性还包括 x1、y1、x2、y2。没有 repeatCount 时，会补 repeatCount=1 和 fill=freeze，播放一次。带 fill=freeze 的循环也会改为一次。

**规则 8。**静态帧是时间线上的一个时刻，所有入场和标签必须已完整。默认时长下须在 1.5 秒前完成入场。移动点可在路径任意位置，但必须可见。

**规则 9。**针对滑块：ID 在 render 外创建，每次新节点都赋同一 ID。协调节点的 opacity、transform 过渡为 220ms，fill、stroke 为 180ms。

**规则 10。**组件卡片的 lf-out svg 最大 560px，动画宿主最大 760px。

**规则 11。**颜色带浅色默认值，例如 `var(--blueprint,#3553ff)`。深色主题重定义变量。

**规则 12。**课程运行时本身是 ES5。旧模块即使存在 ES6，新代码仍必须使用 ES5。

## 校验器

将下列函数粘贴到课程页浏览器控制台，调用 `checkMotionFigure(document.querySelector('[data-figure^="request-path"]'))`。返回问题列表，空数组表示标记检查通过。

```js
function checkMotionFigure(host) {
  var out = [];
  var GEOMETRY = ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'r', 'cx', 'cy', 'rx', 'ry'];
  function list(node, name) {
    var v = node.getAttribute(name);
    return v === null ? null : v.split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s !== ''; });
  }
  function seconds(d) {
    if (!d) return NaN;
    if (/ms$/.test(d)) return parseFloat(d) / 1000;
    return parseFloat(d);
  }
  var svgs = host.querySelectorAll('svg');
  Array.prototype.forEach.call(svgs, function (svg, si) {
    var count = svg.querySelectorAll('*').length + 1;
    if (count > 55) out.push('svg ' + si + ': ' + count + ' elements, limit 55');
    Array.prototype.forEach.call(svg.querySelectorAll('text'), function (t) {
      var size = parseFloat(t.getAttribute('font-size'));
      if (size && size < 12) out.push('text "' + t.textContent.slice(0, 24) + '": font-size ' + size + ' below 12');
    });
  });
  var anims = host.querySelectorAll('animate, animateTransform, animateMotion');
  Array.prototype.forEach.call(anims, function (a, i) {
    var tag = a.tagName;
    var where = tag + ' #' + i + ' (' + (a.getAttribute('attributeName') || 'path') + ')';
    var kt = list(a, 'keyTimes');
    var vals = list(a, 'values');
    var kp = list(a, 'keyPoints');
    var ks = list(a, 'keySplines');
    var mode = a.getAttribute('calcMode') || (tag === 'animateMotion' ? 'paced' : 'linear');
    if (kt) {
      var n = kp ? kp.length : (vals ? vals.length : -1);
      if (n !== -1 && kt.length !== n) out.push(where + ': keyTimes count ' + kt.length + ' differs from ' + n);
      if (Number(kt[0]) !== 0) out.push(where + ': keyTimes does not start at 0');
      if (mode !== 'paced' && mode !== 'discrete' && Number(kt[kt.length - 1]) !== 1) out.push(where + ': keyTimes does not end at 1');
      for (var j = 1; j < kt.length; j++) if (Number(kt[j]) < Number(kt[j - 1])) out.push(where + ': keyTimes decreases at entry ' + j);
    }
    if (ks) {
      if (mode !== 'spline') out.push(where + ': keySplines without calcMode spline');
      if (kt && ks.length !== kt.length - 1) out.push(where + ': keySplines count ' + ks.length + ', need ' + (kt.length - 1));
      if (!kt && vals && ks.length !== vals.length - 1) out.push(where + ': keySplines count ' + ks.length + ', need ' + (vals.length - 1));
    }
    if (tag === 'animateMotion') {
      if (kp && mode !== 'linear') out.push(where + ': keyPoints needs calcMode linear');
      if (kp && !kt) out.push(where + ': keyPoints without keyTimes');
      if (vals) out.push(where + ': values attribute on a path motion');
    }
    var attr = a.getAttribute('attributeName');
    if ((attr === 'fill' || attr === 'stroke') && /var\(/.test(a.getAttribute('values') || a.getAttribute('to') || '')) {
      out.push(where + ': var() inside an animated ' + attr);
    }
    if (a.getAttribute('repeatCount') === 'indefinite') {
      if (GEOMETRY.indexOf(attr) !== -1) out.push(where + ': loop on geometry attribute ' + attr);
      var dur = seconds(a.getAttribute('dur'));
      if (!(dur >= 2.5 && dur <= 6)) out.push(where + ': loop duration ' + a.getAttribute('dur') + ' outside 2.5 to 6 s');
    }
    if (attr === 'transform' && a.getAttribute('type') === 'scale' && vals && Number(vals[0]) === 0) {
      out.push(where + ': scale starts at 0');
    }
  });
  return out;
}
```

校验器只检查挂载后的标记，不检查静态帧、深色主题或手机宽度。这些需要目视检查。
