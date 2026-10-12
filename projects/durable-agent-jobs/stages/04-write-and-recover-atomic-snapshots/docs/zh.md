# 写入并恢复原子快照

> 输出已存在、队列尚未记录完成时，也可能崩溃。让这个间隙可复现。

**类型：** Build
**语言：** Go
**前置要求：** 完成阶段 1 至 3；理解其导出类型和失败契约。
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 构建内容

恢复效果和账本。在初始化工作区实现 `stage4.go`。提供的 CLI 调用你的实现，不导入参考方案。

## 推演机制

打开临时快照前验证每个任务并拒绝重复标识。在目标目录写入、同步、关闭文件，再重命名覆盖 `jobs.json`。加载器限制文件为 4 MiB，拒绝截断 JSON、未知字段和尾随文档。验证失败必须保留此前快照。

组合 worker 持久化认领，读取不可变输入，创建 `effects/<id>.json`，再持久化完成。回执包含输入 SHA256、字节数、词数。同步临时回执，再以不替换的链接发布到最终名称。如果最终回执已有预期值，恢复时复用它。

在完成的工作区运行 `go run . demo`。演示启动真实 worker，写首个效果后退出 86。Status 显示 running v1 和一份回执。下一 worker 使用逻辑时间 111，回收后认领 v3，发现既有回执，以 `reused_effect: true` 完成 v4。第二个样本任务正常完成。

原子重命名保护读取者免于部分 JSON，但不把输入、回执、账本变成一个事务。生产者崩溃可能留下无引用输入文件；相同入队可安全接管。文件同步而无目录同步不能证明断电持久性。练习验证本地文件系统上的进程崩溃恢复。

```figure
pj-durable-agent-jobs-4
```

## 你的契约

```go
func ValidateJobs(jobs []Job) error
func Save(file string, jobs []Job) error
func Load(file string) ([]Job, error)
```

保留 `types.go` 中的公开签名和错误。被拒绝的调用必须保留调用者此前状态。阅读[项目 API](../../../API.md)，了解最终产物的文件与进程边界。

## 实现提示

临时文件的每个操作成功前，保留旧快照。不要用 defer 忽略 Close 错误。阅读 `runner.go`，看函数如何在同一锁下组合。

## 验证

从仓库根目录运行：

```bash
python3 scripts/project_test.py durable-agent-jobs --stage 4 --path /tmp/durable-agent-jobs-work --strict
```

评分器运行选定的工作区，包括此前阶段。参考模式是独立的教师检查，不计为学员完成。

## 探索一次失败

运行 README 中认领后崩溃实验，再运行效果后崩溃实验。统计每次恢复前后的回执文件。纸上把回执替换为 HTTP 支付调用：需要什么幂等键和持久化接收方契约？

## 来源与限制

按需学习标准库 [os 包](https://pkg.go.dev/os)、[context](https://pkg.go.dev/context) 和 [Go 流水线指南](https://go.dev/blog/pipelines)。练习和样本均为原创。进程恢复在单主机上演示；README 列出改造产物时必须保留的文件系统与评估限制。
