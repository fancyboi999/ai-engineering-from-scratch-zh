# 下载文件夹整理台

结合文件元数据、内容哈希和可解释的分类评分，帮助整理本地下载文件。生成无冲突的目标提案和重复文件组，再导出 HTML 审核台和 JSON 移动计划，供其他文件管理器消费。

实现使用 Python 3.10+ 和标准库。样本是原创教学数据。确切的输入、输出和错误契约见 [API.md](API.md)。

## 构建你的版本

```bash
python3 scripts/project_test.py download-folder-sort-desk --init learning-artifacts/download-folder-sort-desk
python3 scripts/project_test.py download-folder-sort-desk --stage 1 --path learning-artifacts/download-folder-sort-desk --strict
```

全新起始实现在你实现第一个契约前会明确失败。后续阶段保留你的源文件。附带的 CLI 和展示辅助程序是脚手架；所有领域决策都调用你的实现。

```bash
python3 scripts/project_test.py download-folder-sort-desk --all --path learning-artifacts/download-folder-sort-desk --strict
cd learning-artifacts/download-folder-sort-desk
python3 cli.py samples/input.json --output my-output
```

## 运行参考实现和你自己的输入

```bash
python3 scripts/project_test.py download-folder-sort-desk --all --solution --strict
cd projects/download-folder-sort-desk/solution
python3 cli.py samples/input.json --output demo-output
python3 cli.py /absolute/path/to/your-input.json --output your-output
```

输入 JSON 包含相对该 JSON 文件的 folder，以及可选的已有目标路径字符串 occupied。输出：moves.json、duplicates.json、review.html。下载并编辑 decisions.json，保留 fingerprint 并填写包含源路径的 approved 数组，然后用 --decisions decisions.json 重跑。文件管理器导入 review_plan(folder, json.load(open("moves.json")), decisions)，检查目标可用性后仅执行获批移动。

## 具体示例与限制

handout.txt 和 duplicate.txt 内容字节相同。文件名不同，SHA-256 值却一致。

本项目不会移动任何文件。文件管理器必须预留目标，并在移动前立即复查文件标识；这个规划门禁不是事务或操作系统沙箱。

## 阶段

1. [盘点文件并计算内容标识](stages/01-inventory/docs/zh.md)
2. [根据可见文件特征评分分类](stages/02-score/docs/zh.md)
3. [规划目标并暴露命名冲突](stages/03-destinations/docs/zh.md)
4. [为文件管理器导出经审核的归档计划](stages/04-review/docs/zh.md)

## 主要参考资料

- [技术参考](https://docs.python.org/3/library/)
