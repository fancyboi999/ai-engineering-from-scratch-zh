# 状态模型

模型是无 DOM、无计时器、无随机性的普通 ES 模块。构建器将它内联到页面，测试直接导入。页面显示的一切来自其输出。

## 契约

```js
export const DEFAULTS = { cache: true };
export function configOf(input) {}   // clamps any input to a valid config
export function simulate(input) {}   // returns { config, events, totals }
export function encode(config) {}    // config to a query string, "" for DEFAULTS
export function decode(search) {}    // query string to a config, bad values become defaults
```

- configOf 接受任意输入，返回有效配置，未知值使用默认值。
- simulate 不读取时钟。模拟时间由 COST 表的固定成本累加。
- encode 只写与 DEFAULTS 不同的值，默认 URL 无查询参数。

## 事件结构

每个事件是机器展示的一步。参考字段：

```js
{
  index: 4,              // position in the list, starts at 0
  type: "schema",        // what happened, drives the motion beats
  station: "schema",     // which part does the work, drives the accent
  cost: 2,               // simulated ms for this step
  clock: 1132,           // running total of cost
  turn: 1,               // counters the readouts show
  calls: 1,
  context: ["req-01", "mem-01", "inv-2026-04", "inv-2026-05"],
  trace: "schema check passed",
  // event-specific fields: ok, errors, result, verdict, proposal
}
```

每事件保存 context.slice() 等快照，使读数可直接显示任意事件，无需重放。

每事件有 trace 字符串，供轨迹面板、纸带、屏幕阅读器使用。

## 限制

模型循环必须有硬上限。参考页最多四轮模型调用、三次工具尝试，退避为 500ms、1000ms，超时 2000ms。达到上限时以 failed 和轨迹结束，不无限循环。

## 结果

每次运行以 exit 事件和结果状态结束。参考状态为 verified、declined、unchecked、failed。状态与正确性独立。未经检查的答案也可能正确，页面应说明：“答案未经检查，本次碰巧正确。”

## 测试

写几何前先测试，参考页有十四项：

1. 正常运行产生精确事件类型序列，用字符串比较。
2. 算术产生页面打印的精确数值，例如 diff=3100、pct=25。
3. 每种故障配置有对应序列和结果。
4. 遍历全部组合，每次都以 exit 结束且不超限。每事件有 trace，时钟不倒退。
5. 同配置两次 simulate 深度相等。
6. decode("?"+encode(config)) 深度等于 config，非法值恢复 DEFAULTS。
7. 发布页面等于新鲜构建输出。
8. HTML 包含全部控件钩子和模拟说明。

用 node --test 运行。模板 model.test.mjs 包含其中四项。

## URL 状态

每次加载读取 decode(location.search)。每次配置改变，用 encode(config) 和 history.replaceState 更新 URL。复制链接按钮复制 location.href。分享链接恢复相同开关。
