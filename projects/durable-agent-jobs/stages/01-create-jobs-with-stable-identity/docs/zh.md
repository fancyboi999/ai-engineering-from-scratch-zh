# 创建稳定任务身份

> 生产者丢失确认，报告请求因此到达两次。两次交付应指向一个任务。

**类型：** Build
**语言：** Go
**前置要求：** Go 结构体、指针、错误、JSON 文件和 shell；按顺序完成此前阶段。
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 构建内容

为重试赋予同一身份。在初始化工作区实现 `stage1.go`。提供的 CLI 调用你的实现，不导入参考方案。

## 推演机制

任务是意图的持久化记录。函数创建记录，但不执行意图。保持 `ID`、`State`、`Version`、`LeaseUntil`、`Attempts` 可见，不要压缩成布尔值。布尔值无法说明当前是否有其他 worker 拥有工作。

对 `report-1` 返回 queued、version 0、attempts 0、lease 0。拒绝 `../report`、空字符串、大写首字母、空格和超过 64 字符的标识。接受小写字母开头，后接小写字母、数字或连字符的形式。不要通过 trim 把无效标识变成另一个有效身份。

提供的 CLI 之后将 `{id,text}` 与任务状态分开存储。相同标识与相同文本入队是无操作；已有标识下更改文本是冲突。这让生产者可以重试，不会意外替换已经运行的工作。

```figure
pj-durable-agent-jobs-1
```

## 你的契约

```go
func NewJob(id string) (Job, error)
```

保留 `types.go` 中的公开签名和错误。被拒绝的调用必须保留调用者此前状态。阅读[项目 API](../../../API.md)，了解最终产物的文件与进程边界。

## 实现提示

构造 Job 前检查整个标识。零值 Job 的状态为空，因此仅成功时返回显式 queued 状态。

## 验证

从仓库根目录运行：

```bash
python3 scripts/project_test.py durable-agent-jobs --stage 1 --path /tmp/durable-agent-jobs-work --strict
```

评分器运行选定的工作区，包括此前阶段。参考模式是独立的教师检查，不计为学员完成。

## 探索一次失败

创建 `a`，再尝试 `a ` 和 `a/`。解释 trim 或路径清理为何让重试含糊。扩展载荷增加报告格式前，先决定格式变化是否要求新标识。

## 来源与限制

按需学习标准库 [os 包](https://pkg.go.dev/os)、[context](https://pkg.go.dev/context) 和 [Go 流水线指南](https://go.dev/blog/pipelines)。练习和样本均为原创。进程恢复在单主机上演示；README 列出改造产物时必须保留的文件系统与评估限制。
