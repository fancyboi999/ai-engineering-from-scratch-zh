# 公共实现契约

在环境中设置 MEMORY_TOKEN，运行 node cli.ts --data-dir memory-data --serve --port 8788。REST 和 MCP 共享同一存储；token 不写入文件。

每个数据目录只用一个写入进程。追加 JSONL 提供重启持久化，不保证断电或多进程事务。哈希词法向量不是语义嵌入。MCP HTTP 是有文档说明的工具子集，不提供流式传输或会话。

### main.ts

```typescript
export function validateMemory(raw: unknown): Omit<Memory, "revision">
export function embed(text: string, dimensions = 32): number[]
export function cosineScores(query: number[], vectors: number[][]): number[]
export function createMemoryServer(store: MemoryStore, token: string)
```

starter 提供记录和类的接口。方法在实现前会有意抛出异常。

阶段测试规定正常结果和应拒绝的输入。不要把学习者实现的导入替换成参考实现的导入。最后一阶段还会用提供的输入驱动器测试你的累积实现。
