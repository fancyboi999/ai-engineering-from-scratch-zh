(function () {
  "use strict";
  window.AIFSProjectFigures.register("pj-configuration-drift-explainer-1", {
    title: "标量校验",
    steps: [
      {
        label: "输入",
        detail: "嵌套值需要明确合并契约。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "嵌套值需要明确合并契约。",
    lab: {
      controls: [
        { key: "value", label: "JSON 标量", type: "text", value: "30" },
      ],
      calculate(v) {
        const x = JSON.parse(v.value);
        const ok =
          x === null || ["string", "number", "boolean"].includes(typeof x);
        return {
          summary: ok ? "接受的标量" : "拒绝的嵌套值",
          metrics: [{ label: "接受", value: ok }],
          columns: ["值", "类型"],
          rows: [[JSON.stringify(x), x === null ? "null" : typeof x]],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-configuration-drift-explainer-2", {
    title: "层级优先级",
    steps: [
      {
        label: "输入",
        detail: "最后一层优先，同时保留可见历史。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "最后一层优先，同时保留可见历史。",
    lab: {
      controls: [
        {
          key: "base",
          label: "默认超时",
          type: "range",
          value: 30,
          min: 0,
          max: 60,
          step: 1,
        },
        {
          key: "override",
          label: "覆盖超时",
          type: "range",
          value: 5,
          min: 0,
          max: 60,
          step: 1,
        },
      ],
      calculate(v) {
        return {
          summary: "生效超时 " + v.override,
          metrics: [{ label: "被覆盖的超时", value: v.base }],
          columns: ["来源", "值"],
          rows: [
            ["defaults.json", v.base],
            ["env:TIMEOUT", v.override],
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-configuration-drift-explainer-3", {
    title: "观察到的漂移",
    steps: [
      {
        label: "输入",
        detail: "缺失值和明确值含义不同。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "缺失值和明确值含义不同。",
    lab: {
      controls: [
        {
          key: "expected",
          label: "预期超时",
          type: "range",
          value: 5,
          min: 0,
          max: 60,
          step: 1,
        },
        {
          key: "actual",
          label: "观察超时",
          type: "range",
          value: 30,
          min: 0,
          max: 60,
          step: 1,
        },
      ],
      calculate(v) {
        return {
          summary: "漂移状态：" + (v.expected === v.actual ? "equal" : "changed"),
          metrics: [{ label: "差异", value: v.actual - v.expected }],
          bars: [
            { label: "预期", value: v.expected, max: 60 },
            { label: "观察", value: v.actual, max: 60 },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-configuration-drift-explainer-4", {
    title: "脱敏导出",
    steps: [
      {
        label: "输入",
        detail: "分类发生在显示脱敏之前。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "分类发生在显示脱敏之前。",
    lab: {
      controls: [
        { key: "key", label: "键", type: "text", value: "api_token" },
        { key: "old", label: "预期", type: "text", value: "before" },
        { key: "now", label: "观察", type: "text", value: "after" },
      ],
      calculate(v) {
        const hide = /(password|secret|token|api[_-]?key|credential)/i.test(
          v.key,
        );
        return {
          summary: "漂移状态：" + (v.old === v.now ? "equal" : "changed"),
          metrics: [{ label: "已脱敏", value: hide }],
          columns: ["键", "预期", "观察"],
          rows: [
            [v.key, hide ? "[REDACTED]" : v.old, hide ? "[REDACTED]" : v.now],
          ],
        };
      },
    },
  });
})();
