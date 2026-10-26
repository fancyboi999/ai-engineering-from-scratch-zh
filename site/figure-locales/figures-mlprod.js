(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-mlprod.js"] = {
  "mlprod-serving-cost": {
    "text": {
      "BATCH VS ONLINE": "批处理与在线服务",
      "online": "在线",
      "batch": "批处理",
      "batch impossible": "批处理无法满足",
      "max staleness allowed (hours)  ·  cost per day on a log scale": "允许的最大数据延迟（小时）  ·  每日成本使用对数刻度",
      "is cheaper at these budgets": "在这些预算下更便宜",
      "batch = 2M users × 24/(staleness − 1 h job) × $0.40/M + lookups  ·  online = replicas for peak QPS (3 × average) × $0.50/h × 24": "批处理 = 2M 用户 × 24/(数据延迟 − 1 h 作业) × $0.40/M + 查询  ·  在线 = 满足峰值 QPS（平均值的 3 倍）的副本数 × $0.50/h × 24",
      "Batch scoring computes a score for every user on each run, so its cost grows as the freshness limit gets shorter. Online serving pays for replicas sized for peak traffic, so its cost follows requests and ignores freshness. Below one hour, a one-hour batch job cannot meet the limit at all. The prices are round numbers for the exercise.": "批量评分每轮为每个用户计算一次分数，因此允许的数据延迟越短，成本越高。在线服务按峰值流量配置副本付费，成本随请求量变化，而不受新鲜度影响。允许延迟不足一小时时，耗时一小时的批处理作业根本无法满足要求。价格是本练习使用的约整数。"
    },
    "patterns": [
      [
        "^batch \\$([\\d.]+)/day, ([\\d.]+) runs/day  ·  online \\$([\\d.]+)/day, (\\d+) replicas$",
        "批处理 $$$1/天，每天运行 $2 次  ·  在线 $$$3/天，$4 个副本"
      ],
      [
        "^batch cannot meet the limit  ·  online \\$([\\d.]+)/day, (\\d+) replicas$",
        "批处理无法满足上限  ·  在线 $$$1/天，$2 个副本"
      ]
    ],
    "preserve": []
  },
  "mlprod-drift-psi": {
    "text": {
      "POPULATION STABILITY INDEX": "群体稳定性指标",
      "10% per bin in the reference": "参考分布每箱 10%",
      "bins = deciles of the reference window  ·  grey reference, blue current": "分箱 = 参考窗口的十分位区间  ·  灰色：参考，蓝色：当前",
      "bars above 80% are clipped": "超过 80% 的柱形已截断",
      "PSI · moderate, 0.1 to 0.25": "PSI · 中等，0.1 至 0.25",
      "PSI = Σ (current − reference) × ln(current / reference), summed over the 10 bins": "PSI = Σ (current − reference) × ln(current / reference)，对 10 个分箱求和",
      "The reference window is cut into ten bins that each hold 10 percent of its values. Move the current window and the share in each bin changes. PSI adds up those changes, weighted by the log ratio. A bin that grows from 10 to 30 percent adds much more than one that grows to 12. The 0.1 and 0.25 bands are a credit-scoring rule of thumb, not a statistical test.": "参考窗口被分成十个箱，每箱包含 10% 的参考值。移动当前窗口，各箱的占比就会变化。PSI 用对数比率对这些变化加权后求和。某箱从 10% 升到 30% 的贡献，远大于升到 12% 的贡献。0.1 和 0.25 这两条分界线只是信用评分领域的经验规则，并非统计检验。",
      "PSI · significant, above 0.25": "PSI · 显著，高于 0.25",
      "PSI · stable, below 0.1": "PSI · 稳定，低于 0.1"
    },
    "patterns": [
      [
        "^KS D = ([\\d.]+)  ·  largest change in bin (\\d+): (\\d+)% → ([\\d.]+)%$",
        "KS D = $1  ·  第 $2 箱变化最大：$3% → $4%"
      ]
    ],
    "preserve": []
  },
  "mlprod-pit-join": {
    "text": {
      "POINT-IN-TIME JOIN": "时点连接",
      "feature rows for one user: value above, event day below  ·  blue band = TTL window": "同一用户的特征记录：上方为值，下方为事件日期  ·  蓝色带 = TTL 窗口",
      "join a row when row.day ≤ label.day and label.day − row.day ≤ TTL, then take the latest one": "仅连接满足 row.day ≤ label.day 且 label.day − row.day ≤ TTL 的记录，再取其中最新一条",
      "A training row for a label at day t can only use feature values that existed at day t. The point-in-time join takes the latest row on or before the label day, and drops it if it is older than the TTL. A naive join on the user ID takes the newest row in the table. That row often comes from after the label and copies the future into training.": "标签日期为 t 的训练记录，只能使用当时已经存在的特征值。时点连接选择标签当日或之前的最新记录，若其年龄超过 TTL 则舍弃。朴素的用户 ID 连接会选取表中最新记录，而该记录经常晚于标签日期，从而把未来信息复制进训练。",
      "none": "无",
      "no row inside the TTL, so the default value is used": "TTL 内无记录，因此使用默认值"
    },
    "patterns": [
      [
        "^label day (\\d+)$",
        "标签日期 $1"
      ],
      [
        "^naive join reads d(\\d+)$",
        "朴素连接读取 d$1"
      ],
      [
        "^joined from day (\\d+), (\\d+) days old$",
        "连接第 $1 天的记录，已有 $2 天"
      ],
      [
        "^(\\d+) future rows hidden from this label  ·  naive latest join returns (.+) from day (\\d+), which leaks the future$",
        "对该标签隐藏 $1 条未来记录  ·  朴素的最新连接返回第 $3 天的 $2，导致未来信息泄漏"
      ],
      [
        "^(\\d+) future rows hidden from this label  ·  naive latest join returns (.+) from day (\\d+)$",
        "对该标签隐藏 $1 条未来记录  ·  朴素的最新连接返回第 $3 天的 $2"
      ],
      [
        "^(\\d+) future row hidden from this label  ·  naive latest join returns (.+) from day (\\d+)(, which leaks the future)?$",
        "对该标签隐藏 $1 条未来记录  ·  朴素的最新连接返回第 $3 天的 $2，泄漏未来信息"
      ]
    ],
    "preserve": []
  }
};
