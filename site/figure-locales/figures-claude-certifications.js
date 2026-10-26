(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-claude-certifications.js"] = {
  "prompt-cache-hit": {
    "text": {
      "saved = hit_rate × prefix_fraction = 0.80 × 0.70 = 0.56": "节省比例 = hit_rate × prefix_fraction = 0.80 × 0.70 = 0.56",
      "PROMPT CACHE HIT": "Prompt 缓存命中",
      "% prefill saved": "% 预填充计算节省量",
      "A long system prompt or document that repeats across calls can be prefilled once and reused. The cached prefix (dashed) skips recomputation, so only the new suffix (solid) is processed. The saving is the hit rate times the prefix fraction: a big shared prefix that is hit often is where caching pays off most.": "重复出现的长系统 prompt 或文档可以预填充一次并复用。虚线表示缓存前缀，跳过重复计算，只处理新的实线后缀。节省量等于命中率乘以前缀占比：共享前缀越大、命中越频繁，缓存收益越高。"
    },
    "patterns": [
      [
        "^cached prefix (\\d+)%$",
        "缓存前缀 $1%"
      ],
      [
        "^new (\\d+)%$",
        "新增 $1%"
      ],
      [
        "^hit rate (\\d+)%  ·  cached prefix skips recompute  ·  cost and time-to-first-token both drop by ~(\\d+)%$",
        "命中率 $1%  ·  缓存前缀跳过重复计算  ·  成本和首个 token 延迟均降低约 $2%"
      ],
      [
        "^saved = (hit_rate × prefix_fraction = [\\d.]+ × [\\d.]+ = [\\d.]+)$",
        "节省比例 = $1"
      ]
    ],
    "preserve": []
  },
  "01-claude-model-fit": {
    "text": {},
    "patterns": [],
    "preserve": [
      {
        "text": "Sonnet",
        "reason": "Claude 模型产品名"
      },
      {
        "text": "Haiku",
        "reason": "Claude 模型产品名"
      },
      {
        "text": "Opus",
        "reason": "Claude 模型产品名"
      }
    ]
  },
  "04-context-cache": {
    "text": {
      "saved = hit_rate × prefix_fraction = 0.80 × 0.70 = 0.56": "节省比例 = hit_rate × prefix_fraction = 0.80 × 0.70 = 0.56"
    },
    "patterns": [
      [
        "^saved = (hit_rate × prefix_fraction = [\\d.]+ × [\\d.]+ = [\\d.]+)$",
        "节省比例 = $1"
      ]
    ],
    "preserve": []
  }
};
