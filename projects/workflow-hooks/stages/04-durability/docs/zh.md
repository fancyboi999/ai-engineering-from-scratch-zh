# 跨会话持久化规则

**第 4 阶段，共 4 阶段。** TypeScript。预计约 2 小时。

将带版本的 JSON 快照写入唯一的同级临时文件，权限仅限所有者，再重命名到目标位置。读取者看到旧的或新的完整文件。存储不存在表示空集合；格式错误则报错。此快照存储支持单个写入进程；跨进程合并与加锁是独立扩展。

本阶段的边界是 `save, load`。保留前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

```figure
pj-workflow-hooks-4
```

## Orchard 案例分析

开始编码前，复习 [TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)和 [仓库记忆与状态](../../../../../phases/14-agent-engineering/34-repo-memory-and-state/docs/zh.md)。先完成[第 3 阶段](../../03-policy/docs/zh.md)。

CLI 摄取 JSONL 纠正，保存带版本的存储，在另一个进程中重新加载，再输出中立 JSON hook 载荷。它保留证据、支持退役，并在重启后精确保留 API_KEY。

```text
capture -> store.json
approve -> stored state approved
emit -> additional_context plus evidence locators
malformed store -> error, not empty success
```

## 构建与检查

写入唯一的同级临时文件，再重命名。此存储遵循单写入者契约；同时使用多个写入者之前应增加锁。

在学习者工作区实现本阶段。CLI 辅助程序是提供的适配器，会导入你的函数，不会用参考方案替代。

```bash
python3 scripts/project_test.py workflow-hooks --stage 4 --path learning-artifacts/workflow-hooks
```

累积阶段通过后，从仓库根目录在原始样本输入上运行你的产物：

```bash
node learning-artifacts/workflow-hooks/cli.ts capture orchard-rules.json projects/workflow-hooks/examples/corrections.jsonl
node learning-artifacts/workflow-hooks/cli.ts inspect orchard-rules.json
```

capture、inspect、approve、retire 和 emit 是基于文件的命令。emit 返回包含 additional_context 和可解析证据的中立 JSON；agent 集成必须将该字段映射到其文档规定的 hook 接口。批准要求提供当前摘要。存储带版本、原子写入，并且只支持单写入者。

## 继续探究

你的 agent 集成如何把 additional_context 映射到文档规定的 hook 传输格式？
