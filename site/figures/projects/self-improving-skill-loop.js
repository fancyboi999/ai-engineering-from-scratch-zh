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
        throw Error("请使用逗号分隔的有限数");
      return n;
    });

  const buildLab = (stage) => ({
    controls: [
      text("development", "开发集消息", "Invoice wrong"),
      text("holdout", "留出集消息", "INVOICE wrong"),
      text("groups", "开发集/留出集分组 ID", "june,august"),
      text("baseline", "基线各用例正确性", "0,1,0"),
      text("candidate", "候选各用例正确性", "1,1,1"),
      number("minimum", "最低准确率增益", 0.05, 0, 1, 0.05),
      check("approved", "已批准此确切候选版本", false),
    ],
    calculate(v) {
      const normalize = (s) =>
        s.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
      const [a, b] = v.groups.split(",").map((x) => x.trim());
      const contentLeak = normalize(v.development) === normalize(v.holdout),
        groupLeak = !!a && a === b;
      const old = finiteList(v.baseline),
        now = finiteList(v.candidate);
      if (
        old.length !== now.length ||
        old.concat(now).some((x) => x !== 0 && x !== 1)
      )
        throw Error("请使用等长的 0/1 正确性列表");
      const before = old.reduce((x, y) => x + y, 0) / old.length,
        after = now.reduce((x, y) => x + y, 0) / now.length,
        regressions = old.filter((n, i) => n === 1 && now[i] === 0).length;
      const eligible =
        !contentLeak &&
        !groupLeak &&
        after - before >= v.minimum &&
        !regressions;
      return {
        summary:
          contentLeak || groupLeak
            ? "数据泄漏阻止评估"
            : eligible
              ? v.approved
                ? "候选版本符合条件且已显式批准"
                : "候选版本符合条件；等待针对该版本的批准"
              : "门禁阻止晋升",
        metrics: [
          metric("内容泄漏", contentLeak),
          metric("分组泄漏", groupLeak),
          metric("增益", (after - before).toFixed(3)),
          metric("回归数", regressions),
        ],
        bars: [
          bar("基线准确率", before, 1),
          bar("候选准确率", after, 1),
        ],
        columns: ["用例", "基线是否正确", "候选是否正确"],
        rows: old.map((x, i) => [i + 1, x, now[i]]),
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-self-improving-skill-loop-1",
    Object.assign(
      {
        title: "划分标注用例，避免标识泄漏",
        steps: [
          {
            label: "输入",
            detail:
              "留出集隔离必须依据内容和分组，而不只是 ID。两张不同 ID 的工单可能重复同一条客户消息。先规范化内容并合并相关记录，再将连通分量分配到一个分区。",
          },
          {
            label: "转换",
            detail:
              'ID d1："Invoice wrong"\nID h1："INVOICE   wrong"\n指纹相同 -> 放入同一分区，或拒绝显式拆分',
          },
          {
            label: "验证",
            detail:
              "对连通分量做哈希前，合并重复内容边与分组边。拒绝相同规范化内容对应的冲突标签。",
          },
        ],
        caption:
          "同一客户线程中的两条不同消息，能安全地视为独立样例吗？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-self-improving-skill-loop-2",
    Object.assign(
      {
        title: "执行并评分透明的路由 skill",
        steps: [
          {
            label: "输入",
            detail:
              "路由 skill 是一个透明的有序列表。规则要求所有词项都出现，首个匹配规则胜出。计算准确率前记录每个预期/预测对，让错误成为提案的依据。",
          },
          {
            label: "转换",
            detail:
              '规则 terms=[password,reset], label=access\n"password reset expired" -> access\n"password rejected" -> unknown',
          },
          {
            label: "验证",
            detail:
              "只规范化一次输入词语。空词项集合绝不能成为匹配一切的规则。",
          },
        ],
        caption:
          "前面的宽泛规则遮蔽后面的精确规则时会发生什么？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-self-improving-skill-loop-3",
    Object.assign(
      {
        title: "只根据开发集错误提议规则",
        steps: [
          {
            label: "输入",
            detail:
              "只根据开发集错误提议规则。Invoice 出现在两个 billing 样例中，可以成为规则；同时出现在 billing 和 access 样例中的词项则有歧义。不要将留出集文本传入此函数。",
          },
          {
            label: "转换",
            detail:
              "开发集：invoice wrong; invoice late -> billing\nmin_support=2 -> 候选 terms=[invoice]\n留出集：invoice missing -> 仅在提案后使用",
          },
          {
            label: "验证",
            detail:
              "每个用例中的每个词项只计一次，收集所有关联标签。只有标签唯一且有足够独立支持时，才提议该规则。",
          },
        ],
        caption:
          "不去重时，同一条开发集消息的重复副本会导致什么错误？",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-self-improving-skill-loop-4",
    Object.assign(
      {
        title: "晋升前要求独立门禁",
        steps: [
          {
            label: "输入",
            detail:
              "通过留出集门禁后生成候选摘要，供人工审阅。晋升要求该确切摘要，写入带版本的规则文件，并保留旧文件用于回滚。公开的样例工单只是示例，不是未见过的基准集。",
          },
          {
            label: "转换",
            detail:
              "基线准确率=0；候选准确率=1；无回归 -> 符合条件\n摘要错误 -> 不写入\n摘要完全一致 -> 晋升并保留 .previous",
          },
          {
            label: "验证",
            detail:
              "将批准绑定到序列化的规则内容，写入前重新计算摘要。绝不能从高分推断已获批准。",
          },
        ],
        caption:
          "再次编辑 skill 前，你会如何冻结下一份留出集？",
      },
      { lab: buildLab(4) },
    ),
  );
})();
