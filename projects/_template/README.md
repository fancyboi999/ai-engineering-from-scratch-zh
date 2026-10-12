# 你的项目标题

这是项目编写草稿脚手架。用自己的项目替代示例产物，扩展为四到八个阶段后再标为就绪。运行器、图表、演示和证书要求遵循[编写契约](../AUTHORING.md)。

示例解析有长度限制的任务标签。有效标签使用小写，以字母开头，包含字母、数字和单个连字符，最多 32 个字符。

## 开始

```bash
python3 scripts/project_test.py your-project-id --init /tmp/my-project-work
python3 scripts/project_test.py your-project-id --stage 1 --path /tmp/my-project-work
python3 scripts/project_test.py your-project-id --all --solution --strict
```

每个新阶段应引入一种独立能力，解释其不变量，并覆盖至少五种可观察情形。加入真实失败输入和至少一个留出案例。在 `project.json` 中用确定性命令演示最终产物。
