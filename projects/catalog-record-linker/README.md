# 目录记录关联器

帮助图书馆员或组织者核对两份 CSV 导出中不一致的条目记录。利用规范化字段和 token 相似度生成候选配对，收集明确的匹配决定，导出保留来源的映射表及经过审核的合并目录。

实现使用 Python 3.10+ 和标准库。样本为原创教学数据。精确的输入、输出和错误契约见 [API.md](API.md)。

## 构建你自己的版本

```bash
python3 scripts/project_test.py catalog-record-linker --init learning-artifacts/catalog-record-linker
python3 scripts/project_test.py catalog-record-linker --stage 1 --path learning-artifacts/catalog-record-linker --strict
```

在实现第一个契约前，新初始化的起始代码会明确失败。后续阶段保留你的源文件。提供的 CLI 和展示辅助函数只是脚手架；所有领域决策都会调用你的实现。

```bash
python3 scripts/project_test.py catalog-record-linker --all --path learning-artifacts/catalog-record-linker --strict
cd learning-artifacts/catalog-record-linker
python3 cli.py samples/input.json --output my-output
```

## 运行参考实现与自己的输入

```bash
python3 scripts/project_test.py catalog-record-linker --all --solution --strict
cd projects/catalog-record-linker/solution
python3 cli.py samples/input.json --output demo-output
python3 cli.py /absolute/path/to/your-input.json --output your-output
```

输入含 left_csv、right_csv 和可选 threshold。输出为 crosswalk.csv、merged-catalog.json、review.html。下载 decisions.json，在 pairs 中添加 {left,right,match,values} 条目，然后传入 --decisions decisions.json。指纹会拒绝针对不同源输入的审核。

## 示例推演与限制

left:map-1 和 right:r-7 可能描述同一本地图集，但两条源记录都不会被丢弃。

任何相似度都不会自动合并记录。ready 表示被接受的合并已解决冲突，不声称所有候选都已检查。

## 阶段

1. [导入两份目录并保留稳定的来源标识](stages/01-import/docs/zh.md)
2. [生成候选配对并解释相似度](stages/02-candidates/docs/zh.md)
3. [审核匹配并解决字段冲突](stages/03-decisions/docs/zh.md)
4. [导出映射表和合并目录](stages/04-export/docs/zh.md)

## 主要参考资料

- [技术参考](https://docs.python.org/3/library/)
