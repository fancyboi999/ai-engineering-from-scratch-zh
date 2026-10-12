# 根据证据或预算停止编码循环

**第 4 阶段，共 4 阶段。** Python。预计约 2 小时。

编码 agent 交替执行动作和观察。这里规划器是显式录制工具调用列表，使循环确定且易检查。工具执行真实文件编辑和真实测试。

每个动作都计入步骤预算。测试通过、工具调用无效或预算耗尽时立即停止。以后生产模型可提供相同类型化动作，无需更改工具执行。

```figure
pj-tiny-coding-agent-4
```

主要参考：[主要技术参考](https://docs.python.org/3/library/subprocess.html)。

## Orchard 具体案例

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和 [Agent 循环](../../../../../phases/14-agent-engineering/01-the-agent-loop/docs/zh.md)。先完成[第 3 阶段](../../03-run-real-tests/docs/zh.md)。

现在规划器接收每次观察。先测试，只有对应失败标记出现才选择附带精确修复，再测试。这个透明规则规划器不宣称用模型发明代码。

```text
test -> AssertionError
proposal marker matches -> patch
test -> OK -> completed
```

## 构建与检查

每次工具结果后再次调用规划器。将请求动作与每次观察一起保留，放弃或步骤耗尽时停止。

在学习者工作区实现本阶段。CLI 辅助程序是附带适配器，导入你的函数，不会代替为参考方案。

```bash
python3 scripts/project_test.py tiny-coding-agent --stage 4 --path learning-artifacts/tiny-coding-agent
```

累积阶段通过后，在仓库根目录用原创样本输入运行你的产物：

```bash
python3 learning-artifacts/tiny-coding-agent/cli.py projects/tiny-coding-agent/examples/workspace projects/tiny-coding-agent/examples/proposals.json --copy-to basket-repair --out repair-trace.json
```

CLI 将可信 Python 工作区复制到新目标，再作为本地代码运行测试。附带提案规划器按观察到的失败选择预写修复，不会发明补丁。POSIX 进程组超时会停止子孙进程，但内存和输出配额需要操作系统级运行器。

## 下一步探究

怎样接入模型，同时保持相同补丁前置条件和完成规则？
