# 更新日志

课程的新动态。最新的在最前面。

格式大致遵循 [Keep a Changelog](https://keepachangelog.com/)。每条记录都点明阶段、课程和改了什么，方便学习者直接跳到变化处。

## [未发布]

### 新增
- `scripts/scaffold-lesson.sh` —— 脚手架脚本，创建 `phases/NN-phase/NN-lesson/` 的完整目录结构，并生成一份从 `LESSON_TEMPLATE.md` 预填的 `docs/zh.md` 骨架。
- `.github/PULL_REQUEST_TEMPLATE.md` —— 贡献者检查清单（代码能跑、代码无注释、先从零实现、每课原子化提交、ROADMAP 行用 markdown 链接）。
- `.github/ISSUE_TEMPLATE/bug_report.md` 和 `new_lesson_proposal.md` —— 缺陷报告和课程设想的结构化收集表单。
- 这份 `CHANGELOG.md`。

## 2026-04 —— Phase 4：计算机视觉完成

### 新增
- Phase 4 全部 28 节课，从图像基础一路到多模态视觉（VLM、3D、视频、自监督）。
- `ROADMAP.md` 中的 Phase 4 各行以 markdown 链接指向课程目录，让网站能呈现它们。

### 修复
- 对 Phase 4 的 15+ 节课做了一轮精修：
  - `phase-4/02`：形状计算器明确了自适应池化、flatten 和 linear 的 RF/stride 处理。
  - `phase-4/03`：骨干网络选择器的说明列出所有覆盖到的系列；为 OCR、医疗、工业场景补充了检测头指引。
  - `phase-4/04`：分类诊断对每种失败模式使用量化阈值；对未定义的指标声明 `n/a`；对少于 3 个类别的情况加了保护。
  - `phase-4/06`：检测指标读取器使用 `AP@0.5`（而非 `mAP@0.5`）；声明逐类召回为可选；锚框设计器澄清了 stride 截断和每层级单锚框的路径。
  - `phase-4/10`：采样器选择器将 `unet_forward_ms` 声明为输入；ControlNet 保护规则提升为规则 0。
  - `phase-4/14`：ViT 检查器与拒绝规则对齐——移植尝试是被审计，而非被认可。
  - `phase-4/24`：开放词表栈选择器有明确的规则优先级和许可证过滤语义；概念设计器解决了 step-5/rule-80 的冲突。
  - `phase-4/25`：VLM 文档的 `_merge` 在占位符不匹配时抛出描述性的 `ValueError`；CMER 在内部做归一化。
  - `phase-4/27`：`synthetic_frames` 将 GT 框裁剪到帧的 H/W 范围内。
  - `phase-4/28`：`rope_3d` 校验维度切分；从 DiT block 示例中移除了未使用的 `F` 导入。

## 2026-Q1 及更早

### 新增
- Phase 0（环境搭建与工具链）：全部 12 节课。
- Phase 1（数学基础）：全部 22 节课。
- Phase 2（机器学习基础）：全部 18 节课。
- Phase 3（深度学习核心）：核心课程，涵盖感知机、反向传播、优化器。
- 内置的 Claude Code 技能：`find-your-level`（分级测验）和 `check-understanding`（按阶段的测验）。
- 网站 `aiengineeringfromscratch.com`：课程目录、逐课页面、路线图、277 词术语表。
- 全部 20 个阶段的初始脚手架（`phases/00-*` 到 `phases/19-*`）。
- `LESSON_TEMPLATE.md`、`CONTRIBUTING.md`、`ROADMAP.md`、`README.md`。

[未发布]: https://github.com/fancyboi999/ai-engineering-from-scratch-zh/compare/HEAD...HEAD
