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
      text("source", "证据", "Alice defeated Bob after 2 retries"),
      text("claim", "主张", "Bob defeated Alice after 2 retries"),
      check("cited", "引用可解析", true),
      number("threshold", "词汇匹配阈值", 0.8, 0, 1, 0.05),
      text("deltas", "配对得分差值", "5,5,-30"),
    ],
    calculate(v) {
      const stop = new Set(["a", "an", "the", "is", "of", "and"]);
      const c = words(v.claim).filter((x) => !stop.has(x)),
        s = words(v.source).filter((x) => !stop.has(x));
      const neg = (x) =>
        unique(x.filter((t) => ["no", "not", "never", "cannot"].includes(t)))
          .sort()
          .join();
      let pos = 0;
      const ordered = c.every((w) => {
        let at = s.indexOf(w, pos);
        if (at < 0) return false;
        pos = at + 1;
        return true;
      });
      const numeric = unique(v.claim.match(/\d+(?:\.\d+)?/g) || []).every((n) =>
        (v.source.match(/\d+(?:\.\d+)?/g) || []).includes(n),
      );
      const overlap = c.length
        ? unique(c).filter((t) => s.includes(t)).length / unique(c).length
        : 0;
      const reverse = unique(c).every((t) => s.includes(t)) && !ordered;
      const reason = !c.length
        ? "empty"
        : !v.cited
          ? "uncited"
          : neg(c) !== neg(s)
            ? "negation"
            : !numeric
              ? "number"
              : reverse
                ? "order_requires_review"
                : "lexical_overlap";
      const score = reason === "lexical_overlap" ? overlap : 0,
        kept = score >= v.threshold && c.length > 0 && v.cited;
      const d = finiteList(v.deltas);
      return {
        summary:
          stage === 4
            ? "配对变化均值 " +
              (d.reduce((a, b) => a + b, 0) / d.length).toFixed(2) +
              "；退步仍明确展示。"
            : ({ empty: "空主张（empty）", uncited: "无引用（uncited）", negation: "否定词不一致（negation）", number: "数值不一致（number）", order_requires_review: "顺序需审查（order_requires_review）", lexical_overlap: "词汇重叠（lexical_overlap）" })[reason] + "：词汇检查无法证明真假。",
        metrics: [
          metric("原始词汇重叠率", overlap.toFixed(3)),
          metric("经守卫检查的得分", score.toFixed(3)),
          metric(
            "状态",
            !c.length ? "no_evidence" : kept ? "lexical_match" : "needs_review",
          ),
          metric("缺少参考标注", "召回率／覆盖率不可用"),
        ],
        bars:
          stage === 4
            ? d.map((x, i) => bar("问题 " + (i + 1), x))
            : [
                bar("词汇重叠率", overlap, 1),
                bar("经守卫检查的支持度", score, 1),
              ],
        columns: ["检查项", "结果"],
        rows: [
          ["引用", v.cited],
          ["数值一致", numeric],
          ["顺序匹配", ordered],
          ["需要人工审查", !kept],
        ],
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-report-judge-1",
    Object.assign(
      {
        title: "解析主张与来源引用",
        steps: [
          {
            label: "输入",
            detail:
              "逐句审查事实陈述。Orchard 有一条有来源的重试上限陈述和一条无关的部署主张；一个有效引用标记不能让整段通过。",
          },
          {
            label: "转换",
            detail:
              "Worker A invokes worker B [S1]. Retry limit is 99 [S2].\n主张 1 -> 引用 [S1]\n主张 2 -> 引用 [S2]",
          },
          {
            label: "验证",
            detail:
              "从主张文本移除标记前先提取它们。去除重复标记，但保留句子标识。",
          },
        ],
        caption:
          "证据映射中不存在 [S2] 时，应如何处理？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-report-judge-2",
    Object.assign(
      {
        title: "平均得分前先检查证据",
        steps: [
          {
            label: "输入",
            detail:
              '词汇重叠无法捕捉关系。主张“Bob defeated Alice”与“Alice defeated Bob”用词完全相同，却颠倒了谁做了什么。拒绝这种顺序不匹配并交给人工审查，不能把这项检查称为语义理解。',
          },
          {
            label: "转换",
            detail:
              "来源：Alice defeated Bob\n主张：Bob defeated Alice\n词汇重叠率=1；顺序检查=false\n结果：order_requires_review",
          },
          {
            label: "验证",
            detail:
              "通过否定词和数值守卫后，才比较内容 token 的顺序。这个保守规则可能拒绝有效转述，因此要明确显示原因。",
          },
        ],
        caption:
          "写一个会被词汇规则拒绝的真实转述。人工判断需要什么证据？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-report-judge-3",
    Object.assign(
      {
        title: "报告精确率、覆盖率与来源召回率",
        steps: [
          {
            label: "输入",
            detail:
              "空报告没有证据，得分为零。召回率和事实覆盖率需要标注；缺少标注时它们不可用，而不是自动满分。只有获得支持的主张才能计入来源召回率或覆盖率。",
          },
          {
            label: "转换",
            detail:
              "空主张 -> 得分 0，状态 no_evidence\n3 个词汇匹配，无参考标注 -> recall null, coverage null\n只使用可用指标计算得分",
          },
          {
            label: "验证",
            detail:
              "统一记录有支持的主张，并从这个集合推导所有支持证据指标。不要让悬空引用虚增来源召回率。",
          },
        ],
        caption:
          "为什么词汇匹配得分为 100，召回率却仍不可用？",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-report-judge-4",
    Object.assign(
      {
        title: "用自助法区间比较配对修订",
        steps: [
          {
            label: "输入",
            detail:
              "比较报告修改前后的同一组问题。简单问题上的提升可能掩盖严重退步；在自助法区间旁保留每个问题的差值。",
          },
          {
            label: "转换",
            detail:
              "基线：q1=80,q2=70,q3=90\n候选：q1=85,q2=75,q3=60\n差值：+5,+5,-30；q3 仍然退步",
          },
          {
            label: "验证",
            detail:
              "用确定性种子对配对差值重采样。区间描述的是当前标注样本，不代表所有未来报告的事实准确率。",
          },
        ],
        caption:
          "再复制一份 q1 能创造独立证据吗？",
      },
      { lab: buildLab(4) },
    ),
  );
})();
