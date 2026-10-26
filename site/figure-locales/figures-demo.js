(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-demo.js"] = {
  "demo-token-bucket": {
    "text": {
      "TOKEN BUCKET": "令牌桶限流",
      "Each request takes one token from the bucket of its client. The bucket refills at a fixed rate and never holds more than its capacity. The capacity sets the largest burst that the demo accepts. The refill rate sets the steady request rate. A rejected request gets HTTP 429 with a Retry-After header, and the model does not run.": "每次请求消耗当前客户端桶里的一个令牌。桶以恒定速率补充，且永远不会超过其最大容量。容量决定了 Demo 能承受的突发并发上限，补充速率决定了长期平稳请求率。被拒绝的请求会收到携带 Retry-After 标头的 HTTP 429 响应，且不会触发底层模型运行。",
      "tokens": "token 数",
      "cap 4": "容量 4",
      "requests": "请求",
      "0 s": "0 秒",
      "6 s": "6 秒",
      "12 s": "12 秒",
      "accepted: model runs": "已接受：运行模型",
      "rejected: 429 + Retry-After": "已拒绝：429 + Retry-After",
      "of 24 requests accepted": "条请求被接受（共 24 条）",
      "9 rejected  ·  first burst 5/8  ·  steady 7/8  ·  last burst 3/8": "9 条被拒绝  ·  首轮突发 5/8  ·  稳态 7/8  ·  末轮突发 3/8",
      "tokens = min(4, tokens + 1 x seconds since last request)  ·  accept when tokens >= 1, then take 1": "tokens = min(4, tokens + 1 x 距上次请求的秒数)  ·  tokens >= 1 时接受，再扣除 1"
    },
    "patterns": [
      [
        "^cap (\\d+)$",
        "容量 $1"
      ],
      [
        "^(\\d+) s$",
        "$1 秒"
      ],
      [
        "^of (\\d+) requests accepted$",
        "条请求被接受（共 $1 条）"
      ],
      [
        "^(\\d+) rejected  ·  first burst (\\d+/\\d+)  ·  steady (\\d+/\\d+)  ·  last burst (\\d+/\\d+)$",
        "$1 条被拒绝  ·  首轮突发 $2  ·  稳态 $3  ·  末轮突发 $4"
      ],
      [
        "^tokens = min\\(([^,]+), tokens \\+ ([^ ]+) x seconds since last request\\)  ·  accept when tokens >= 1, then take 1$",
        "tokens = min($1, tokens + $2 x 距上次请求的秒数)  ·  tokens >= 1 时接受，再扣除 1"
      ]
    ],
    "preserve": []
  }
};
