(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-re-35.js"] = {
  "re-evidence-ledger": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "observed · shipped-artifact": "已观察 · 已交付产物",
      "derived · shipped-artifact": "已推导 · 已交付产物",
      "observed · controlled-replay": "已观察 · 受控回放",
      "pass": "通过",
      "unsupported": "缺少支持证据",
      "unknown 1/11": "未知 1/11",
      "derived": "已推导",
      "Claims": "主张",
      "dangling": "引用悬空",
      "unsupported 0/11": "缺少支持证据 0/11"
    },
    "patterns": [
      [
        "^Does ([\\s\\S]+) hold when the compiled function runs\\?$",
        "编译后的函数运行时，$1 是否成立？"
      ],
      [
        "^(ev_[a-f0-9]+) \\(inferred prediction\\)([\\s\\S]*)$",
        "$1（推断预测）$2"
      ],
      [
        "^unknown\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)/([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "未知 $1/$2"
      ],
      [
        "^unsupported\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)/([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "缺少支持证据 $1/$2"
      ]
    ],
    "preserve": [
      {
        "text": "grade(95) == 4",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "grade(55) == 0",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      }
    ]
  }
};
