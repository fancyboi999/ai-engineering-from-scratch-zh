(function () {
  "use strict";

  const sampleCalls = [
    { id: "call_001", query: "laptop stand", category: "electronics", limit: 15 },
    { id: "call_002", query: "cotton crewneck", category: "apparel", limit: 5, client_tag: "summer_sale" },
    { id: "call_003", query: "dining table", category: "home", limit: 2 },
    { id: "call_004", query: "distributed systems in rust", limit: 85 },
    { id: "call_005", query: "", limit: 10 }
  ];

  const controls = [
    {
      key: "addRequiredApiKey",
      label: "新增必填参数 'api_key'",
      type: "checkbox",
      value: true
    },
    {
      key: "removeHomeCategory",
      label: "从 category 枚举中删除 'home'",
      type: "checkbox",
      value: true
    },
    {
      key: "narrowLimitMax",
      label: "'limit' 允许的最大值",
      type: "range",
      value: 50,
      min: 10,
      max: 100,
      step: 10
    },
    {
      key: "closeSchema",
      label: "拒绝未声明属性（additionalProperties: false）",
      type: "checkbox",
      value: true
    },
    {
      key: "strictGate",
      label: "启用严格的 CI 兼容性闸门",
      type: "checkbox",
      value: true
    }
  ];

  const calculate = function (v) {
    const breakingRules = [];
    if (v.addRequiredApiKey) breakingRules.push("新增必填参数 'api_key'");
    if (v.removeHomeCategory) breakingRules.push("枚举删除 category 'home'");
    if (v.narrowLimitMax < 100) breakingRules.push("limit 上限降到 " + v.narrowLimitMax);
    if (v.closeSchema) breakingRules.push("拒绝额外属性");

    const counts = { preserved: 0, broken: 0, alreadyInvalid: 0 };
    const rows = sampleCalls.map(function (call) {
      if (!call.query) {
        counts.alreadyInvalid += 1;
        return [call.id, "原本无效", "query 短于 minLength 1"];
      }
      const reasons = [];
      if (v.addRequiredApiKey && !call.api_key) reasons.push("缺少必填的 'api_key'");
      if (v.removeHomeCategory && call.category === "home") reasons.push("category 'home' 不在枚举中");
      if (call.limit > v.narrowLimitMax) reasons.push("limit " + call.limit + " > " + v.narrowLimitMax);
      if (v.closeSchema && call.client_tag) reasons.push("未声明的属性 'client_tag'");
      if (reasons.length) {
        counts.broken += 1;
        return [call.id, "被破坏", reasons.join("；")];
      }
      counts.preserved += 1;
      return [call.id, "保持有效", "新旧契约下都有效"];
    });

    const validOld = counts.preserved + counts.broken;
    const compatible = breakingRules.length === 0 && counts.broken === 0;
    let gateStatus = "未启用";
    let gateDetail = "不加 --strict 时，无论报告结果如何，CLI 都以 0 退出。";
    if (v.strictGate) {
      gateStatus = compatible ? "通过" : "失败";
      gateDetail = compatible ? "严格闸门通过，退出码为 0。" : "严格闸门失败，退出码为 1。";
    }

    const summaryText = compatible
      ? "旧契约下有效的 " + validOld + " 条调用全部仍然通过。"
      : "旧契约下有效的 " + validOld + " 条调用中，有 " + counts.broken + " 条现在失败，来自 " + breakingRules.length + " 项破坏性变更。另有 " + counts.alreadyInvalid + " 条已保存调用原本就无效，不计为被破坏。";

    return {
      summary: summaryText + gateDetail,
      metrics: [
        { label: "已保存调用", value: sampleCalls.length },
        { label: "保持有效", value: counts.preserved },
        { label: "被破坏", value: counts.broken },
        { label: "原本无效", value: counts.alreadyInvalid },
        { label: "CI 闸门", value: gateStatus }
      ],
      bars: [
        { label: "保持有效", value: counts.preserved, max: sampleCalls.length },
        { label: "被破坏", value: counts.broken, max: sampleCalls.length },
        { label: "原本无效", value: counts.alreadyInvalid, max: sampleCalls.length }
      ],
      columns: ["调用", "结果", "原因"],
      rows: rows
    };
  };

  const steps1 = [
    { label: "输入契约", detail: "load_contract、validate_call" },
    { label: "校验契约与调用", detail: "解析 schema 字典，确认已保存调用符合原始规范。" },
    { label: "观察结果", detail: "比较差异之前，就拒绝格式错误的 schema 和无效的历史载荷。" }
  ];

  const steps2 = [
    { label: "比较契约", detail: "classify_changes" },
    { label: "分类变更", detail: "区分破坏性变更（新增必填、收窄类型或枚举）和兼容的扩展。" },
    { label: "观察结果", detail: "得到结构化的变更分类，标出严重程度和受影响的属性路径。" }
  ];

  const steps3 = [
    { label: "生成式测试", detail: "generate_counterexamples、replay_calls" },
    { label: "合成反例", detail: "生成满足旧契约、但无法通过新契约的最小载荷，并回放已保存调用。" },
    { label: "观察结果", detail: "得到具体的破坏性夹具和精确的历史失败率。" }
  ];

  const steps4 = [
    { label: "CI 闸门与导出", detail: "build_report、export_fixtures、cli" },
    { label: "生成 CI 报告", detail: "输出机器可读的 JSON 迁移报告，并按兼容性以状态 0 或 1 退出。" },
    { label: "观察结果", detail: "没有显式迁移适配器时，阻止破坏性 schema 迁移上线。" }
  ];

  window.AIFSProjectFigures.register("pj-tool-contract-migration-checker-1", {
    title: "加载带版本的工具契约与已保存调用",
    steps: steps1,
    caption: "比较差异之前，先校验契约和历史调用。",
    lab: { controls, calculate }
  });

  window.AIFSProjectFigures.register("pj-tool-contract-migration-checker-2", {
    title: "分类受支持的 schema 变更",
    steps: steps2,
    caption: "区分破坏性和兼容的 schema 修改。",
    lab: { controls, calculate }
  });

  window.AIFSProjectFigures.register("pj-tool-contract-migration-checker-3", {
    title: "生成并回放破坏性调用反例",
    steps: steps3,
    caption: "合成反例并回放历史调用记录。",
    lab: { controls, calculate }
  });

  window.AIFSProjectFigures.register("pj-tool-contract-migration-checker-4", {
    title: "导出迁移夹具与兼容性闸门",
    steps: steps4,
    caption: "在 CI 流水线中自动执行迁移检查。",
    lab: { controls, calculate }
  });
})();
