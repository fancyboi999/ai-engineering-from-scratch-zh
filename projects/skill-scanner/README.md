# Skill 供应链扫描器

引用新增能力的 skill 变更审查助手。

来源证据使用字节偏移。含 café 的行占用的 UTF-8 字节多于可见字母，所以字符索引不能安全切 Rust 字符串。拆行时保留起止偏移。

## 从学员工作区开始

[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)、[安全与秘密审计](../../phases/17-infrastructure-and-production/25-security-secrets-audit/docs/zh.md)。语言基础：[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)。

安装 Rust（`rustc`）与 Python 3.10+。核心用 Rust 标准库；Python 适配器编译到私有临时目录。

```bash
python3 scripts/project_test.py skill-scanner --init learning-artifacts/skill-scanner
python3 scripts/project_test.py skill-scanner --stage 1 --path learning-artifacts/skill-scanner
```

## 构建路线

1. [保留字节精确的来源区间](stages/01-retain-byte-accurate-source-spans/docs/zh.md)
2. [检测具名提示模式](stages/02-detect-named-advisory-patterns/docs/zh.md)
3. [对独立证据评分，避免膨胀](stages/03-score-distinct-evidence-without-inflation/docs/zh.md)
4. [构建显式审查门禁](stages/04-build-an-explicit-review-gate/docs/zh.md)

## 用自己的输入运行

阶段完成后，这些命令在原创 Orchard 示例上运行你的工作区代码。把样本路径替换为自己的文件。

```bash
rustc --edition=2021 learning-artifacts/skill-scanner/cli.rs -o learning-artifacts/skill-scanner/scanner
learning-artifacts/skill-scanner/scanner projects/skill-scanner/examples/reviewable 3
```

先检查完整参考方案时，将同命令中的 `learning-artifacts/skill-scanner` 替换为 `projects/skill-scanner/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例明确，便于其他工具消费。

## 集成边界

扫描器输出版本化 JSON，含文件路径、精确 UTF-8 字节区间和提示规则。显式模式会漏混淆内容，也可能标记无害文档。below-threshold 不代表安全；扫描状态从不替代安装完整性或人工审查。

```bash
python3 scripts/project_test.py skill-scanner --all --solution --strict
python3 scripts/project_test.py skill-scanner --all --path learning-artifacts/skill-scanner --strict
```

首命令检查参考方案，第二检查你的实现。发布的示例和测试是回归证据，不是生产认证或未见基准测试。

## 主要参考资料

- [官方参考](https://agentskills.io/specification)
