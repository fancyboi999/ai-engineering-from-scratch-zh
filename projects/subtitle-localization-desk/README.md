# 字幕本地化工作台

帮助课程创作者通过词表、可选真实翻译 provider 和明确审核步骤，本地化附带 WebVTT 字幕。保留 cue 标识与时间戳，标记超过选定阅读预算的文本，导出审核后字幕和并排 HTML 工作台。

实现使用 Python 3.10+ 和标准库。样本是原创教学数据。确切的输入、输出和错误契约见 [API.md](API.md)。

## 构建你的版本

```bash
python3 scripts/project_test.py subtitle-localization-desk --init learning-artifacts/subtitle-localization-desk
python3 scripts/project_test.py subtitle-localization-desk --stage 1 --path learning-artifacts/subtitle-localization-desk --strict
```

全新起始实现在你实现第一个契约前会明确失败。后续阶段保留你的源文件。附带的 CLI 和展示辅助程序是脚手架；所有领域决策都调用你的实现。

```bash
python3 scripts/project_test.py subtitle-localization-desk --all --path learning-artifacts/subtitle-localization-desk --strict
cd learning-artifacts/subtitle-localization-desk
python3 cli.py samples/input.json --output my-output
```

## 运行参考实现和你自己的输入

```bash
python3 scripts/project_test.py subtitle-localization-desk --all --solution --strict
cd projects/subtitle-localization-desk/solution
python3 cli.py samples/input.json --output demo-output
python3 cli.py /absolute/path/to/your-input.json --output your-output
```

输入 JSON 含 vtt、translations、glossary 和可选 cps。输出 review.html 和 translation-decisions.json。下载 decisions.json，编辑 cue 文本和 approved 标记，再用 --decisions decisions.json 重跑。只有全部 cue 获批才创建 reviewed.vtt；超预算 cue 还需 override_budget=true。用 parse_vtt 或视频播放器的 WebVTT 轨道消费 reviewed.vtt。

## 具体示例与限制

cue map 从 00:00.000 开始，在 00:03.000 结束。三秒窗口在每次翻译中保持不变。

离线核心使用提供的翻译，不调用翻译 provider。可选 provider 适配器可填充同一 translations 映射；每个结果仍需审核。语义质量取决于双语审核者。

## 阶段

1. [解析字幕 cue 并保留时间](stages/01-cues/docs/zh.md)
2. [对翻译提案应用词表](stages/02-glossary/docs/zh.md)
3. [审核 cue 长度、术语和含义](stages/03-reading-budget/docs/zh.md)
4. [导出本地化字幕和审核决策](stages/04-review-export/docs/zh.md)

## 主要参考资料

- [技术参考](https://www.w3.org/TR/webvtt1/)
