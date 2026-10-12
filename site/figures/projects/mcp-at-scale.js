(function () {
  "use strict";
  const controls = [
    { key: "query", label: "工具查询", type: "text", value: "pods count" },
    {
      key: "budget",
      label: "序列化工具数组预算",
      type: "range",
      value: 700,
      min: 0,
      max: 3000,
      step: 1,
    },
    {
      key: "families",
      label: "资源类别数",
      type: "range",
      value: 3,
      min: 1,
      max: 50,
      step: 1,
    },
    {
      key: "initialized",
      label: "客户端已初始化",
      type: "checkbox",
      value: true,
    },
  ];
  const calculate = function (v, stepIndex) {
    const resources = ["pods", "logs", "metrics", "jobs", "nodes", "services"];
    const terms = new Set(v.query.toLowerCase().match(/[a-z0-9]+/g) || []);
    const tools = [];
    for (const r of resources.slice(0, Math.min(v.families, 6)))
      for (const op of ["list", "get", "count", "search", "describe"]) {
        const tool = {
          name: r + "_" + op,
          description: op + " " + r,
          inputSchema: {
            type: "object",
            properties:
              op === "get"
                ? { name: { type: "string" } }
                : op === "search"
                  ? { query: { type: "string" } }
                  : {},
          },
        };
        const score = [r, op].filter((x) => terms.has(x)).length;
        if (score) tools.push({ tool, score });
      }
    tools.sort(
      (a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name),
    );
    const selected = [];
    for (const { tool } of tools) {
      if (
        JSON.stringify([...selected, tool]).length <= v.budget &&
        selected.length < 5
      )
        selected.push(tool);
    }
    const used = selected.length ? JSON.stringify(selected).length : 0;
    return {
      summary: v.initialized
        ? "调用工具前先选择元数据"
        : "协议错误 -32002：使用工具前先初始化",
      metrics: [
        { label: "生成的注册工具数", value: v.families * 5 },
        { label: "每页 32 个工具的页数", value: Math.ceil((v.families * 5) / 32) },
        { label: "选中 schema 的字符数", value: used },
      ],
      bars: [
        { label: "已用字符预算", value: used, max: v.budget || 1 },
      ],
      columns: ["选中的工具", "schema 字符数"],
      rows: selected.map((x) => [x.name, JSON.stringify(x).length]),
    };
  };
  window.AIFSProjectFigures.register(
    "pj-mcp-at-scale-1",
    Object.assign(
      {
        title: "构建 250 个只读工具的目录",
        steps: [
          {
            label: "输入",
            detail:
              "为 50 种资源分别创建五个范围明确的读取操作。",
          },
          {
            label: "转换",
            detail:
              "为 50 种资源分别创建五个范围明确的读取操作。名称和 schema 保持稳定；执行时读取注入的清单，而不是连接集群。工具 schema 精确定义接受的键和值，未知参数不会意外进入处理器。",
          },
          {
            label: "验证",
            detail: "生成的目录恰好包含 250 个不同的工具。",
          },
        ],
        caption: "生成的目录恰好包含 250 个不同的工具。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-mcp-at-scale-2",
    Object.assign(
      {
        title: "在明确的上下文预算内选择工具",
        steps: [
          {
            label: "输入",
            detail: "将工具放入上下文窗口前，先对元数据排序。",
          },
          {
            label: "转换",
            detail:
              "将工具放入上下文窗口前，先对元数据排序。统计各选中 schema 的紧凑 JSON 实际字符数，到达明确预算就停止。这是字符预算，不是模型 token 估算；不要混淆单位。同分时按稳定名称排序，使发现结果可复现。",
          },
          {
            label: "验证",
            detail:
              "查询 pods count 会优先选择 pods_count，且绝不超过序列化预算。",
          },
        ],
        caption:
          "查询 pods count 会优先选择 pods_count，且绝不超过序列化预算。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-mcp-at-scale-3",
    Object.assign(
      {
        title: "通过 stdio 实现带初始化的 JSON-RPC",
        steps: [
          {
            label: "输入",
            detail:
              "协议有生命周期：协商版本、接收 initialized 通知，再列出或调用工具。",
          },
          {
            label: "转换",
            detail:
              "协议有生命周期：协商版本、接收 initialized 通知，再列出或调用工具。通知没有响应。区分传输错误与工具执行错误，保留请求 ID，并对目录分页，而不是一次返回全部 250 个 schema。",
          },
          {
            label: "验证",
            detail:
              "初始化前调用返回 -32002；初始化后的 tools/list 返回 32 个工具和游标。",
          },
        ],
        caption:
          "初始化前调用返回 -32002；初始化后的 tools/list 返回 32 个工具和游标。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-mcp-at-scale-4",
    Object.assign(
      {
        title: "通过协议分页审计目录覆盖",
        steps: [
          {
            label: "输入",
            detail: "将分页视为客户端可见的契约。",
          },
          {
            label: "转换",
            detail:
              "将分页视为客户端可见的契约。通过处理器遍历每一页，跟踪跨页重复名称。有限页数防护可以发现意外的游标循环。此审计验证协议清单；最终的类型化客户端还会测试独立的操作系统进程边界。",
          },
          {
            label: "验证",
            detail:
              "完整遍历 8 页会返回 250 个不同的名称。",
          },
        ],
        caption:
          "完整遍历 8 页会返回 250 个不同的名称。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-mcp-at-scale-5",
    Object.assign(
      {
        title: "类型化 stdio 边界",
        steps: [
          {
            label: "编码",
            detail: "写入换行分隔、ID 唯一的请求。",
          },
          {
            label: "进程",
            detail:
              "Python 在独立进程中处理初始化和工具调用。",
          },
          {
            label: "关联",
            detail:
              "解析并验证 ID、通知、超时和输出预算。",
          },
        ],
        caption: "Node 测试覆盖实际构建的进程边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
