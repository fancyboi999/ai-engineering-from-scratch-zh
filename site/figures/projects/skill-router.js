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
      text("query", "请求", "release replicas"),
      text(
        "keywords",
        "技能关键词（以逗号分隔）",
        "release,replicas,release",
      ),
      text(
        "files",
        "变更路径（以逗号分隔）",
        "deploy/orchard.yaml,deploy/orchard.yaml",
      ),
      number("competitor", "第二个技能得分", 6, 0, 20),
      number("margin", "要求的得分差距", 2, 0, 6),
      check("permission", "依赖所需读取权限可用", true),
    ],
    calculate(v) {
      const q = new Set(words(v.query)),
        keywords = unique(
          v.keywords
            .split(",")
            .map((x) => x.trim().normalize("NFC").toLowerCase()),
        ).filter((w) => words(w).some((t) => q.has(t)));
      const paths = unique(
        v.files.split(",").map((x) => x.trim().replaceAll("\\", "/")),
      ).filter((p) => p.startsWith("deploy/") && !p.split("/").includes(".."));
      const score = keywords.length * 2 + paths.length * 3;
      const status =
        score === 0
          ? "no-match"
          : Math.abs(score - v.competitor) < v.margin
            ? "ambiguous"
            : v.competitor > score
              ? "other skill leads"
              : !v.permission
                ? "blocked"
                : "ready";
      return {
        summary:
          ({ "no-match": "无匹配（no-match）", ambiguous: "有歧义（ambiguous）", "other skill leads": "其他技能领先", blocked: "受阻（blocked）", ready: "就绪（ready）" })[status] +
          (status === "ready" ? ": check-tests -> release-review" : ""),
        metrics: [
          metric("关键词分数", keywords.length * 2),
          metric("路径分数", paths.length * 3),
          metric("重复项贡献", "0"),
          metric("得分差距", Math.abs(score - v.competitor)),
        ],
        bars: [bar("发布审查", score), bar("其他技能", v.competitor)],
        columns: ["证据", "贡献"],
        rows: keywords
          .map((w) => ["关键词：" + w, 2])
          .concat(paths.map((p) => ["路径：" + p, 3])),
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-skill-router-1",
    Object.assign(
      {
        title: "解析带类型的技能目录",
        steps: [
          {
            label: "输入契约",
            detail:
              "从 SKILL.md 的名称和描述发现技能，再读取 routing.json 作为本地路由扩展。目录名必须与技能名匹配。路由元数据不属于可移植技能格式。",
          },
          {
            label: "解析带类型的技能目录",
            detail:
              "skills/release-review/SKILL.md -> 名称 release-review\nrouting.json -> keywords,paths,priority,requires,permissions",
          },
          {
            label: "观察结果",
            detail:
              "用 parseSkill 校验合并记录。解析发现文件前先拒绝符号链接文件或过大的文件。",
          },
        ],
        caption:
          "release-review 目录声明名称为 publish 时，应如何处理？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-router-2",
    Object.assign(
      {
        title: "为词汇与仓库路径评分",
        steps: [
          {
            label: "输入契约",
            detail:
              "重复证据不能虚增匹配分数。Orchard 请求重复了同一变更路径，但路径贡献只能计一次。关键词各贡献两分，不同的匹配路径各贡献三分。",
          },
          {
            label: "为词汇与仓库路径评分",
            detail:
              "关键词 release,replicas -> 4 分\n文件 deploy/orchard.yaml 重复两次 -> 3 分\nscore=7，而不是 10",
          },
          {
            label: "观察结果",
            detail:
              "评分前统一分隔符并去重。解释理由应与实际计数的证据一致。",
          },
        ],
        caption:
          "两条不同路径规则匹配同一文件，应算作两次独立观察吗？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-router-3",
    Object.assign(
      {
        title: "执行前解析依赖",
        steps: [
          {
            label: "输入契约",
            detail:
              "选择 release-review 需要先运行 check-tests。深度优先遍历先输出依赖，再输出所选技能，并校验整个图的权限。一个依赖被拒绝就会阻断整个计划。",
          },
          {
            label: "执行前解析依赖",
            detail:
              "release-review 依赖 check-tests\nallowed=[read]\nplan=[check-tests,release-review]",
          },
          {
            label: "观察结果",
            detail:
              "分别维护 active 和 visited 集合：active 用于发现环，visited 防止重复执行。不要在依赖之前追加父技能。",
          },
        ],
        caption:
          "如果 check-tests 暗中需要网络权限，会发生什么？",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-skill-router-4",
    Object.assign(
      {
        title: "对有歧义或受阻请求弃选",
        steps: [
          {
            label: "输入契约",
            detail:
              "两个技能得分太接近，或所选计划需要不可用权限时，放弃选择。解释路由为何停止，比随意选出一个获胜技能更有用。",
          },
          {
            label: "对有歧义或受阻请求弃选",
            detail:
              "publish 请求 -> release-publish 得分 2\nallowed=[read]；publish 需要 network\nstatus=blocked，无执行计划",
          },
          {
            label: "观察结果",
            detail:
              "依赖规划前先检查得分差距。排序只提供选择证据，不授予工具执行权限。",
          },
        ],
        caption:
          "如何调整一个有歧义的关键词，而不过拟合示例请求？",
      },
      { lab: buildLab(4) },
    ),
  );
})();
