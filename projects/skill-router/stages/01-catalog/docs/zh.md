# 解析类型化技能目录

**第 1 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

技能清单声明 id、description、keywords、路径模式、priority、依赖与权限。运行时校验数组和数字，不要相信 JSON 类型断言。分词会规范标点与大小写，并去掉重复单词，因此重复 prompt 不会抬高分数。

本阶段的边界是 `parseSkill, tokens`。保留前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

```figure
pj-skill-router-1
```

## Orchard 案例分析

开始编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和 [工具 schema 设计](../../../../../phases/13-tools-and-protocols/05-tool-schema-design/docs/zh.md)。

通过 SKILL.md 的 name 和 description 发现技能，再将 routing.json 作为本地路由扩展读取。目录名必须与技能名一致。路由元数据不是可移植技能格式的一部分。

```text
skills/release-review/SKILL.md -> name release-review
routing.json -> keywords,paths,priority,requires,permissions
```

## 构建与检查

用 parseSkill 校验合并后的记录。解析之前，拒绝符号链接或过大的发现文件。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，会导入你的函数，不会用参考方案替代。

```bash
python3 scripts/project_test.py skill-router --init learning-artifacts/skill-router
python3 scripts/project_test.py skill-router --stage 1 --path learning-artifacts/skill-router
```

先预测上面的中间状态，再运行本阶段。全新桩代码会失败；参考方案运行通过并不能证明你的学习者工作区已完成。

## 继续探究

目录 release-review 声明 name 为 publish 时，应如何处理？
