# 读取不可变的 Git 导出

> git log --format=%h%x09%s -> 哈希与标题

**类型：** Build
**语言：** Go
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 读取记录而不丢失证据

Git 提交包含哈希、标题和正文。第一个练习刻意从“哈希、制表符、标题”记录开始，让你先学会解析边界，再由提供的 Git 适配器处理 NUL 分隔的正文。不要把完整提交正文按换行拆开，再把每一行当成新提交。

## 推演一个案例

记录 `abc1234\tfeat: cache` 与 `abc1234\tfix: cache` 的标题不同，但仍然冲突。构建已接受哈希的集合。在追加第二条记录前检查其哈希；发现冲突时返回错误，不返回部分结果。

```figure
pj-changelog-writer-from-git-1
```

## 你的任务

```go
func ParseLog(text string)([]Commit,error)
```

在工作区实现这些公开签名。区分无效输入、预算超限和状态冲突。操作失败时保留原始证据或输入记录。测试直接加载你的工作区，因此在已提交的参考方案中另写一个函数不会推进你的阶段。

## 运行测试

```bash
python3 scripts/project_test.py changelog-writer-from-git --stage 1 --path /tmp/changelog-writer-from-git-work
```

本阶段检查 Valid、Duplicate、BadHash、NoSubject、Empty。用失败案例定位被破坏的不变量。只通过正常示例不能证明边界行为正确。

## 实现提示

使用上限为二的 SplitN，让第一个分隔符定义边界。验证哈希的每个字符，再拒绝空标题。集成适配器单独保留正文，导出上限为 4 MiB。

先从一条有效记录开始，再添加拒绝案例，最后才优化。失败时不改变源数据，让调用者能诊断原因。用能表达边界的最小函数；额外的框架会掩盖你正在学习的机制。

## 检查理解

为什么提交正文可以包含换行，而标题导出不能？构造一个被截断的 NUL 导出，解释适配器为何拒绝它。

运行测试前先写下预测。如果结果出乎意料，沿着验证、状态构造和输出追踪输入。通过测试的参考实现只是对照工具；只有你自己的工作区通过累积评分器才能证明完成。

## 使用你自己的数据

`--repo PATH --from REV --to REV` 读取不可变的 Git 范围。也可以用 `--input FILE` 接收 `git log --format=%H%x00%s%x00%b%x00 FROM..TO` 的输出。添加 `--output release.md --receipt release.json` 可生成可复用产物。不传参数时使用原创的双提交 fixture。支持的仓库配置使用 SHA-1 提交 ID；SHA-256 仓库需要扩展哈希格式。

## 来源

[Git 美化输出格式](https://git-scm.com/docs/pretty-formats)。
