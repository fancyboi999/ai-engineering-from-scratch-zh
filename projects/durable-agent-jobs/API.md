# 持久化队列集成

在完成的工作区执行 `go build -o jobs .`。CLI 没有依赖或网络连接。JSON 输出到 stdout，错误输出到 stderr；普通失败退出 1。崩溃注入按设计退出 86。

| 命令 | 输入 | 结果 |
|---|---|---|
| `enqueue --store DIR --input FILE` | id/text 对象的 JSON 数组 | 请求记录数，包含相同内容的重新交付 |
| `worker --store DIR` | 已有持久化输入 | 含 id、认领版本、state、reused_effect 的 Schema1 事件 |
| `status --store DIR` | 已有或空目录 | Schema1 任务、可用效果与范围 |
| `demo --input FILE` | 相同输入格式 | 临时存储中的子进程崩溃与恢复记录 |

标识匹配 `[a-z][a-z0-9-]{0,63}`。每条文本限 1,000,000 UTF-8 字节，请求数组限 10,000 条记录，每份 JSON 文档限 4 MiB。未知输入字段和尾随 JSON 文档导致失败。标识永久绑定原始文本；更改报告时使用新标识。

worker 选项为 `--lease-ms`（默认 30000）、`--max-attempts`（3）、`--max-jobs`（1）、`--delay-ms`（0..60000）、`--crash-after claim|effect` 和 `--now-ms`（默认 -1 表示当前墙上时间）。显式非负 now-ms 提供演示的固定逻辑时钟。同一存储内避免混用逻辑与真实时钟。

存储包含 `ledger.lock`、`jobs.json`、不可变的 `inputs/<id>.json` 和 `effects/<id>.json`。任务字段保留阶段 API 的 Go 名称：ID、State、Version、LeaseUntil、Attempts。租约使用整数毫秒。效果字段为 id、input_sha256、bytes、words。

`Enqueue`、`ClaimNext`、`CompleteClaim`、`Work`、`Status` 组合阶段函数。全部账本读改写操作获取同一个建议锁。ClaimNext 回收已到期的 running 记录，保留尝试次数，保存新认领，再释放锁执行。完成时在该锁下重新加载并检查当前版本。

回执发布使用已同步临时文件和拒绝替换的原子硬链接。已有回执数据必须与预期输入摘要和计数完全相同。这允许两个执行竞争发布同一本地效果。这是接收方拥有的幂等契约示例，不是外部恰好一次保证。

status 调用锁住任务快照，但随后独立读取效果文件。它可能显示完成仍待确认的回执。这是真实中间状态，不是事务性的组合快照。不要把 status 当密码学审计，也不要在 worker 运行时编辑存储文件。

接入远程效果时，保留输入身份与租约栅栏，先设计接收方的持久化幂等键和对账协议。只复制 `Finish` 调用无法保护接收方免于重复请求。
