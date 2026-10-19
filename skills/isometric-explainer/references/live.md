# 浏览器运行脚本

构建器把 kit、模型、数据 D、运行脚本内联为一个 script。运行脚本将事件转为运动，并让页面与模型同步。

## 事件转为节拍

beatsFor(sim) 将每事件转为短节拍列表。每节拍是姿态字段的补间：

```js
{ d: 0.4, to: { head: -5 }, hot: ["head", "carriage"], start: (pose) => {}, event: 7 }
```

- pose 是普通数值对象，包含车架位置、臂偏移、计数器等。每次从 freshPose(config) 开始。
- to 列出运动字段，start 设置显示卡片等离散变化。
- hot 列出当前强调的绘制项 ID。
- 每事件首节拍携带 event，开始时按该事件更新读数与轨迹。
- 位移节拍计算自身时长。参考值为 0.35+distance/150 秒，模板为 0.3+distance/90。
- 使用三次 in-out 缓动，每节拍保持 0.1 至 1.3 秒。

## 帧循环

```js
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  if (state.playing) advance(dt * speed * (still.matches ? 40 : 1));
  const moving = stepExplode(dt);
  draw();
  frame = visible && (state.playing || moving) ? requestAnimationFrame(tick) : 0;
}
```

- advance(dt) 遍历节拍，一帧可完成多个短节拍。
- 单步模式把 stopAt 设为下一事件索引，advance 在更后事件的首节拍前停止。
- 没有播放或弹簧运动时停止循环。任何控件调用唤醒函数，请求一帧。
- rootMargin 为 120px 0px 的 IntersectionObserver 设置 visible，离屏不运行帧。

## draw()

1. 每项世界偏移 T[id] 等于装配组展开偏移加姿态偏移。
2. transform 设为 K.translateAlong(P,T[id])，字符串没变就不写 DOM。
3. 计算每项 key+dot(T[id],V)，V 是 x、y、z 各单位步长的深度。
4. 按值排序，将 ID 连接成字符串。字符串变化才重排 DOM。
5. 重建杆、指针、曲柄等变形路径。按四舍五入后的值缓存，参考页将抽屉开度取到 0.25 单位。
6. 用 display 切换卡片等出现、消失的部件。
7. 为 hot 项及 tag- 铭牌加 data-hot，移除其他项该属性。

## 单一强调色

CSS 为带 data-hot 的组启用强调色：

```css
[data-hot] .iso-edge { stroke: var(--anatomy-lit); }
[data-hot] .iso-top { fill: var(--anatomy-lit-top); }
[data-hot] .iso-shade { fill: var(--anatomy-lit-shade); }
[data-hot] .iso-face-text { fill: var(--anatomy-lit); }
```

只有执行当前步骤的部件高亮。配置中关闭的部件降低透明度，不额外着色。

## 控件

控件改变配置或视图，然后重新加载模型运行。

| 控件 | 动作 |
|---|---|
| 运行 | 从当前节拍播放，已完成时重新加载再播放 |
| 单步 | 播放到下一事件开始 |
| 禁用 | 按固定顺序加载下一故障配置并播放 |
| 修复 | 加载 DEFAULTS 并播放 |
| 展开 | 各装配组弹至偏移，暂停运行 |
| 重置 | 收起、清除选择、加载 DEFAULTS |
| 开关 | load(configFromForm())，若先前已开始则保持播放 |

load 调用 simulate、重建节拍、重置姿态、同步开关、写 URL、重绘。

参考页还提供场景按钮、0.5x/1x/2x/4x 速度、部件检查器、六步导览和复制链接。

## 键盘与屏幕阅读器

- 舞台 tabindex=0，aria-label 列出按键。
- 空格和回车运行或暂停，右箭头单步，E 展开，B 禁用，R 修复。
- 事件目标不是舞台时忽略这些键，避免抢走表单按键。
- 标签页使用箭头键和 aria-selected。
- aria-live=polite 元素在结束时播报结果。

## 减少动态效果

- 匹配 prefers-reduced-motion:reduce 时运行加速 40 倍，展开直接到终态。
- 减少动态效果或 URL 带 ?still 时不自动播放。
- 否则舞台 35% 可见后 900ms 自动播放一次。

## 布局

- 桌面一屏包含页头行、工具栏、舞台、读数。参考网格为 250px minmax(0,1fr) 350px，height:100svh，min-height:700px。
- 舞台占剩余空间，SVG 宽高 100%。
- 1100px 以下网格改单列，高度 auto。
- 640px 以下读数两列。参考页让 SVG 宽 150%，在图框中裁剪，使手机上工作台足够大。
- 按钮至少高 44px。

## 调试句柄

在 window 暴露状态和少量函数，例如 window.__machine={state,load,play,pause,step,seek,finish}。验证脚本用 seek(n) 停在任意事件。
