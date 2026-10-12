# 在根目录内原子安装

**第 3 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

创建目录前检查预期摘要。用 lstat 检查每个 agent 目录，拒绝符号链接。在目标旁暂存完整的转换后包，再重命名。已有的托管安装先移至临时备份，以便最终重命名失败时恢复。这个教学事务假设只有一个可信本地写入者；恶意并发替换文件系统需要操作系统级隔离。

本阶段的边界是 `install`。保留前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

```figure
pj-skill-installer-3
```

## Orchard 案例分析

开始编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和 [数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[第 2 阶段](../../02-translate/docs/zh.md)。

安装到调用者拥有的可丢弃根目录。安装器先把全部文件写入私有的同级目录，只有包完整后才重命名到 agent 发现路径。

```text
root/.agents/skills/orchard-release/
SKILL.md + references/checklist.md + .installed.json
```

## 构建与检查

暂存前检查父目录是否为符号链接。agent 目录映射与可移植技能内容分开处理。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，会导入你的函数，不会用参考方案替代。

```bash
python3 scripts/project_test.py skill-installer --stage 3 --path learning-artifacts/skill-installer
```

先预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案运行通过并不能证明你的学习者工作区已完成。

## 继续探究

若在重命名之前写入失败，读取者应看到什么？
