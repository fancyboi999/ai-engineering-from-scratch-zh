# 公开实现契约

输入中的 files 将名称映射到文本或行数组。可选的 reviewers 包含 id、cost、findings 记录。预期标签使用 {file,line,rule}；报告记录源指纹，以及各审查者与共识的对比指标。

本地审查者是不同的静态启发式规则，不是独立 LLM。共识衡量支持程度，不代表真相。外部回调必须遵守 AbortSignal；超时不能撤销远程副作用。

### main.ts

```typescript
export function validateFinding( raw: unknown, files: Record<string, string[]>, ): Finding | null
export function aggregate( reviews: Review[], files: Record<string, string[]>, quorum = 2, )
export async function runPanel( reviewers: Reviewer[], budget: number, timeoutMs = 1000, )
export function evaluate(predicted: string[], expected: string[])
```

起始代码提供记录和类接口。方法在实现之前有意抛出异常。

阶段测试规定正常结果与需拒绝的输入。不要把学习者代码的导入换成参考方案导入。最后阶段还会用你累积完成的实现运行所提供的输入驱动器。
