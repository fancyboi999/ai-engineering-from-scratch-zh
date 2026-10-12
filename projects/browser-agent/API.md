# 公共实现契约

以实现 observe、act 和 capture 的适配器替换 Driver。只有在启动教学 fixture 的服务并设置 BROWSE_BIN 后，才运行 cli.ts --live。

离线模式测试 fixture 的状态转换和记录的像素。绿色像素只是该 fixture 特有的信号，不代表通用视觉理解。实时 CLI 仅限访问明确允许的回环页面。

### pixels.py

```python
def inspect(data)
```

### main.ts

```typescript
export function parseObservation(raw: unknown): Observation
export function choose(observation: Observation, task: Task): Action
export function inspectPNG(file: string):
export async function runAgent(driver: Driver, task: Task, maxSteps = 5)
export function scoreRuns(statuses: string[])
```

starter 提供记录和类的接口。方法在实现前会有意抛出异常。

`inspectPNG` 在 PNG 数据缺失或无效时抛出异常。`runAgent` 捕获截图和检查错误，返回 `status: "screenshot-error"`、`trace`、`reason` 和 `screenshot`（返回的路径；截图失败时为 `null`），不会伪造 `visual` 指标。CLI 保存这份回执，并以状态码 2 退出。

阶段测试规定正常结果和应拒绝的输入。不要把学习者实现的导入替换成参考实现的导入。最后一阶段还会用提供的输入驱动器测试你的累积实现。
