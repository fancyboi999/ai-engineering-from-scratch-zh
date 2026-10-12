(function () {
  "use strict";
  // 保留路由、状态和工具枚举；仅在显示边界使用中文标签。
  const display = {
    billing: "账单", access: "访问", platform: "平台", human: "人工",
    read_invoice: "读取账单", read_account: "读取账户", read_status: "读取状态",
    received: "已接收", routed: "已路由", answered: "已回答", escalated: "已升级",
    classify: "分类", respond: "回复", escalate: "升级处理",
  };
  const steps = [
    { label: "校验", detail: "应用共享的确定性边界检查。" },
    { label: "选择", detail: "将路由与能力分开。" },
    {
      label: "保留",
      detail: "存储可检查的证据与响应状态。",
    },
  ];
  window.AIFSProjectFigures.register("pj-support-agent-with-google-adk-1", {
    title: "任何模型请求前先脱敏",
    steps,
    caption:
      "文档中的两种模式只是有限示例，不是完整隐私过滤器。",
    lab: {
      controls: [
        {
          key: "text",
          label: "工单文本",
          type: "text",
          value: "invoice for learner@example.invalid api_key=EXAMPLE_VALUE",
        },
      ],
      calculate(v) {
        const clean = v.text
          .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
          .replace(/(api[_ -]?key\s*[:=]\s*)\S+/gi, "$1[redacted]");
        const valid = v.text.trim() && v.text.length <= 10000;
        return {
          summary: valid
            ? "只有清理后的文本可以进入会话。"
            : "拒绝此工单。",
          metrics: [
            { label: "输入字符数", value: v.text.length },
            {
              label: "过滤器是否修改文本",
              value: clean === v.text ? "否" : "是",
            },
          ],
          rows: [["清理后的工单", clean]],
          columns: ["边界", "文本"],
        };
      },
    },
  });
  const routes = {
    billing: ["invoice", "refund", "payment"],
    access: ["password", "login", "account"],
    platform: ["outage", "latency", "error"],
  };
  const tools = {
    billing: "read_invoice",
    access: "read_account",
    platform: "read_status",
  };
  function route(text) {
    const words = new Set(text.toLowerCase().match(/\w+/g) || []),
      scores = Object.entries(routes)
        .map(([key, terms]) => [key, terms.filter((t) => words.has(t)).length])
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return {
      scores,
      selected:
        !scores[0][1] || scores[0][1] === scores[1][1] ? "human" : scores[0][0],
    };
  }
  window.AIFSProjectFigures.register("pj-support-agent-with-google-adk-2", {
    title: "将路由得分与权限分开",
    steps,
    caption:
      "得分相同则升级给人工处理。合法的专职 agent 也不能使用其他专职 agent 的工具。",
    lab: {
      controls: [
        {
          key: "text",
          label: "工单文本",
          type: "text",
          value: "invoice login",
        },
        {
          key: "tool",
          label: "请求的能力",
          type: "select",
          value: "read_invoice",
          options: Object.values(tools).map((value) => ({
            value,
            label: display[value],
          })),
        },
      ],
      calculate(v) {
        const r = route(v.text),
          allowed = tools[r.selected] === v.tool;
        let summary = "拒绝请求的能力。";
        if (r.selected === "human")
          summary = "运行模型或读取能力前先升级给人工。";
        else if (allowed) summary = "授权 " + display[v.tool] + "（" + v.tool + "）";
        return {
          summary,
          metrics: [
            { label: "路由", value: display[r.selected] },
            { label: "是否允许", value: allowed ? "是" : "否" },
          ],
          bars: r.scores.map(([label, value]) => ({ label: display[label], value, max: 3 })),
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-support-agent-with-google-adk-3", {
    title: "状态转移后必须保留响应",
    steps,
    caption:
      "终止状态不能接受更多事件。人工路由允许升级处理，不允许自动回答。",
    lab: {
      controls: [
        {
          key: "state",
          label: "当前状态",
          type: "select",
          value: "routed",
          options: ["received", "routed", "answered", "escalated"].map(
            (value) => ({ value, label: display[value] }),
          ),
        },
        {
          key: "event",
          label: "事件",
          type: "select",
          value: "respond",
          options: ["classify", "respond", "escalate"].map((value) => ({
            value,
            label: display[value],
          })),
        },
        { key: "human", label: "人工路由", type: "checkbox", value: false },
        {
          key: "text",
          label: "回复文本",
          type: "text",
          value: "Use the receipt invoice reference.",
        },
      ],
      calculate(v) {
        const next = {
          received: { classify: "routed" },
          routed: { respond: "answered", escalate: "escalated" },
        }[v.state]?.[v.event];
        const valid =
          next && !(v.event === "respond" && (v.human || !v.text.trim()));
        return {
          summary: valid
            ? "转移到 " + display[next]
            : "拒绝转移，保留先前状态。",
          metrics: [{ label: "下一状态", value: display[valid ? next : v.state] }],
          rows: [
            [
              "保留的响应",
              valid && v.event === "respond" ? v.text.trim() : "无",
            ],
          ],
          columns: ["会话字段", "值"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-support-agent-with-google-adk-4", {
    title: "进入 ADK 前应用同一门禁",
    steps,
    caption:
      "真实 SDK 测试验证图行为。确定性测试模型有明确标注；它不能证明语言模型质量。",
    lab: {
      controls: [
        {
          key: "text",
          label: "工单主题",
          type: "text",
          value: "account login",
        },
        {
          key: "proposed",
          label: "模型提议的路由",
          type: "select",
          value: "access",
          options: ["billing", "access", "platform"].map((value) => ({
            value,
            label: display[value],
          })),
        },
      ],
      calculate(v) {
        const r = route(v.text);
        const valid = r.selected !== "human" && r.selected === v.proposed;
        let summary = "运行 ADK 前拒绝路由覆盖。";
        if (r.selected === "human")
          summary = "升级给人工：不调用 ADK 模型。";
        else if (valid)
          summary =
            "基于清理后的文本与授权指引，运行分诊和专职 agent。";
        return {
          summary,
          metrics: [
            { label: "允许的路由", value: display[r.selected] },
            { label: "模型调用数", value: valid ? 2 : 0 },
          ],
          rows: [
            ["读取能力", valid ? display[tools[r.selected]] + "（" + tools[r.selected] + "）" : "无"],
            [
              "回复状态",
              valid ? "已回答并保留草稿" : "无自动回答",
            ],
          ],
          columns: ["门禁结果", "值"],
        };
      },
    },
  });
})();
