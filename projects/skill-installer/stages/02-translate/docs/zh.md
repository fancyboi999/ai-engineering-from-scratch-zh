# 转换元数据并计算内容哈希

**第 2 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

保留同一份指令正文，只重新生成一个小型、带引号的元数据头。参考文件逐字节保留。对排序后的路径/内容对计算 SHA-256 摘要，让文件插入顺序不影响完整性。摘要检测内容变化，但不证明发布者身份；调用者负责取得可信的预期摘要。

本阶段的边界是 `digest, translate`。保留前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

```figure
pj-skill-installer-2
```

## Orchard 案例分析

开始编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和 [数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。先完成[第 1 阶段](../../01-bundle/docs/zh.md)。

将 name 和 description 序列化为与 JSON 兼容、带双引号的 YAML 标量。Rust 校验器接受同一子集，包括转义。转换会重写元数据，因此源摘要与转换后的摘要不同。

```text
source bundle digest -> expected source identity
translated SKILL.md: name: "orchard-release"
translated digest -> installed content identity
```

## 构建与检查

先排序文件条目，再计算哈希。摘要验证内容是否符合可信预期；从不可信字节计算摘要，不会证明发布者身份。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，会导入你的函数，不会用参考方案替代。

```bash
python3 scripts/project_test.py skill-installer --stage 2 --path learning-artifacts/skill-installer
```

先预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案运行通过并不能证明你的学习者工作区已完成。

## 继续探究

包含引号的 description 怎样才能在安装器到校验器的往返中保持不变？
