(function () {
  "use strict";
  const steps = [
    { label: "契约", detail: "校验输入与选定操作。" },
    { label: "状态", detail: "区分等待与失败。" },
    { label: "副作用", detail: "通过必需门禁后才调用工具。" },
  ];
  window.AIFSProjectFigures.register("pj-typed-workflow-agent-with-mastra-1", {
    title: "类型也需要运行时校验",
    steps,
    caption:
      "这个关键词分类器是可检查的基线，不是授权系统。",
    lab: {
      controls: [
        { key: "id", label: "工单 ID", type: "text", value: "workshop-42" },
        {
          key: "text",
          label: "消息",
          type: "text",
          value: "Update the workshop equipment label",
        },
      ],
      calculate(v) {
        const valid = v.id.trim() && v.text.trim() && v.text.length <= 10000;
        const intent = /\b(update|delete|change|cancel)\b/i.test(v.text)
          ? "write"
          : "read";
        return {
          summary: valid
            ? "已校验工单，意图为" + (intent === "write" ? "写入" : "读取") + "。"
            : "规划前拒绝格式错误的工单。",
          metrics: [
            { label: "字符数", value: v.text.length },
            { label: "意图", value: valid ? (intent === "write" ? "写入" : "读取") : "无" },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-typed-workflow-agent-with-mastra-2", {
    title: "根据选定工具决定审批要求",
    steps,
    caption:
      "已保存的检查点不能仅通过修改标志关闭审批。",
    lab: {
      controls: [
        {
          key: "tool",
          label: "选定操作",
          type: "select",
          value: "update",
          options: [
            { value: "lookup", label: "查找" },
            { value: "update", label: "更新" },
          ],
        },
        {
          key: "required",
          label: "requiresApproval 标志",
          type: "checkbox",
          value: true,
        },
      ],
      calculate(v) {
        const expected = v.tool === "update",
          valid = expected === v.required;
        return {
          summary: valid
            ? "计划契约内部一致。"
            : "拒绝被修改的检查点。",
          metrics: [
            { label: "预期标志", value: String(expected) },
            { label: "存储的标志", value: String(v.required) },
          ],
          rows: [[v.tool === "update" ? "更新" : "查找", expected ? "产生副作用前审阅" : "只读"]],
          columns: ["操作", "政策"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-typed-workflow-agent-with-mastra-3", {
    title: "失败调用也计入预算",
    steps,
    caption:
      "手写运行时在变更前暂停。重试真实写入仍需幂等性。",
    lab: {
      controls: [
        {
          key: "write",
          label: "计划包含 update",
          type: "checkbox",
          value: true,
        },
        {
          key: "approved",
          label: "已提供批准",
          type: "checkbox",
          value: false,
        },
        {
          key: "failures",
          label: "成功前失败次数",
          type: "range",
          value: 1,
          min: 0,
          max: 5,
        },
        {
          key: "budget",
          label: "共享调用预算",
          type: "range",
          value: 3,
          min: 1,
          max: 5,
        },
      ],
      calculate(v) {
        const paused = v.write && !v.approved;
        const calls = paused ? 0 : Math.min(v.failures + 1, 2, v.budget);
        const ok = !paused && v.failures < 2 && v.failures + 1 <= v.budget;
        let summary = "达到尝试或调用上限后失败。";
        if (paused) summary = "首次工具调用前已暂停。";
        else if (ok) summary = "完成并获得可用结果。";
        return {
          summary,
          metrics: [
            { label: "观察到的调用数", value: calls },
            { label: "每项操作尝试上限", value: 2 },
          ],
          bars: [{ label: "已消耗调用数", value: calls, max: v.budget }],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-typed-workflow-agent-with-mastra-4", {
    title: "恢复已存计划，而不是新请求",
    steps,
    caption:
      "真实 SDK 将暂停状态存入 SQLite。这些控件模拟恢复计划外的审批门禁。",
    lab: {
      controls: [
        {
          key: "approved",
          label: "审阅者已批准",
          type: "checkbox",
          value: false,
        },
        {
          key: "ticket",
          label: "工单 ID 一致",
          type: "checkbox",
          value: true,
        },
        {
          key: "digest",
          label: "计划摘要一致",
          type: "checkbox",
          value: true,
        },
        {
          key: "stored",
          label: "本地存储中存在该运行",
          type: "checkbox",
          value: true,
        },
      ],
      calculate(v) {
        let status = "success";
        if (!v.stored) status = "missing run";
        else if (!v.approved) status = "suspended";
        else if (!v.ticket || !v.digest) status = "failed";
        let summary = "拒绝无效恢复或不匹配的批准。";
        if (status === "success")
          summary = "使用原始操作与查询恢复执行。";
        else if (status === "suspended")
          summary = "保持待审批状态，不产生副作用。";
        return {
          summary,
          metrics: [
            { label: "SDK 结果", value: { success: "成功", "missing run": "运行不存在", suspended: "已暂停", failed: "失败" }[status] },
            { label: "工具调用数", value: status === "success" ? 1 : 0 },
          ],
          rows: [
            ["持久化上下文", "runId, ticketId, planHash, plan"],
            [
              "审阅者身份",
              "必须由集成应用验证身份",
            ],
          ],
          columns: ["边界", "存储或要求的数据"],
        };
      },
    },
  });
})();
