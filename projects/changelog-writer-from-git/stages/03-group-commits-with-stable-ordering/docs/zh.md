# 按稳定顺序分组提交

> feat! 归入 Breaking changes，而不是 Features

**类型：** Build
**语言：** Go
**阶段：** 第 3 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 让发布分组可复现

分组需要有序决策。破坏性行为优先于功能或修复。组内排序让输出不受记录进入程序的顺序影响。源提交仍可在独立的 JSON 回执中查看。

## 推演一个案例

输入两个修复提交，哈希依次为 bbbbbbb 和 aaaaaaa，输出顺序应为 aaaaaaa、bbbbbbb。加入哈希为 ccccccc、标题为 `feat!: new wire format` 的提交；它只能归入 Breaking changes。对原始输入切片排序会让其他调用者意外，所以应将值分类到新的分组切片中。

```figure
pj-changelog-writer-from-git-3
```

## 你的任务

```go
func Group(commits []Commit)(map[string][]Commit,error)
```

在工作区实现这些公开签名。区分无效输入、预算超限和状态冲突。操作失败时保留原始证据或输入记录。测试直接加载你的工作区，因此在已提交的参考方案中另写一个函数不会推进你的阶段。

## 运行测试

```bash
python3 scripts/project_test.py changelog-writer-from-git --stage 3 --path /tmp/changelog-writer-from-git-work
```

本阶段检查 Features、BreakingFirst、Stable、Unknown、Empty。用失败案例定位被破坏的不变量。只通过正常示例不能证明边界行为正确。

## 实现提示

创建分组映射，逐条分类，再将每个结果切片按哈希排序。不要遍历映射来输出章节，因为映射迭代不保证稳定的展示顺序。

先从一条有效记录开始，再添加拒绝案例，最后才优化。失败时不改变源数据，让调用者能诊断原因。用能表达边界的最小函数；额外的框架会掩盖你正在学习的机制。

## 检查理解

反复打乱同一提交列表，比较渲染后的字节。revert 必须与其目标一同可见；解释为什么悄悄减掉两个提交可能掩盖后续变更。

运行测试前先写下预测。如果结果出乎意料，沿着验证、状态构造和输出追踪输入。通过测试的参考实现只是对照工具；只有你自己的工作区通过累积评分器才能证明完成。

## 使用你自己的数据

`--repo PATH --from REV --to REV` 读取不可变的 Git 范围。也可以用 `--input FILE` 接收 `git log --format=%H%x00%s%x00%b%x00 FROM..TO` 的输出。添加 `--output release.md --receipt release.json` 可生成可复用产物。不传参数时使用原创的双提交 fixture。支持的仓库配置使用 SHA-1 提交 ID；SHA-256 仓库需要扩展哈希格式。

## 来源

[Git 美化输出格式](https://git-scm.com/docs/pretty-formats)。
