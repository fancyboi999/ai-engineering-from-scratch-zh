(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-visaudio4.js"] = {
  "v4-video-temporal": {
    "text": {
      "Motion reduced": "已减少动画",
      "VIDEO · TEMPORAL MODELLING": "视频 · 时间建模",
      "when does time get modelled?": "在哪一步建模时间？",
      "A 2D+pool model runs the same image CNN on each frame and averages the features over time, so \"pushing left\" and \"pushing right\" collapse into the same clip vector. A 3D conv slides its kernel through time as well as space: it sees a short window of frames at once and can encode direction. Spatio-temporal transformers finish the idea by attending over every (t, h, w) token jointly, at quadratic cost in clip length.": "2D+池化模型对每一帧运行相同的图像 CNN，再沿时间平均特征，因此“向左推”和“向右推”会得到相同的视频片段向量。3D 卷积的卷积核同时沿时间与空间滑动，一次观察短时间窗口内的多帧，因而能够编码方向。时空 transformer 则联合关注每个 (t, h, w) token，将这一思路推得更远，代价是计算量随片段长度平方增长。",
      "same five frames, two ways of reading time": "同样五帧，读取时间的两种方式",
      "2D + pool": "2D + 池化",
      "avg over T": "沿时间 T 求平均",
      "motion lost": "丢失运动信息",
      "3D conv": "3D 卷积",
      "motion kept": "保留运动信息",
      "transformers go further: attention over every (t, h, w) token at once": "transformer 更进一步：同时关注每个 (t, h, w) token",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "v4-vision-pipeline": {
    "text": {
      "Motion reduced": "已减少动画",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "ConvNeXt-T",
        "reason": "模型名、结构化输出字面量或按 token 展示的英文输入样本保留原样。"
      },
      {
        "text": "label: cereal 0.94",
        "reason": "模型名、结构化输出字面量或按 token 展示的英文输入样本保留原样。"
      },
      {
        "text": "\"box\": [82,74,..]",
        "reason": "模型名、结构化输出字面量或按 token 展示的英文输入样本保留原样。"
      },
      {
        "text": "\"cls\": \"cereal\"",
        "reason": "模型名、结构化输出字面量或按 token 展示的英文输入样本保留原样。"
      },
      {
        "text": "\"score\": 0.94",
        "reason": "模型名、结构化输出字面量或按 token 展示的英文输入样本保留原样。"
      }
    ]
  },
  "v4-vlm-projector": {
    "text": {
      "Motion reduced": "已减少动画",
      "image tokens join the text stream": "图像 token 加入文本流",
      "Every production VLM is the same three parts. A ViT slices the image into patches and encodes each one; a small MLP projects those patch embeddings into the LLM token space; the decoder then reads image tokens and text tokens as one interleaved sequence, so \"how many red cars?\" is answered by ordinary next-token prediction. Swapping the ViT, the projector, or the LLM is mechanical once the pattern is in place.": "生产 VLM 都由三部分组成：ViT 把图像切块并逐块编码，小型 MLP 把图像块嵌入投影到 LLM 的 token 空间，解码器再把图像 token 与文本 token 当作交错序列读取。因此，“有多少辆红色汽车？”可以通过普通的下一个 token 预测回答。理解这一模式后，更换 ViT、投影器或 LLM 都只是组件替换。",
      "ViT-MLP-LLM: the image enters the LLM as tokens": "ViT-MLP-LLM：图像以 token 形式进入 LLM",
      "patches": "图像分块",
      "ViT + MLP projector": "ViT + MLP 投影器",
      "text: \"how many red cars?\"": "文本：\"how many red cars?\"",
      "image tokens": "图像 token",
      "LLM decoder": "LLM 解码器",
      "answer: \"3\"": "回答：\"3\"",
      "one interleaved sequence: [img][img][img][img][how][many][red][cars] -> next-token prediction": "交错序列：[img][img][img][img][how][many][red][cars] -> 下一个 token 预测",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "VLM · ViT-MLP-LLM",
        "reason": "公式、协议标识或技术专名，原样保留。"
      },
      {
        "text": "how",
        "reason": "模型名、结构化输出字面量或按 token 展示的英文输入样本保留原样。"
      },
      {
        "text": "many",
        "reason": "模型名、结构化输出字面量或按 token 展示的英文输入样本保留原样。"
      },
      {
        "text": "red",
        "reason": "模型名、结构化输出字面量或按 token 展示的英文输入样本保留原样。"
      },
      {
        "text": "cars",
        "reason": "模型名、结构化输出字面量或按 token 展示的英文输入样本保留原样。"
      }
    ]
  },
  "v4-world-rollout": {
    "text": {
      "Motion reduced": "已减少动画",
      "WORLD MODELS · ACTION-CONDITIONED ROLLOUT": "世界模型 · 以行动为条件的推演",
      "predict, act, feed back, repeat": "预测、行动、反馈、重复",
      "Pure video generation predicts frames from a prompt and stops. A world model is the same video DiT run in a loop: each denoised chunk is appended to the context, an action token (turn left, open door) conditions the next prediction, and the model becomes a learned simulator you can steer. Drift is the failure mode, because every hallucinated pixel becomes future input.": "纯视频生成根据 prompt 预测帧后就停止。世界模型则把同一个视频 DiT 放进循环：每段去噪后的内容追加到上下文，行动 token（向左转、开门）作为下一次预测的条件，模型由此成为可以操控的学习式模拟器。它的失效方式是漂移，因为每个虚构像素都会成为未来的输入。",
      "a world model rolls the future out of its own predictions": "世界模型用自己的预测继续推演未来",
      "frame t (context)": "第 t 帧（上下文）",
      "turn left": "向左转",
      "frame t+1, denoising": "第 t+1 帧，正在去噪",
      "open door": "开门",
      "frame t+2": "第 t+2 帧",
      "each generated frame re-enters the context window": "每个生成帧重新进入上下文窗口",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "v4-alm-tokens": {
    "text": {
      "Motion reduced": "已减少动画",
      "AUDIO-LANGUAGE MODELS · ONE STREAM": "音频语言模型 · 同一条序列",
      "sound events become tokens the LLM reads": "声音事件转为 LLM 可读取的 token",
      "An audio-language model keeps the three-part template: an audio encoder (Whisper, BEATs) turns each stretch of sound into embeddings, a projector maps them into the LLM token space, and the decoder reads them inline with the text prompt. Answering \"is anyone hurt?\" needs all three events at once, the bark, the shout, and the silence after. That joint read is exactly what a transcript-only ASR pipeline throws away.": "音频语言模型沿用三部分模板：音频编码器（Whisper、BEATs）把每段声音转为嵌入，投影器将其映射到 LLM token 空间，解码器把这些嵌入与文本 prompt 一起读取。回答“有人受伤吗？”需要同时理解犬吠、喊叫以及随后的寂静。只依赖转录的 ASR 流水线恰好丢失了这种联合信息。",
      "five seconds of audio, three events, one token stream": "五秒音频、三个事件、同一条 token 流",
      "bark": "犬吠",
      "\"stop!\"": "\"停下！\"",
      "silence": "寂静",
      "answer: \"yes, likely danger: a bark, a shout, then silence\"": "回答：\"是的，可能有危险：先有犬吠和喊叫，随后一片寂静\"",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "anyone",
        "reason": "模型名、结构化输出字面量或按 token 展示的英文输入样本保留原样。"
      },
      {
        "text": "hurt",
        "reason": "模型名、结构化输出字面量或按 token 展示的英文输入样本保留原样。"
      }
    ]
  },
  "v4-voice-latency": {
    "text": {
      "Motion reduced": "已减少动画",
      "VOICE ASSISTANT · LATENCY LANES": "语音助手 · 延迟泳道",
      "overlap beats sequential": "重叠执行优于串行执行",
      "The 800 ms feel comes from overlap, not from any single fast component. STT starts on partial speech, the LLM starts on the partial transcript, TTS starts after the first few tokens, and the first audio byte lands around 750 ms, inside the budget. When the user barges in, the VAD event cancels TTS and playback immediately: the fastest path in the pipeline is the one that stops it.": "约 800 ms 的响应感来自重叠执行，而不是某个组件单独足够快。STT 从部分语音开始处理，LLM 根据部分转录开始生成，TTS 收到前几个 token 就启动，首个音频字节约在 750 ms 到达，仍在预算以内。用户插话时，VAD 事件立即取消 TTS 和播放；流水线中最快的路径，是让它停止的路径。",
      "streamed stages overlap; the reply starts before the budget line": "流式阶段彼此重叠，回复在预算线之前开始",
      "800 ms budget": "800 ms 预算",
      "user speech": "用户语音",
      "stt": "语音识别",
      "tts": "语音合成",
      "audio out": "音频输出",
      "first audio: 750 ms": "首段音频：750 ms",
      "barge-in: cancel tts": "用户插话：取消语音合成",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "v4-audio-watermark": {
    "text": {
      "Motion reduced": "已减少动画",
      "AUDIO WATERMARKING · SURVIVAL": "音频水印 · 抗失真能力",
      "embed, distort, still detect": "嵌入、失真后仍可检测",
      "AudioSeal-style watermarking adds a learned, imperceptible signal to every sample of generated speech. The point is not secrecy but survival: after MP3 compression, cropping, and resampling, the detector still recovers the payload bits that mark the clip as synthetic. Detection models like AASIST and RawNet2 handle the uncooperative adversary; the watermark handles your own outputs. Ship voice cloning with both.": "AudioSeal 一类水印方法给生成语音的每个采样点加入可学习、不可感知的信号。目标不是保密，而是抗失真：经过 MP3 压缩、裁剪和重采样后，检测器仍能恢复标记合成音频的载荷位。AASIST 和 RawNet2 等检测模型应对不配合的攻击者，水印则用于标记自己系统的输出。发布声音克隆能力时，两者都需要。",
      "the watermark rides below hearing and survives the pipeline": "水印低于听觉感知阈值，经过处理后仍能保留",
      "generated speech": "生成语音",
      "+ watermark (inaudible)": "+ 水印（不可听见）",
      "mp3 · crop": "MP3 · 裁剪",
      "resample": "重采样",
      "distorted copy": "失真副本",
      "detector": "检测器",
      "payload recovered": "已恢复载荷",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "v4-controlnet-zero": {
    "text": {
      "Motion reduced": "已减少动画",
      "CONTROLNET · ZERO-CONV STEERING": "ControlNet · 零卷积引导",
      "the side branch starts silent": "侧分支初始时不产生影响",
      "ControlNet clones the encoder half of a pretrained U-Net, feeds the clone a pose map, and wires its features back into the frozen decoder through 1x1 convolutions initialised to zero. At step zero the side branch is exactly a no-op, so training can only improve on the base model; as the zero-convs warm up, the pose starts steering generation. LoRA plays the same trick on the weights themselves: a low-rank delta beside frozen attention matrices.": "ControlNet 复制预训练 U-Net 的编码器部分，把姿态图送入副本，再通过零初始化的 1x1 卷积把副本特征接回冻结的解码器。第零步时侧分支完全不影响结果，因此训练从基础模型原有能力出发；零卷积逐渐学到非零权重后，姿态开始引导生成。LoRA 在权重上采用类似办法：在冻结的注意力矩阵旁学习低秩增量。",
      "a trainable clone steers a frozen U-Net through zero-convs": "可训练副本通过零卷积引导冻结的 U-Net",
      "pose map": "姿态图",
      "trainable clone": "可训练副本",
      "frozen SD U-Net": "冻结的 Stable Diffusion U-Net",
      "encoder": "编码器",
      "decoder": "解码器",
      "zero-conv links: start as a no-op, learn the nudge": "零卷积连接：初始不改变输出，再学习引导信号",
      "pose-locked output": "由姿态约束的输出",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "v4-3d-multiview": {
    "text": {
      "Motion reduced": "已减少动画",
      "3D GENERATION · TWO-STAGE STACK": "3D 生成 · 两阶段架构",
      "views first, geometry second": "先生成视图，再恢复几何",
      "The 2026 text-to-3D stack splits the problem in two. A multi-view diffusion model (Zero123, MVDream, SV3D) generates a ring of consistent views around the object from one photo or prompt; a reconstruction step then fits a cloud of oriented 3D Gaussians to those views by gradient descent. Rendering the splats is just projection plus alpha-compositing, which is why the result runs at real-time frame rates on a consumer GPU.": "2026 年的文生 3D 架构把问题分成两步。多视图扩散模型（Zero123、MVDream、SV3D）从一张照片或一个 prompt 生成围绕对象的一组一致视图；随后，重建步骤通过梯度下降为这些视图拟合有方向的 3D 高斯点云。渲染高斯体只需投影与 alpha 合成，因此普通消费级 GPU 也能以实时帧率运行结果。",
      "one photo becomes an orbit of views becomes a cloud of Gaussians": "一张照片变成环绕视图，再变成高斯点云",
      "single image": "单张图像",
      "multi-view diffusion": "多视图扩散",
      "3D Gaussian splats": "3D 高斯泼溅",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  }
};
