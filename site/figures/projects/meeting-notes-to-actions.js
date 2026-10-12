(function () {
  "use strict";
  const controls = [
    { key: "owner", label: "负责人", type: "text", value: "Mira" },
    { key: "due", label: "截止日期", type: "text", value: "2026-10-01" },
    { key: "today", label: "审核日期", type: "text", value: "2026-09-29" },
    {
      key: "task",
      label: "任务",
      type: "text",
      value: "Update the migration guide",
    },
    {
      key: "approved",
      label: "审核者已明确批准",
      type: "checkbox",
      value: false,
    },
    {
      key: "copies",
      label: "来源中的重复提及次数",
      type: "range",
      value: 2,
      min: 1,
      max: 5,
      step: 1,
    },
  ];
  const calculate = function (v, stepIndex) {
    const dateOk = (s) =>
      /^\d{4}-\d{2}-\d{2}$/.test(s) &&
      !isNaN(Date.parse(s + "T00:00:00Z")) &&
      new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;
    const missing = v.owner === "?" || v.due === "?",
      invalid = v.due !== "?" && !dateOk(v.due),
      ready = !missing && !invalid && v.task.trim().length > 0,
      exported = ready && v.approved;
    return {
      summary: invalid
        ? "拒绝不可能的日历日期"
        : missing
          ? "将承诺保留为待定，并标记缺失字段"
          : exported
            ? "一条已批准的承诺可以进入 CSV"
            : "可以审核；仍需批准",
      metrics: [
        { label: "保留的来源引用数", value: v.copies },
        {
          label: "已逾期",
          value: dateOk(v.due) && dateOk(v.today) && v.due < v.today,
        },
      ],
      bars: [
        { label: "提及次数", value: v.copies, max: 5 },
        { label: "去重后的承诺数", value: 1, max: 5 },
        { label: "已导出的批准行数", value: exported ? 1 : 0, max: 5 },
      ],
    };
  };
  window.AIFSProjectFigures.register(
    "pj-meeting-notes-to-actions-1",
    Object.assign(
      {
        title: "解析明确的行动记录并保留源行",
        steps: [
          { label: "行", detail: "枚举原始笔记行。" },
          { label: "标记", detail: "只接受明确的 ACTION 记录。" },
          {
            label: "来源",
            detail: "保留原始行及其行号。",
          },
        ],
        caption:
          "解析 ACTION 行，保留源行号，拒绝格式错误的标记行。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-meeting-notes-to-actions-2",
    Object.assign(
      {
        title: "验证负责人和日历日期",
        steps: [
          {
            label: "字段",
            detail: "检查任务文本和明确的未知标记。",
          },
          { label: "日历", detail: "解析真实的 ISO 日期。" },
          { label: "标志", detail: "展示缺失信息的承诺。" },
        ],
        caption: "验证负责人、任务和 ISO 日期。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-meeting-notes-to-actions-3",
    Object.assign(
      {
        title: "精确去重承诺并保留引用",
        steps: [
          { label: "键", detail: "规范化承诺的三个字段。" },
          { label: "分组", detail: "只合并完全相同的键。" },
          { label: "引用", detail: "保留每一条原始行。" },
        ],
        caption:
          "合并规范化后完全相同的重复项，并对来源行号排序。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-meeting-notes-to-actions-4",
    Object.assign(
      {
        title: "发布已转义的 HTML 清单与摘要",
        steps: [
          { label: "分类", detail: "计算审核和逾期标志。" },
          { label: "转义", detail: "将导入的文本当作数据。" },
          { label: "发布", detail: "写出可移植的 HTML 清单。" },
        ],
        caption:
          "返回 HTML，以及就绪、待审核和逾期行动的数量。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
