# 将文件工具限制在工作区内

**第 1 阶段，共 4 阶段。** Python。预计约 2 小时。

agent 文件工具必须相对工作区解释路径，解析符号链接后再检查包含关系。字符串前缀不足以判断：/tmp/work-other 以 /tmp/work 开头，却是另一个目录。

这保护可信本地教学工作区中的文件工具路径。它不为 Python 测试提供沙箱，不防止并发符号链接竞态，也不隔离恶意代码。本项目只能运行可信 fixture。

```figure
pj-tiny-coding-agent-1
```

主要参考：[主要技术参考](https://docs.python.org/3/library/subprocess.html)。

## Orchard 具体案例

编码前复习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和 [Agent 循环](../../../../../phases/14-agent-engineering/01-the-agent-loop/docs/zh.md)。

Orchard basket 修复在可信 Python 工作区的一次性副本中运行。打开任何请求文件前，先在该根目录下解析路径。路径看似本地，符号链接却可能把它指向工作区之外。

```text
basket.py -> contained existing file
../basket.py -> reject
symlink to external file -> reject
```

## 构建与检查

比较解析后的路径组件，不比较字符串前缀。工作区由调用方选择；模型响应不得选择新根目录。

在学习者工作区实现本阶段。CLI 辅助程序是附带适配器，导入你的函数，不会代替为参考方案。

```bash
python3 scripts/project_test.py tiny-coding-agent --init learning-artifacts/tiny-coding-agent
python3 scripts/project_test.py tiny-coding-agent --stage 1 --path learning-artifacts/tiny-coding-agent
```

预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案通过不代表你的学习者工作区已完成。

## 下一步探究

为什么复制可信仓库不会让测试代码变成沙箱代码？
