(function () {
  "use strict";
  const steps = [
    {
      label: "来源",
      detail: "保持原文和作者制定的策略可见。",
    },
    { label: "决策", detail: "应用明确的确定性契约。" },
    { label: "审查", detail: "用证据解释结果。" },
  ];
  const norm = (s) =>
    s
      .normalize("NFKC")
      .toLocaleLowerCase("en-US")
      .trim()
      .replace(/[.!?]+$/u, "")
      .replace(/\s+/gu, " ");
  window.AIFSProjectFigures.register("pj-source-grounded-study-coach-1", {
    title: "答案需要引文支持",
    steps,
    caption:
      "卡组在提问前校验答案的逐字证据。",
    lab: {
      controls: [
        {
          key: "source",
          label: "来源段落",
          type: "text",
          value: "Each packet records the harvest year.",
        },
        {
          key: "answer",
          label: "标准答案",
          type: "text",
          value: "harvest year",
        },
        {
          key: "start",
          label: "证据起点",
          type: "number",
          value: 0,
          min: 0,
          max: 1000,
        },
        {
          key: "end",
          label: "证据终点",
          type: "number",
          value: 37,
          min: 0,
          max: 1000,
        },
      ],
      calculate(v) {
        const bounds =
          Number.isInteger(v.start) &&
          Number.isInteger(v.end) &&
          v.start >= 0 &&
          v.end > v.start &&
          v.end <= v.source.length;
        const quote = bounds ? v.source.slice(v.start, v.end) : "";
        const valid = bounds && v.answer.trim() && quote.includes(v.answer);
        return {
          summary: valid
            ? "标准答案具有有效的来源位置。"
            : "拒绝此卡：修正偏移量或答案证据。",
          metrics: [
            { label: "来源 UTF-16 长度", value: v.source.length },
            { label: "偏移量有效", value: bounds ? "yes" : "no" },
          ],
          rows: [
            ["引文", quote || "（无效范围）"],
            ["预期答案", v.answer],
          ],
          columns: ["字段", "文本"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-source-grounded-study-coach-2", {
    title: "按精确答案契约评分",
    steps,
    caption:
      "正确转述也可能需要人工审查。这个基线不能对任意语义评分。",
    lab: {
      controls: [
        {
          key: "answer",
          label: "标准答案",
          type: "text",
          value: "paper envelopes",
        },
        {
          key: "response",
          label: "学习者回答",
          type: "text",
          value: " PAPER   ENVELOPES! ",
        },
        {
          key: "variant",
          label: "作者认可的变体",
          type: "text",
          value: "a paper envelope",
        },
      ],
      calculate(v) {
        const response = norm(v.response);
        const correct =
          Boolean(response) &&
          (response === norm(v.answer) ||
            (Boolean(v.variant.trim()) && response === norm(v.variant)));
        return {
          summary: correct
            ? "通过明确的字符串匹配策略。"
            : "查看来源并对照预期答案。",
          metrics: [{ label: "已接受", value: correct ? "yes" : "no" }],
          rows: [
            ["预期值", norm(v.answer)],
            ["回答", response],
            ["认可变体", norm(v.variant)],
          ],
          columns: ["比较项", "规范化文本"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-source-grounded-study-coach-3", {
    title: "计算下次复习日期",
    steps,
    caption:
      "这是公开可见的教学策略。答题正确性改变复习间隔，但不能证明学习质量。",
    lab: {
      controls: [
        {
          key: "box",
          label: "当前盒级",
          type: "range",
          value: 1,
          min: 0,
          max: 5,
        },
        {
          key: "correct",
          label: "答案已接受",
          type: "checkbox",
          value: true,
        },
        {
          key: "date",
          label: "作答日期",
          type: "text",
          value: "2026-09-02",
        },
      ],
      calculate(v) {
        const time = Date.parse(v.date + "T00:00:00Z");
        const valid =
          /^\d{4}-\d{2}-\d{2}$/.test(v.date) &&
          Number.isFinite(time) &&
          new Date(time).toISOString().slice(0, 10) === v.date;
        if (!valid)
          return { summary: "拒绝无效日历日期。", metrics: [] };
        const box = v.correct ? Math.min(5, v.box + 1) : 0;
        const interval = v.correct ? 2 ** (box - 1) : 1;
        return {
          summary:
            "下次到期：" +
            new Date(time + interval * 86400000).toISOString().slice(0, 10),
          metrics: [
            { label: "下一盒级", value: box },
            { label: "间隔天数", value: interval },
          ],
          bars: [{ label: "复习间隔", value: interval, max: 16 }],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-source-grounded-study-coach-4", {
    title: "为报告选择到期队列",
    steps,
    caption:
      "每张练习卡都保留来源段落。页面在本地记录实际输入的答案，并下载作答日志供下次 CLI 运行使用。",
    lab: {
      controls: [
        {
          key: "day",
          label: "九月的报告日期",
          type: "range",
          value: 3,
          min: 1,
          max: 10,
        },
      ],
      calculate(v) {
        const rows = [
          ["sorting", 1],
          ["harvest-year", 3],
          ["storage", 4],
        ].map(([id, day]) => [
          id,
          "2026-09-" + String(day).padStart(2, "0"),
          v.day >= day ? "due" : "later",
        ]);
        const count = rows.filter((r) => r[2] === "due").length;
        return {
          summary: `显示 9 月 ${v.day} 日的 ${count} 张到期卡。`,
          metrics: [
            { label: "到期卡数", value: count },
            { label: "尚未到期卡数", value: 3 - count },
          ],
          rows,
          columns: ["卡片", "到期日期", "队列"],
        };
      },
    },
  });
})();
