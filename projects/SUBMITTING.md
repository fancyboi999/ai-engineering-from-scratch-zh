# 提交项目

构建一个学完课程后仍有人愿意用的产物。用四到八个阶段教授它，让完整参考路径无需 API key 即可离线运行。精确的清单、运行器、图表、演示和完成证据契约见 [AUTHORING.md](AUTHORING.md)。

## 选择有用的目标

好的项目交付报告生成器、证据索引、技能校验器、记忆服务、工作流工具、协议服务器或评估框架。诚实限定范围。fixture 后端可以教授桌面协议，但应明确标识，不能描述为操作系统集成。

实现与课程必须原创。技术事实引用官方文档、规范和论文。不要抓取个人数据、规避安全控制，也不要把缺乏实质工程练习的托管模型调用当作项目。

## 创建项目

```bash
cp -R projects/_template projects/your-project-id
```

ID 使用小写字母和连字符，与目录名一致。`source` 设为 `community`，在 `author` 中保留姓名和 GitHub 账号。开发阶段保持 `status` 为 `draft`。目录保留署名，不会自动把草稿提升为就绪项目。

模板用一个小型 Python 阶段展示契约。将它扩展为四到八个阶段，用自己的产物替代示例。Python、TypeScript、Rust 和 Go 使用标准库运行器。混合项目为每阶段声明真实运行器。包含新学习者工作区所需的每个模块和 fixture。

## 教授并验证每个阶段

解释有用的行为、支配行为的不变量、完整示例、精确公共函数签名、错误，以及学习者能复制的命令。每阶段需要五个有意义的测试、一个失败案例、明确失败的初始实现及原创注册机制图。测试必须加载学习者工作区，不能悄悄导入仓库内的参考解。

后续初始目录添加文件，不覆盖先前工作。除非学习者显式传入 `--force`，初始化器保留已有文件，包括学习者实现。提供留出测试或数据集、实测评估结果，以及循环和预算的明确终止状态。

## 演示产物

在 `demo` 下声明会终止的 argv 命令，如 `{"command":["python3","demo.py"],"cwd":"solution"}`。录制真实输出，将 GIF 或视频及静态海报提交到项目的 `media/`。在 `demos` 中声明相对路径。站点构建打包课程和录制内容，预览不依赖 GitHub main 上尚未发布的文件。

## 验证与提交

```bash
python3 scripts/project_test.py your-project-id --all --solution --strict
python3 scripts/project_test.py your-project-id --init /tmp/your-project-check
python3 scripts/project_test.py your-project-id --stage 1 --path /tmp/your-project-check
node --test site/test_projects_data.js
node site/build-projects.js --strict
```

参考解必须通过全部阶段，没有跳过的测试。全新初始实现必须失败，并给出可行动的实现提示。严格模式拒绝缺运行时、空测试套件、跳过测试、缺图表和缺录制内容。不要提交生成的 `site/projects-data.js` 或 `site/project-content/` 文件。

向 [中文仓库](https://github.com/fancyboi999/ai-engineering-from-scratch-zh) 提交 feature 分支 pull request。维护者评审原创课程、测试参考产物、以学习者身份尝试前几个阶段，并检查网站渲染结果。完成证书使用完整学习者评分报告；参考解结果和手动勾选框不构成完成证据。
