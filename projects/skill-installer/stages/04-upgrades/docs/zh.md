# 升级时保护本地修改

**第 4 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

替换安装之前，确认每个跟踪文件仍匹配先前摘要，且没有出现未托管文件。用户编辑了跟踪文件或添加了自己的文件时，拒绝升级。用户可以有意识地把这些改动纳入源包。重复安装成功后，不留下暂存或备份目录。

本阶段的边界是 `install`。保留前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

```figure
pj-skill-installer-4
```

## Orchard 案例分析

开始编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和 [数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[第 3 阶段](../../03-install/docs/zh.md)。

升级必须保留本地修改。将当前文件与上一次安装的摘要比较，拒绝已修改或未托管的文件。演示会编辑检查清单、重试安装，并保留这项修改。

```text
installed checklist hash=A
local edit -> current hash=B
upgrade -> modified installation; local text remains
```

## 构建与检查

移动目标之前，读取现有回执并验证文件列表。若最终重命名失败，恢复已移走的备份。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，会导入你的函数，不会用参考方案替代。

```bash
python3 scripts/project_test.py skill-installer --stage 4 --path learning-artifacts/skill-installer
```

累积阶段通过后，从仓库根目录在原始样本输入上运行你的产物：

```bash
node learning-artifacts/skill-installer/cli.ts inspect projects/skill-installer/examples/orchard-release.json codex
```

inspect 是试运行。install 需要 bundle、agent、root 以及可信的预期源摘要。支持的目标映射为 codex=.agents/skills、claude=.claude/skills 和 cursor=.cursor/skills。发现路径在本地配置；安装成功并不能证明另一个正在运行的 agent 已激活该技能。

## 继续探究

替换本地编辑过的检查清单之前，一个可审查的合并应展示什么？
