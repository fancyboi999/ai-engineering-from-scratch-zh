(window.AIFS_FIGURE_LOCALES = window.AIFS_FIGURE_LOCALES || {})["figures-cv3.js"] = {
  "cv3-roialign-sampling": {
    "text": {
      "Motion reduced": "已减少动画",
      "MASK R-CNN · RoIAlign": "Mask R-CNN · RoIAlign",
      "sample points fall between pixels": "采样点可以落在像素之间",
      "RoIPool snaps a proposal box to the integer feature grid twice, and those roundings smear the mask by fractions of a pixel. RoIAlign keeps the box fractional: it places a fixed set of sample points inside each output bin and reads each one by bilinear interpolation of its four neighbouring cells. No rounding, so the mask lands where the object actually is.": "RoIPool 两次将候选框对齐到整数特征网格，取整误差会让掩码偏移不足一个像素的距离。RoIAlign 保留小数坐标：在每个输出分桶内放置固定采样点，并通过相邻四个网格值的双线性插值读取各点。无需取整，掩码就能落在对象实际所在的位置。",
      "feature map · integer pixel grid": "特征图 · 整数像素网格",
      "RoI proposal (fractional)": "RoI 候选框（小数坐标）",
      "aligned 2x2 output": "对齐的 2x2 输出",
      "bilinear interpolation,": "双线性插值，",
      "no rounding of the box": "不对边界框取整",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "Mask R-CNN · RoIAlign",
        "reason": "模型与算法专名，按翻译契约原样保留。"
      }
    ]
  },
  "cv3-latent-compression": {
    "text": {
      "Motion reduced": "已减少动画",
      "STABLE DIFFUSION · LATENT SPACE": "Stable Diffusion · 潜空间",
      "diffuse in 64x64, not 512x512": "在 64x64 空间扩散，而非 512x512",
      "Pixel-space diffusion backprops through 786,432 values per step. Stable Diffusion trains a VAE that compresses the 3x512x512 image into a 4x64x64 latent (the small orange grid), runs the whole denoising loop there, then decodes back to pixels. The latent is 48x cheaper to attend over, which is what made open-weight text-to-image practical.": "像素空间扩散每步都要对 786,432 个值反向传播。Stable Diffusion 训练一个 VAE，把 3x512x512 图像压缩成 4x64x64 潜表示（较小的橙色网格），在其中完成全部去噪，再解码回像素。潜空间的注意力计算成本降低 48 倍，才让开放权重的文生图模型变得实用。",
      "3 x 512 x 512 image": "3 x 512 x 512 图像",
      "4 x 64 x 64 latent": "4 x 64 x 64 潜表示",
      "decoded image": "解码后的图像",
      "VAE encoder": "VAE 编码器",
      "VAE decoder": "VAE 解码器",
      "(3*512*512)/(4*64*64) = 48x less compute to denoise": "(3*512*512)/(4*64*64) = 48x（去噪计算量之比）",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "cv3-ctc-collapse": {
    "text": {
      "Motion reduced": "已减少动画",
      "OCR · CTC COLLAPSE": "OCR · CTC 折叠",
      "frame labels fold into one string": "逐帧标签折叠为一个字符串",
      "A CRNN emits one character (or a blank ε) per time-step, with no fixed alignment to the input. CTC defines the collapse: merge runs of the same label, then delete the blanks. The blank between the two l-runs is what keeps \"hello\" from collapsing to \"helo\". Training sums over every alignment that collapses to the target.": "CRNN 每个时间步输出一个字符或空白 ε，无需与输入固定对齐。CTC 定义的折叠规则是：先合并连续相同标签，再删除空白。两段 l 之间的空白使 \"hello\" 不会折叠成 \"helo\"。训练时会对所有能够折叠为目标字符串的对齐方式求和。",
      "CRNN per-frame predictions (one column per time step)": "CRNN 逐帧预测（每列对应一个时间步）",
      "rule 1 · merge repeated neighbours": "规则 1 · 合并相邻重复标签",
      "rule 2 · delete blank ε": "规则 2 · 删除空白 ε",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "h h ε e l l ε l o o  ->  \"hello\"",
        "reason": "CTC 标签序列与折叠后的英文示例数据必须原样保留。"
      }
    ]
  },
  "cv3-pose-heatmap": {
    "text": {
      "Motion reduced": "已减少动画",
      "POSE · HEATMAP REGRESSION": "姿态估计 · 热力图回归",
      "peaks resolve, bones connect": "找到峰值，再连接骨架",
      "A pose model does not regress coordinates directly. It outputs one heatmap per keypoint, trained so a Gaussian bump sits over the true joint; the argmax pixel is the coordinate. Once all K peaks resolve, the joints are linked into a skeleton by a fixed body graph (top-down) or by association fields (bottom-up).": "姿态模型不直接回归坐标，而是为每个关键点输出一张热力图；训练目标是在真实关节位置形成高斯峰，取 argmax 像素得到坐标。找到全部 K 个峰后，自上而下方法通过固定人体图连接关节，自下而上方法则通过关联场组装骨架。",
      "per-keypoint heatmap (argmax = joint)": "各关键点的热力图（argmax = 关节位置）",
      "assembled skeleton": "组装后的骨架",
      "one of K heatmaps": "K 张热力图中的一张",
      "regress a Gaussian per joint, take the argmax pixel": "为每个关节回归一个高斯分布，再取 argmax 像素",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "cv3-gaussian-splat": {
    "text": {
      "Motion reduced": "已减少动画",
      "3D GAUSSIAN SPLATTING": "3D 高斯泼溅",
      "blobs project and blend, no ray marching": "投影并混合高斯体，无需光线步进",
      "A scene is millions of 3D Gaussians, each carrying a centre, a rotation+scale covariance, an opacity, and view-dependent colour. Rendering projects every blob to a 2D ellipse, sorts them by depth, and alpha-composites front to back, the same blend NeRF needed hundreds of MLP queries to approximate. That is why splats render at 100+ fps and train in minutes.": "一个场景由数百万个 3D 高斯体组成，每个携带中心、旋转与尺度组成的协方差、透明度，以及随视角变化的颜色。渲染时把每个高斯体投影为 2D 椭圆，按深度排序，再从前到后执行 alpha 合成；NeRF 则需要数百次 MLP 查询来近似同样的混合。因此高斯泼溅能以 100+ fps 渲染，并在几分钟内训练完成。",
      "a cloud of oriented 3D Gaussians, sorted and alpha-composited": "对有方向的 3D 高斯点云排序并执行 alpha 合成",
      "each splat:": "每个高斯体：",
      "alpha, SH": "透明度、球谐函数 SH",
      "rasterise,": "光栅化，",
      "not march": "无需步进",
      "no MLP query per ray; project each blob to 2D and blend at 100+ fps": "无需逐光线查询 MLP；将各高斯体投影到 2D，再以 100+ fps 混合",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "cv3-rectified-flow": {
    "text": {
      "Motion reduced": "已减少动画",
      "RECTIFIED FLOW": "整流流",
      "straighten the path, sample in 20 steps": "拉直轨迹，用 20 步采样",
      "DDPM learns a curved trajectory from noise to data, so faithfully integrating it takes hundreds of small steps. Rectified flow trains the model to follow a straight line between the noise sample and the data point. A straight path needs far fewer integration steps, which is how SD3 and FLUX sample in 20 steps (or 1-4 when distilled) instead of 1000.": "DDPM 学习从噪声到数据的曲线轨迹，精确积分需要数百个小步。整流流让模型沿噪声样本与数据点之间的直线前进。直线路径所需积分步数少得多，因此 SD3 和 FLUX 用 20 步采样，蒸馏后可降到 1-4 步，而不是 1000 步。",
      "x_T noise": "x_T 噪声",
      "x_0 data": "x_0 数据",
      "DDPM: curved path, ~1000 steps": "DDPM：曲线路径，约 1000 步",
      "rectified flow: straight line, ~20 steps": "整流流：直线路径，约 20 步",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  },
  "cv3-open-vocab": {
    "text": {
      "Motion reduced": "已减少动画",
      "SAM 3 · OPEN-VOCAB SEGMENTATION": "SAM 3 · 开放词汇分割",
      "a noun phrase selects every match": "用一个名词短语选中所有匹配对象",
      "Promptable Concept Segmentation takes a short noun phrase and returns masks for every matching object plus instance IDs in one pass. The grey apple and box stay unselected; the three oranges get outlined and numbered. Earlier systems chained a text-grounded detector into a separate segmenter, accumulating error at the seam. SAM 3 collapses that cascade into a single model.": "可提示概念分割接受一个简短名词短语，一次前向传播就返回所有匹配对象的掩码和实例 ID。灰色苹果与盒子未被选中，三个橙子则被勾边并编号。此前的方法需要把文本定位检测器与独立分割器串联，接口处会累积误差；SAM 3 把这一串联流程合为一个模型。",
      "prompt: \"orange\"": "prompt：\"orange\"",
      "one forward": "一次前向",
      "pass:": "传播：",
      "all matching": "全部匹配对象的",
      "masks +": "掩码 +",
      "instance ids": "实例 ID",
      "no detector cascade — text in, every matching mask out": "无需级联检测器：输入文本，输出所有匹配掩码",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": [
      {
        "text": "prompt：\"orange\"",
        "reason": "prompt 技术名与用于开放词汇匹配的英文查询样本，保持原样。"
      }
    ]
  },
  "cv3-track-assoc": {
    "text": {
      "Motion reduced": "已减少动画",
      "MULTI-OBJECT TRACKING · ASSOCIATION": "多目标跟踪 · 关联",
      "detections snap to tracks, IDs persist": "检测结果与轨迹关联，ID 保持不变",
      "Tracking-by-detection runs a detector every frame, then asks which new box is which old track. It scores every (track, detection) pair by IoU (often plus motion and appearance), solves the assignment with the Hungarian algorithm, and carries the matched ID forward. Unmatched detections start new tracks; unmatched tracks age out. The identity, not the box, is the product.": "基于检测的跟踪方法每帧运行检测器，再判断新边界框对应哪条已有轨迹。它用 IoU（通常还结合运动与外观）为每个轨迹与检测对打分，利用匈牙利算法求解分配，并把匹配 ID 延续到下一帧。未匹配检测创建新轨迹，未匹配轨迹逐渐过期。最终产物是对象身份，而不只是边界框。",
      "tracks at t-1 (solid) + detections at t (dashed), matched by IoU": "t-1 时刻轨迹（实线）与 t 时刻检测（虚线），按 IoU 匹配",
      "keep #1": "保留 #1",
      "keep #2": "保留 #2",
      "keep #3": "保留 #3",
      "IoU cost matrix -> Hungarian assignment -> persist IDs across frames": "IoU 代价矩阵 -> 匈牙利算法分配 -> 跨帧保留 ID",
      "Animation disabled because reduced motion is enabled": "已启用减少动态效果，动画已停用"
    },
    "patterns": [],
    "preserve": []
  }
};
