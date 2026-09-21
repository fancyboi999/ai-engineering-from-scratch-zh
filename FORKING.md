# Fork 指南

本课程采用 MIT 许可证。你可以自由 fork 它并按自己的需要改编。下面说说怎么把这件事做好。

## 面向团队

想拿它做内部培训？fork 下来定制：

1. Fork 本仓库
2. 删掉团队用不到的阶段
3. 加入公司专属的示例和数据
4. 把内部工具的集成加进产出物里
5. 按 MIT 许可保留版权声明和许可声明

## 面向学校与大学

想拿它做课程材料？

1. Fork 本仓库
2. 把各阶段映射到你的学期排课表
3. 给练习加上评分标准
4. 加上你自己的作业和考试
5. 也欢迎把改进回馈到上游

## 面向训练营

在办收费训练营？在 MIT 许可证下完全没问题。

1. Fork 下来，按你的班期时间线重新编排
2. 加上视频内容、直播课、导师辅导
3. 代码和文档随你拿去搭建
4. 也欢迎赞助本项目或回馈贡献

## 面向其他编程语言

想用另一种编程语言来教这套课程？

1. Fork 本仓库
2. 用你的语言重新实现代码示例
3. 保留课程结构和文档
4. 提一个 PR，从主 README 链接到你的 fork

## 让你的 fork 保持更新

基于中文版创建的 fork，可将中文仓库设为更新来源，在工作区干净时执行：

```bash
git remote add upstream https://github.com/fancyboi999/ai-engineering-from-scratch-zh.git
git fetch upstream main
git switch -c sync/zh-main
git merge upstream/main
```

已有 `upstream` 时，先用 `git remote -v` 核对其目标。合并后保留自己 fork 的域名与定制配置，
运行 `node site/build.js`、`node site/build.js --check`，通过 PR 发布。

本中文镜像跟踪英文原仓的流程见 [AGENTS.md](AGENTS.md#同步与冲突)，翻译契约见
[TRANSLATION.md](TRANSLATION.md)。

## 署名

分发副本或实质性部分时，须保留 [LICENSE](LICENSE) 中的版权声明和许可声明。
项目介绍中还可以附上来源链接：

```text
Based on AI Engineering from Scratch by Rohit Ghumare
https://github.com/rohitg00/ai-engineering-from-scratch
简体中文版由 fancy 维护
https://github.com/fancyboi999/ai-engineering-from-scratch-zh
```
