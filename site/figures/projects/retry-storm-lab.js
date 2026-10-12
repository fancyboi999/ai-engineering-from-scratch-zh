(function () {
  "use strict";
  window.AIFSProjectFigures.register("pj-retry-storm-lab-1", {
    title: "突发容量",
    steps: [
      {
        label: "输入",
        detail: "一个精确时钟桶限制接受的初始调用。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "一个精确时钟桶限制接受的初始调用。",
    lab: {
      controls: [
        {
          key: "clients",
          label: "客户端数",
          type: "range",
          value: 20,
          min: 0,
          max: 50,
          step: 1,
        },
        {
          key: "capacity",
          label: "每毫秒容量",
          type: "range",
          value: 5,
          min: 0,
          max: 50,
          step: 1,
        },
      ],
      calculate(v) {
        const ok = Math.min(v.clients, v.capacity);
        return {
          summary: ok + " 个成功；" + (v.clients - ok) + " 个失败",
          bars: [
            { label: "接受", value: ok, max: 50 },
            { label: "拒绝", value: v.clients - ok, max: 50 },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-retry-storm-lab-2", {
    title: "有界退避",
    steps: [
      {
        label: "输入",
        detail: "每次重试前采用有上限的指数等待。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "每次重试前采用有上限的指数等待。",
    lab: {
      controls: [
        {
          key: "base",
          label: "基准毫秒数",
          type: "range",
          value: 10,
          min: 0,
          max: 50,
          step: 1,
        },
        {
          key: "cap",
          label: "上限毫秒数",
          type: "range",
          value: 80,
          min: 0,
          max: 200,
          step: 1,
        },
      ],
      calculate(v) {
        const cap = Math.max(v.base, v.cap);
        return {
          summary: "上限 " + cap + "ms",
          columns: ["重试", "等待（毫秒）"],
          rows: [1, 2, 3, 4].map((i) => [
            i,
            Math.min(cap, v.base * 2 ** (i - 1)),
          ]),
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-retry-storm-lab-3", {
    title: "共享放大率",
    steps: [
      { label: "输入", detail: "初始调用加准入重试。" },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "初始调用加准入重试。",
    lab: {
      controls: [
        {
          key: "clients",
          label: "客户端数",
          type: "range",
          value: 20,
          min: 0,
          max: 50,
          step: 1,
        },
        {
          key: "budget",
          label: "共享重试上限",
          type: "range",
          value: 12,
          min: 0,
          max: 100,
          step: 1,
        },
      ],
      calculate(v) {
        return {
          summary: "最多 " + (v.clients + v.budget) + " 次尝试",
          metrics: [
            {
              label: "最大放大率",
              value: v.clients
                ? ((v.clients + v.budget) / v.clients).toFixed(2)
                : 0,
            },
          ],
          bars: [
            { label: "初始", value: v.clients, max: 150 },
            { label: "重试", value: v.budget, max: 150 },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-retry-storm-lab-4", {
    title: "观察回执",
    steps: [
      {
        label: "输入",
        detail: "独立于声明计数器统计实际调用。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "独立于声明计数器统计实际调用。",
    lab: {
      controls: [
        {
          key: "initial",
          label: "初始调用数",
          type: "range",
          value: 20,
          min: 0,
          max: 50,
          step: 1,
        },
        {
          key: "retried",
          label: "观察到的重试数",
          type: "range",
          value: 12,
          min: 0,
          max: 50,
          step: 1,
        },
        {
          key: "success",
          label: "成功客户端数",
          type: "range",
          value: 12,
          min: 0,
          max: 50,
          step: 1,
        },
      ],
      calculate(v) {
        const s = Math.min(v.initial, v.success),
          calls = v.initial + v.retried;
        return {
          summary: calls + " 次实际 HTTP 尝试",
          metrics: [
            { label: "成功数", value: s },
            {
              label: "放大率",
              value: v.initial ? (calls / v.initial).toFixed(2) : 0,
            },
          ],
          bars: [
            {
              label: "恢复客户端数",
              value: s,
              max: Math.max(1, v.initial),
            },
          ],
        };
      },
    },
  });
})();
