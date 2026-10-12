# 公开实现契约

从你的埋点中逐行导出 Span JSON 对象，并在 CI 中把 trace.json 与 trace.html 一起保留。

默认输入使用文档规定的 JSONL Span 契约。`--format otlp` 也接受随附的 OTLP JSON 子集：`resourceSpans[].scopeSpans[].spans`、trace/span ID、父 ID、Unix 纳秒时间戳、状态码和数值型 GenAI 输入/输出 token 属性。适配器先将时间戳转换为相对毫秒，再执行常规 span 校验。它不接受 protobuf，也不提供 OTLP 接收器。基线文件仍使用 JSONL。

token 必须是各 span 独占的用量。跨机器时钟必须在导入前归一化。

### main.ts

```typescript
export function parseTrace(raw: string): Span[]
export function validateTree(spans: Span[]): Map<string, Span>
export function unionDuration(intervals: [number, number][]): number
export function analyze(spans: Span[])
export function render(spans: Span[]): string
```

starter 提供记录和类的接口。方法在实现前会故意抛出错误。

阶段测试规定正常结果和应拒绝的输入。不要把学习者实现的导入改成参考实现的导入。最后一个阶段还会针对你的累积实现运行随附的输入驱动程序。
