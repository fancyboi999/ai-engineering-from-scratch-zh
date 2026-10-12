# 社区学习路径规划器

帮助学习者从明确的工作坊与资源目录中选择可行顺序。结合前置依赖图、声明的目标和时间预算，解释选择每项资源的原因，导出可编辑的 HTML 学习地图以及供其他课程平台使用的机器可读路径。

实现使用 Python 3.10+ 和标准库。样本为原创教学数据。精确的输入、输出和错误契约见 [API.md](API.md)。

## 构建你自己的版本

```bash
python3 scripts/project_test.py community-learning-path-finder --init learning-artifacts/community-learning-path-finder
python3 scripts/project_test.py community-learning-path-finder --stage 1 --path learning-artifacts/community-learning-path-finder --strict
```

在实现第一个契约前，新初始化的起始代码会明确失败。后续阶段保留你的源文件。提供的 CLI 和展示辅助函数只是脚手架；所有领域决策都会调用你的实现。

```bash
python3 scripts/project_test.py community-learning-path-finder --all --path learning-artifacts/community-learning-path-finder --strict
cd learning-artifacts/community-learning-path-finder
python3 cli.py samples/input.json --output my-output
```

## 运行参考实现与自己的输入

```bash
python3 scripts/project_test.py community-learning-path-finder --all --solution --strict
cd projects/community-learning-path-finder/solution
python3 cli.py samples/input.json --output demo-output
python3 cli.py /absolute/path/to/your-input.json --output your-output
```

输入 JSON 含 resources、goals、budget 和可选 completed ID。输出 learning-map.html、path.json、unmet-prerequisites.json。编辑 HTML 中的进度 JSON，下载 decisions.json，再以 --decisions decisions.json 重跑。课程平台按数组顺序导入 path.json 中的 path 条目，保留 id、prerequisites、minutes 和 completed 字段。

## 示例推演与限制

社区制图先学坐标基础，再做实地采集，最后发布。高级分析还要求一项外部统计学前置资源。

HTML 编辑代表自报进度。导入器校验依赖一致性和指纹，不验证学习者身份或评估是否通过。

## 阶段

1. [建模资源、目标及前置依赖关系](stages/01-catalog/docs/zh.md)
2. [寻找可行路径并展示缺失的前置要求](stages/02-closure/docs/zh.md)
3. [在明确的时间预算内排序备选方案](stages/03-rank/docs/zh.md)
4. [导出可编辑学习地图与集成契约](stages/04-progress/docs/zh.md)

## 主要参考资料

- [技术参考](https://docs.python.org/3/library/)
