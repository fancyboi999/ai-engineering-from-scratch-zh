# 分类约定式提交标题

> feat(api)!: remove v1 -> 类型 feat，作用域 api，breaking 为 true

**类型：** Build
**语言：** Go
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 分类标题，同时保留迁移风险

约定式标题是一种实用的小语法：类型、可选作用域、可选感叹号、冒号加空格、描述。真实仓库也包含合并提交和普通文字。将这些记录保留为 Other，让发布编辑者检查。

## 推演一个案例

`fix(api)!: rename timeout` 得到 kind fix、scope api、breaking true、description rename timeout。在此函数运行前，独立的 `BREAKING CHANGE: Rename config.` 页脚也会设置 breaking true。分类器必须保留已有信号，不能因为没有感叹号就覆盖它。

```figure
pj-changelog-writer-from-git-2
```

## 你的任务

```go
func Classify(c Commit)(Commit,error)
```

在工作区实现这些公开签名。区分无效输入、预算超限和状态冲突。操作失败时保留原始证据或输入记录。测试直接加载你的工作区，因此在已提交的参考方案中另写一个函数不会推进你的阶段。

## 运行测试

```bash
python3 scripts/project_test.py changelog-writer-from-git --stage 2 --path /tmp/changelog-writer-from-git-work
```

本阶段检查 Feature、Scope、Breaking、Other、Blank。用失败案例定位被破坏的不变量。只通过正常示例不能证明边界行为正确。

## 实现提示

匹配一次标题语法。保持无法识别的非空标题原样不变。用逻辑 OR 合并传入的 breaking 标记和标题标记。空标题是无效输入，不是 Other 条目。

先从一条有效记录开始，再添加拒绝案例，最后才优化。失败时不改变源数据，让调用者能诊断原因。用能表达边界的最小函数；额外的框架会掩盖你正在学习的机制。

## 检查理解

对同一个标题分别传入 false 和 true 的 breaking 标记来分类。哪些字段变化？为什么替换标记会丢失迁移证据？

运行测试前先写下预测。如果结果出乎意料，沿着验证、状态构造和输出追踪输入。通过测试的参考实现只是对照工具；只有你自己的工作区通过累积评分器才能证明完成。

## 使用你自己的数据

`--repo PATH --from REV --to REV` 读取不可变的 Git 范围。也可以用 `--input FILE` 接收 `git log --format=%H%x00%s%x00%b%x00 FROM..TO` 的输出。添加 `--output release.md --receipt release.json` 可生成可复用产物。不传参数时使用原创的双提交 fixture。支持的仓库配置使用 SHA-1 提交 ID；SHA-256 仓库需要扩展哈希格式。

## 来源

[Git 美化输出格式](https://git-scm.com/docs/pretty-formats)。
