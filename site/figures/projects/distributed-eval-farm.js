(function () {
  "use strict";
  window.AIFSProjectFigures.register("pj-distributed-eval-farm-1", {
    title: "将用例标识哈希到唯一桶中",
    steps: [
      {
        label: "读取 ID",
        detail:
          "标识符是唯一、非空的 UTF-8 字符串。修改 prompt 会改变数据集标识，但不会改变 ID 所属的桶。",
      },
      {
        label: "对字节做哈希",
        detail:
          "FNV-1a 对每个字节做异或，然后乘法取模 2^32。哈希值与输入到达顺序无关。",
      },
      {
        label: "取模",
        detail:
          "分片索引等于哈希值对分片数取模。更改分片数需要开启新的运行。",
      },
    ],
    caption:
      "这些桶与 Go 核心使用相同的 FNV-1a 32 位字节运算，也适用于 UTF-8 输入。",
    lab: {
      controls: [
        {
          key: "ids",
          label: "用逗号分隔的用例 ID",
          type: "text",
          value: "case-a,case-b,case-c,case-d",
        },
        {
          key: "shards",
          label: "分片数",
          type: "range",
          value: 4,
          min: 1,
          max: 8,
          step: 1,
        },
      ],
      calculate(v) {
        const ids = v.ids.split(",").map((x) => x.trim());
        if (ids.some((x) => !x) || new Set(ids).size !== ids.length)
          return {
            summary: "拒绝空标识符或重复标识符",
            metrics: [{ label: "记录数", value: ids.length }],
            bars: [],
          };
        const buckets = Array.from({ length: v.shards }, () => []);
        const rows = ids.map((id) => {
          let hash = 2166136261;
          for (const byte of new TextEncoder().encode(id)) {
            hash = Math.imul(hash ^ byte, 16777619) >>> 0;
          }
          const shard = hash % v.shards;
          buckets[shard].push(id);
          return [id, hash, shard];
        });
        return {
          summary: "每个用例恰好属于一个桶",
          metrics: [
            { label: "用例数", value: ids.length },
            {
              label: "非空分片数",
              value: buckets.filter((b) => b.length).length,
            },
          ],
          columns: ["用例", "32 位哈希值", "分片"],
          rows,
          bars: buckets.map((b, i) => ({
            label: "分片 " + i,
            value: b.length,
            max: ids.length,
          })),
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-distributed-eval-farm-2", {
    title: "工作进程开始前先持久化租约",
    steps: [
      {
        label: "读取当前持有者",
        detail:
          "协调器持有稳定的账本锁时，重新加载共享快照。",
      },
      {
        label: "检查到期时间",
        detail:
          "未完成的分片在恰好到期时变得可认领。",
      },
      {
        label: "推进版本",
        detail:
          "接替的持有者获得下一个版本，工作开始前先保存快照。",
      },
    ],
    caption:
      "旧持有者持有 v1，直到 110。计算新持有者能否认领，以及哪个版本成为有效版本。",
    lab: {
      controls: [
        {
          key: "now",
          label: "接替者认领时间",
          type: "range",
          value: 110,
          min: 100,
          max: 125,
          step: 1,
        },
        {
          key: "ttl",
          label: "接替者租约时长",
          type: "range",
          value: 10,
          min: 1,
          max: 30,
          step: 1,
        },
        {
          key: "done",
          label: "旧持有者已完成",
          type: "checkbox",
          value: false,
        },
      ],
      calculate(v) {
        const acquire = !v.done && v.now >= 110;
        let summary = "旧持有者仍持有 v1";
        if (v.done) summary = "已完成分片保持关闭";
        else if (acquire) summary = "新持有者取得 v2";
        return {
          summary: summary,
          metrics: [
            { label: "当前版本", value: acquire ? 2 : 1 },
            { label: "到期时间", value: acquire ? v.now + v.ttl : 110 },
            { label: "旧租约剩余时长", value: Math.max(0, 110 - v.now) },
          ],
          bars: [
            { label: "认领时间", value: v.now, max: 160 },
            {
              label: "更新后的到期时间",
              value: acquire ? v.now + v.ttl : 110,
              max: 160,
            },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-distributed-eval-farm-3", {
    title: "重复投递只确认同一份证据",
    steps: [
      {
        label: "检查持有者与版本",
        detail: "即使答案正确，旧租约也不能写入。",
      },
      {
        label: "处理回执重复投递",
        detail:
          "确认完全相同的已完成回执，不重新打开分片。",
      },
      {
        label: "首次完成需检查到期时间",
        detail:
          "首次结果必须在到期前到达；后续重复投递只确认已有结果。",
      },
    ],
    caption:
      "当前是新持有者，版本 v2，到期时间 120。身份、结果是否相同、首次完成时间各自承担不同的检查职责。",
    lab: {
      controls: [
        {
          key: "version",
          label: "提交版本",
          type: "number",
          value: 2,
          min: 1,
          max: 4,
          step: 1,
        },
        {
          key: "old",
          label: "以旧持有者身份提交",
          type: "checkbox",
          value: false,
        },
        {
          key: "done",
          label: "回执已提交",
          type: "checkbox",
          value: true,
        },
        {
          key: "same",
          label: "结果字节完全相同",
          type: "checkbox",
          value: true,
        },
        {
          key: "now",
          label: "到达时间",
          type: "range",
          value: 125,
          min: 110,
          max: 140,
          step: 1,
        },
      ],
      calculate(v) {
        const identity = v.version === 2 && !v.old;
        const accepted = identity && (v.done ? v.same : v.now < 120);
        let summary = "拒绝到期后的首次完成";
        if (!identity) summary = "已隔离：持有者或版本不正确";
        else if (accepted && v.done)
          summary = "幂等确认；不新增结果";
        else if (accepted) summary = "接受首次完成";
        else if (v.done) summary = "拒绝冲突回执";
        return {
          summary: summary,
          metrics: [
            { label: "已接受", value: accepted ? 1 : 0 },
            { label: "新增回执数", value: accepted && !v.done ? 1 : 0 },
            {
              label: "决策后的结果写入数",
              value: v.done || accepted ? 1 : 0,
            },
          ],
          bars: [
            { label: "到达时间", value: v.now, max: 140 },
            { label: "到期时间", value: 120, max: 140 },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-distributed-eval-farm-4", {
    title: "计算受限并发的工作批次",
    steps: [
      {
        label: "限制回调并发",
        detail:
          "同时启动子进程的池回调数不超过配置上限。",
      },
      {
        label: "认领与评分",
        detail:
          "每个子进程认领一个已持久化分片，比较录制答案，并提交受版本隔离保护的回执。",
      },
      {
        label: "收集每个批次",
        detail:
          "协调器等待当前批次完成后才派发下一批；完成的运行保留所有回执。",
      },
    ],
    caption:
      "根据给定分片时长做调度计算。它估算批次耗时，不是实测模型吞吐量。",
    lab: {
      controls: [
        {
          key: "durations",
          label: "分片时长（ms）",
          type: "text",
          value: "80,20,40,60",
        },
        {
          key: "workers",
          label: "并发进程槽位数",
          type: "range",
          value: 2,
          min: 1,
          max: 8,
          step: 1,
        },
      ],
      calculate(v) {
        const durations = v.durations.split(",").map((x) => Number(x.trim()));
        if (
          durations.length > 32 ||
          durations.some((x) => !Number.isFinite(x) || x <= 0)
        )
          return {
            summary: "输入 1 至 32 个正数时长",
            metrics: [],
            bars: [],
          };
        let time = 0;
        const rows = [];
        for (let i = 0; i < durations.length; i += v.workers) {
          const batch = durations.slice(i, i + v.workers);
          batch.forEach((d, j) =>
            rows.push(["shard-" + (i + j), "slot-" + (j + 1), time, time + d]),
          );
          time += Math.max(...batch);
        }
        const serial = durations.reduce((a, b) => a + b, 0);
        return {
          summary: "批次屏障等待每批最慢的分片",
          metrics: [
            { label: "预计总耗时（ms）", value: time },
            { label: "子进程总数", value: durations.length },
            {
              label: "最大并发子进程数",
              value: Math.min(v.workers, durations.length),
            },
            { label: "批次数", value: Math.ceil(durations.length / v.workers) },
          ],
          columns: ["分片", "槽位", "开始时间（ms）", "完成时间（ms）"],
          rows,
          bars: [
            { label: "串行耗时", value: serial, max: serial },
            { label: "受限并发批次耗时", value: time, max: serial },
          ],
        };
      },
    },
  });
})();
