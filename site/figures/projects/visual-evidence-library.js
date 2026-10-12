(function () {
  "use strict";
  const steps = [
    { label: "图像", detail: "使用源图像像素，而不是屏幕像素。" },
    { label: "区域", detail: "保留文本及其矩形区域。" },
    {
      label: "检查",
      detail: "结构检查不能验证文本本身。",
    },
  ];
  window.AIFSProjectFigures.register("pj-visual-evidence-library-1", {
    title: "矩形是否在边界内？",
    steps,
    caption:
      "图像为 600 × 320 像素。矩形必须完全位于四条边界内。",
    lab: {
      controls: [
        {
          key: "x",
          label: "左边 x",
          type: "range",
          value: 45,
          min: 0,
          max: 600,
        },
        {
          key: "y",
          label: "顶边 y",
          type: "range",
          value: 130,
          min: 0,
          max: 320,
        },
        {
          key: "width",
          label: "区域宽度",
          type: "range",
          value: 510,
          min: 0,
          max: 600,
        },
        {
          key: "height",
          label: "区域高度",
          type: "range",
          value: 45,
          min: 0,
          max: 320,
        },
      ],
      calculate(v) {
        const right = v.x + v.width,
          bottom = v.y + v.height;
        const valid =
          v.width > 0 && v.height > 0 && right <= 600 && bottom <= 320;
        return {
          summary: valid
            ? "几何位置有效；提供的文本仍需可信来源或审查。"
            : "拒绝越界矩形，不要裁剪证据。",
          metrics: [
            { label: "右边界", value: right },
            { label: "下边界", value: bottom },
          ],
          bars: [
            { label: "水平范围", value: right, max: 600 },
            { label: "垂直范围", value: bottom, max: 320 },
          ],
        };
      },
    },
  });
  const terms = (s) =>
    new Set(s.toLocaleLowerCase().match(/[\p{L}\p{N}_]+/gu) || []);
  window.AIFSProjectFigures.register("pj-visual-evidence-library-2", {
    title: "计算词汇查询覆盖率",
    steps,
    caption:
      "这是对给定文本计算的 token 重叠得分，不是 OCR，也不是答案置信度估计。",
    lab: {
      controls: [
        {
          key: "query",
          label: "查询",
          type: "text",
          value: "return dry seeds",
        },
        {
          key: "text",
          label: "区域文本",
          type: "text",
          value: "Return dry seeds in paper envelopes.",
        },
      ],
      calculate(v) {
        const wanted = terms(v.query),
          have = terms(v.text),
          matches = [...wanted].filter((t) => have.has(t));
        const score = wanted.size ? matches.length / wanted.size : 0;
        return {
          summary: wanted.size
            ? `此区域包含 ${wanted.size} 个不同查询 token 中的 ${matches.length} 个。`
            : "空查询不返回匹配项。",
          metrics: [
            { label: "查询覆盖率", value: (score * 100).toFixed(0) + "%" },
            { label: "匹配 token", value: matches.join(", ") || "none" },
          ],
          bars: [{ label: "覆盖率", value: score, max: 1 }],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-visual-evidence-library-3", {
    title: "区分提案与已接受证据",
    steps,
    caption:
      "分类标签不进入文本索引。人工审查是明确的状态转换。",
    lab: {
      controls: [
        {
          key: "text",
          label: "提议文本",
          type: "text",
          value: "Return tools to the blue shelf.",
        },
        {
          key: "label",
          label: "分类标签",
          type: "text",
          value: "notice",
        },
        {
          key: "geometry",
          label: "坐标通过边界检查",
          type: "checkbox",
          value: true,
        },
        {
          key: "reviewed",
          label: "人工已核对图像与文本",
          type: "checkbox",
          value: false,
        },
      ],
      calculate(v) {
        const valid = Boolean(v.text.trim()) && v.geometry;
        const indexed = valid && v.reviewed;
        let summary = "单独保存提案，供审查。";
        if (!valid) summary = "拒绝格式错误的提取结果。";
        else if (indexed)
          summary = "经过明确审查的区域可以进入文本索引。";
        return {
          summary,
          metrics: [
            { label: "可索引区域数", value: indexed ? 1 : 0 },
            { label: "可索引分类标签数", value: 0 },
          ],
          rows: [
            ["文本", v.text],
            ["仅标签", v.label],
            ["来源", "model-proposed"],
          ],
          columns: ["输出类别", "值"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-visual-evidence-library-4", {
    title: "页面缩放时保持覆盖层对齐",
    steps,
    caption:
      "600 像素宽的源图像包含矩形 [45,130,510,45]。JSON 中的来源坐标保持不变。",
    lab: {
      controls: [
        {
          key: "display",
          label: "显示图像宽度",
          type: "range",
          value: 420,
          min: 180,
          max: 900,
        },
      ],
      calculate(v) {
        const scale = v.display / 600;
        return {
          summary:
            "像素位置随显示尺寸缩放，百分比保持稳定。",
          metrics: [
            { label: "缩放比例", value: scale.toFixed(2) },
            { label: "左侧位置", value: (45 * scale).toFixed(1) + " px" },
            { label: "矩形宽度", value: (510 * scale).toFixed(1) + " px" },
          ],
          rows: [
            ["左侧", "45 / 600", "7.5%"],
            ["顶部", "130 / 320", "40.625%"],
            ["宽度", "510 / 600", "85%"],
            ["高度", "45 / 320", "14.0625%"],
          ],
          columns: ["样式", "来源比例", "CSS 百分比"],
        };
      },
    },
  });
})();
