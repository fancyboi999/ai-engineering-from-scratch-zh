# 分布式评估集群协调器

把记录了模型预测的文件变成可恢复的评估运行。独立 worker 进程获取持久化分片、比较答案并发布受版本栅栏保护的回执。在认领后终止 worker，重新启动运行，证明旧 worker 无法覆盖替代者的结果。

Go 适合协调器：同一个无依赖二进制可以启动子 worker、限制并发并协调文件系统状态。此实现将工作分配给同一 Linux 或 macOS 主机上的多个进程。不提供多机器传输，也不执行模型推理。

四阶段约需 8 小时。需要 Go 1.22+、评分器所需的 Python 3.10+，以及结构体、错误、JSON、goroutine、channel 和取消知识。不熟悉 channel 时，从 [A Tour of Go](https://go.dev/tour/) 和 [Go 流水线](https://go.dev/blog/pipelines)开始。完成[持久化 agent 任务](../durable-agent-jobs/README.md)会让持久化阶段更容易。

## 构建并运行你的版本

从仓库根目录运行：

```bash
python3 scripts/project_test.py distributed-eval-farm --init /tmp/distributed-eval-farm-work
python3 scripts/project_test.py distributed-eval-farm --stage 1 --path /tmp/distributed-eval-farm-work --strict
```

初始化提供类型、进程胶水代码和预测样本。首次测试会有意失败，直到你实现 `stage1.go`。完成四个阶段后运行组合产物：

```bash
python3 scripts/project_test.py distributed-eval-farm --all --path /tmp/distributed-eval-farm-work --strict --report /tmp/farm-learner.json
cd /tmp/distributed-eval-farm-work
go build -o /tmp/farm-learner .
/tmp/farm-learner demo --input samples/cases.json --workers 2 --shards 4
```

演示在真实 worker 持久化认领后让其崩溃，输出未完成快照，再在到期边界启动替代 worker。提供的协调器调用你的阶段实现。参考通过是教师证据，不是学员完成。

## 对预测文件运行参考方案

```bash
cd projects/distributed-eval-farm/solution
go build -o /tmp/eval-farm .
STORE=$(mktemp -d /tmp/eval-farm.XXXXXX)
/tmp/eval-farm init --store "$STORE" --input samples/cases.json --shards 4
/tmp/eval-farm run --store "$STORE" --input samples/cases.json --shards 4 --workers 2
/tmp/eval-farm status --store "$STORE"
```

每条输入记录包含 id、prompt、expected、response。传入自己的 JSON 数组或编辑样本副本。评分先转小写并压缩空白，再比较 expected 和 response。四条原创记录得分 3/4。运行前 completed_shards 和 evaluated 为 0；运行后 complete 为 true，completed_shards 为 4，evaluated 为 4，correct 为 3。

报告保留有序数据集的 SHA256，以及每分片的案例结果、所有者、版本和实际 worker PID。样本配 workers 2 时，两个有界批次启动四个短生命周期进程。PID 会变化，并发上限仍为 2。完成后再次运行不产生新的 worker 事件，并保留回执。已记录的样本答案展示协调机制，不是模型基准测试。

## 恢复崩溃的 worker

使用独立存储和一个分片，便于观察恢复：

```bash
CRASH_STORE=$(mktemp -d /tmp/eval-crash.XXXXXX)
/tmp/eval-farm init --store "$CRASH_STORE" --input samples/cases.json --shards 1
/tmp/eval-farm worker --store "$CRASH_STORE" --worker-id old --now-ms 100 --lease-ms 10 --crash-after-claim
/tmp/eval-farm status --store "$CRASH_STORE"
/tmp/eval-farm run --store "$CRASH_STORE" --input samples/cases.json --shards 1 --workers 2 --now-ms 110 --lease-ms 10
```

崩溃有意退出 86。Status 显示 owner old、version 1、到期 110、Done false。110 时恢复以 version 2 完成全部四个案例。109 时恢复则报告待完成运行并退出 1，不会抢占有效租约。墙上时钟运行时省略 now-ms。`--delay-ms` 在认领后暂停，用于暴露过期 worker 竞态，不改变评分函数。

## 学习与集成

1. [划分稳定案例身份](stages/01-partition-stable-case-identities/docs/zh.md)。
2. [持久化分片租约并设置版本栅栏](stages/02-fence-each-shard-lease/docs/zh.md)。
3. [接受幂等回执](stages/03-accept-idempotent-completion-receipts/docs/zh.md)。
4. [组合有界进程协调器](stages/04-run-a-bounded-local-worker-pool/docs/zh.md)。

[API.md](API.md) 说明 JSON 和进程边界。任何语言都能写预测文件、解析报告。最终阶段测试构建选定的学员二进制，使用实际 worker 进程，测试崩溃恢复、延迟的过期写入者、数据集变化及损坏状态保留：

```bash
python3 scripts/project_test.py distributed-eval-farm --all --solution --strict
```

## 如实说明限制

协调器使用 4 MiB 全运行快照和本地 POSIX 建议锁。所有写入者必须配合。网络文件系统、不可信存储写入者和多主机时钟不在契约内。文件同步和原子重命名展示进程崩溃恢复；未实现目录同步和断电保证。

预测已预先记录。精确匹配评分不判断语义质量、引用或公平性，不调用模型 API。没有网络 worker 协议、租约心跳、动态重新分片、重试退避或调度守护进程。`run` 运行有界批次，报告待完成租约，不会无限等待；到期后再调用。context 取消约束配合的回调；CLI 还给运行设置两分钟截止时间。这些是高级扩展的明确起点，不是隐藏的生产保证。
