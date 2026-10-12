# 通过一个允许的命令运行真实测试

**第 3 阶段，共 4 阶段。** Python。预计约 2 小时。

测试工具自己掌握 argv。模型文本绝不变成 shell 命令。用当前 Python 解释器执行 unittest discovery，禁用交互 stdin，捕获输出并设置超时。

即使 unittest 退出码为零，零测试或含跳过测试的套件也算失败。从 stderr 读取最终 unittest 摘要；fixture 打印到 stdout 的文本不是运行器证据。工具执行可信 Python，路径限制本身不是操作系统安全边界。

```figure
pj-tiny-coding-agent-3
```

主要参考：[主要技术参考](https://docs.python.org/3/library/subprocess.html)。

## Orchard 具体案例

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和 [Agent 循环](../../../../../phases/14-agent-engineering/01-the-agent-loop/docs/zh.md)。先完成[第 2 阶段](../../02-apply-exact-patches/docs/zh.md)。

声称修复前运行真实 unittest 套件。原始 basket 示例中 total(7,3) 返回 10 而非 21；total(7,0) 返回 7 而非 0。补丁后两个失败都应消失。

```text
before: 2 failed assertions
after: 2 executed tests, OK
zero tests or skipped tests -> not success
```

## 构建与检查

从 stderr 读取最终 unittest 摘要，要求执行测试数为正。在 POSIX 上，测试截止时间到达时停止整个进程组。

在学习者工作区实现本阶段。CLI 辅助程序是附带适配器，导入你的函数，不会代替为参考方案。

```bash
python3 scripts/project_test.py tiny-coding-agent --stage 3 --path learning-artifacts/tiny-coding-agent
```

预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案通过不代表你的学习者工作区已完成。

## 下一步探究

为什么打印的 "Ran 999 tests" 行不能算测试证据？
