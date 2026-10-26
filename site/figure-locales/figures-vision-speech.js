(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-vision-speech.js"] = {
  "conv-output-size": {
    "text": {
      "CONV OUTPUT SIZE": "卷积输出尺寸",
      "The spatial size out of a convolution follows one formula: floor((W − K + 2P) / S) + 1. Padding P adds border so the kernel can reach the edges and keep size; stride S skips positions and shrinks the output. \"Same\" padding picks P so the output matches the input; \"valid\" padding uses P = 0 and shrinks by K − 1.": "卷积输出的空间尺寸只有一条公式：floor((W − K + 2P) / S) + 1。填充 P 加边让核够到边缘、保住尺寸；步幅 S 跳过位置、收缩输出。\"Same\" 填充选 P 使输出对齐输入；\"valid\" 填充 P = 0，缩小 K − 1。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "padded input = 34 (grey = padding, box = kernel)": "填充后输入 = 34（灰色 = 填充，方框 = 卷积核）",
      "output positions = 32": "输出位置数 = 32",
      "W 32  K 3  S 1  P 1  →  32 per side": "W 32  K 3  S 1  P 1 → 每边 32",
      "kernel larger than padded input: no valid output": "卷积核大于填充后的输入：没有有效输出"
    },
    "patterns": [
      [
        "^W (\\d+)  K (\\d+)  S (\\d+)  P (\\d+)  →  (\\d+) per side$",
        "W $1  K $2  S $3  P $4 → 每边 $5"
      ],
      [
        "^padded\\ input\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\(grey\\ =\\ padding,\\ box\\ =\\ kernel\\)$",
        "填充后输入 = $1（灰色 = 填充，方框 = 卷积核）"
      ],
      [
        "^output\\ positions\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "输出位置数 = $1"
      ],
      [
        "^W\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ K\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ S\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ P\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ →\\ \\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ per\\ side$",
        "W $1  K $2  S $3  P $4 → 每边 $5"
      ]
    ],
    "preserve": [
      {
        "text": "out = floor((W − K + 2P) / S) + 1 = floor((32 − 3 + 2) / 1) + 1",
        "reason": "产品、标准、数学记号或原样演示数据，不属于读者说明文案"
      },
      {
        "text": "out = floor((W − K + 2P) / S) + 1 = floor((4 − 3 + 2) / 1) + 1",
        "reason": "控件切换后的原始代码、协议参数、反编译证据或数学表达式，保持机器含义和数值不变"
      },
      {
        "text": "out = floor((W − K + 2P) / S) + 1 = floor((64 − 3 + 2) / 1) + 1",
        "reason": "控件切换后的原始代码、协议参数、反编译证据或数学表达式，保持机器含义和数值不变"
      },
      {
        "text": "out = floor((W − K + 2P) / S) + 1 = floor((64 − 1 + 2) / 1) + 1",
        "reason": "控件切换后的原始代码、协议参数、反编译证据或数学表达式，保持机器含义和数值不变"
      },
      {
        "text": "out = floor((W − K + 2P) / S) + 1 = floor((64 − 11 + 2) / 1) + 1",
        "reason": "控件切换后的原始代码、协议参数、反编译证据或数学表达式，保持机器含义和数值不变"
      },
      {
        "text": "out = floor((W − K + 2P) / S) + 1 = floor((64 − 11 + 2) / 4) + 1",
        "reason": "控件切换后的原始代码、协议参数、反编译证据或数学表达式，保持机器含义和数值不变"
      },
      {
        "text": "out = floor((W − K + 2P) / S) + 1 = floor((64 − 11 + 0) / 4) + 1",
        "reason": "控件切换后的原始代码、协议参数、反编译证据或数学表达式，保持机器含义和数值不变"
      },
      {
        "text": "out = floor((W − K + 2P) / S) + 1 = floor((64 − 11 + 10) / 4) + 1",
        "reason": "控件切换后的原始代码、协议参数、反编译证据或数学表达式，保持机器含义和数值不变"
      }
    ]
  },
  "convolution-kernel": {
    "text": {
      "CONVOLUTION KERNEL": "卷积核",
      "A convolution lays a small kernel over every 3x3 patch of the image and sums the elementwise products. The edge kernel cancels flat regions and lights up the vertical band; blur averages neighbors; sharpen amplifies the center against its surround. The output is two pixels smaller per side because the window cannot center on the border.": "卷积把一个小核罩在图像的每个 3x3 区域上，对元素乘积求和。边缘核抵消平坦区域、点亮竖直条带；模糊核对邻居取平均；锐化核放大中心与四周的对比。输出每边小两个像素，因为窗口没法以边界为中心。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "edge detect": "边缘检测",
      "blur (box)": "方框模糊",
      "sharpen": "锐化",
      "identity": "恒等",
      "input 8x8": "输入 8x8",
      "output 6x6": "输出 6x6",
      "window at (0,0)  ·  output = 0.0": "窗口位于 (0,0) · 输出 = 0.0",
      "output = Σ kernel · patch   ·   kernel rows [-1 -1 -1] [-1 8 -1] [-1 -1 -1]": "输出 = Σ 卷积核 · 图像块 · 卷积核各行 [-1 -1 -1] [-1 8 -1] [-1 -1 -1]"
    },
    "patterns": [
      [
        "^window at \\((\\d+),(\\d+)\\)  ·  output = ([-\\d.]+)  \\(sum / (\\d+)\\)$",
        "窗口位于 ($1,$2) · 输出 = $3（求和 / $4）"
      ],
      [
        "^output = Σ kernel · patch   ·   kernel rows (\\[[-\\d ]+\\] \\[[-\\d ]+\\] \\[[-\\d ]+\\])$",
        "输出 = Σ 卷积核 · 图像块 · 卷积核各行 $1"
      ],
      [
        "^input\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)x8$",
        "输入 $1x8"
      ],
      [
        "^output\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)x6$",
        "输出 $1x6"
      ],
      [
        "^window\\ at\\ \\(([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\)\\ \\ ·\\ \\ output\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)$",
        "窗口位于 ($1) · 输出 = $2"
      ],
      [
        "^output\\ =\\ Σ\\ kernel\\ ·\\ patch\\ \\ \\ ·\\ \\ \\ kernel\\ rows\\ \\[([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\]\\ \\[([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\]\\ \\[([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\]$",
        "输出 = Σ 卷积核 · 图像块 · 卷积核各行 [$1 $2 $3] [$4 $5 $6] [$7 $8 $9]"
      ]
    ],
    "preserve": []
  },
  "pooling": {
    "text": {
      "POOLING": "池化",
      "Pooling downsamples a feature map by summarizing each window into one value. A 2x2 window with stride 2 halves both dimensions, turning the 4x4 grid into 2x2. Max pooling forwards the strongest activation in each window (highlighted); average pooling forwards the mean. The result is smaller, translation-tolerant, and cheaper for the next layer.": "池化把特征图降采样，每个窗口汇总成一个值。2x2 窗口、步幅 2 让两个维度各减半，4x4 网格变 2x2。最大池化传递窗口内最强的激活（高亮）；平均池化传递均值。结果更小、对平移更宽容，也让下一层更便宜。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "max": "最大值",
      "average": "平均值",
      "input 4x4": "输入 4x4",
      "output 2x2": "输出 2x2",
      "each 2x2 window keeps its largest value (outlined in the input)": "每个 2x2 窗口保留最大值（在输入中描边标出）",
      "each 2x2 window keeps the average of its four values": "每个 2x2 窗口保留四个值的平均值",
      "2x2 window, stride 2  ·  4x4 → 2x2  ·  out = max(window)": "2x2 窗口，步幅 2 · 4x4 → 2x2 · out = max(window)",
      "2x2 window, stride 2  ·  4x4 → 2x2  ·  out = mean(window)": "2x2 窗口，步幅 2 · 4x4 → 2x2 · out = mean(window)"
    },
    "patterns": [
      [
        "^input\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)x4$",
        "输入 $1x4"
      ],
      [
        "^output\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)x2$",
        "输出 $1x2"
      ],
      [
        "^each\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)x2\\ window\\ keeps\\ its\\ largest\\ value\\ \\(outlined\\ in\\ the\\ input\\)$",
        "每个 $1x2 窗口保留最大值（在输入中描边标出）"
      ],
      [
        "^each\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)x2\\ window\\ keeps\\ the\\ average\\ of\\ its\\ four\\ values$",
        "每个 $1x2 窗口保留四个值的平均值"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)x2\\ window,\\ stride\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ ·\\ \\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)x4\\ →\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)x2\\ \\ ·\\ \\ out\\ =\\ max\\(window\\)$",
        "$1x2 窗口，步幅 $2 · $3x4 → $4x2 · out = max(window)"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)x2\\ window,\\ stride\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ ·\\ \\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)x4\\ →\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)x2\\ \\ ·\\ \\ out\\ =\\ mean\\(window\\)$",
        "$1x2 窗口，步幅 $2 · $3x4 → $4x2 · out = mean(window)"
      ]
    ],
    "preserve": []
  },
  "receptive-field": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "x 9 pixels": "x 9 像素",
      "4 conv layers  ·  kernel 3  ·  stride 1  ·  one output neuron sees a 9-pixel-wide region": "4 个卷积层 · 卷积核 3 · 步幅 1 · 一个输出神经元能看到宽 9 像素的区域",
      "RF grows by (k − 1) · Π(strides) per layer   ·   RF = 1 + Σ (k − 1) · s^(layer−1)": "每层 RF 增长 (k − 1) · Π(strides) · RF = 1 + Σ (k − 1) · s^(layer−1)"
    },
    "patterns": [
      [
        "^x\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ pixels$",
        "x $1 像素"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ conv\\ layers\\ \\ ·\\ \\ kernel\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ ·\\ \\ stride\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ ·\\ \\ one\\ output\\ neuron\\ sees\\ a\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\-pixel\\-wide\\ region$",
        "$1 个卷积层 · 卷积核 $2 · 步幅 $3 · 一个输出神经元能看到宽 $4 像素的区域"
      ],
      [
        "^RF\\ grows\\ by\\ \\(k\\ −\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\)\\ ·\\ Π\\(strides\\)\\ per\\ layer\\ \\ \\ ·\\ \\ \\ RF\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\+\\ Σ\\ \\(k\\ −\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\)\\ ·\\ s\\^\\(layer−([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\)$",
        "每层 RF 增长 (k − $1) · Π(strides) · RF = $2 + Σ (k − $3) · s^(layer−$4)"
      ]
    ],
    "preserve": []
  },
  "cnn-param-count": {
    "text": {
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "conv params": "个卷积参数"
    },
    "patterns": [],
    "preserve": []
  },
  "mel-scale": {
    "text": {
      "MEL SCALE": "梅尔刻度",
      "Human hearing resolves low frequencies finely and high ones coarsely. The mel scale bends linear Hz to match: it is near-linear below 1 kHz and compresses steeply above it, so a jump from 8 to 9 kHz spans far fewer mels than 200 to 300 Hz. Mel filterbanks spend their resolution where the ear actually cares.": "人耳对低频分辨细腻，对高频分辨粗糙。梅尔刻度把线性 Hz 弯成与之匹配：1 kHz 以下接近线性，往上急剧压缩，所以 8 到 9 kHz 的跨度折算的梅尔数远少于 200 到 300 Hz。梅尔滤波器组把分辨率花在耳朵真正在意的地方。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "mel": "梅尔",
      "4000 Hz is 25% of the Hz axis but only 60% up the mel axis  ·  high frequencies are compressed": "4000 Hz 位于 Hz 轴的 25% 处，却位于梅尔轴的 60% 处 · 高频被压缩",
      "mel = 2595 · log10(1 + f / 700)   ·   dashed line is the linear identity for comparison": "mel = 2595 · log10(1 + f / 700) · 虚线是用于比较的线性恒等映射"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ Hz\\ is\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%\\ of\\ the\\ Hz\\ axis\\ but\\ only\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)%\\ up\\ the\\ mel\\ axis\\ \\ ·\\ \\ high\\ frequencies\\ are\\ compressed$",
        "$1 Hz 位于 Hz 轴的 $2% 处，却位于梅尔轴的 $3% 处 · 高频被压缩"
      ],
      [
        "^mel\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ·\\ log1([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\(([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\+\\ f\\ /\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\)\\ \\ \\ ·\\ \\ \\ dashed\\ line\\ is\\ the\\ linear\\ identity\\ for\\ comparison$",
        "mel = $1 · log1$2($3 + f / $4) · 虚线是用于比较的线性恒等映射"
      ]
    ],
    "preserve": []
  },
  "spectrogram-window": {
    "text": {
      "SPECTROGRAM WINDOW": "频谱图窗口",
      "A spectrogram chops the signal into windows and takes a Fourier transform of each. A short window pins down when something happened but spreads its energy across frequency; a long window resolves pitch finely but smears it across time. The product of the two resolutions is fixed, so every choice trades one for the other.": "频谱图把信号切成窗口，对每个窗口做傅里叶变换。短窗口能定准事件发生的时间，能量却在频率上摊开；长窗口能精细分辨音高，却在时间上糊掉。两个分辨率之积是固定的，任何选择都是拿一个换另一个。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "time →": "时间 →",
      "freq": "频率",
      "window 256 samples = 16.0 ms  ·  freq bins every 62.5 Hz  ·  sharp in time, blurry in frequency": "窗口 256 个采样点 = 16.0 ms · 频率分箱间隔 62.5 Hz · 时间清晰，频率模糊",
      "time res = window / SR,  freq res = SR / window   ·   product is fixed (uncertainty)": "时间分辨率 = window / SR，频率分辨率 = SR / window · 二者乘积固定（不确定性）"
    },
    "patterns": [
      [
        "^window (\\d+) samples = ([\\d.]+) ms  ·  freq bins every ([\\d.]+) Hz  ·  sharp in frequency, blurry in time$",
        "窗口 $1 个采样点 = $2 ms · 频率分箱间隔 $3 Hz · 频率清晰，时间模糊"
      ],
      [
        "^window (\\d+) samples = ([\\d.]+) ms  ·  freq bins every ([\\d.]+) Hz  ·  balanced$",
        "窗口 $1 个采样点 = $2 ms · 频率分箱间隔 $3 Hz · 均衡"
      ],
      [
        "^window\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ samples\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ ms\\ \\ ·\\ \\ freq\\ bins\\ every\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ Hz\\ \\ ·\\ \\ sharp\\ in\\ time,\\ blurry\\ in\\ frequency$",
        "窗口 $1 个采样点 = $2 ms · 频率分箱间隔 $3 Hz · 时间清晰，频率模糊"
      ]
    ],
    "preserve": []
  },
  "nyquist-aliasing": {
    "text": {
      "NYQUIST & ALIASING": "奈奎斯特与混叠",
      "Grey is the true signal, blue dots are the samples, the dashed line is the wave those dots imply. As long as the sample rate exceeds twice the signal frequency, the samples reconstruct the original. Push the frequency past Nyquist (fs/2) and the same dots trace a lower, false frequency: that is aliasing, and it is why audio is low-pass filtered before sampling.": "灰色是真实信号，蓝点是采样，虚线是这些点暗示的波形。只要采样率超过信号频率的两倍，样本就能重建原信号。把频率推过奈奎斯特点（fs/2），同样这些点描出的却是一个更低的假频率：这就是混叠，也是音频采样前要先低通滤波的原因。",
      "Motion reduced": "已减少动态效果",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用",
      "sampled cleanly": "采样无混叠",
      "aliased": "发生混叠",
      "signal 7 Hz  ·  sample rate 20 Hz  ·  Nyquist = 10 Hz  ·  below Nyquist: faithfully captured": "信号 7 Hz · 采样率 20 Hz · 奈奎斯特频率 = 10 Hz · 低于奈奎斯特频率：忠实采集",
      "alias appears when f > fs/2   ·   f_alias = |f − round(f/fs)·fs|": "f > fs/2 时出现混叠 · f_alias = |f − round(f/fs)·fs|"
    },
    "patterns": [
      [
        "^signal ([\\d.]+) Hz  ·  sample rate ([\\d.]+) Hz  ·  Nyquist = ([\\d.]+) Hz  ·  above Nyquist: dots trace a false ([\\d.]+) Hz wave$",
        "信号 $1 Hz · 采样率 $2 Hz · 奈奎斯特频率 = $3 Hz · 超过奈奎斯特频率：采样点描出错误的 $4 Hz 波形"
      ],
      [
        "^aliased → ([\\d.]+) Hz$",
        "发生混叠 → $1 Hz"
      ],
      [
        "^signal\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ Hz\\ \\ ·\\ \\ sample\\ rate\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ Hz\\ \\ ·\\ \\ Nyquist\\ =\\ ([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ Hz\\ \\ ·\\ \\ below\\ Nyquist:\\ faithfully\\ captured$",
        "信号 $1 Hz · 采样率 $2 Hz · 奈奎斯特频率 = $3 Hz · 低于奈奎斯特频率：忠实采集"
      ],
      [
        "^alias\\ appears\\ when\\ f\\ >\\ fs/([-+]?\\d+(?:[.,]\\d+)*(?:[eE][-+]?\\d+)?)\\ \\ \\ ·\\ \\ \\ f_alias\\ =\\ \\|f\\ −\\ round\\(f/fs\\)·fs\\|$",
        "f > fs/$1 时出现混叠 · f_alias = |f − round(f/fs)·fs|"
      ]
    ],
    "preserve": []
  }
};
