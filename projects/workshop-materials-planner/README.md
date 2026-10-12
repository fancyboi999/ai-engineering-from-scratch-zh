# 工作坊物料规划器

帮助工作坊主持人核对每位参与者的材料、可复用设备和库存快照。通过显式单位转换与声明共享规则计算缺口，让无法换算数量保持可见，导出装箱清单及参与人数对比。

实现使用 Python 3.10+ 和标准库。样本是原创教学数据。确切的输入、输出和错误契约见 [API.md](API.md)。

## 构建你的版本

```bash
python3 scripts/project_test.py workshop-materials-planner --init learning-artifacts/workshop-materials-planner
python3 scripts/project_test.py workshop-materials-planner --stage 1 --path learning-artifacts/workshop-materials-planner --strict
```

全新起始实现在你实现第一个契约前会明确失败。后续阶段保留你的源文件。附带的 CLI 和展示辅助程序是脚手架；所有领域决策都调用你的实现。

```bash
python3 scripts/project_test.py workshop-materials-planner --all --path learning-artifacts/workshop-materials-planner --strict
cd learning-artifacts/workshop-materials-planner
python3 cli.py samples/input.json --output my-output
```

## 运行参考实现和你自己的输入

```bash
python3 scripts/project_test.py workshop-materials-planner --all --solution --strict
cd projects/workshop-materials-planner/solution
python3 cli.py samples/input.json --output demo-output
python3 cli.py /absolute/path/to/your-input.json --output your-output
```

输入 JSON 含 participants、materials、inventory、conversions 和可选 compare counts。输出 packing-list.csv、shortages.json、planner.html。滑块支持 0 到 100 人；CLI 支持任意非负整数。下载 decisions.json 保存选定人数，用 --decisions decisions.json 重跑，再通过 csv.DictReader 把 packing-list.csv 导入电子表格。

## 具体示例与限制

八位参与者每人需要纸张，每三人共享剪刀。除非提供换算，一瓶胶水有多少毫升是未知的。

共享假定一次并发活动，组内无限复用。它不安排连续工作坊、采购提前期或材料替代。

## 阶段

1. [建模参与者、材料和库存单位](stages/01-model/docs/zh.md)
2. [分别缩放耗材与共享设备](stages/02-scale/docs/zh.md)
3. [计算缺口并审核不确定换算](stages/03-shortages/docs/zh.md)
4. [导出装箱清单和参与人数情景](stages/04-scenarios/docs/zh.md)

## 主要参考资料

- [技术参考](https://docs.python.org/3/library/)
