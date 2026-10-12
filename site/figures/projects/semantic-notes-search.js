(function () {
  "use strict";
  const number = (key, label, value, min = 0, max = 100, step = 1) => ({
    key,
    label,
    type: "range",
    value,
    min,
    max,
    step,
  });
  const text = (key, label, value) => ({ key, label, type: "text", value });
  const check = (key, label, value) => ({
    key,
    label,
    type: "checkbox",
    value,
  });
  const select = (key, label, value, options) => ({
    key,
    label,
    type: "select",
    value,
    options: options.map((x) => ({ value: x, label: x })),
  });
  const metric = (label, value) => ({ label, value });
  const bar = (label, value, max) => ({ label, value, max });
  const words = (s) =>
    s
      .normalize("NFC")
      .toLowerCase()
      .match(/[\p{L}\p{N}_]+/gu) || [];
  const unique = (xs) => [...new Set(xs)];
  const finiteList = (s) =>
    s.split(",").map((x) => {
      const n = Number(x.trim());
      if (!Number.isFinite(n))
        throw Error("请使用逗号分隔的有限数值");
      return n;
    });

  const buildLab = (stage) => ({
    controls: [
      text("query", "查询", "release replicas"),
      text(
        "notes",
        "笔记（用 | 分隔）",
        "deploy replicas | restore backups | café guest wifi",
      ),
      text("alias", "一条别名映射（from=to）", "release=deploy"),
      number("k", "结果数 k", 2, 1, 3),
      number("expected", "预期笔记编号", 1, 1, 3),
    ],
    calculate(v) {
      const [from, to] = v.alias.split("=");
      const tokens = (s) => words(s).map((w) => (w === from ? to : w));
      const docs = v.notes.split("|").map(tokens);
      const df = Object.create(null);
      docs.forEach((d) => unique(d).forEach((t) => (df[t] = (df[t] || 0) + 1)));
      const idf = Object.create(null);
      for (const [term, count] of Object.entries(df)) {
        idf[term] = Math.log((1 + docs.length) / (1 + count)) + 1;
      }
      const vector = (terms) => {
        const counts = Object.create(null);
        terms.forEach((t) => {
          if (idf[t]) counts[t] = (counts[t] || 0) + idf[t];
        });
        const norm = Math.sqrt(
          Object.values(counts).reduce((s, n) => s + n * n, 0),
        );
        const weights = Object.create(null);
        for (const [term, count] of Object.entries(counts)) {
          weights[term] = count / norm;
        }
        return weights;
      };
      const q = vector(tokens(v.query));
      const ranked = docs
        .map((doc, i) => {
          const d = vector(doc),
            score = Object.entries(q).reduce(
              (sum, [t, w]) => sum + w * (d[t] || 0),
              0,
            );
          return { id: i + 1, score, matched: unique(doc).filter((t) => q[t]) };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || a.id - b.id)
        .slice(0, v.k);
      return {
        summary:
          stage === 1
            ? "规范化查询 token：" + tokens(v.query).join(", ")
            : stage === 4
              ? "预期笔记 " +
                v.expected +
                (ranked.some((x) => x.id === v.expected)
                  ? " 已检索到"
                  : " 未检索到")
              : "根据你的笔记计算稀疏向量余弦得分。",
        metrics: [
          metric("笔记数", docs.length),
          metric("查询词数", Object.keys(q).length),
          metric(
            "前 k 项是否命中",
            ranked.some((x) => x.id === v.expected),
          ),
        ],
        bars: ranked.map((x) => bar("笔记 " + x.id, x.score, 1)),
        columns:
          stage === 2
            ? ["词项", "文档频率", "IDF"]
            : ["笔记", "得分", "匹配词项"],
        rows:
          stage === 2
            ? Object.entries(df).map(([t, n]) => [t, n, idf[t].toFixed(4)])
            : ranked.map((x) => [
                x.id,
                x.score.toFixed(4),
                x.matched.join(", "),
              ]),
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-semantic-notes-search-1",
    Object.assign(
      {
        title: "规范化笔记并保留标识",
        steps: [
          {
            label: "文本",
            detail:
              "Orchard 运维人员可能用不同 Unicode 编码输入 café。对文本和别名键同时执行大小写折叠与 NFC 规范化，使等价拼写共享 token。一个别名就是一次明确的词汇替换。",
          },
          {
            label: "大小写折叠",
            detail:
              '"CAFE\\u0301" -> ["café"]\n别名 release -> deploy\n"release café" -> ["deploy","café"]',
          },
          {
            label: "别名",
            detail:
              "在 Unicode 单词正则匹配前先规范化，否则组合标记可能丢失。不要递归展开别名形成循环。",
          },
        ],
        caption:
          "什么情况下将 release 映射到 deploy 会损害检索而不是帮助检索？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-semantic-notes-search-2",
    Object.assign(
      {
        title: "按文档中的稀有程度加权词项",
        steps: [
          {
            label: "计数",
            detail:
              "稀有运维词比常见项目名更能区分笔记。每篇笔记对文档频率只计一次，将词频乘以平滑后的稀有度，再规范化每个稀疏向量。",
          },
          {
            label: "加权",
            detail:
              "N=3; df(orchard)=3 -> idf=1\ndf(restore)=1 -> idf=log(4/2)+1=1.6931",
          },
          {
            label: "规范化",
            detail:
              "用每篇文档的单词集合计算文档频率。在一篇笔记中重复 orchard 十次，不代表它出现在十篇文档中。",
          },
        ],
        caption:
          "比较短笔记与长操作手册前，为什么要规范化向量长度？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-semantic-notes-search-3",
    Object.assign(
      {
        title: "用稳定的同分规则排序查询结果",
        steps: [
          {
            label: "查询",
            detail:
              "CLI 为你自己的 Markdown 文件夹返回路径、预览和匹配的 token。查询与笔记向量使用相同的别名映射和 IDF 表；未知词不贡献权重。",
          },
          {
            label: "点积",
            detail:
              "query=release replicas\n别名 release=deploy\n匹配笔记：release.md；匹配词项：deploy（文件 fixture 中 replica 为单数）",
          },
          {
            label: "前 k 项",
            detail:
              "使用索引的 IDF 计算查询向量，再与笔记向量求点积。同分时按文档 ID 排序。",
          },
        ],
        caption:
          "如果笔记使用了别名表中没有的同义词，空结果意味着什么？",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-semantic-notes-search-4",
    Object.assign(
      {
        title: "添加嵌入（embedding）前先测量检索效果",
        steps: [
          {
            label: "标注",
            detail:
              "添加其他检索后端前，先测量目标笔记是否出现在前列。给定笔记涵盖部署、恢复和访客 Wi-Fi，因此一个别名可能帮助某个主题，却损害另一个主题。",
          },
          {
            label: "检索",
            detail:
              "标注：restore -> backup.md；café -> café.md\nhits=2,total=2,k=1 -> recall=1\n添加误导性别名 -> 检查变化后的命中 ID",
          },
          {
            label: "得分",
            detail:
              "标注查询应与调参示例分离。评估时调用真实搜索函数，不要另写一个评分器。",
          },
        ],
        caption:
          "在声称检索对初学者更好之前，你会收集多少条新标注？",
      },
      { lab: buildLab(4) },
    ),
  );
})();
