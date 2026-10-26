(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-speech2.js"] = {
  "sp-asr-attention": {
    "text": {
      "ASR CROSS-ATTENTION": "ASR 交叉注意力",
      "decoder attends over audio": "解码器关注音频",
      "Whisper is an encoder-decoder. The encoder turns the 30-second log-mel window into a row of audio frames, and the decoder emits tokens one at a time, each step cross-attending over those frames. The highlighted band shows attention drifting left to right as the transcript advances, a soft learned alignment rather than the fixed per-frame labels a CTC model uses.": "Whisper 是编码器—解码器模型。编码器将 30 秒的对数梅尔窗口转为一列音频帧，解码器逐个输出 token，每一步都对这些帧做交叉注意力。高亮带随转录推进从左向右移动，表示学得的软对齐，而非 CTC 模型使用的固定逐帧标签。",
      "encoder: 30 s log-mel frames": "编码器：30 秒对数梅尔帧",
      "decoder: cross-attends, emits one token at a time": "解码器：做交叉注意力，每次输出一个 token",
      "attention drifts left-to-right: a learned, soft alignment (no blank token)": "注意力从左向右移动：学得的软对齐（没有 blank token）"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "<sot>",
        "reason": "保留转录样例的特殊token与输入词语"
      },
      {
        "text": "the",
        "reason": "保留转录样例的特殊token与输入词语"
      },
      {
        "text": "cat",
        "reason": "保留转录样例的特殊token与输入词语"
      },
      {
        "text": "sat",
        "reason": "保留转录样例的特殊token与输入词语"
      }
    ]
  },
  "sp-eer-crossover": {
    "text": {
      "EER CROSSOVER": "等错误率交点",
      "slide the threshold": "移动阈值",
      "Raise the threshold and you reject more genuine speakers (false reject rate climbs); lower it and you accept more impostors (false accept rate climbs). The orange line sweeps the threshold and settles where the two curves cross. That single crossover point is the Equal Error Rate, the one number every speaker-verification leaderboard quotes.": "提高阈值会拒绝更多真实说话人，误拒率上升；降低阈值则会接受更多冒充者，误受率上升。橙线扫描阈值，停在两条曲线相交之处。这个交点就是等错误率（EER），也是说话人验证排行榜常用的单项指标。",
      "error rate vs decision threshold": "错误率与决策阈值",
      "EER: FAR = FRR": "等错误率 EER：FAR = FRR"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "FAR",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "FRR",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "sp-tts-stack": {
    "text": {
      "TTS STACK": "TTS 流水线",
      "text to mel to waveform": "文本到梅尔谱，再到波形",
      "Modern text-to-speech runs three stages. The frontend turns the string into tokens, the acoustic model paints a mel spectrogram column by column, and the vocoder turns that mel into an audible waveform. End-to-end flow-matching models blur the last two stages, but this three-part picture is still how you reason about and debug a synthesised voice.": "现代文本转语音包含三个阶段：前端把字符串转为 token，声学模型逐列绘制梅尔频谱图，声码器再把梅尔谱转成可听波形。端到端流匹配模型弱化了后两个阶段的边界，但分析和调试合成语音时，这幅三段图仍然有用。",
      "text -> tokens": "文本 -> token",
      "acoustic model -> mel spectrogram": "声学模型 -> 梅尔频谱图",
      "vocoder -> waveform": "声码器 -> 波形"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "hel",
        "reason": "保留语音合成输入的分词片段，避免改变示例语料"
      },
      {
        "text": "lo",
        "reason": "保留语音合成输入的分词片段，避免改变示例语料"
      },
      {
        "text": "wor",
        "reason": "保留语音合成输入的分词片段，避免改变示例语料"
      },
      {
        "text": "ld",
        "reason": "保留语音合成输入的分词片段，避免改变示例语料"
      }
    ]
  },
  "sp-voice-factorize": {
    "text": {
      "VOICE FACTORIZE": "语音因素分解",
      "split, swap speaker, recombine": "分解、更换说话人、重组",
      "Cloning and conversion rest on one decomposition: separate what was said from who said it. The source clip is factorized into a content representation and a speaker embedding; the source speaker is dropped and a reference embedding from a five-second clip of person B is swapped in. Recombining content with the new speaker yields B saying the same words, which is why a consent gate and watermark are mandatory.": "克隆和转换都基于同一种分解：把“说了什么”与“谁在说”分开。源片段被拆为内容表示和说话人嵌入；源说话人被移除，换入从 B 的五秒片段提取的参考嵌入。将内容与新说话人重组，便得到 B 说出相同词语的结果，因此必须设置同意关卡和水印。",
      "source: person A says \"hello\"": "源音频：A 说“hello”",
      "factorize": "分解",
      "content": "内容",
      "spk A (dropped)": "说话人 A（已移除）",
      "reference: 5 s of person B": "参考音频：B 的 5 秒片段",
      "recombine -> B says \"hello\"": "重组 -> B 说“hello”",
      "same content, swapped speaker identity; an inaudible watermark is required": "内容不变，更换说话人身份；必须加入不可听水印"
    },
    "patterns": [],
    "preserve": []
  },
  "sp-codec-tokens": {
    "text": {
      "NEURAL CODEC TOKENS": "神经音频编解码 token",
      "RVQ codebooks to waveform": "从 RVQ 码本到波形",
      "A neural audio codec discretizes sound with residual vector quantization: the first codebook captures the signal, each later one quantizes the leftover residual. Splitting the first codebook as semantic (the linguistic content, gold) from the acoustic remainder lets a transformer predict speech tokens the way it predicts words. The decoder sums the chosen codes per frame back into a waveform.": "神经音频编解码器用残差向量量化将声音离散化：第一个码本捕获信号，后续码本逐个量化剩余残差。把第一个码本视为语义部分（金色，语言内容），与其余声学部分分开，transformer 就能像预测词语一样预测语音 token。解码器逐帧将选中的编码相加，重建波形。",
      "residual vector quantization: 4 codebooks per frame": "残差向量量化：每帧 4 个码本",
      "q0 = semantic (linguistic content)   q1..q3 = acoustic detail": "q0 = 语义（语言内容）   q1..q3 = 声学细节",
      "decoder sums codes ->": "解码器将编码相加 ->"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "q0",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "q1",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "q2",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      },
      {
        "text": "q3",
        "reason": "保留公式、代码标识或模型方法名称的原始字面量"
      }
    ]
  },
  "sp-vad-cascade": {
    "text": {
      "VAD + TURN-TAKING": "VAD 与轮次交接",
      "speech, pause, hangover, turn end": "语音、停顿、静音延迟、轮次结束",
      "The detector labels every 20 ms frame as speech or silence. A brief mid-sentence pause must not end the turn, so a silence hangover timer has to fill all the way before end-pointing fires. Set the hangover too short and you cut users off; too long and the assistant never stops waiting. The turn ends only when sustained silence outlasts the timer.": "检测器将每个 20 ms 帧标为语音或静音。句中短暂停顿不能结束轮次，因此静音延迟计时器必须完全走满，才触发终点检测。延迟设得太短会打断用户，太长则助手一直等待。只有持续静音超过计时器，轮次才会结束。",
      "is this 20 ms frame speech? Silero VAD per frame": "这个 20 ms 帧是语音吗？逐帧运行 Silero VAD",
      "VAD decision": "VAD 判定",
      "silence hangover -> turn end fires": "静音延迟 -> 触发轮次结束"
    },
    "patterns": [],
    "preserve": []
  },
  "sp-fullduplex": {
    "text": {
      "FULL-DUPLEX SPEECH": "全双工语音",
      "listen and speak at once": "同时听与说",
      "A pipelined voice agent has a latency floor because each stage waits on the one before it. A full-duplex model collapses the pipeline: it consumes the incoming user stream and emits its own audio stream simultaneously, with a text inner monologue as an intermediate rather than a required stage. Listening and speaking overlap, which is how 200 ms response latency becomes possible.": "流水线式语音 agent 的延迟有下限，因为每个阶段都要等待前一阶段。全双工模型将流水线合并：它在接收用户输入流的同时，生成自己的音频流；文本内部独白是中间表示，而不是必经的独立阶段。听与说相互重叠，因此有可能实现 200 ms 响应延迟。",
      "user audio in (Mimi tokens, constantly arriving)": "用户音频输入（Mimi token，持续到达）",
      "inner-monologue text (intermediate, not a separate stage)": "内部独白文本（中间表示，不是独立阶段）",
      "model audio out (generated at the same time, full-duplex)": "模型音频输出（同时生成，全双工）"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "the",
        "reason": "保留内部独白中的原始示例词语，不改变模型输出演示"
      },
      {
        "text": "weather",
        "reason": "保留内部独白中的原始示例词语，不改变模型输出演示"
      },
      {
        "text": "is",
        "reason": "保留内部独白中的原始示例词语，不改变模型输出演示"
      },
      {
        "text": "sunny",
        "reason": "保留内部独白中的原始示例词语，不改变模型输出演示"
      },
      {
        "text": "today",
        "reason": "保留内部独白中的原始示例词语，不改变模型输出演示"
      }
    ]
  },
  "sp-wer-align": {
    "text": {
      "WORD ERROR RATE": "词错误率",
      "align ref to hypothesis": "对齐参考文本与识别假设",
      "Word error rate is an edit distance. The transcript is aligned to the reference word by word, and every mismatch is counted as a substitution, deletion, or insertion. Their sum divided by the number of reference words is the WER. Here one substitution (kitchen to chicken), one deletion (the), and one insertion (now) over five reference words give sixty percent.": "词错误率是一种编辑距离。转录文本与参考文本逐词对齐，每处不匹配都计为替换、删除或插入。三者总和除以参考词数，便得到 WER。此处有一次替换（kitchen 变为 chicken）、一次删除（the）和一次插入（now），参考文本共五个词，因此为百分之六十。",
      "reference": "参考文本",
      "hypothesis (ASR output)": "识别假设（ASR 输出）",
      "DEL": "删除",
      "SUB": "替换",
      "INS": "插入"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "turn",
        "reason": "保留WER对齐样本中的原始词语和公式；翻译词语会改变编辑距离演示"
      },
      {
        "text": "on",
        "reason": "保留WER对齐样本中的原始词语和公式；翻译词语会改变编辑距离演示"
      },
      {
        "text": "the",
        "reason": "保留WER对齐样本中的原始词语和公式；翻译词语会改变编辑距离演示"
      },
      {
        "text": "kitchen",
        "reason": "保留WER对齐样本中的原始词语和公式；翻译词语会改变编辑距离演示"
      },
      {
        "text": "chicken",
        "reason": "保留WER对齐样本中的原始词语和公式；翻译词语会改变编辑距离演示"
      },
      {
        "text": "now",
        "reason": "保留WER对齐样本中的原始词语和公式；翻译词语会改变编辑距离演示"
      },
      {
        "text": "lights",
        "reason": "保留WER对齐样本中的原始词语和公式；翻译词语会改变编辑距离演示"
      },
      {
        "text": "WER = (S + D + I) / N = (1 + 1 + 1) / 5 = 60%",
        "reason": "保留WER对齐样本中的原始词语和公式；翻译词语会改变编辑距离演示"
      }
    ]
  }
};
