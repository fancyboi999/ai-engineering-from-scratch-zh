# 串行化带修订版本的写入

第 2 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段建立在此前的契约上。

## 本阶段的变化

加载版本化事件日志，为每个 namespace/id 对重建最新记录。更新必须指明预期修订版本。串行化写入，避免两个从修订版本零竞争的调用者都成功。修改内存映射前先追加。这是单进程存储：追加完成不保证断电持久性，多服务器进程需要外部锁或数据库。

本阶段的边界是 `MemoryStore.put, MemoryStore.list`。保持之前阶段的行为不变：最终评分器会在同一工作区运行所有阶段。

## 推演一个具体案例

同一进程中的两个写入者对同一 id 都提出 expectedRevision0。串行队列允许一次创建、拒绝另一次；回放 JSONL 日志重建修订版本 1。

```figure
pj-memory-server-2
```

改变实验输入，在查看指标前先计算结果。图表根据这些输入计算；下方实现测试仍是完成情况的证据来源。

## 实现契约

在工作区的 `main.ts` 中实现 `MemoryStore.put, MemoryStore.list`。先尝试实现契约，再阅读参考实现的导出类型。保留 starter 的公共名称，让测试能够调用你的实现。核心函数返回结构化值，不在内部打印；CLI 打印最终结果。

使用[公共 API 契约](../../../API.md)和 starter 的类型化签名。核心函数返回值，由提供的驱动器负责文件输入、参数解析和呈现。

修改映射前先追加。追加失败时，内存值不能假装持久化已成功。失败操作后保持尾部 Promise 可用，让后续独立写入能继续。

## 验证并检查

从仓库根目录用 `python3 scripts/project_test.py memory-server --init learning-artifacts/memory-server` 初始化一次，然后进行累积评分：

```bash
python3 scripts/project_test.py memory-server --stage 2 --path learning-artifacts/memory-server --strict
```

在实现契约前，全新工作区应当失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/memory-server
node cli.ts --data-dir memory-data --put samples/memory.json
node cli.ts --data-dir memory-data --query "cache policy"
node cli.ts --data-dir memory-data --history cache-policy
```

## 探查失败边界

用修订版本 0，从独立进程运行 cli.ts --put 两次。第二次失败。再使用修订版本 1，用 --history 检查两个日志条目。




## 参考资料

[MCP 工具规范](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
[Rust 标准库](https://doc.rust-lang.org/std/)
[Node HTTP API](https://nodejs.org/api/http.html)
