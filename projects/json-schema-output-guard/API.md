# 公开实现契约

在应用边界调用 guard(raw,schema)，或调用 repair(generate,schema,maxAttempts)，其中 generate 接收结构化 Issue[] 和从 1 开始的尝试编号。

这是明确限定的 JSON Schema 子集。拒绝 $ref、format 和组合器。通过 schema 不代表回答符合事实。录制的修复不是实时模型调用。

### main.ts

```typescript
export function checkSchema(schema: Schema, depth = 0): void
export function parseJSON(raw: string): unknown
export function validate( value: unknown, schema: Schema, pointer = "$", depth = 0, ): Issue[]
export function guard( raw: string, schema: Schema, ):
export async function repair( generate: (feedback: Issue[], attempt: number) => Promise<string>, schema: Schema, maxAttempts = 3, )
```

starter 提供记录和类的接口。方法在实现前会故意抛出错误。

阶段测试规定正常结果和应拒绝的输入。不要把学习者实现的导入改成参考实现的导入。最后一个阶段还会针对你的累积实现运行随附的输入驱动程序。
