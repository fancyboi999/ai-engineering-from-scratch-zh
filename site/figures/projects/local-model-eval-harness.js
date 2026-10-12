(function () {
  "use strict";
  const controls = [
    {
      key: "total",
      label: "已标注用例数",
      type: "range",
      value: 10,
      min: 1,
      max: 30,
      step: 1,
    },
    {
      key: "answered",
      label: "已录制预测数",
      type: "range",
      value: 8,
      min: 0,
      max: 30,
      step: 1,
    },
    {
      key: "hits",
      label: "正确预测数",
      type: "range",
      value: 6,
      min: 0,
      max: 30,
      step: 1,
    },
    {
      key: "confidence",
      label: "共同报告的置信度",
      type: "range",
      value: 0.9,
      min: 0,
      max: 1,
      step: 0.05,
    },
    {
      key: "latencies",
      label: "延迟（ms）",
      type: "text",
      value: "80,100,120,300,900",
    },
  ];
  const calculate = function (v, stepIndex) {
    if (v.answered > v.total || v.hits > v.answered)
      return {
        summary: "拒绝不可能的预测数量",
        metrics: [],
        bars: [],
      };
    const latency = v.latencies
      .split(",")
      .map(Number)
      .sort((a, b) => a - b);
    if (latency.some((n) => !Number.isFinite(n) || n < 0))
      return { summary: "拒绝无效延迟", metrics: [], bars: [] };
    const accuracy = v.hits / v.total,
      coverage = v.answered / v.total,
      ece = v.answered ? Math.abs(v.confidence - v.hits / v.answered) : 0;
    return {
      summary:
        "缺失预测仍计入准确率的分母。置信度是自行报告的。",
      metrics: [
        { label: "准确率", value: accuracy.toFixed(3) },
        { label: "覆盖率", value: coverage.toFixed(3) },
        { label: "单分箱 ECE", value: ece.toFixed(3) },
        {
          label: "最近秩法 p95（ms）",
          value: latency[Math.ceil(latency.length * 0.95) - 1],
        },
      ],
      bars: [
        { label: "正确", value: v.hits, max: v.total },
        { label: "错误", value: v.answered - v.hits, max: v.total },
        { label: "未回答", value: v.total - v.answered, max: v.total },
      ],
    };
  };
  window.AIFSProjectFigures.register(
    "pj-local-model-eval-harness-1",
    Object.assign(
      {
        title: "校验预测记录",
        steps: [
          {
            label: "记录",
            detail: "一起保留答案、置信度与延迟。",
          },
          { label: "校验", detail: "拒绝非有限数或无效字段。" },
          { label: "对齐", detail: "用稳定 ID 关联标签。" },
        ],
        caption:
          "校验 ID 唯一、答案为字符串、置信度在 [0,1] 内，且 latency_ms 非负。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-local-model-eval-harness-2",
    Object.assign(
      {
        title: "测量规范化后的精确答案准确率",
        steps: [
          { label: "关联", detail: "按标签 ID 匹配预测。" },
          { label: "比较", detail: "只规范化大小写与空白字符。" },
          {
            label: "分母",
            detail: "将未回答的标签计为未命中。",
          },
        ],
        caption:
          "针对完整标签映射返回 correct、total、accuracy 与 coverage。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-local-model-eval-harness-3",
    Object.assign(
      {
        title: "测量置信度校准",
        steps: [
          {
            label: "分箱",
            detail: "按固定宽度对置信度分箱。",
          },
          {
            label: "比较",
            detail: "比较平均置信度与观察到的正确率。",
          },
          { label: "加权", detail: "按样本数对差距加权平均。" },
        ],
        caption:
          "按各箱样本数加权计算固定宽度分箱的 ECE，并保留每箱证据。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-local-model-eval-harness-4",
    Object.assign(
      {
        title: "一同发布准确率与延迟",
        steps: [
          {
            label: "质量",
            detail: "计算准确率与置信度校准。",
          },
          {
            label: "延迟",
            detail: "对有限测量值排序，用最近秩法取分位数。",
          },
          { label: "报告", detail: "在评分卡旁保留来源信息。" },
        ],
        caption:
          "汇总指标、最近秩法延迟分位数与测量来源标签。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
