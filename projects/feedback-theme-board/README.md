# 反馈主题看板

用可检查的短语证据为产品反馈分组，统计不同来源，并导出本地 issue 草稿。

最终得到可移植证据看板、JSON 摘要和未发送的 Markdown 调查草稿。

## 运行完成的工具

从仓库根目录运行：

```bash
cd projects/feedback-theme-board/solution
node cli.ts sample.jsonl themes.json output
```

样本为本项目原创。通过同一 CLI 换成你自己的输入。基线不需要模型 key。启用可选外部适配器前，先看命令帮助。

## 自己动手构建

先学习[开发环境搭建](../../phases/00-setup-and-tooling/01-dev-environment/docs/zh.md)和[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/zh.md)。开始前应能读取 JSON 对象、调用函数、运行终端命令，并理解失败测试。

```bash
python3 scripts/project_test.py feedback-theme-board --init my-feedback-theme-board
python3 scripts/project_test.py feedback-theme-board --stage 1 --path my-feedback-theme-board --strict
python3 scripts/project_test.py feedback-theme-board --all --path my-feedback-theme-board --strict --report completion.json
```

全新工作区在实现函数之前会故意失败。CLI、输入文件和公开类型已提供，因此完成任务不需要复制参考入口。依次完成各阶段：

1. [以稳定身份导入反馈](stages/01-import-feedback/docs/zh.md)
2. [匹配短语并保留原始文本范围](stages/02-match-evidence/docs/zh.md)
3. [统计证据，不夸大来源支持](stages/03-count-without-inflation/docs/zh.md)
4. [发布证据和可审核的调查草稿](stages/04-publish-and-integrate/docs/zh.md)

## 复用产物

CLI 和可导入函数读取普通本地文件，返回结构化输出。与其他程序集成时，保留输入身份和明确的失败元数据。HTML 输出没有第三方脚本；检查其中包含的源数据后即可分享。

## 验证与范围

```bash
python3 scripts/project_test.py feedback-theme-board --all --solution --strict
```

基线匹配显式单词短语，不判断语义情感或真相。不同来源标签不等于经过验证的人数或市场规模。可选模型建议生成独立的配置提案，使用前必须审核；不会向 issue 跟踪器发布任何内容。

评分验证随附的确定性契约。学习者证书是自我声明的完成记录，不代表真实 provider 验证或职业认证。在认为工具已经集成前，阅读 JSON 回执并至少测试一个新输入。

主要参考：[JSON 文本交换，RFC 8259](https://www.rfc-editor.org/rfc/rfc8259)。
