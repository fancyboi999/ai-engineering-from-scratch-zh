# 持久化 agent 任务

构建本地报告队列，可在认领、输出、完成之间中断。让另一个 worker 对同一目录重启，准确检查哪些工作重复。完成的产物接收文本记录，为每个任务写一份绑定内容的回执。

Go 适合小型独立 worker 二进制和显式文件系统操作。核心与 CLI 只用标准库。四阶段约 8 小时。需要 Go 1.22+、评分器所需的 Python 3.10+、Linux 或 macOS，以及基础结构体、指针、错误、JSON。概念不熟悉时从 [A Tour of Go](https://go.dev/tour/)开始。第四阶段配合学习 [os 文件系统 API](https://pkg.go.dev/os)。

## 构建并运行你的版本

从仓库根目录运行：

```bash
python3 scripts/project_test.py durable-agent-jobs --init /tmp/durable-agent-jobs-work
python3 scripts/project_test.py durable-agent-jobs --stage 1 --path /tmp/durable-agent-jobs-work --strict
```

首个命令提供类型契约、CLI 和样本输入。首个测试有意失败，直到实现 `stage1.go`。继续完成四阶段，再评分并运行完成的工作区：

```bash
python3 scripts/project_test.py durable-agent-jobs --all --path /tmp/durable-agent-jobs-work --strict --report /tmp/durable-learner.json
cd /tmp/durable-agent-jobs-work
go build -o /tmp/durable-learner .
/tmp/durable-learner demo --input samples/jobs.json
```

演示在独立进程中调用你的二进制。只有完整学员报告证明本地完成；参考测试不授予证书。

## 用自己的数据运行参考方案

```bash
cd projects/durable-agent-jobs/solution
go build -o /tmp/durable-jobs .
STORE=$(mktemp -d /tmp/durable-jobs.XXXXXX)
/tmp/durable-jobs enqueue --store "$STORE" --input samples/jobs.json
/tmp/durable-jobs worker --store "$STORE" --max-jobs 100
/tmp/durable-jobs status --store "$STORE"
```

输入是 `{ "id": "report-one", "text": "your report text" }` 的 JSON 数组。编辑样本副本或传入自己的路径。重复入队相同内容是安全的。已有 ID 下更改载荷会冲突。输出回执包含 SHA256、UTF-8 字节长度和按空白分隔的词数；此 worker 不通过模型生成或发送报告。

使用新存储复现崩溃：

```bash
CRASH_STORE=$(mktemp -d /tmp/durable-crash.XXXXXX)
/tmp/durable-jobs enqueue --store "$CRASH_STORE" --input samples/jobs.json
/tmp/durable-jobs worker --store "$CRASH_STORE" --now-ms 100 --lease-ms 10 --crash-after effect
/tmp/durable-jobs status --store "$CRASH_STORE"
/tmp/durable-jobs worker --store "$CRASH_STORE" --now-ms 111 --lease-ms 10 --max-jobs 100
/tmp/durable-jobs status --store "$CRASH_STORE"
```

崩溃命令有意退出 86。恢复前，`incident-summary` 为 running v1，回执已存在：95 字节、11 个词。恢复后为 completed v4、attempts 2，worker 报告 `reused_effect: true`。第二个样本以 v2 完成，回执为 79 字节、12 个词。将 `--crash-after effect` 改成 `claim`，观察输出存在前的恢复。`go run . demo` 自动执行效果写入后崩溃流程，只清理自己的临时目录。

`--now-ms` 是注入测试时钟。真实墙上时钟执行时省略它。`--delay-ms 500` 让另一进程在旧进程完成前回收已到期认领。过期完成会失败；两个普通 worker 进程可以安全认领不同任务。

## 学习各边界

1. [创建稳定任务身份](stages/01-create-jobs-with-stable-identity/docs/zh.md)。
2. [以版本和租约认领](stages/02-claim-with-a-lease-and-version/docs/zh.md)。
3. [回收任务并拦截旧 worker](stages/03-finish-or-reclaim-expired-work/docs/zh.md)。
4. [持久化快照并恢复效果](stages/04-write-and-recover-atomic-snapshots/docs/zh.md)。

[API.md](API.md) 定义集成契约。可从任何语言调用二进制并解析 JSON。评分器构建选定工作区，测试实际崩溃、并发 worker、过期完成、输入变化和损坏状态保留：

```bash
python3 scripts/project_test.py durable-agent-jobs --all --solution --strict
```

## 如实说明限制

存储用建议锁协调同一本地 POSIX 文件系统上的配合进程。不要放在 NFS 上、绕过包装器、与不可信写入者共享，或视为经过认证的服务。Windows 需要不同的加锁实现。

执行是至少一次。本地不可变回执让这个特定效果幂等，但不会让任意支付、邮件或远程写入都恰好一次。崩溃可能留下临时文件或无引用输入。快照重命名和文件同步保护进程恢复，但没有目录同步时不承诺断电持久性。达到尝试上限的任务保持可见，供手动对账。产物是教学规模队列，快照上限 4 MiB，没有调度、心跳续租或远程传输。
