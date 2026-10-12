(function () {
  "use strict";
  window.AIFSProjectFigures.register("pj-streaming-answer-recovery-1", {
    title: "UTF-8 分帧",
    steps: [
      {
        label: "输入",
        detail: "完整事件需要空行分隔符。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "完整事件需要空行分隔符。",
    lab: {
      controls: [
        {
          key: "data",
          label: "SSE 文本",
          type: "text",
          value: "id: 1\ndata: Caf\u00e9\n\n",
        },
      ],
      calculate(v) {
        const n = v.data.split(/\r?\n\r?\n/).length - 1;
        return {
          summary: n + " 个完整事件分隔符",
          metrics: [
            {
              label: "UTF-8 字节数",
              value: new TextEncoder().encode(v.data).length,
            },
            { label: "字符数", value: v.data.length },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-streaming-answer-recovery-2", {
    title: "稳定标识",
    steps: [
      {
        label: "输入",
        detail: "重复的相同事件不追加两次。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "重复的相同事件不追加两次。",
    lab: {
      controls: [
        { key: "ids", label: "已投递 ID", type: "text", value: "1,2,2,3" },
      ],
      calculate(v) {
        const ids = v.ids
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          unique = [...new Set(ids)];
        return {
          summary: unique.length + " 个唯一事件已接受",
          metrics: [{ label: "重复数", value: ids.length - unique.length }],
          columns: ["已接受 ID"],
          rows: unique.map((x) => [x]),
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-streaming-answer-recovery-3", {
    title: "恢复游标",
    steps: [
      {
        label: "输入",
        detail: "重连从最后接受的事件之后开始。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "重连从最后接受的事件之后开始。",
    lab: {
      controls: [
        {
          key: "last",
          label: "最后接受 ID",
          type: "range",
          value: 1,
          min: 0,
          max: 4,
          step: 1,
        },
      ],
      calculate(v) {
        const ids = [1, 2, 3, 4].filter((x) => x > v.last);
        return {
          summary: ids.length
            ? "从这些 ID 恢复：" + ids.join(", ")
            : "没有剩余事件",
          metrics: [{ label: "Last-Event-ID", value: v.last }],
          columns: ["下一事件"],
          rows: ids.map((x) => [x]),
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-streaming-answer-recovery-4", {
    title: "答案状态",
    steps: [
      {
        label: "输入",
        detail: "文本和引用不能证明已完成。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "文本和引用不能证明已完成。",
    lab: {
      controls: [
        {
          key: "accepted",
          label: "接受事件数",
          type: "range",
          value: 2,
          min: 0,
          max: 4,
          step: 1,
        },
      ],
      calculate(v) {
        const status = v.accepted === 4 ? "completed" : "interrupted";
        return {
          summary: "答案状态：" + status,
          metrics: [
            { label: "有可用引用", value: v.accepted >= 3 },
            { label: "有可用完成事件", value: v.accepted === 4 },
          ],
          columns: ["字段", "值"],
          rows: [
            [
              "text",
              v.accepted >= 2
                ? "Café supports interrupted answers."
                : v.accepted === 1
                  ? "Caf"
                  : "",
            ],
            ["lastID", v.accepted],
          ],
        };
      },
    },
  });
})();
