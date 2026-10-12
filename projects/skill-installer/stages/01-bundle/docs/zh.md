# 校验可移植包

**第 1 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

接收包含 SKILL.md 和可选参考文件的命名包。接触磁盘之前，校验每条相对路径。拒绝点路径段、绝对路径、盘符前缀、反斜杠以及保留的安装元数据。每个文本文件限制为 100 KB。安装器读取内存中的包，网络获取和签名信任另行负责。

本阶段的边界是 `safePath, validate`。保留前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

```figure
pj-skill-installer-1
```

## Orchard 案例分析

开始编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和 [数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。

可移植包携带元数据和相对路径的 UTF-8 文件。把 SKILL.md 当作入口文档，拒绝任何可能逃出所选安装根目录的资源名。原始 Orchard 包包含恢复检查清单。

```text
name=orchard-release
files: SKILL.md, references/checklist.md
../settings.json -> rejected
```

## 构建与检查

创建目录前校验所有文件路径。将 .installed.json 保留给安装器回执。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，会导入你的函数，不会用参考方案替代。

```bash
python3 scripts/project_test.py skill-installer --init learning-artifacts/skill-installer
python3 scripts/project_test.py skill-installer --stage 1 --path learning-artifacts/skill-installer
```

先预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案运行通过并不能证明你的学习者工作区已完成。

## 继续探究

为什么即使当前机器使用斜杠路径，也必须拒绝 Windows 反斜杠？
