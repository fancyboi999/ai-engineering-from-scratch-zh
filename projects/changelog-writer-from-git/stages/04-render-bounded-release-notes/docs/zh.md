# 渲染有界的发布说明

> 提交 `[x](bad)` -> 发布说明中经过转义的字面标签

**类型：** Build
**语言：** Go
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 从真实仓库构建发布产物

CLI 接收仓库路径和两个修订，将两个名称解析为不可变提交 ID，读取不含 from、包含 to 的范围，生成 Markdown 和可选 JSON 回执。它不会更改检出内容，也不会发布版本。

## 推演一个案例

运行 `go run . --repo /path/to/repo --from v1.0 --to HEAD --label v1.1 --output release.md --receipt release.json`。检查回执哈希和迁移章节。页脚表明作者说了什么必须改变，但不能证明这些说明完整。

```figure
pj-changelog-writer-from-git-4
```

## 你的任务

```go
func Release(label string,commits []Commit,max int)(string,error)
```

在工作区实现这些公开签名。区分无效输入、预算超限和状态冲突。操作失败时保留原始证据或输入记录。测试直接加载你的工作区，因此在已提交的参考方案中另写一个函数不会推进你的阶段。

## 运行测试

```bash
python3 scripts/project_test.py changelog-writer-from-git --stage 4 --path /tmp/changelog-writer-from-git-work
```

本阶段检查 Output、BadLabel、Limit、Escape、SectionOrder。用失败案例定位被破坏的不变量。只通过正常示例不能证明边界行为正确。

## 实现提示

渲染前验证标签和提交预算。将描述转义为 Markdown 字面文本，使用固定章节顺序，并包含每个来源哈希。提供的适配器使用参数数组、十秒截止时间和有界输出缓冲区；不会由 shell 解释提交文本。

先从一条有效记录开始，再添加拒绝案例，最后才优化。失败时不改变源数据，让调用者能诊断原因。用能表达边界的最小函数；额外的框架会掩盖你正在学习的机制。

## 检查理解

从小型临时仓库生成发布说明，比较前后的 git status。在新分支中更改一个源提交，展示导出指纹如何变化。手动发布前审查显式的 revert 引用。

运行测试前先写下预测。如果结果出乎意料，沿着验证、状态构造和输出追踪输入。通过测试的参考实现只是对照工具；只有你自己的工作区通过累积评分器才能证明完成。

## 使用你自己的数据

`--repo PATH --from REV --to REV` 读取不可变的 Git 范围。也可以用 `--input FILE` 接收 `git log --format=%H%x00%s%x00%b%x00 FROM..TO` 的输出。添加 `--output release.md --receipt release.json` 可生成可复用产物。不传参数时使用原创的双提交 fixture。支持的仓库配置使用 SHA-1 提交 ID；SHA-256 仓库需要扩展哈希格式。

## 来源

[Git 美化输出格式](https://git-scm.com/docs/pretty-formats)。
