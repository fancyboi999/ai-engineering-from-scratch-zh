# 以租约和版本认领

> 认领是 worker 获得行动许可的时刻。开始工作前先持久化它。

**类型：** Build
**语言：** Go
**前置要求：** 完成阶段 1；理解其导出类型和失败契约。
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 构建内容

预留执行窗口。在初始化工作区实现 `stage2.go`。提供的 CLI 调用你的实现，不导入参考方案。

## 推演机制

从 queued version 0、attempts 0 开始。100 ms 时以 expected version 0 认领 10 ms，变为 running version 1、attempts 1、lease 110。租约区间为 [100,110)，不含右端点。

两个 worker 都可能读到 version 0。只有首个成功认领者能继续。更改记录后才检查预期版本，会丢失拒绝第二个 worker 所需的证据。赋值任何字段前，验证状态、预期版本、尝试上限、时钟和溢出。

`ClaimJob` 是纯内存转移。提供的 `ClaimNext` 包装器在加载、转移、Save 全程持有操作系统文件锁。独立进程打开同一 `ledger.lock`；崩溃释放内核锁。`jobs.json` 被替换，而稳定锁文件保持原位。锁住被重命名的快照本身会让各进程锁住不同文件对象。

尝试计数在恢复后保留。上限为 3 时，崩溃三次的任务应仍可见，为 queued、attempts 3；悄悄清零计数会产生无限重试循环。

```figure
pj-durable-agent-jobs-2
```

## 你的契约

```go
func ClaimJob(j *Job, expected int, now, ttl int64, maxAttempts int) error
```

保留 `types.go` 中的公开签名和错误。被拒绝的调用必须保留调用者此前状态。阅读[项目 API](../../../API.md)，了解最终产物的文件与进程边界。

## 实现提示

每个拒绝条件都用提前返回。相加前检查 `now > MaxInt64-ttl`。只有之后才赋值租约、版本、尝试次数和状态。

## 验证

从仓库根目录运行：

```bash
python3 scripts/project_test.py durable-agent-jobs --stage 2 --path /tmp/durable-agent-jobs-work --strict
```

评分器运行选定的工作区，包括此前阶段。参考模式是独立的教师检查，不计为学员完成。

## 探索一次失败

预测两个调用者都传 expected 0 后的快照。再将 maxAttempts 设为 1，回收首次尝试。为何状态为 queued，下一次认领仍失败？

## 来源与限制

按需学习标准库 [os 包](https://pkg.go.dev/os)、[context](https://pkg.go.dev/context) 和 [Go 流水线指南](https://go.dev/blog/pipelines)。练习和样本均为原创。进程恢复在单主机上演示；README 列出改造产物时必须保留的文件系统与评估限制。
