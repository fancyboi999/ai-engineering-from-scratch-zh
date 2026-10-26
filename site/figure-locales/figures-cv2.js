(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-cv2.js"] = {
  "object-detection-nms": {
    "text": {
      "Motion reduced": "已减少动画",
      "OBJECT DETECTION · NMS": "目标检测 · 非极大值抑制",
      "boxes pop in, overlaps pruned": "候选框出现，再剔除重叠框",
      "A YOLO head predicts a box at every grid cell, so one object spawns many overlapping candidates (dashed). Non-maximum suppression sorts them by confidence, keeps the strongest, and deletes every box that overlaps it too much. What survives is one tight box per object.": "YOLO 检测头在每个网格单元预测边界框，因此同一物体会产生多个重叠候选框（虚线）。非极大值抑制按置信度排序，保留最强候选，删除与其重叠过多的框。最后，每个物体只留下一个贴合的框。",
      "scene · all candidate boxes": "场景 · 全部候选框",
      "1 · dense grid of boxes": "1 · 密集候选框网格",
      "2 · score each box": "2 · 对每个框评分",
      "3 · sort by objectness": "3 · 按目标置信度排序",
      "4 · drop high-IoU overlaps": "4 · 删除高 IoU 重叠框",
      "5 · one box per object": "5 · 每个物体一个框",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ ·\\ dense\\ grid\\ of\\ boxes$",
        "$1 · 密集候选框网格"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ ·\\ score\\ each\\ box$",
        "$1 · 对每个框评分"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ ·\\ sort\\ by\\ objectness$",
        "$1 · 按目标置信度排序"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ ·\\ drop\\ high\\-IoU\\ overlaps$",
        "$1 · 删除高 IoU 重叠框"
      ],
      [
        "^([-+]?\\d+(?:[.,]\\d+)*)\\ ·\\ one\\ box\\ per\\ object$",
        "$1 · 每个物体一个框"
      ]
    ],
    "preserve": [
      {
        "text": "dog 0.94",
        "reason": "检测类别与分数的输出样本"
      }
    ]
  },
  "segmentation-flood": {
    "text": {
      "Motion reduced": "已减少动画",
      "SEMANTIC SEGMENTATION": "语义分割",
      "every pixel labelled, regions flood in": "逐像素标注，区域逐步填满",
      "Segmentation is classification at every pixel. The encoder compresses the image for context, the decoder upsamples back to full resolution, and a skip connection carries the fine spatial detail across so boundaries stay crisp. Watch each pixel claim its class as the mask floods outward.": "分割是在每个像素上做分类。编码器压缩图像以获得上下文，解码器上采样回完整分辨率，跳跃连接保留精细空间信息，使边界保持清晰。观察掩码扩散时，每个像素如何确定所属类别。",
      "input image": "输入图像",
      "per-pixel mask": "逐像素掩码",
      "skip connection": "跳跃连接",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": []
  },
  "cv-gan-image": {
    "text": {
      "Motion reduced": "已减少动画",
      "GAN · THE MINIMAX GAME": "GAN · 极小极大博弈",
      "one draws, one critiques": "一个绘图，一个评判",
      "The generator turns a noise vector into an image; the critic scores how real it looks. They train against each other: the generator pushes the critic's P(real) up, the critic pushes it down. As the seesaw settles toward balance the fake image sharpens from noise into structure.": "生成器将噪声向量变成图像；评论家评估图像看起来有多真实。两者对抗训练：生成器推动评论家的 P(real) 上升，评论家使其下降。跷跷板趋于平衡时，假图像也从噪声逐渐形成结构。",
      "noise z": "噪声 z",
      "generator G": "生成器 G",
      "fake image": "生成图像",
      "critic D": "评论家 D",
      "minimax — G pushes the score up, D pushes it down": "极小极大：G 提高分数，D 降低分数",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "P(real) →",
        "reason": "概率数学符号"
      }
    ]
  },
  "cv-diffusion-image": {
    "text": {
      "Motion reduced": "已减少动画",
      "DIFFUSION · DENOISING": "扩散 · 去噪",
      "from pure noise to a sample": "从纯噪声生成样本",
      "A diffusion model learns to remove a little noise at a time. Sampling starts from a grid of pure Gaussian noise and walks backward: each step predicts the noise and subtracts it, so structure emerges gradually. Repeat the small denoising step enough times and a coherent image condenses out of static.": "扩散模型学习每次去除少量噪声。采样从纯高斯噪声网格开始，逆向推进：每一步预测噪声并减去，结构逐渐出现。反复执行小步去噪，连贯图像便从随机噪声中形成。",
      "x_T  pure noise": "x_T  纯噪声",
      "x_0  sample": "x_0  样本",
      "reverse process: predict and subtract noise, step by step": "逆过程：逐步预测并减去噪声",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": []
  },
  "nerf-rays": {
    "text": {
      "Motion reduced": "已减少动画",
      "NeRF · VOLUME RENDERING": "NeRF · 体渲染",
      "rays sample the field, colours integrate": "沿射线采样场，再积分颜色",
      "A NeRF stores a scene as a function: give it a 3D point and view direction, it returns density and colour. To render a pixel, cast a ray from the camera, sample points along it, query the MLP at each, and integrate density-weighted colour front to back. Each ray collapses a line through space into one pixel.": "NeRF 将场景存储为函数：输入 3D 坐标和观察方向，输出密度和颜色。渲染像素时，从相机发射射线，沿途采样，在每个点查询 MLP，再从前向后积分密度加权的颜色。每条射线将空间中的一条线压缩为一个像素。",
      "camera": "相机",
      "volume (density · colour field)": "体积（密度 · 颜色场）",
      "march along each ray, query the MLP for density + colour, integrate → one pixel": "沿每条射线步进，向 MLP 查询密度 + 颜色，积分 → 一个像素",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [
      [
        "^A\\ NeRF\\ stores\\ a\\ scene\\ as\\ a\\ function:\\ give\\ it\\ a\\ ([-+]?\\d+(?:[.,]\\d+)*)D\\ point\\ and\\ view\\ direction,\\ it\\ returns\\ density\\ and\\ colour\\.\\ To\\ render\\ a\\ pixel,\\ cast\\ a\\ ray\\ from\\ the\\ camera,\\ sample\\ points\\ along\\ it,\\ query\\ the\\ MLP\\ at\\ each,\\ and\\ integrate\\ density\\-weighted\\ colour\\ front\\ to\\ back\\.\\ Each\\ ray\\ collapses\\ a\\ line\\ through\\ space\\ into\\ one\\ pixel\\.$",
        "NeRF 将场景存储为函数：输入 $1D 坐标和观察方向，输出密度和颜色。渲染像素时，从相机发射射线，沿途采样，在每个点查询 MLP，再从前向后积分密度加权的颜色。每条射线将空间中的一条线压缩为一个像素。"
      ]
    ],
    "preserve": []
  },
  "clip-contrastive": {
    "text": {
      "Motion reduced": "已减少动画",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": []
  },
  "metric-embedding": {
    "text": {
      "Motion reduced": "已减少动画",
      "METRIC LEARNING · RETRIEVAL": "度量学习 · 检索",
      "same-class points cluster, query rings its neighbours": "同类点聚集，查询圈定邻居",
      "Retrieval ranks candidates by distance in an embedding space. Metric learning shapes that space: a triplet or contrastive loss pulls same-class points together and pushes other classes apart. Once the clusters are tight, a query's nearest neighbours by cosine distance are reliably the right answers.": "检索按嵌入空间中的距离给候选排序。度量学习塑造该空间：三元组损失或对比损失拉近同类点、推远异类点。聚类紧密后，查询按余弦距离找到的最近邻就能可靠地给出正确答案。",
      "embedding space — metric learning pulls same-class together": "嵌入空间：度量学习拉近同类点",
      "query → nearest neighbours by cosine distance = same class": "查询 → 余弦距离最近邻 = 同一类别",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": []
  },
  "depth-sweep": {
    "text": {
      "Motion reduced": "已减少动画",
      "MONOCULAR DEPTH": "单目深度",
      "one frame in, a distance per pixel out": "输入一帧，输出每像素距离",
      "A monocular depth model maps a single RGB frame to a distance for every pixel. A frozen ViT encoder reads perspective, texture, and learned scene priors; a light decoder upsamples them into a dense depth map. Near surfaces glow bright, far ones recede — all from one image, no stereo rig or depth sensor.": "单目深度模型将单张 RGB 图像映射为每个像素的距离。冻结的 ViT 编码器读取透视、纹理和学到的场景先验；轻量解码器上采样为稠密深度图。近处表面更亮，远处更暗；仅凭一张图像，不需要双目装置或深度传感器。",
      "RGB frame": "RGB 图像帧",
      "predicted depth (near → far)": "预测深度（近 → 远）",
      "near": "近",
      "mid": "中",
      "far": "远",
      "one RGB frame → a distance per pixel, no stereo or LiDAR": "单张 RGB 图像 → 每像素距离，无需双目或激光雷达",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，因此关闭动画"
    },
    "patterns": [],
    "preserve": []
  }
};
