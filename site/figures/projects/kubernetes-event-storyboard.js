(function () {
  "use strict";
  window.AIFSProjectFigures.register("pj-kubernetes-event-storyboard-1", {
    title: "捕获延迟",
    steps: [
      {
        label: "输入",
        detail: "发生时间与观察时间是不同时间戳。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "发生时间与观察时间是不同时间戳。",
    lab: {
      controls: [
        {
          key: "occur",
          label: "最近发生时刻（分钟）",
          type: "range",
          value: 3,
          min: 0,
          max: 10,
          step: 1,
        },
        {
          key: "observe",
          label: "观察时刻（分钟）",
          type: "range",
          value: 5,
          min: 0,
          max: 10,
          step: 1,
        },
      ],
      calculate(v) {
        return {
          summary:
            v.observe >= v.occur
              ? "捕获延迟：" + (v.observe - v.occur) + " 分钟"
              : "需要调查时钟顺序",
          columns: ["时钟", "分钟"],
          rows: [
            ["occurrence", v.occur],
            ["observation", v.observe],
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-kubernetes-event-storyboard-2", {
    title: "序列去重",
    steps: [
      { label: "输入", detail: "同一 UID 的快照使用最大计数。" },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "同一 UID 的快照使用最大计数。",
    lab: {
      controls: [
        {
          key: "a",
          label: "较早快照计数",
          type: "range",
          value: 2,
          min: 0,
          max: 10,
          step: 1,
        },
        {
          key: "b",
          label: "较晚快照计数",
          type: "range",
          value: 4,
          min: 0,
          max: 10,
          step: 1,
        },
        {
          key: "other",
          label: "不同事件计数",
          type: "range",
          value: 1,
          min: 0,
          max: 10,
          step: 1,
        },
      ],
      calculate(v) {
        return {
          summary: "分组计数：" + (Math.max(v.a, v.b) + v.other),
          metrics: [
            { label: "同 UID 保留计数", value: Math.max(v.a, v.b) },
            { label: "简单累加的重复计数", value: v.a + v.b + v.other },
          ],
          bars: [
            {
              label: "正确总数",
              value: Math.max(v.a, v.b) + v.other,
              max: 20,
            },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-kubernetes-event-storyboard-3", {
    title: "UID 匹配",
    steps: [
      { label: "输入", detail: "名称不是稳定对象标识。" },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "名称不是稳定对象标识。",
    lab: {
      controls: [
        {
          key: "event",
          label: "事件对象 UID",
          type: "text",
          value: "pod-old",
        },
        {
          key: "workload",
          label: "快照 UID",
          type: "text",
          value: "pod-new",
        },
        {
          key: "revision",
          label: "快照版本",
          type: "text",
          value: "8",
        },
      ],
      calculate(v) {
        return {
          summary:
            v.event === v.workload
              ? "版本 " + v.revision
              : "版本未知：UID 不匹配",
          metrics: [{ label: "标识匹配", value: v.event === v.workload }],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-kubernetes-event-storyboard-4", {
    title: "上下文脱敏",
    steps: [
      {
        label: "输入",
        detail: "只有明确子集传给助手。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "只有明确子集传给助手。",
    lab: {
      controls: [
        {
          key: "events",
          label: "原始事件数",
          type: "range",
          value: 5,
          min: 0,
          max: 20,
          step: 1,
        },
        {
          key: "repeated",
          label: "重复快照数",
          type: "range",
          value: 2,
          min: 0,
          max: 20,
          step: 1,
        },
      ],
      calculate(v) {
        const n = Math.max(0, v.events - v.repeated);
        return {
          summary: n + " 个分组前的不同事件标识",
          metrics: [
            { label: "导出消息数", value: 0 },
            { label: "导出 spec 字段数", value: 0 },
          ],
          bars: [{ label: "保留标识数", value: n, max: 20 }],
        };
      },
    },
  });
})();
