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
      text("before", "先前策略", "tokens expire after 60 minutes"),
      text("after", "新输入策略", "tokens expire after 15 minutes"),
      check("present", "文档存在于新输入语料库", true),
      number("oldTime", "先前时间戳", 100, 0, 500),
      number("updated", "新输入时间戳", 200, 0, 500),
      number("now", "查询时间", 210, 0, 600),
      number("maxAge", "最大年龄", 60, 0, 300),
      number("expected", "预期版本", 1, 0, 5),
      number("current", "当前版本", 1, 0, 5),
    ],
    calculate(v) {
      const normal = (s) => s.normalize("NFC").replace(/\r\n/g, "\n").trim();
      const operation = !v.present
        ? "delete"
        : normal(v.before) !== normal(v.after)
          ? "update"
          : v.updated !== v.oldTime
            ? "refresh"
            : "unchanged";
      const age = v.now - v.updated,
        eligible = v.present && age >= 0 && age <= v.maxAge,
        commit = v.current === v.expected;
      return {
        summary:
          stage === 3
            ? commit
              ? "版本匹配：下一快照 " + (v.current + 1)
              : "写入者版本过期：保留版本 " + v.current
            : stage === 4
              ? eligible
                ? "当前来源符合条件"
                : "查询时排除该来源"
              : "计划操作：" + ({ delete: "删除（delete）", update: "更新（update）", refresh: "刷新（refresh）", unchanged: "未变（unchanged）" })[operation],
        metrics: [
          metric("操作", ({ delete: "删除（delete）", update: "更新（update）", refresh: "刷新（refresh）", unchanged: "未变（unchanged）" })[operation]),
          metric("年龄", age),
          metric("可用于引用", eligible),
          metric("CAS 已接受", commit),
        ],
        bars: [
          bar("来源年龄", Math.max(0, age), v.maxAge),
          bar("允许年龄", v.maxAge),
        ],
        columns: ["字段", "之前", "之后"],
        rows: [
          [
            "规范化文本",
            normal(v.before),
            v.present ? normal(v.after) : "（已删除）",
          ],
          ["时间戳", v.oldTime, v.updated],
          ["快照版本", v.current, commit ? v.current + 1 : v.current],
        ],
      };
    },
  });
  window.AIFSProjectFigures.register(
    "pj-rag-freshness-pipeline-1",
    Object.assign(
      {
        title: "规范化文档并生成内容指纹",
        steps: [
          {
            label: "输入",
            detail:
              "Orchard 策略的超时时间变化时，文档 ID 保持不变。正文哈希前先规范化 Unicode 与行尾，更新时间单独保留。之后再次观察到未变的内容属于刷新，不是重写。",
          },
          {
            label: "转换",
            detail:
              "id=orchard-auth\n文本：tokens expire after 60 minutes\nupdated: 100 -> 200\n内容哈希：未变",
          },
          {
            label: "验证",
            detail:
              "对规范化后的 UTF-8 字节计算哈希，不要把时间戳计入内容标识。",
          },
        ],
        caption:
          "为什么 café 的两种不同编码应生成相同指纹？",
      },
      { lab: buildLab(1) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-rag-freshness-pipeline-2",
    Object.assign(
      {
        title: "规划插入、更新、删除与刷新",
        steps: [
          {
            label: "输入",
            detail:
              "摄取接收完整语料快照。变更后的 fixture 替换了已退役的备份笔记，并修改 token 有效期。必须删除缺失 ID，防止过时证据仍可被搜索到。",
          },
          {
            label: "转换",
            detail:
              "之前的 ID：orchard-auth, retired-backup\n之后的 ID：orchard-auth, restore-runbook\n更新：orchard-auth；删除：retired-backup；插入：restore-runbook",
          },
          {
            label: "验证",
            detail:
              "决定操作前先构建输入 ID 映射。重复输入 ID 是错误，不能采用最后写入者覆盖规则。",
          },
        ],
        caption:
          "如果导入器只收到部分变更流，契约应如何调整？",
      },
      { lab: buildLab(2) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-rag-freshness-pipeline-3",
    Object.assign(
      {
        title: "通过原子替换持久化索引",
        steps: [
          {
            label: "输入",
            detail:
              "两个摄取进程可能同时读到版本 1。持久化的同级锁文件使版本检查和替换写入串行执行。expected_version=1 时只能有一个进程提交，下一个写入者必须重新读取。",
          },
          {
            label: "转换",
            detail:
              "写入者 A 预期版本 1 -> 提交版本 2\n写入者 B 预期版本 1 -> 索引版本过期\nindex.json.lock 保留为稳定的锁 inode",
          },
          {
            label: "验证",
            detail:
              "在 POSIX 上，读取、比较、fsync 和 rename 全程持有 flock。释放后不要删除锁文件，否则等待进程可能锁住不同文件。",
          },
        ],
        caption:
          "进程写完临时文件但尚未 rename 就退出，会发生什么？",
      },
      { lab: buildLab(3) },
    ),
  );
  window.AIFSProjectFigures.register(
    "pj-rag-freshness-pipeline-4",
    Object.assign(
      {
        title: "在查询时排除过期证据",
        steps: [
          {
            label: "输入",
            detail:
              "编辑后，查询必须返回 15 分钟策略，绝不能返回已废弃的 60 分钟文本。即使最后一次快照后没有运行摄取任务，也要在回答时检查新鲜度。",
          },
          {
            label: "转换",
            detail:
              "updated=200; now=210; max_age=60 -> 年龄 10，符合条件\nupdated=200; now=500; max_age=60 -> 年龄 300，已排除",
          },
          {
            label: "验证",
            detail:
              "查询只读取一个已提交快照。每个命中都返回快照版本和来源哈希，供调用方检测过期引用。",
          },
        ],
        caption:
          "时间标在未来的文档应获得负年龄并成为最佳结果吗？",
      },
      { lab: buildLab(4) },
    ),
  );
})();
