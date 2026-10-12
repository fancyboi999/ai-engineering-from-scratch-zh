# 评估集群集成

在完成的工作区执行 `go build -o farm .`。调用者提供 UTF-8 JSON 预测记录，读取 JSON 报告；不需要 SDK 或推理服务。

```json
[
  {"id":"case-one","prompt":"Safe HTTP read verb?","expected":"GET","response":" get "}
]
```

ID 必须唯一且非空，最多 256 字节。预期答案必须非空。prompt、expected、response 各限 100,000 字节。最多接受 10,000 条记录和 4 MiB JSON。未知字段和尾随文档导致失败。当前评分规则是转小写并规范空白后比较相等性。

| 命令 | 行为 |
|---|---|
| `init --store DIR --input FILE --shards N` | 绑定数据集哈希和分片数；相同重放保留进度 |
| `worker --store DIR --worker-id NAME` | 最多认领、评估并提交一个符合条件的分片 |
| `run --store DIR --input FILE --shards N --workers W` | 初始化或验证身份；启动有界进程批次；输出覆盖率与回执 |
| `status --store DIR` | 验证并报告持久化快照 |
| `demo --input FILE` | 输出临时存储中的实际 worker 崩溃与恢复快照 |

分片数为 1..1024，并发进程槽为 1..64。活跃租约省略空桶。包括已记录预测在内的有序数据集，按 Go 的规范 JSON 结构体编码计算哈希。这是本产物的身份格式，不是跨语言 JSON 规范化标准。集成报告时保留输出的哈希。

worker 选项：`--lease-ms`（默认 30000）、`--now-ms`（默认 -1，使用墙上时钟）、`--delay-ms`（0..60000）、`--crash-after-claim`（有意退出 86）。显式非负 now-ms 是测试的固定逻辑时钟。完成时重新检查当前持久化的所有者与版本；不能信任 worker 旧的内存 Lease。

`farm.json` 存储 schema_version 1、dataset_sha256、shard_count、cases、shards。每个分片存储 case_ids 和阶段 Lease 对象，包含 Shard、Worker、Version、Until、Result、Done。完成后的 Result 为编码 JSON，包含 worker_pid、有序案例正确性标记、correct、total。租约字段的大写名称保留原始 Go 教学 API。

`Partition` 定义归属。`InitFarm` 将归属持久化。`ClaimShard` 在返回输入前加锁、加载、获取和持久化。`WorkShard` 在锁外执行精确匹配评估。`CompleteShard` 在持锁时重新加载并调用 `Submit`。`RunFarm` 用学员的 `Parallel` 池启动同一二进制的 worker 命令，将取消传入 `exec.CommandContext`。

报告包含 complete、active_shards、completed_shards、correct、evaluated、dataset_cases、worker_processes、receipts 和完整分片账本。`worker_processes` 统计已接受回执中不同的 PID，不是配置并发量的测量。Run 还输出 worker_events。每次调用的池限制同时运行的子进程；每次运行的进程 ID 可能不同。

stdout 包含 JSON，stderr 包含失败信息。退出 0 表示命令成功；剩余租约仍被占有时，run 输出 complete:false 后退出 1。格式错误的输入、过期完成、数据集变化或状态损坏也退出 1。有意崩溃注入在认领持久化后退出 86。已完成的重新运行不重算结果。

文件系统是可信的本地存储，不是经过认证的证据。快照验证器检查数据集身份、分片归属、租约形态和回执覆盖与计数。它不会认证编辑了自洽快照的人。网络扩展需要经过认证的 worker、有界请求、支持事务的协调器和时钟策略；只保留 JSON 字段名不够。
