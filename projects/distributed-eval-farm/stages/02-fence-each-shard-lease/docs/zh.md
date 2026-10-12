# 为每个分片租约设置版本栅栏

> 租约必须在获取它的进程退出后仍存在。下个进程必须推进同一版本。

**类型：** Build
**语言：** Go
**前置要求：** 完成阶段 1；理解其导出类型和失败契约。
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 构建内容

让另一个进程安全接管。在初始化工作区实现 `stage2.go`。提供的 CLI 调用你的实现，不导入参考方案。

## 推演机制

第一个 worker 在 100 ms 以 10 ms 租约认领 shard-0。存储记录的 owner 为 old、version 1、until 110。第二个 worker 在 109 无法获取它。到 110 可成为 owner new，version 2。无论时间如何，已完成分片保持关闭。

`Acquire` 在内存中更改一个 Lease。`ClaimShard` 在 `ledger.lock` 下将其与全运行快照组合。持锁时重新加载，选择符合条件的分片，调用 Acquire，保存，最后才向 worker 返回案例。认领持久化前启动评估，会在崩溃后没有可恢复的所有者。

初始化后运行 `farm worker --crash-after-claim`。这会启动真实进程，在重命名后退出 86，将租约留在磁盘上。替代进程可在到期边界恢复分片。观察这个故障不需要网络、模型服务或合成回调。

所有参与者必须在本地 Linux 或 macOS 文件系统上使用加锁包装器。直接调用 Acquire 不协调进程。网络文件系统或远程数据库需要自己的事务和时钟契约。

```figure
pj-distributed-eval-farm-2
```

## 你的契约

```go
func Acquire(l *Lease, worker string, now, ttl int64) error
```

保留 `types.go` 中的公开签名和错误。被拒绝的调用必须保留调用者此前状态。阅读[项目 API](../../../API.md)，了解最终产物的文件与进程边界。

## 实现提示

修改前检查 Done 以及当前被占有且未到期的租约。验证时钟算术。将所有者、版本和到期时间一起更改。

## 验证

从仓库根目录运行：

```bash
python3 scripts/project_test.py distributed-eval-farm --stage 2 --path /tmp/distributed-eval-farm-work --strict
```

评分器运行选定的工作区，包括此前阶段。参考模式是独立的教师检查，不计为学员完成。

## 探索一次失败

worker 认领后暂停，再在同一逻辑时间运行另一个。确认报告待完成工作，而不是抢占它。110 时恢复，检查持久化版本。

## 来源与限制

按需学习标准库 [os 包](https://pkg.go.dev/os)、[context](https://pkg.go.dev/context) 和 [Go 流水线指南](https://go.dev/blog/pipelines)。练习和样本均为原创。进程恢复在单主机上演示；README 列出改造产物时必须保留的文件系统与评估限制。
