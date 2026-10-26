(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-history.js"] = {
  "prediction-game": {
    "text": {
      "Motion reduced": "已减少动画",
      "THE PREDICTION GAME": "预测游戏",
      "A human guesses each hidden letter until correct; the guess counts alone can reconstruct the text, so their statistics bound the information per letter. A 27-symbol alphabet could carry 4.75 bits per letter. Human guessers with context needed close to 1. Every language model since is a mechanical player of this game, and perplexity is its score.": "人类逐个猜测隐藏字母，直到猜中；仅凭猜测次数就能重建文本，因此这些统计量给出了每个字母信息量的上界。27 个符号的字母表每个字母最多携带 4.75 比特，而看到上下文的人类猜测者只需要接近 1 比特。此后的每个语言模型都是这个游戏的机械玩家，困惑度就是它的得分。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "chatbot-lineage": {
    "text": {
      "Motion reduced": "已减少动画",
      "THE SCRIPTED HALF-CENTURY": "脚本机器人的半个世纪",
      "Every system on this line is one mechanism: match the input, emit a canned response, update a little state. PARRY added affect variables, ALICE added forty thousand categories, SmarterChild added backend lookups. Coverage grew linearly with rules; generality never arrived. That ceiling is why the next three paradigms exist.": "这条时间线上的系统都使用同一种机制：匹配输入、输出预制回复、更新少量状态。PARRY 加入情绪变量，ALICE 加入 4 万个类别，SmarterChild 加入后端查询。覆盖率随规则线性增长，通用性却始终没有出现；这个上限正是后三个范式存在的原因。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "ELIZA",
        "reason": "系统专名或数学公式，保持原样。"
      },
      {
        "text": "PARRY",
        "reason": "系统专名或数学公式，保持原样。"
      },
      {
        "text": "ALICE",
        "reason": "系统专名或数学公式，保持原样。"
      },
      {
        "text": "SMARTERCHILD",
        "reason": "系统专名或数学公式，保持原样。"
      }
    ]
  },
  "mask-derivation": {
    "text": {
      "Motion reduced": "已减少动画",
      "WHERE THE TRIANGLE COMES FROM": "三角掩码从何而来",
      "All three panels are a lower-triangular row-stochastic matrix multiplied against the sequence. The prefix average fixes every weight at 1/(i+1). Learned scores make the weights uneven but static. Attention makes them depend on the tokens themselves, which is why the third panel keeps shifting. The mask never changed; it is the loop bounds of the original average.": "三个面板都是用下三角行随机矩阵乘以序列。前缀平均把权重固定为 1/(i+1)；学习分数让权重变得不均匀但仍静态；注意力则让权重由 token 本身决定，所以第三个面板不断变化。掩码从未改变，它就是原始平均操作的循环边界。",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "softmax(S + M)",
        "reason": "系统专名或数学公式，保持原样。"
      },
      {
        "text": "softmax(QKᵀ/√d + M)",
        "reason": "系统专名或数学公式，保持原样。"
      }
    ]
  }
};
