# 为词语和仓库路径评分

**第 2 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

每个匹配关键词得两分，每条匹配文件路径得三分。返回分数的同时返回评分理由。支持单个路径段内的星号和跨路径段的双星号，转义正则标点，并拒绝绝对路径或向父目录穿越的文件路径。`**/` 匹配零个或多个完整目录：`**/*.ts` 匹配 `main.ts`，`src/**/*.ts` 同时匹配 `src/main.ts` 和 `src/lib/main.ts`。规范反斜杠，拒绝 Windows 盘符绝对路径和以斜杠为根的路径。分数相同时依次按 priority 和 id 排序，使排名可复现。

本阶段的边界是 `matchPath, rank`。保留前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

```figure
pj-skill-router-2
```

## Orchard 案例分析

开始编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和 [工具 schema 设计](../../../../../phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md)。先完成[第 1 阶段](../../01-catalog/docs/zh.md)。

重复证据不能抬高匹配分数。Orchard 请求重复了同一条改动路径，但只应计算一次路径贡献。关键词各贡献两分，不同的匹配路径各贡献三分。

```text
keywords release,replicas -> 4 points
files deploy/orchard.yaml repeated twice -> 3 points
score=7, not 10
```

## 构建与检查

评分前规范分隔符并去重。理由必须与实际计数的证据一致。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，会导入你的函数，不会用参考方案替代。

```bash
python3 scripts/project_test.py skill-router --stage 2 --path learning-artifacts/skill-router
```

先预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案运行通过并不能证明你的学习者工作区已完成。

## 继续探究

两个不同路径规则匹配同一个文件，应算作两次独立观察吗？
