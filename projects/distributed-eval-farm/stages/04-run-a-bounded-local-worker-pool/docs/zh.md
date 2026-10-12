# 运行有界本地 worker 池

> 每个分派的 worker 都走同一持久化认领与回执路径时，并发才有用。

**类型：** Build
**语言：** Go
**前置要求：** 完成阶段 1 至 3；理解其导出类型和失败契约。
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 构建内容

跨进程运行整个集群。在初始化工作区实现 `stage4.go`。提供的 CLI 调用你的实现，不导入参考方案。

## 推演机制

围绕注入的回调实现有界 goroutine 池。channel 传递唯一工作 ID；同时调用回调的数量不超过配置 worker 数。收集成功 Items，按 ID 排序。回调失败时，把错误与实际收集的成功结果一同返回。取消停止新的有效工作，并传入每个回调。

最终 `run` 命令用这个池启动操作系统 worker 进程。每个回调用 worker 命令执行同一个编译二进制。每个进程获取一个持久化分片，评估其已记录预测，再经当前租约提交。工作分有界批次运行，直到全部分片完成，或每个剩余分片都有未到期的所有者。

四案例样本配 workers 2 时，两个批次创建四个短生命周期进程。上限 2 指同时运行进程，不是总进程数。报告显示 4 个中 3 个正确、完整覆盖、数据集哈希、分片所有者和实际进程 ID。PID 每次可能不同；分数来自提供的响应。

最终阶段测试让延迟旧 worker 与替代者并行。替代者提交后，旧进程以版本栅栏错误退出，持久化快照不变。测试还让 worker 崩溃、从磁盘重启、拒绝变化的数据集并保留损坏输入供诊断。这是同主机协调，不是多机器传输。

```figure
pj-distributed-eval-farm-4
```

## 你的契约

```go
func Parallel(ctx context.Context, ids []string, workers int, run func(context.Context, string) (string, error)) ([]Item, error)
```

保留 `types.go` 中的公开签名和错误。被拒绝的调用必须保留调用者此前状态。阅读[项目 API](../../../API.md)，了解最终产物的文件与进程边界。

## 实现提示

只有分派 goroutine 关闭 jobs channel。全部 worker 退出后关闭 results。给结果收集足够容量，或出错后继续排空，避免发送者被困住。

## 验证

从仓库根目录运行：

```bash
python3 scripts/project_test.py distributed-eval-farm --stage 4 --path /tmp/distributed-eval-farm-work --strict
```

评分器运行选定的工作区，包括此前阶段。参考模式是独立的教师检查，不计为学员完成。

## 探索一次失败

分别用 workers 1 和 2 运行样本，比较覆盖和回执，而不是墙上时钟速度。尝试 workers 0 和已取消的 context。解释忽略 context 的回调为何仍会延迟池关闭。

## 来源与限制

按需学习标准库 [os 包](https://pkg.go.dev/os)、[context](https://pkg.go.dev/context) 和 [Go 流水线指南](https://go.dev/blog/pipelines)。练习和样本均为原创。进程恢复在单主机上演示；README 列出改造产物时必须保留的文件系统与评估限制。
