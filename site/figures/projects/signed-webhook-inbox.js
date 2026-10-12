(function () {
  "use strict";
  window.AIFSProjectFigures.register("pj-signed-webhook-inbox-1", {
    title: "原始字节",
    steps: [
      {
        label: "输入",
        detail:
          "即使 JSON 含义不变，一个空格也会改变签名输入。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption:
      "即使 JSON 含义不变，一个空格也会改变签名输入。",
    lab: {
      controls: [
        {
          key: "body",
          label: "原始 JSON 请求体",
          type: "text",
          value: '{"eventId":"business-42"}',
        },
      ],
      calculate(v) {
        const bytes = new TextEncoder().encode(v.body);
        return {
          summary: bytes.length + " 个精确字节进入签名",
          metrics: [
            { label: "增加一个空格后的字节数", value: bytes.length + 1 },
          ],
          columns: ["输入", "字节数"],
          rows: [
            [v.body, bytes.length],
            [v.body + " ", bytes.length + 1],
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-signed-webhook-inbox-2", {
    title: "时间戳窗口",
    steps: [
      {
        label: "输入",
        detail: "用包含端点的区间限制旧签名和未来签名。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "用包含端点的区间限制旧签名和未来签名。",
    lab: {
      controls: [
        {
          key: "age",
          label: "签名后秒数",
          type: "range",
          value: 300,
          min: 0,
          max: 600,
          step: 1,
        },
        {
          key: "window",
          label: "允许偏差秒数",
          type: "range",
          value: 300,
          min: 0,
          max: 600,
          step: 1,
        },
      ],
      calculate(v) {
        return {
          summary:
            v.age <= v.window ? "时间戳接受" : "时间戳拒绝",
          metrics: [
            {
              label: "超出窗口秒数",
              value: Math.max(0, v.age - v.window),
            },
          ],
          bars: [
            { label: "经过时间", value: v.age, max: 600 },
            { label: "窗口", value: v.window, max: 600 },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-signed-webhook-inbox-3", {
    title: "投递标识",
    steps: [
      {
        label: "输入",
        detail: "传输重试共享 ID 和完全相同的请求体。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "传输重试共享 ID 和完全相同的请求体。",
    lab: {
      controls: [
        {
          key: "first",
          label: "已接受 ID",
          type: "text",
          value: "delivery-1",
        },
        {
          key: "next",
          label: "传入 ID",
          type: "text",
          value: "delivery-1",
        },
        { key: "body", label: "传入请求体", type: "text", value: "same" },
      ],
      calculate(v) {
        return {
          summary:
            v.next !== v.first
              ? "新传输投递"
              : v.body === "same"
                ? "重复重试：复用条目"
                : "标识冲突：拒绝",
          metrics: [
            { label: "新存储投递", value: v.next !== v.first ? 1 : 0 },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-signed-webhook-inbox-4", {
    title: "显式重放",
    steps: [
      {
        label: "输入",
        detail: "新运行不同于新传输投递。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "新运行不同于新传输投递。",
    lab: {
      controls: [
        {
          key: "runs",
          label: "重放运行 ID",
          type: "text",
          value: "review-1,review-1,review-2",
        },
      ],
      calculate(v) {
        const runs = v.runs
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          unique = [...new Set(runs)];
        return {
          summary: unique.length + " 条处理回执",
          metrics: [
            {
              label: "复用的重复运行数",
              value: runs.length - unique.length,
            },
          ],
          columns: ["存储的运行 ID"],
          rows: unique.map((x) => [x]),
        };
      },
    },
  });
})();
