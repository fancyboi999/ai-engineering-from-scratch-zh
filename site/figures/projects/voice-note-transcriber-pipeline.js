(function () {
  "use strict";
  const steps = [
    { label: "音频", detail: "保留采样坐标与源字节。" },
    {
      label: "处理",
      detail: "应用明确的信号或传输契约。",
    },
    { label: "审阅", detail: "将转写证据与播放内容比较。" },
  ];
  window.AIFSProjectFigures.register("pj-voice-note-transcriber-pipeline-1", {
    title: "采样率定义时钟",
    steps,
    caption:
      "同一采样索引在不同采样率下对应不同时间。",
    lab: {
      controls: [
        {
          key: "index",
          label: "采样索引",
          type: "number",
          value: 800,
          min: 0,
          max: 160000,
        },
        {
          key: "rate",
          label: "采样率（Hz）",
          type: "select",
          value: "16000",
          options: [
            { value: "8000", label: "8000" },
            { value: "16000", label: "16000" },
            { value: "48000", label: "48000" },
          ],
        },
        {
          key: "sample",
          label: "有符号 16 位采样值",
          type: "range",
          value: 16384,
          min: -32768,
          max: 32767,
        },
      ],
      calculate(v) {
        return {
          summary: "时间戳 = 采样索引 / 采样率。",
          metrics: [
            { label: "秒", value: (v.index / Number(v.rate)).toFixed(4) },
            {
              label: "归一化振幅",
              value: (v.sample / 32768).toFixed(4),
            },
          ],
          rows: [
            [
              String(v.index),
              String(v.rate),
              (v.index / Number(v.rate)).toFixed(4),
            ],
          ],
          columns: ["索引", "Hz", "秒"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-voice-note-transcriber-pipeline-2", {
    title: "选择保留哪些声学帧",
    steps,
    caption:
      "帧能量是编写的示例。强噪声可能通过，轻声词语可能被滤掉。",
    lab: {
      controls: [
        {
          key: "threshold",
          label: "RMS 阈值",
          type: "range",
          value: 0.02,
          min: 0,
          max: 0.3,
          step: 0.01,
        },
        {
          key: "gap",
          label: "最大静音间隔（ms）",
          type: "range",
          value: 40,
          min: 0,
          max: 100,
          step: 20,
        },
      ],
      calculate(v) {
        const energies = [0, 0.1, 0.1, 0, 0.08, 0.08, 0];
        const active = energies
          .map((e, i) => (e >= v.threshold ? [i * 20, (i + 1) * 20] : null))
          .filter(Boolean);
        const merged = [];
        for (const span of active) {
          const last = merged[merged.length - 1];
          if (last && span[0] - last[1] <= v.gap) last[1] = span[1];
          else merged.push([...span]);
        }
        const kept = merged.filter(([a, b]) => b - a >= 40);
        return {
          summary: `按 40 ms 最短时长筛选后，保留 ${kept.length} 个活跃片段。`,
          metrics: [
            { label: "活跃帧数", value: active.length },
            {
              label: "保留时长（ms）",
              value: kept.reduce((sum, [a, b]) => sum + b - a, 0),
            },
          ],
          bars: energies.map((value, i) => ({
            label: "帧 " + i,
            value,
            max: 0.3,
          })),
          rows: kept.map(([a, b]) => [String(a), String(b)]),
          columns: ["开始时间（ms）", "结束时间（ms）"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-voice-note-transcriber-pipeline-3", {
    title: "识别请求携带实际音频",
    steps,
    caption:
      "只重试暂时性超时。给定参考文本模式不发出识别请求。",
    lab: {
      controls: [
        {
          key: "reference",
          label: "使用给定参考文本",
          type: "checkbox",
          value: false,
        },
        {
          key: "timeouts",
          label: "成功前超时次数",
          type: "range",
          value: 1,
          min: 0,
          max: 5,
        },
        {
          key: "retries",
          label: "允许重试次数",
          type: "range",
          value: 1,
          min: 0,
          max: 5,
        },
      ],
      calculate(v) {
        const attempts = v.reference
          ? 0
          : Math.min(v.timeouts + 1, v.retries + 1);
        const success = v.reference || v.timeouts <= v.retries;
        let summary = "超时预算已耗尽；保留失败记录。";
        if (v.reference)
          summary = "不调用识别器；标注给定转写文本的来源。";
        else if (success)
          summary = "记录返回文本与对应音频片段的确切哈希。";
        return {
          summary,
          metrics: [
            { label: "HTTP 尝试次数", value: attempts },
            {
              label: "是否执行识别",
              value: v.reference ? "否" : "端点模式",
            },
          ],
          rows: [
            ["载荷", "multipart model 字段 + WAV 文件"],
            ["证据", "片段 SHA256 与尝试次数"],
          ],
          columns: ["契约", "值"],
        };
      },
    },
  });
  window.AIFSProjectFigures.register("pj-voice-note-transcriber-pipeline-4", {
    title: "将校验过的字幕条目转换为 WebVTT",
    steps,
    caption:
      "审阅页面将片段时间关联到实际播放，不推断词语对齐。",
    lab: {
      controls: [
        {
          key: "start",
          label: "字幕开始时间（秒）",
          type: "number",
          value: 1.234,
          min: 0,
          max: 20,
          step: 0.001,
        },
        {
          key: "end",
          label: "字幕结束时间（秒）",
          type: "number",
          value: 3.5,
          min: 0,
          max: 20,
          step: 0.001,
        },
        {
          key: "duration",
          label: "音频时长（秒）",
          type: "number",
          value: 5.685,
          min: 0,
          max: 20,
          step: 0.001,
        },
      ],
      calculate(v) {
        const stamp = (s) => {
          let ms = Math.round(s * 1000);
          const h = Math.floor(ms / 3600000);
          ms %= 3600000;
          const m = Math.floor(ms / 60000);
          ms %= 60000;
          return (
            [h, m, Math.floor(ms / 1000)]
              .map((n) => String(n).padStart(2, "0"))
              .join(":") +
            "." +
            String(ms % 1000).padStart(3, "0")
          );
        };
        const valid = v.start >= 0 && v.end > v.start && v.end <= v.duration;
        return {
          summary: valid
            ? stamp(v.start) + " --> " + stamp(v.end)
            : "拒绝顺序错误或结束点超出音频的字幕条目。",
          metrics: [
            {
              label: "字幕时长（秒）",
              value: (v.end - v.start).toFixed(3),
            },
          ],
          rows: [
            ["音频证据", "原始片段哈希"],
            ["修正流程", "编辑 JSON，验证哈希，再次渲染"],
          ],
          columns: ["产物", "保留的关联"],
        };
      },
    },
  });
})();
