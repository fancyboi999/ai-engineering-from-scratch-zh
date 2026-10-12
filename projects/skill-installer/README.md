# 跨 agent 技能安装器

一个跨 agent 升级工具：提供可审查的差异，不丢失本地修改。

可移植包携带元数据和相对路径的 UTF-8 文件。把 SKILL.md 当作入口文档，拒绝任何可能逃出所选安装根目录的资源名。原始 Orchard 包包含恢复检查清单。

## 从学习者工作区开始

[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/zh.md), [安全与密钥审计](../../phases/17-infrastructure-and-production/25-security-secrets-audit/docs/zh.md)。语言基础：[TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)。

使用 Node 22.18+，评分器使用 Python 3.10+。核心 TypeScript 无需安装软件包。

```bash
python3 scripts/project_test.py skill-installer --init learning-artifacts/skill-installer
python3 scripts/project_test.py skill-installer --stage 1 --path learning-artifacts/skill-installer
```

## 构建路线

1. [校验可移植包](stages/01-bundle/docs/zh.md)
2. [转换元数据并计算内容哈希](stages/02-translate/docs/zh.md)
3. [在根目录内原子安装](stages/03-install/docs/zh.md)
4. [升级时保护本地修改](stages/04-upgrades/docs/zh.md)

## 使用自己的输入运行

完成各阶段后，这些命令会在原始 Orchard 示例上运行你的工作区代码。将样本路径换成你自己的文件。

```bash
node learning-artifacts/skill-installer/cli.ts inspect projects/skill-installer/examples/orchard-release.json codex
```

若想先查看完整参考方案，将同一命令中的 `learning-artifacts/skill-installer` 换成 `projects/skill-installer/solution`。JSON 结果使用 `schema_version: 1`；路径与参数示例都明确给出，便于其他工具消费。

## 集成边界

inspect 是试运行。install 需要 bundle、agent、root 以及可信的预期源摘要。支持的目标映射为 codex=.agents/skills、claude=.claude/skills 和 cursor=.cursor/skills。发现路径在本地配置；安装成功并不能证明另一个正在运行的 agent 已激活该技能。

```bash
python3 scripts/project_test.py skill-installer --all --solution --strict
python3 scripts/project_test.py skill-installer --all --path learning-artifacts/skill-installer --strict
```

第一条命令检查参考方案，第二条检查你的实现。发布的示例与测试是回归证据，不是生产认证或未见过的基准。

## 主要参考资料

- [Agent Skills 规范](https://agentskills.io/specification)
- [Node crypto API](https://nodejs.org/api/crypto.html)
- [Node 文件系统 API](https://nodejs.org/api/fs.html)
