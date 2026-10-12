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
      text("grades", "相关性标注（id:grade）", "a:3,b:1,c:0"),
      text("order", "候选排序", "b,a,c"),
      text("baseline", "基线排序", "c,b,a"),
      number("k", "截断位置 k", 3, 1, 6),
    ],
    calculate(v) {
      const grade = {};
      v.grades.split(",").forEach((part) => {
        const [id, raw] = part.trim().split(":");
        const n = Number(raw);
        if (!id || !Number.isInteger(n) || n < 0 || n > 3 || id in grade)
          throw Error("ID 必须唯一，等级必须在 0..3 之间");
        grade[id] = n;
      });
      const rank = (s) => {
        const ids = s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        if (unique(ids).length !== ids.length)
          throw Error("排序包含重复 ID");
        return ids;
      };
      const ideal = Object.values(grade)
        .sort((a, b) => b - a)
        .slice(0, v.k)
        .reduce((sum, n, i) => sum + (2 ** n - 1) / Math.log2(i + 2), 0);
      const calculate = (ids) => {
        const top = ids.slice(0, v.k),
          hits = top.filter((id) => grade[id] > 0).length,
          relevant = Object.values(grade).filter((n) => n > 0).length;
        const dcg = top.reduce(
          (sum, id, i) => sum + (2 ** (grade[id] || 0) - 1) / Math.log2(i + 2),
          0,
        );
        return {
          precision: hits / v.k,
          recall: relevant ? hits / relevant : 0,
          dcg,
          ndcg: ideal ? dcg / ideal : 0,
          unjudged: top.filter((id) => !(id in grade)).length,
        };
      };
      const ids = rank(v.order),
        a = calculate(rank(v.baseline)),
        b = calculate(ids);
      return {
        summary:
          stage === 4
            ? "NDCG 变化 " +
              (b.ndcg - a.ndcg).toFixed(4) +
              (b.ndcg < a.ndcg ? " = 退步" : "")
            : stage === 1
              ? "已校验排序证据的唯一性。"
              : "根据可编辑的排序计算折损增益。",
        metrics: Object.entries(b).map(([key, val]) =>
          metric(({ precision: "精确率", recall: "召回率", dcg: "折损累积增益（DCG）", ndcg: "归一化折损累积增益（NDCG）", unjudged: "未标注数" })[key], typeof val === "number" ? Number(val.toFixed(4)) : val),
        ),
        bars: [
          bar("基线 NDCG", a.ndcg, 1),
          bar("候选 NDCG", b.ndcg, 1),
        ],
        columns: ["排名", "文档", "相关性", "折损增益"],
        rows: ids
          .slice(0, v.k)
          .map((id, i) => [
            i + 1,
            id,
            grade[id] ?? "unjudged",
            ((2 ** (grade[id] || 0) - 1) / Math.log2(i + 2)).toFixed(4),
          ]),
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-retrieval-evaluation-lab-1",
    Object.assign(
      {
        title: "校验排序与分级相关性标注",
        steps: [
          {
            label: "排序",
            detail:
              "排序是由唯一文档 ID 组成的有序列表。Orchard 恢复查询的证据有不同等级：恢复流程比发布说明中的一笔带过更有用。",
          },
          {
            label: "相关性标注",
            detail:
              "标注：restore=3, release=1, cafe=0\n排序：[release, restore, restore] -> 重复错误",
          },
          {
            label: "契约",
            detail:
              "评分前先校验排序与标注。明确展示未标注文档，不能假定它们已经审查且被判为不相关。",
          },
        ],
        caption:
          "语料库刚新增笔记时，缺少相关性标注意味着什么？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-retrieval-evaluation-lab-2",
    Object.assign(
      {
        title: "计算前 k 项的精确率与召回率",
        steps: [
          {
            label: "截断位置",
            detail:
              "当 k=2，检索到一篇相关笔记和一篇不相关笔记，精确率为 1/2。若标注中有两篇相关笔记，召回率也为 1/2。两个指标的分母来自不同集合。",
          },
          {
            label: "命中",
            detail:
              "ranking[:2]=[restore,cafe]\n相关标注={restore,release}\nprecision=1/2; recall=1/2",
          },
          {
            label: "分母",
            detail:
              "只有正相关性标注才算相关，不能只看标注映射中是否存在键。即使返回结果不足，也保留给定的截断位置。",
          },
        ],
        caption:
          "为什么增大 k 可能提高召回率，却降低精确率？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-retrieval-evaluation-lab-3",
    Object.assign(
      {
        title: "奖励排在前列的有用证据",
        steps: [
          {
            label: "排名",
            detail:
              "将更强证据放在前面。增益分别为 3 和 1 时，即使检索文档集合不变，较弱来源排在前面也会降低折损增益。",
          },
          {
            label: "折损",
            detail:
              "排序 [release,restore]：DCG=1 + 7/log2(3)=5.4165\n理想排序 [restore,release]：DCG=7 + 1/log2(3)=7.6309\nNDCG=0.7098",
          },
          {
            label: "归一化",
            detail:
              "使用增益 2^relevance-1 和折损 log2(rank+1)。以相同截断位置下的最佳标注排序作归一化。",
          },
        ],
        caption: "如果所有标注增益都为零，NDCG 应返回什么？",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-retrieval-evaluation-lab-4",
    Object.assign(
      {
        title: "逐个查询比较系统",
        steps: [
          {
            label: "对齐",
            detail:
              "给定的三查询 fixture 改善了 release 与 café 的检索，却让 restore 检索变差。按查询级差值排序，先展示丢失的恢复证据，再看汇总。",
          },
          {
            label: "测量",
            detail:
              "release：改善\ncafe：改善\nrestore：退步\n--fail-on-regression -> 退出码 1",
          },
          {
            label: "汇总",
            detail:
              "按标注查询 ID 对齐系统。每个差值都附上前后排序 ID；单个数值无法指出哪个来源移动了。",
          },
        ],
        caption: "平均 NDCG 上升时，哪个查询最应优先审查？",
      },
      { lab: buildLab(4) },
    ),
  );
})();
