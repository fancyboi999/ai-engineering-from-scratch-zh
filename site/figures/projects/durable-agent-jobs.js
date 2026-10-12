(function () {
  "use strict";
  window.AIFSProjectFigures.register("pj-durable-agent-jobs-1", {
    title: "重试需要稳定的标识",
    steps: [
      {
        label: "校验字节",
        detail:
          "标识符必须以小写字母开头，后续只能包含小写字母、数字或连字符，总长不超过 64 个字符。",
      },
      {
        label: "创建任务意图",
        detail:
          "有效的新任务初始为 queued，版本 0、尝试次数 0，尚无租约或输出。",
      },
      {
        label: "绑定输入",
        detail:
          "CLI 将标识符绑定到不可变文本。相同内容再次入队是安全的；文本变化则产生冲突。",
      },
    ],
    caption:
      "改变标识符与载荷的关系，计算是否允许创建或重复投递。",
    lab: {
      controls: [
        { key: "id", label: "任务标识符", type: "text", value: "report-1" },
        {
          key: "exists",
          label: "ID 已存储",
          type: "checkbox",
          value: false,
        },
        {
          key: "changed",
          label: "载荷已变化",
          type: "checkbox",
          value: false,
        },
      ],
      calculate(v) {
        const valid = /^[a-z][a-z0-9-]{0,63}$/.test(v.id);
        const conflict = valid && v.exists && v.changed;
        let summary = "创建版本 0 的 queued 任务；尚未执行副作用";
        if (!valid) summary = "已拒绝：标识符无效";
        else if (conflict)
          summary = "已拒绝：该标识已绑定其他文本";
        else if (v.exists)
          summary = "相同内容重复投递：保留已有任务";
        return {
          summary: summary,
          metrics: [
            { label: "标识符长度", value: v.id.length },
            { label: "新增任务数", value: valid && !v.exists ? 1 : 0 },
            { label: "已执行副作用数", value: 0 },
          ],
          bars: [{ label: "ID 长度 /64", value: v.id.length, max: 64 }],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-durable-agent-jobs-2", {
    title: "修改账本前检查权限",
    steps: [
      {
        label: "比较版本",
        detail:
          "调用方的预期版本必须等于 queued 记录的当前版本。",
      },
      {
        label: "检查尝试次数上限",
        detail:
          "恢复保留尝试次数。处于 queued 状态的任务也可能已经耗尽重试预算。",
      },
      {
        label: "持久化认领",
        detail:
          "成功转移会递增版本与尝试次数，设置到期时间，然后在持有账本锁时保存。",
      },
    ],
    caption:
      "租约区间是半开的：到期时刻是首次拒绝完成提交的毫秒。",
    lab: {
      controls: [
        {
          key: "current",
          label: "当前版本",
          type: "number",
          value: 2,
          min: 0,
          max: 20,
          step: 1,
        },
        {
          key: "expected",
          label: "预期版本",
          type: "number",
          value: 2,
          min: 0,
          max: 20,
          step: 1,
        },
        {
          key: "attempts",
          label: "已有尝试次数",
          type: "range",
          value: 1,
          min: 0,
          max: 5,
          step: 1,
        },
        {
          key: "cap",
          label: "尝试次数上限",
          type: "range",
          value: 3,
          min: 1,
          max: 5,
          step: 1,
        },
        {
          key: "now",
          label: "认领时间（ms）",
          type: "number",
          value: 100,
          min: 0,
          max: 1000,
          step: 1,
        },
        {
          key: "ttl",
          label: "租约时长（ms）",
          type: "range",
          value: 10,
          min: 1,
          max: 100,
          step: 1,
        },
      ],
      calculate(v) {
        const accepted = v.current === v.expected && v.attempts < v.cap;
        let summary = "认领已接受；执行前先持久化";
        if (v.current !== v.expected)
          summary = "冲突：预期版本已过期";
        else if (!accepted)
          summary = "已达尝试次数上限；保留 queued 记录";
        return {
          summary: summary,
          metrics: [
            {
              label: "更新后的版本",
              value: v.current + (accepted ? 1 : 0),
            },
            {
              label: "更新后的尝试次数",
              value: v.attempts + (accepted ? 1 : 0),
            },
            { label: "租约到期时间", value: accepted ? v.now + v.ttl : 0 },
          ],
          bars: [
            {
              label: "已消耗尝试次数",
              value: v.attempts + (accepted ? 1 : 0),
              max: v.cap,
            },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-durable-agent-jobs-3", {
    title: "时间与版本分别隔离工作进程",
    steps: [
      {
        label: "尝试提交完成",
        detail:
          "运行中的工作进程必须持有当前版本，且时间严格早于到期时刻。",
      },
      {
        label: "回收",
        detail:
          "到期时，running v1 变成 queued v2。这会在再次认领前使旧工作进程失效。",
      },
      {
        label: "重试",
        detail:
          "新工作进程认领 v3。旧 v1 即使报告较早的时间，也不能完成。",
      },
    ],
    caption:
      "将时钟移到 110，再切换提交版本，观察两项独立检查。",
    lab: {
      controls: [
        {
          key: "now",
          label: "完成时间（ms）",
          type: "range",
          value: 109,
          min: 95,
          max: 125,
          step: 1,
        },
        {
          key: "version",
          label: "提交版本",
          type: "number",
          value: 1,
          min: 0,
          max: 5,
          step: 1,
        },
        {
          key: "retry",
          label: "接替者已认领 v3",
          type: "checkbox",
          value: false,
        },
      ],
      calculate(v) {
        const current = v.retry ? 3 : 1,
          expiry = v.retry ? 120 : 110,
          accepted = v.version === current && v.now < expiry;
        let summary = "完成提交已接受";
        if (v.version !== current) summary = "已拒绝：版本过期";
        else if (!accepted) summary = "已拒绝：租约到期";
        return {
          summary: summary,
          metrics: [
            { label: "当前认领版本", value: current },
            { label: "租约到期时刻", value: expiry },
            { label: "剩余时间（ms）", value: Math.max(0, expiry - v.now) },
          ],
          bars: [
            { label: "完成时间", value: v.now, max: 125 },
            { label: "到期时间", value: expiry, max: 125 },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-durable-agent-jobs-4", {
    title: "从副作用与完成提交之间的空档恢复",
    steps: [
      {
        label: "持久化 v1",
        detail:
          "执行本地文本回执前，先保存 running 状态的认领记录。",
      },
      {
        label: "发布副作用",
        detail:
          "将已同步落盘的临时回执建立链接，不覆盖已有输出。",
      },
      {
        label: "崩溃与重试",
        detail:
          "到期后，恢复推进到 v3；若存在相同回执则复用，随后持久化 completed v4。",
      },
    ],
    caption:
      "这里计算单任务的进程崩溃时间线，不模拟文件系统断电。",
    lab: {
      controls: [
        {
          key: "point",
          label: "崩溃位置",
          type: "select",
          value: "effect",
          options: [
            { value: "claim", label: "认领后" },
            { value: "effect", label: "副作用后" },
          ],
        },
        {
          key: "recover",
          label: "恢复时钟（ms）",
          type: "range",
          value: 111,
          min: 100,
          max: 125,
          step: 1,
        },
      ],
      calculate(v) {
        const effect = v.point === "effect",
          expired = v.recover >= 110;
        let summary = "租约仍被持有：接替者不能执行";
        if (expired && effect)
          summary = "回收，复用已有副作用，完成 v4";
        else if (expired)
          summary = "回收，首次发布副作用，完成 v4";
        return {
          summary: summary,
          metrics: [
            { label: "重启前的副作用数", value: effect ? 1 : 0 },
            {
              label: "重启新增副作用数",
              value: expired && !effect ? 1 : 0,
            },
            { label: "已完成任务数", value: expired ? 1 : 0 },
          ],
          columns: ["时刻", "版本", "副作用数"],
          rows: [
            ["100 时认领", 1, 0],
            ["崩溃", 1, effect ? 1 : 0],
            [
              "重启时刻 " + v.recover,
              expired ? 4 : 1,
              expired || effect ? 1 : 0,
            ],
          ],
          bars: [
            {
              label: "已持久化副作用数",
              value: expired || effect ? 1 : 0,
              max: 1,
            },
          ],
        };
      },
    },
  });
})();
