# 完成或回收到期工作

> 慢 worker 醒来时，另一个 worker 可能已完成任务。它的旧回执不能改写账本。

**类型：** Build
**语言：** Go
**前置要求：** 完成阶段 1 至 2；理解其导出类型和失败契约。
**阶段：** 第 3 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 构建内容

区分完成与许可。在初始化工作区实现 `stage3.go`。提供的 CLI 调用你的实现，不导入参考方案。

## 推演机制

worker A 拥有 version 1 到 110。110 时完成 version 1 失败。Reclaim 将 running v1 改成 queued v2，清除租约，保留 attempts 1。worker B 认领 queued v2，得到 running v3、attempts 2。A 的迟到完成仍带 1，即使时钟说 105 也失败。版本检查防御过期的时间视图。

worker B 在到期前完成，生成 completed v4。完成是新状态转移，其版本不是认领版本。重复 `Finish` 失败，因为任务不再 running。这刻意不同于幂等输出回执：账本转移和业务效果具有不同契约。

CLI 的 `--now-ms` 只用于可复现实验。普通 worker 在认领与完成时读取当前墙上时钟。注入固定时钟能证明版本栅栏，但不模拟计算中实际流逝的时钟。拥有独立时钟的多机器需要协调器掌握时间权威。

```figure
pj-durable-agent-jobs-3
```

## 你的契约

```go
func Finish(j *Job, expected int, now int64) error
func Reclaim(j *Job, now int64) bool
```

保留 `types.go` 中的公开签名和错误。被拒绝的调用必须保留调用者此前状态。阅读[项目 API](../../../API.md)，了解最终产物的文件与进程边界。

## 实现提示

Reclaim 必须同时测试 running 状态和到期。queued 或 completed 记录应逐字节不变。Finish 必须检查当前版本和租约。

## 验证

从仓库根目录运行：

```bash
python3 scripts/project_test.py durable-agent-jobs --stage 3 --path /tmp/durable-agent-jobs-work --strict
```

评分器运行选定的工作区，包括此前阶段。参考模式是独立的教师检查，不计为学员完成。

## 探索一次失败

对 lease 110 测试 109 与 110，再让 A 在 B 认领 v3 后完成。说明为何延长 A 的超时不能恢复其权限。

## 来源与限制

按需学习标准库 [os 包](https://pkg.go.dev/os)、[context](https://pkg.go.dev/context) 和 [Go 流水线指南](https://go.dev/blog/pipelines)。练习和样本均为原创。进程恢复在单主机上演示；README 列出改造产物时必须保留的文件系统与评估限制。
