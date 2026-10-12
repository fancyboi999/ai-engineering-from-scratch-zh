(function () {
  "use strict";
  const steps = [
    { label: "输入", detail: "检查原始邮件数据。" },
    { label: "规则", detail: "应用明确的契约。" },
    { label: "证据", detail: "保留可检查的结果。" },
  ];
  window.AIFSProjectFigures.register("pj-inbox-triage-desk-1", {
    title: "邮件解析保留了哪些信息？",
    steps,
    caption:
      "编辑邮件的纯文本字段。MIME 解码由 Python 实现；本实验检查解码后的记录。",
    lab: {
      controls: [
        {
          key: "sender",
          label: "发件人地址",
          type: "text",
          value: "mira@example.invalid",
        },
        {
          key: "body",
          label: "纯文本正文",
          type: "text",
          value: "Could you print six table labels?",
        },
        {
          key: "hasId",
          label: "邮件有 ID",
          type: "checkbox",
          value: true,
        },
      ],
      calculate(v) {
        const valid = /^[^\s@]+@[^\s@]+$/.test(v.sender);
        return {
          summary: valid
            ? "将正文与邮件标识一同保留。"
            : "分类前先拒绝无效记录。",
          metrics: [
            {
              label: "正文字节数",
              value: new TextEncoder().encode(v.body).length,
            },
            {
              label: "标识",
              value: v.hasId
                ? "已提供 Message-ID"
                : "需用摘要作为后备标识",
            },
          ],
          rows: [
            ["sender", v.sender],
            ["text", v.body],
            ["body_status", v.body.trim() ? "plain" : "no-plain-body"],
          ],
          columns: ["字段", "解析值"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-inbox-triage-desk-2", {
    title: "规则匹配是证据，不是确定结论",
    steps,
    caption:
      "类别冲突时归为不确定。修改邮件，检查匹配到的确切短语。",
    lab: {
      controls: [
        {
          key: "text",
          label: "邮件正文",
          type: "text",
          value: "Please confirm. For your information, the room changed.",
        },
      ],
      calculate(v) {
        const rules = {
          action: ["please", "can you", "could you", "confirm"],
          information: ["for your information", "newsletter", "receipt"],
        };
        const hits = [];
        for (const [category, phrases] of Object.entries(rules))
          for (const phrase of phrases) {
            const match = new RegExp("(?<!\\w)" + phrase + "(?!\\w)", "i").exec(
              v.text,
            );
            if (match) hits.push([category, match[0], String(match.index)]);
          }
        const categories = new Set(hits.map((h) => h[0]));
        const category =
          categories.size === 1 ? [...categories][0] : "uncertain";
        return {
          summary:
            ({ action: "待行动", uncertain: "不确定", information: "信息" }[category]) + "队列；每项分类仍需审阅。",
          metrics: [
            { label: "匹配类别数", value: categories.size },
            {
              label: "优先级",
              value: { action: 0, uncertain: 1, information: 2 }[category],
            },
          ],
          rows: (hits.length ? hits : [["uncertain", "没有匹配短语", ""]]).map(([category, quote, offset]) => [{ action: "待行动", uncertain: "不确定", information: "信息" }[category], quote, offset]),
          columns: ["类别", "原文引用", "开始偏移"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-inbox-triage-desk-3", {
    title: "起草前校验引用",
    steps,
    caption:
      "草稿中的承诺留给人来写。虚构引用会阻止提案生成。",
    lab: {
      controls: [
        {
          key: "source",
          label: "来源正文",
          type: "text",
          value: "Please bring two folding chairs.",
        },
        {
          key: "quote",
          label: "拟用的证据引用",
          type: "text",
          value: "two folding chairs",
        },
        {
          key: "sameMessage",
          label: "决策中的邮件 ID 一致",
          type: "checkbox",
          value: true,
        },
      ],
      calculate(v) {
        const found = v.quote.length > 0 && v.source.includes(v.quote);
        const valid = found && v.sameMessage;
        return {
          summary: valid
            ? "生成未发送草稿，保留可编辑的回复占位文本。"
            : "拒绝此决策；标识与确切证据必须同时匹配。",
          metrics: [
            { label: "找到引用", value: found ? "是" : "否" },
            { label: "已发送邮件数", value: 0 },
          ],
          rows: [
            ["来源", v.source],
            ["回复草稿", "[在此撰写并检查回复。]"],
          ],
          columns: ["记录", "文本"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-inbox-triage-desk-4", {
    title: "构建审阅队列",
    steps,
    caption:
      "数量会改变队列与草稿总数。类别与邮件线程标识仍然分开。",
    lab: {
      controls: [
        {
          key: "action",
          label: "待行动邮件数",
          type: "range",
          value: 3,
          min: 0,
          max: 20,
        },
        {
          key: "uncertain",
          label: "不确定邮件数",
          type: "range",
          value: 2,
          min: 0,
          max: 20,
        },
        {
          key: "information",
          label: "信息类邮件数",
          type: "range",
          value: 5,
          min: 0,
          max: 20,
        },
      ],
      calculate(v) {
        const rows = ["action", "uncertain", "information"].map((key, i) => [
          String(i),
          key,
          String(v[key]),
        ]);
        const count = v.action + v.uncertain + v.information;
        return {
          summary: `导出 ${count} 条审阅记录和 ${count} 份未发送草稿。`,
          metrics: [
            { label: "草稿文件数", value: count },
            { label: "已发送邮件数", value: 0 },
          ],
          bars: rows.map((r) => ({
            label: { action: "待行动", uncertain: "不确定", information: "信息" }[r[1]],
            value: Number(r[2]),
            max: 20,
          })),
          rows: rows.map(([priority, category, count]) => [priority, { action: "待行动", uncertain: "不确定", information: "信息" }[category], count]),
          columns: ["优先级", "类别", "邮件数"],
        };
      },
    },
  });
})();
