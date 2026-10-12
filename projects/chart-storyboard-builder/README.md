# 图表故事板构建器

帮助社区组织者依据列的角色，明确选择聚合方式和图表形式，解释小型数据集。把每条注释绑定到绘制的数值，展示缺失数据与坐标轴选择，导出 SVG 图表序列、HTML 及机器可读的图表规格。

实现使用 Python 3.10+ 和标准库。样本为原创教学数据。精确的输入、输出和错误契约见 [API.md](API.md)。

## 构建你自己的版本

```bash
python3 scripts/project_test.py chart-storyboard-builder --init learning-artifacts/chart-storyboard-builder
python3 scripts/project_test.py chart-storyboard-builder --stage 1 --path learning-artifacts/chart-storyboard-builder --strict
```

在实现第一个契约前，新初始化的起始代码会明确失败。后续阶段保留你的源文件。提供的 CLI 和展示辅助函数只是脚手架；所有领域决策都会调用你的实现。

```bash
python3 scripts/project_test.py chart-storyboard-builder --all --path learning-artifacts/chart-storyboard-builder --strict
cd learning-artifacts/chart-storyboard-builder
python3 cli.py samples/input.json --output my-output
```

## 运行参考实现与自己的输入

```bash
python3 scripts/project_test.py chart-storyboard-builder --all --solution --strict
cd projects/chart-storyboard-builder/solution
python3 cli.py samples/input.json --output demo-output
python3 cli.py /absolute/path/to/your-input.json --output your-output
```

输入 JSON 含 csv、roles、可选 periods 和 charts [{grammar,reducer,annotations}]。输出 chart-N.svg、chart-specs.json、storyboard.html。下游使用方加载 chart-specs.json，逐一选择 charts 条目并调用 render_svg(spec)，无需输入 CSV 即可重现可移植图表。

## 示例推演与限制

原创出席表中，第 1 周的值是 8 和 10，第 2 周为空，第 4 周为 12。空单元格没有数值。

工具支持分类柱状图和显式指定时段顺序的折线图。不推断日期、因果关系或置信区间；这些需另做统计分析。

## 阶段

1. [分析列并声明角色与单位](stages/01-roles/docs/zh.md)
2. [计算聚合值并选择图表语法](stages/02-aggregate/docs/zh.md)
3. [将注释绑定到实际绘制的数值](stages/03-annotations/docs/zh.md)
4. [导出无障碍可视化故事板和数据回执](stages/04-publish/docs/zh.md)

## 主要参考资料

- [技术参考](https://docs.python.org/3/library/)
