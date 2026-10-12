(function () {
  "use strict";
  const controls = [
    { key: "question", label: "问题", type: "text", value: "cache expire" },
    {
      key: "text",
      label: "来源文本",
      type: "text",
      value: "Cache entries expire after sixty seconds. Bananas are yellow.",
    },
    {
      key: "quote",
      label: "提议的引文",
      type: "text",
      value: "Bananas are yellow.",
    },
    {
      key: "size",
      label: "分块字符数",
      type: "range",
      value: 35,
      min: 10,
      max: 150,
      step: 1,
    },
    {
      key: "overlap",
      label: "分块重叠字符数",
      type: "range",
      value: 5,
      min: 0,
      max: 30,
      step: 1,
    },
  ];
  const calculate = function (v, stepIndex) {
    const words = (s) => new Set(s.toLowerCase().match(/\w+/g) || []);
    const terms = words(v.question),
      qwords = words(v.quote),
      matches = [...terms].filter((x) => qwords.has(x)).length;
    const offset = v.text.indexOf(v.quote),
      valid = offset >= 0 && v.quote.trim().length > 0;
    if (v.overlap >= v.size)
      return {
        summary: "拒绝大于或等于分块大小的重叠长度",
        metrics: [],
        bars: [],
      };
    const chunks = [];
    for (let start = 0; start < v.text.length; start += v.size - v.overlap) {
      const end = Math.min(v.text.length, start + v.size);
      chunks.push([start, end, v.text.slice(start, end)]);
      if (end === v.text.length) break;
    }
    return {
      summary: !valid
        ? "拒绝无来源支持的引文"
        : matches === 0
          ? "存在逐字引文，但与查询的相关性仍需审查"
          : "逐字引文与查询存在词汇重叠",
      metrics: [
        { label: "引文起始位置", value: offset },
        { label: "获得支持的查询词数", value: matches },
      ],
      bars: [
        { label: "匹配的查询词数", value: matches, max: terms.size || 1 },
      ],
      columns: ["起点", "终点", "分块"],
      rows: chunks,
    };
  };
  window.AIFSProjectFigures.register(
    "pj-doc-qa-with-citations-1",
    Object.assign(
      {
        title: "加载本地文档并保留稳定来源信息",
        steps: [
          {
            label: "输入",
            detail:
              "在检索前保留来源标识、内容哈希和精确偏移量。",
          },
          {
            label: "转换",
            detail:
              "在检索前保留来源标识、内容哈希和精确偏移量。字符窗口是刻意保持简单的基线：重叠能保留边界附近的上下文，但不会创造新证据。加载器拒绝越出根目录的符号链接，防止文档扫描悄悄读取其他目录。",
          },
          {
            label: "验证",
            detail:
              "当 size=4、overlap=1 时，abcdef 的第二个重叠分块从偏移量 3 开始。",
          },
        ],
        caption:
          "当 size=4、overlap=1 时，abcdef 的第二个重叠分块从偏移量 3 开始。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-doc-qa-with-citations-2",
    Object.assign(
      {
        title: "用可检查的关键词得分排序分块",
        steps: [
          {
            label: "输入",
            detail:
              "词频通过对数趋于饱和，文档频率则降低常见词的权重。",
          },
          {
            label: "转换",
            detail:
              "词频通过对数趋于饱和，文档频率则降低常见词的权重。返回包含得分的完整分块契约，而不只是文本，因为下一阶段需要来源偏移量。这个词汇基线会漏掉同义词；添加嵌入（embedding）服务前先测量它的表现。",
          },
          {
            label: "验证",
            detail:
              "socket 查询选中包含 socket 的分块，未知词则触发弃答。",
          },
        ],
        caption:
          "socket 查询选中包含 socket 的分块，未知词则触发弃答。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-doc-qa-with-citations-3",
    Object.assign(
      {
        title: "只接受有检索片段支持的答案",
        steps: [
          {
            label: "输入",
            detail:
              "要求模型选择逐字引文和来源 ID，再校验两者。",
          },
          {
            label: "转换",
            detail:
              "要求模型选择逐字引文和来源 ID，再校验两者。引用的子串提供可核查片段，但不保证来源内容真实。检索为空时直接明确弃答，不调用模型。若后续写作采用转述，就需要另一种支持性检查。",
          },
          {
            label: "验证",
            detail:
              "模型响应若含有被引分块中不存在的词，就会被拒绝。",
          },
        ],
        caption:
          "模型响应若含有被引分块中不存在的词，就会被拒绝。",
      },
      { lab: { controls, calculate } },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-doc-qa-with-citations-4",
    Object.assign(
      {
        title: "使用框架分块器并保留偏移量",
        steps: [
          {
            label: "输入",
            detail:
              "适配器保留从零实现的检索与答案校验器。",
          },
          {
            label: "转换",
            detail:
              "适配器保留从零实现的检索与答案校验器。可选的 LangChain 路径提供递归分块和假模型接口，再将每个分块还原为精确来源偏移量。分块器若改写文本，就拒绝结果，不能编造来源信息。遇到重复的重叠子串，搜索游标应前进一个位置，而非整个分块长度。",
          },
          {
            label: "验证",
            detail:
              "框架分块转换为与基线相同的来源片段契约。",
          },
        ],
        caption:
          "框架分块转换为与基线相同的来源片段契约。",
      },
      { lab: { controls, calculate } },
    ),
  );
})();
