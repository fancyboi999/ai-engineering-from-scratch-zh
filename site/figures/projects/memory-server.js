(function () {
  "use strict";
  const controls = [
    { key: "query", label: "查询", type: "text", value: "cache policy" },
    {
      key: "text",
      label: "记忆文本",
      type: "text",
      value: "cache policy expires quickly",
    },
    {
      key: "revision",
      label: "已存修订号",
      type: "range",
      value: 1,
      min: 0,
      max: 5,
      step: 1,
    },
    {
      key: "expected",
      label: "调用者预期修订号",
      type: "range",
      value: 1,
      min: 0,
      max: 5,
      step: 1,
    },
    {
      key: "namespace",
      label: "命名空间不同",
      type: "checkbox",
      value: false,
    },
  ];
  const calculate = function (v, stepIndex) {
    const tokens = (s) => s.toLowerCase().match(/[a-z0-9]+/g) || [];
    const embed = (s) => {
      const out = Array(32).fill(0);
      for (const word of tokens(s)) {
        let h = 2166136261;
        for (const c of word) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
        out[(h >>> 0) % 32]++;
      }
      return out;
    };
    const a = embed(v.query),
      b = embed(v.text),
      dot = a.reduce((s, x, i) => s + x * b[i], 0),
      norm = Math.sqrt(
        a.reduce((s, x) => s + x * x, 0) * b.reduce((s, x) => s + x * x, 0),
      ),
      cos = norm ? dot / norm : 0;
    const terms = new Set(tokens(v.query)),
      words = new Set(tokens(v.text)),
      lex = terms.size
        ? [...terms].filter((x) => words.has(x)).length / terms.size
        : 0,
      score = v.namespace ? 0 : 0.6 * lex + 0.4 * cos;
    return {
      summary:
        v.expected === v.revision
          ? "写入可追加修订号 " + (v.revision + 1)
          : "追加前拒绝过期写入",
      metrics: [
        { label: "词项覆盖率", value: lex.toFixed(3) },
        { label: "特征哈希余弦相似度", value: cos.toFixed(3) },
        { label: "返回得分", value: score.toFixed(3) },
      ],
      bars: [
        {
          label: "词项贡献",
          value: v.namespace ? 0 : 0.6 * lex,
          max: 1,
        },
        {
          label: "余弦贡献",
          value: v.namespace ? 0 : 0.4 * cos,
          max: 1,
        },
      ],
    };
  };
  window.AIFSProjectFigures.register(
    "pj-memory-server-1",
    Object.assign(
      {
        title: "将文本、命名空间和来源一并保存",
        steps: [
          { label: "输入契约", detail: "validateMemory, embed" },
          {
            label: "将文本、命名空间和来源一并保存",
            detail:
              "每条记忆都需要受限的 ID、命名空间、文本和来源定位符。绝不返回脱离来源的字符串。小型特征哈希嵌入将规范化词项映射到固定向量；它是确定性的词项投影，不是预训练语义模型。哈希碰撞是预期现象，这也是检索仍需保留词项证据的原因。",
          },
          {
            label: "观察结果",
            detail:
              "向量有 32 个桶，每条记录同时保留可读的来源定位符。",
          },
        ],
        caption: "继续前进，在下一次产生副作用前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-memory-server-2",
    Object.assign(
      {
        title: "串行执行带修订号的写入",
        steps: [
          {
            label: "输入契约",
            detail: "MemoryStore.put, MemoryStore.list",
          },
          {
            label: "串行执行带修订号的写入",
            detail:
              "加载带版本的事件日志，重建每个 namespace/id 对的最新记录。更新必须指定预期修订号。串行执行写入，让两个从修订号零开始竞争的调用者不能同时成功。先追加，再改变内存映射。这是单进程存储：追加完成不保证断电后的持久性；多个服务进程需要外部锁或数据库。",
          },
          {
            label: "观察结果",
            detail:
              "两个并发创建会返回一次成功和一次修订冲突；重新打开后可恢复成功的记录。",
          },
        ],
        caption: "继续前进，在下一次产生副作用前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-memory-server-3",
    Object.assign(
      {
        title: "在真实 Rust 进程中为向量评分",
        steps: [
          {
            label: "输入契约",
            detail: "cosineScores, MemoryStore.search",
          },
          {
            label: "在真实 Rust 进程中为向量评分",
            detail:
              "用标准 Rust 工具链编译 score.rs，通过 stdin 发送查询与文档向量。计算余弦相似度，零范数向量返回零。将 60% 的查询词项覆盖率与 40% 的余弦得分组合，同分时按 ID 排序。跨进程前验证维度和有限数值。Rust 二进制编译到私有临时目录。",
          },
          {
            label: "观察结果",
            detail:
              "Rust 计算内核为相同向量打分 1.0，搜索会返回匹配的记忆并完整保留来源。",
          },
        ],
        caption: "继续前进，在下一次产生副作用前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-memory-server-4",
    Object.assign(
      {
        title: "提供 REST 和 MCP 工具",
        steps: [
          { label: "输入契约", detail: "createMemoryServer" },
          {
            label: "提供 REST 和 MCP 工具",
            detail:
              "绑定本地服务，要求 bearer token，限制请求体大小，并通过 JSON-RPC POST 实现 health、REST 写入/搜索及 MCP 初始化/工具子集。工具执行失败在成功的 JSON-RPC 响应中使用 isError；未知协议方法使用 JSON-RPC 错误。这是教学子集，不含会话、流式传输或生产级认证。测试实际 HTTP 字节，防止序列化丢失来源或修订号。",
          },
          {
            label: "观察结果",
            detail:
              "演示通过回环地址执行实际 REST 写入和 MCP 搜索，然后打印来源、修订号和得分。",
          },
        ],
        caption: "继续前进，在下一次产生副作用前检查边界。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
