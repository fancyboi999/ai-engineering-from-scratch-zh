# 合并完整重叠并集

> 在记录进入模型流水线前移除有界敏感文本模式。

**类型：** Build
**语言：** Python
**前置要求：** 前面的项目阶段
**预计时间：** 约 120 分钟

## 学习目标

- 实现公开函数契约，拒绝不支持的输入。
- 运行工具前预测具体示例结果。
- 用保存的证据解释失败案例。
- 在流水线下一阶段复用输出。

## 你构建的内容

校验每个跨度并对副本排序。相交跨度成为一个并集，kinds 排序去重。相邻跨度仍独立。不要删除小型嵌套匹配而意外暴露更大匹配的剩余部分。

```text
merge_spans(spans, text_length) -> list[dict]
```

## 推演一个示例

```python
merge_spans([{'start': 1, 'end': 4, 'kind': 'LITERAL'}, {'start': 3, 'end': 6, 'kind': 'LITERAL'}], 6)
```

预期值：

```text
[{'start': 1, 'end': 6, 'kinds': ['LITERAL']}]
```

`banana` 中字面串 `ana` 出现在 [1,4) 和 [3,6)。合并区间为 [1,6)，五个字符只覆盖一次。维护当前最终区间；下一起点在其终点之前时扩展终点。相等是相邻，不是重叠。

## 交互实验

```figure
pj-sensitive-text-redaction-gate-2
```

更改机制中的一个输入。预测哪个中间值应改变，再比较计算的回执。图表说明本阶段契约；本地评分器测试你的实际 Python 代码。

## 动手构建

打开学习者工作区的 `main.py`。用显式数据结构实现本阶段函数，保留前阶段契约。CLI 和 HTML 渲染器在初始化时已提供，不能代替你正在编写的实现。阶段测试导入 `PROJECT_WORKSPACE`，因此编辑讲师文件不能完成你的版本。

## 失败案例

拒绝布尔偏移、负起点、空跨度、超过 text_length 的终点和不支持的 kinds。绝不修改调用方跨度。

## 验证

在仓库根目录执行：

```bash
python3 scripts/project_test.py sensitive-text-redaction-gate --stage 2 --path learning-artifacts/sensitive-text-redaction-gate --strict
```

评分器是累积式的。读取首个失败断言，用最小输入复现并修复负责的函数。它检查常规案例、边界条件、畸形值和独立 fixture。讲师专用等效命令为 `--stage 2 --solution --strict`。

## 使用与扩展

全部四阶段通过后，用自己的 JSONL 运行附带 CLI：

```bash
cd learning-artifacts/sensitive-text-redaction-gate
python3 cli.py samples/input.jsonl --literals samples/literals.json --output demo-output
```

另写一个不同于具体示例的留出案例。解释其结果为什么由契约决定，而非匹配硬编码样本。

明确保留不支持的行为说明。扩展接受的输入格式前，应先增加契约示例和测试，再改实现。
