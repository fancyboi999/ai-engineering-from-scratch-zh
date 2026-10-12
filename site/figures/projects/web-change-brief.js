(function () {
  "use strict";
  const steps = [
    {
      label: "快照",
      detail: "保留声明的来源与提取策略。",
    },
    { label: "计算", detail: "应用受限且可检查的转换。" },
    { label: "报告", detail: "保留精确的变更证据。" },
  ];
  const blocks = (s) =>
    s
      .split("|")
      .map((x) => x.trim().replace(/\s+/g, " "))
      .filter(Boolean);
  const diff = (a, b) => {
    const left = new Map(),
      right = new Map();
    for (const x of a) left.set(x, (left.get(x) || 0) + 1);
    for (const x of b) right.set(x, (right.get(x) || 0) + 1);
    let common = 0;
    const rows = [];
    for (const x of [...new Set([...a, ...b])].sort()) {
      const l = left.get(x) || 0,
        r = right.get(x) || 0;
      common += Math.min(l, r);
      rows.push([
        x,
        String(l),
        String(r),
        r > l ? "新增 " + (r - l) : l > r ? "删除 " + (l - r) : "未改变",
      ]);
    }
    return { rows, common };
  };
  window.AIFSProjectFigures.register("pj-web-change-brief-1", {
    title: "明确过滤可读文本块",
    steps,
    caption:
      "用 | 分隔已提取的文本块。此实验展示 HTML 扫描后的短语过滤。",
    lab: {
      controls: [
        {
          key: "text",
          label: "用 | 分隔的提取文本块",
          type: "text",
          value: "Community workshop | Updated today 15:00 | Bring a mug",
        },
        {
          key: "ignore",
          label: "忽略短语",
          type: "text",
          value: "updated today",
        },
      ],
      calculate(v) {
        const input = blocks(v.text),
          phrase = v.ignore.trim().toLowerCase();
        const kept = input.filter(
          (x) => !phrase || !x.toLowerCase().includes(phrase),
        );
        return {
          summary: `保留 ${input.length} 个可读文本块中的 ${kept.length} 个。`,
          metrics: [
            { label: "移除的文本块数", value: input.length - kept.length },
          ],
          rows: input.map((x) => [x, kept.includes(x) ? "保留" : "已过滤"]),
          columns: ["文本块", "决定"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-web-change-brief-2", {
    title: "统计文本出现次数，而不只检查存在与否",
    steps,
    caption:
      "用 | 分隔文本块。重新排序不算文本变更，重复次数改变则算。",
    lab: {
      controls: [
        {
          key: "before",
          label: "变更前文本块",
          type: "text",
          value: "A | A | B",
        },
        {
          key: "after",
          label: "变更后文本块",
          type: "text",
          value: "A | B | C",
        },
      ],
      calculate(v) {
        const a = blocks(v.before),
          b = blocks(v.after),
          r = diff(a, b);
        return {
          summary: `${r.common} 次文本块出现未改变。`,
          metrics: [
            { label: "变更前文本块", value: a.length },
            { label: "变更后文本块", value: b.length },
          ],
          rows: r.rows,
          columns: ["精确文本", "变更前次数", "变更后次数", "变更"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-web-change-brief-3", {
    title: "不将失败的获取结果作为基线",
    steps,
    caption:
      "HTTP 成功、支持的媒体类型、大小和取消状态是独立检查项。",
    lab: {
      controls: [
        {
          key: "status",
          label: "HTTP 状态",
          type: "select",
          value: "200",
          options: [
            { value: "200", label: "200 成功" },
            { value: "503", label: "503 不可用" },
            { value: "404", label: "404 未找到" },
          ],
        },
        {
          key: "bytes",
          label: "响应字节数",
          type: "number",
          value: 125000,
          min: 0,
          max: 4000000,
          step: 1000,
        },
        {
          key: "html",
          label: "HTML 内容类型（Content-Type）",
          type: "checkbox",
          value: true,
        },
        {
          key: "cancelled",
          label: "请求已取消",
          type: "checkbox",
          value: false,
        },
      ],
      calculate(v) {
        const checks = [
          ["状态为 200", v.status === "200"],
          ["HTML 类型", v.html],
          ["不超过 2 MB", v.bytes <= 2000000],
          ["未取消", !v.cancelled],
        ];
        const accepted = checks.every((x) => x[1]);
        return {
          summary: accepted
            ? "获取结果可以提取。替换基线仍需明确操作。"
            : "保留原基线并报告获取失败。",
          metrics: [
            { label: "通过的检查项数", value: checks.filter((x) => x[1]).length },
            { label: "基线替换次数", value: 0 },
          ],
          rows: checks.map(([k, ok]) => [k, ok ? "通过" : "失败"]),
          columns: ["检查项", "结果"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-web-change-brief-4", {
    title: "展示改变的陈述本身",
    steps,
    caption:
      "报告携带精确文本与次数，不推断发布者意图。",
    lab: {
      controls: [
        {
          key: "before",
          label: "先前陈述",
          type: "text",
          value: "The workshop starts at 14:00.",
        },
        {
          key: "after",
          label: "当前陈述",
          type: "text",
          value: "The workshop starts at 15:00.",
        },
      ],
      calculate(v) {
        const r = diff(blocks(v.before), blocks(v.after));
        return {
          summary:
            v.before.trim() === v.after.trim()
              ? "文本没有变化。"
              : "并排审核删除和新增的陈述。",
          metrics: [{ label: "未改变的出现次数", value: r.common }],
          rows: r.rows,
          columns: ["精确证据", "之前", "之后", "报告操作"],
        };
      },
    },
  });
})();
