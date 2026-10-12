(function () {
  "use strict";
  window.AIFSProjectFigures.register("pj-log-volume-reduction-lab-1", {
    title: "数字模板",
    steps: [
      {
        label: "输入",
        detail: "替换连续 ASCII 数字，保留其他文本。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "替换连续 ASCII 数字，保留其他文本。",
    lab: {
      controls: [
        {
          key: "message",
          label: "消息",
          type: "text",
          value: "retry request 137 after 50ms",
        },
      ],
      calculate(v) {
        const t = v.message.replace(/[0-9]+/g, "#");
        return {
          summary: t,
          metrics: [{ label: "输入字符数", value: v.message.length }],
          columns: ["原始值", "模板"],
          rows: [[v.message, t]],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-log-volume-reduction-lab-2", {
    title: "分组证据",
    steps: [
      {
        label: "输入",
        detail: "一条稀有日志打断重复模板。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "一条稀有日志打断重复模板。",
    lab: {
      controls: [
        {
          key: "n",
          label: "重试记录数",
          type: "range",
          value: 199,
          min: 0,
          max: 300,
          step: 1,
        },
        {
          key: "rare",
          label: "磁盘已满记录数",
          type: "range",
          value: 1,
          min: 0,
          max: 5,
          step: 1,
        },
      ],
      calculate(v) {
        return {
          summary:
            v.n +
            v.rare +
            " 条记录，分布于 " +
            ((v.n > 0 ? 1 : 0) + (v.rare > 0 ? 1 : 0)) +
            " 个模板",
          metrics: [
            { label: "重试计数", value: v.n },
            { label: "磁盘已满计数", value: v.rare },
          ],
          bars: [
            { label: "重试", value: v.n, max: 305 },
            { label: "磁盘已满", value: v.rare, max: 305 },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-log-volume-reduction-lab-3", {
    title: "均匀位置",
    steps: [
      {
        label: "输入",
        detail:
          "事件索引不在选定位置中时就会丢失。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption:
      "事件索引不在选定位置中时就会丢失。",
    lab: {
      controls: [
        {
          key: "budget",
          label: "预算",
          type: "range",
          value: 8,
          min: 0,
          max: 20,
          step: 1,
        },
        {
          key: "rare",
          label: "稀有事件索引（从零开始）",
          type: "range",
          value: 137,
          min: 0,
          max: 199,
          step: 1,
        },
      ],
      calculate(v) {
        const ids = Array.from({ length: v.budget }, (_, i) =>
          Math.floor((i * 200) / Math.max(1, v.budget)),
        );
        const kept = ids.includes(v.rare);
        return {
          summary: kept
            ? "均匀采样保留稀有事件"
            : "均匀采样漏掉稀有事件",
          metrics: [{ label: "稀有度策略保留它", value: v.budget > 0 }],
          columns: ["选中索引"],
          rows: ids.map((x) => [x]),
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-log-volume-reduction-lab-4", {
    title: "稀有覆盖率",
    steps: [
      {
        label: "输入",
        detail: "覆盖率统计稀有模板，不统计 token。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "覆盖率统计稀有模板，不统计 token。",
    lab: {
      controls: [
        {
          key: "rare",
          label: "稀有模板数",
          type: "range",
          value: 4,
          min: 0,
          max: 10,
          step: 1,
        },
        {
          key: "kept",
          label: "保留稀有模板数",
          type: "range",
          value: 3,
          min: 0,
          max: 10,
          step: 1,
        },
      ],
      calculate(v) {
        const k = Math.min(v.rare, v.kept),
          cov = v.rare ? k / v.rare : 1;
        return {
          summary: (100 * cov).toFixed(1) + "% 稀有模板覆盖率",
          metrics: [{ label: "丢失稀有模板数", value: v.rare - k }],
          bars: [{ label: "已保留", value: k, max: Math.max(1, v.rare) }],
        };
      },
    },
  });
})();
