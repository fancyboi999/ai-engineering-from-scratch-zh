(function () {
  "use strict";
  window.AIFSProjectFigures.register("pj-hedged-request-lab-1", {
    title: "最近秩分位数",
    steps: [
      {
        label: "输入",
        detail: "小样本使尾部分位数较粗糙。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "小样本使尾部分位数较粗糙。",
    lab: {
      controls: [
        {
          key: "samples",
          label: "延迟样本（毫秒）",
          type: "text",
          value: "2,4,10,20,80",
        },
      ],
      calculate(v) {
        const a = v.samples
          .split(",")
          .map(Number)
          .sort((a, b) => a - b);
        if (a.some((x) => !Number.isFinite(x) || x < 0))
          throw Error("无效样本");
        return {
          summary: a.length + " 个样本",
          metrics: [
            { label: "P50（毫秒）", value: a[Math.ceil(a.length * 0.5) - 1] },
            { label: "P95（毫秒）", value: a[Math.ceil(a.length * 0.95) - 1] },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-hedged-request-lab-2", {
    title: "对冲计时器",
    steps: [
      {
        label: "输入",
        detail: "只有首次尝试尚未胜出时才启动第二次。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "只有首次尝试尚未胜出时才启动第二次。",
    lab: {
      controls: [
        {
          key: "primary",
          label: "主请求延迟（毫秒）",
          type: "range",
          value: 80,
          min: 0,
          max: 200,
          step: 1,
        },
        {
          key: "secondary",
          label: "次请求延迟（毫秒）",
          type: "range",
          value: 5,
          min: 0,
          max: 200,
          step: 1,
        },
        {
          key: "delay",
          label: "对冲延时（毫秒）",
          type: "range",
          value: 10,
          min: 0,
          max: 200,
          step: 1,
        },
      ],
      calculate(v) {
        const launched = v.primary > v.delay,
          win = launched
            ? Math.min(v.primary, v.delay + v.secondary)
            : v.primary;
        return {
          summary: "胜出时间：" + win + "ms",
          metrics: [{ label: "已发起调用数", value: launched ? 2 : 1 }],
          bars: [
            { label: "基线", value: v.primary, max: 400 },
            { label: "对冲", value: win, max: 400 },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-hedged-request-lab-3", {
    title: "取消证据",
    steps: [
      {
        label: "输入",
        detail: "客户端取消与服务器完成工作是两回事。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "客户端取消与服务器完成工作是两回事。",
    lab: {
      controls: [
        {
          key: "started",
          label: "已启动服务请求数",
          type: "range",
          value: 2,
          min: 0,
          max: 5,
          step: 1,
        },
        {
          key: "cancelled",
          label: "客户端取消数",
          type: "range",
          value: 1,
          min: 0,
          max: 5,
          step: 1,
        },
      ],
      calculate(v) {
        const c = Math.min(v.started, v.cancelled);
        return {
          summary: "服务器仍可能完成全部 " + v.started + " 个请求",
          metrics: [
            { label: "客户端取消观察数", value: c },
            { label: "已证明节省的工作", value: 0 },
          ],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-hedged-request-lab-4", {
    title: "工作量比值",
    steps: [
      {
        label: "输入",
        detail: "比较延迟前统计全部已发起尝试。",
      },
      {
        label: "计算",
        detail: "改变输入，检查计算结果。",
      },
    ],
    caption: "比较延迟前统计全部已发起尝试。",
    lab: {
      controls: [
        {
          key: "baseline",
          label: "基线调用数",
          type: "range",
          value: 3,
          min: 0,
          max: 20,
          step: 1,
        },
        {
          key: "hedged",
          label: "对冲调用数",
          type: "range",
          value: 6,
          min: 0,
          max: 40,
          step: 1,
        },
      ],
      calculate(v) {
        return {
          summary: v.baseline
            ? (v.hedged / v.baseline).toFixed(2) + " 倍请求工作量"
            : "没有基线分母",
          metrics: [
            { label: "额外请求数", value: v.hedged - v.baseline },
          ],
          bars: [
            { label: "基线", value: v.baseline, max: 40 },
            { label: "对冲", value: v.hedged, max: 40 },
          ],
        };
      },
    },
  });
})();
