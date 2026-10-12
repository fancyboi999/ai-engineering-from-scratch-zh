(function () {
  "use strict";
  window.AIFSProjectFigures.register("pj-decision-tradeoff-explorer-1", {
    title: "未知证据",
    steps: [
      { label: "输入", detail: "null 值保持未知。" },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "null 值保持未知。",
    lab: {
      controls: [
        { key: "value", label: "值的 JSON", type: "text", value: "null" },
      ],
      calculate(v) {
        const x = JSON.parse(v.value);
        return {
          summary:
            x === null
              ? "未知：选项不符合条件"
              : Number.isFinite(x)
                ? "实测数值"
                : "无效证据",
          metrics: [{ label: "已知", value: Number.isFinite(x) }],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-decision-tradeoff-explorer-2", {
    title: "加权分数",
    steps: [
      {
        label: "输入",
        detail: "比较固定规范化后的可及性与成本值。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "比较固定规范化后的可及性与成本值。",
    lab: {
      controls: [
        {
          key: "access",
          label: "可及性权重",
          type: "range",
          value: 5,
          min: 0,
          max: 10,
          step: 1,
        },
      ],
      calculate(v) {
        const w = v.access / 10;
        const a = 0.9 * w + 0.2 * (1 - w),
          b = 0.6 * w + 0.8 * (1 - w);
        return {
          summary: a > b ? "开放展厅领先" : "隔间领先",
          metrics: [
            { label: "开放展厅得分", value: a.toFixed(3) },
            { label: "隔间得分", value: b.toFixed(3) },
          ],
          bars: [
            { label: "开放展厅", value: a, max: 1 },
            { label: "隔间", value: b, max: 1 },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-decision-tradeoff-explorer-3", {
    title: "偏好交叉点",
    steps: [
      {
        label: "输入",
        detail: "在十一组权重下求解双准则分数。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "在十一组权重下求解双准则分数。",
    lab: {
      controls: [
        {
          key: "cost",
          label: "开放展厅布置小时数",
          type: "range",
          value: 8,
          min: 0,
          max: 10,
          step: 1,
        },
      ],
      calculate(v) {
        const rows = Array.from({ length: 11 }, (_, i) => {
          const w = i / 10,
            a = 0.9 * w + (1 - v.cost / 10) * (1 - w),
            b = 0.6 * w + 0.8 * (1 - w);
          return [
            w.toFixed(1),
            a.toFixed(2),
            b.toFixed(2),
            a > b ? "开放展厅" : "隔间",
          ];
        });
        return {
          summary: "固定范围敏感性扫描",
          columns: ["可及性权重", "开放展厅", "隔间", "领先者"],
          rows,
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-decision-tradeoff-explorer-4", {
    title: "选中记录",
    steps: [
      {
        label: "输入",
        detail: "有意选择可以不同于最高分选项。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "有意选择可以不同于最高分选项。",
    lab: {
      controls: [
        {
          key: "chosen",
          label: "选中的有效 ID",
          type: "text",
          value: "open",
        },
        {
          key: "access",
          label: "可及性权重",
          type: "range",
          value: 8,
          min: 0,
          max: 10,
          step: 1,
        },
      ],
      calculate(v) {
        const w = v.access / 10,
          a = 0.9 * w + 0.2 * (1 - w),
          b = 0.6 * w + 0.8 * (1 - w),
          winner = a > b ? "open" : "pods";
        return {
          summary: ["open", "pods"].includes(v.chosen)
            ? "可导出版本 1 场景"
            : "无效选择 ID",
          columns: ["字段", "值"],
          rows: [
            ["chosen", v.chosen],
            ["winner", winner],
            ["可及性权重", w],
          ],
        };
      },
    },
  });
})();
