# 几何

构建脚本在 Node 中一次生成全部几何。浏览器只移动组、切换可见性并重建少量路径。

## 世界单位与坐标轴

- x 沿工作台从左到右，y 从后方向读者，z 向上。
- 世界单位是设计单位，不是像素。参考台面为 398×292，起始模板为 144×68。
- 台面保持 z=0，工位立于其上，台板和支脚低于零。

## 相机

```js
const P = k.fitProjection(points, W, H, { pad: 26, azimuth: 60 });
```

- 仰角是工具默认 30 度，不按部件单独修改。
- 方位角决定可见面。60 度时，朝 +y 的面占视角 0.87，朝 +x 占 0.5。工作面和铭牌放在 +y 面。
- points 必须包含台板角点和展开姿态最高点，否则展开部件会超出舞台。
- 参考页 viewBox 为 960×640，模板为 720×440。

## 部件清单

写代码前先列表，每部件一行：

| id | 装配组 | 平面 x,y,w,d | z0 至 z1 | 色调 | 运动 |
|---|---|---|---|---|---|
| cache | cache | -26,-30,20,18 | 0 至 10 | mid | 无 |
| probe | cache | -19,-3,6,6 | 18 至 25 | hi | 查询时 z=-2.5 |
| bin0 | cache | -21,-27,10,0.8 | 10 至 17 | hi | 存储时显示 |

装配组决定展开向量，以及随部件点亮的铭牌。

## 常用工具函数

kit/iso-kit.mjs：

| 函数 | 产物 |
|---|---|
| fitProjection(points,W,H,opts) | 投影 P |
| iso(p,P)、depthOf(p,P) | 世界点的屏幕坐标与深度 |
| slabOf(plan,z,h,P,steps,bevel) | 圆角盒，plan 为 x,y,w,d,r |
| cylinder(cx,cy,r,z,h,P,steps) | 竖直圆柱 |
| extrude(ring,z,h,P,opts) | 任意平面多边形向上挤出 |
| solidSvg(paths,{tone,crease,lit,inner}) | 填充、四级阴影、顶面、折痕与轮廓 |
| lineSvg(d,{tone,free,dotted,dashed}) | 指定色调的线 |
| lineOnTop(a,b,z,P)、segment(a,b,P)、ring(cx,cy,r,z,P) | 顶面或空间中的线 |
| radialTicks、topTicks、knurl、sideSeam、dotGrid | 刻度盘、尺刻度、防滑纹、接缝、孔阵 |
| topMatrix(at,z,P)、sideMatrix(at,z,P,face)、faceTextSvg(m,text,opts) | 面上雕刻文字 |
| haloOf(plan,z,h,P) | 工位下方柔和阴影 |
| translateAlong(P,[dx,dy,dz]) | 世界偏移对应的 SVG translate |
| figureSvg、plateHtml、ISO_CSS | SVG 根、角标框、基础样式 |

kit/lathe.mjs 的 frameAlong、disc、ribsOf、dotsOf、circleOf、spokesOf、viewOf 构建任意轴向的滚筒、滚轮、杆与端口。kit/tube.mjs 的 tubePieces、tubeSvg 构建按深度拆段的弯管。

## 阴影与色调

- solidSvg 绘制纸张填充、最多四级阴影、亮顶面、折痕、轮廓。
- 挤出侧面的阴影级为 floor(4*(n·l+1)/2)，n 是平面法线，l=(-sin A,cos A)。
- 旋转体使用抬高光源，阴影边界为 0、0.2、0.42、0.62。
- 轮廓调为 hi、mid、lo、faint。运动或重要部件用 hi，工位主体用 mid，底座和凹槽用 lo，接缝用 faint。
- 灰阶来自 CSS 变量。浅色 anatomy-shade-0 至 3 为 #dcdace 至 #f5f3ea，深色为 #0b0e1b 至 #14192e。
- 强调色 anatomy-lit 浅色 #3553ff、深色 #6b8eff。舞台其他部分不用彩色。

## 绘制项与深度键

每部件一个 `{ id, asm, key, svg }`，key 为参考点深度加偏置。

```js
const depth = (p) => k.depthOf(p, P);   // (x cosA + y sinA) cosE + z sinE
put("probe", "cache", [-16, 0, 20], svg, 6);
```

- 参考点取部件可见中心。
- key 越大越晚绘制，显示越靠前。
- 台板偏置约 -1000，轨道约 -500，使它们先绘制。
- 部件放在其他部件上时加正偏置。模板中缓存顶卡片原本深度小于缓存主体而被遮住，加 3 后可见。
- 悬在车架上方的头部偏置 6 至 20，使其绘制在下方卡片之上。

## 铭牌

每工位有雕刻概念铭牌，英文大写，中文对应翻译。

```js
const w = text.length * size * 0.62 + size * 1.8;   // plate width
const baseline = (z0 + z1) / 2 - size * 0.36;       // text on a vertical face
```

- 铭牌放在运动部件不会挡住的位置。模板中工位侧面的铭牌被停靠车架遮住，改到轨道前的台面后解决。
- 主图文字使用 4.4 至 7 世界单位，并检查手机截图。
- 展开时铭牌留在台面，作为部件索引。
- 铭牌项 ID 为 tag-<assembly>，随工位点亮。

## 线

- 每个线端接实体、另一条线或中心毂。
- 从毂出发、末端悬空的指针标 data-free=end，从尖端反画则标 start。
- 固定臂和运动头之间的杆由运行脚本逐帧重建，所有姿态下两端都落在实体上。

## 展开

每个装配组一个世界偏移向量。参考向量从控制器 [0,6,44] 到记忆滚筒 [-50,-14,16]。底板、轨道、核心保持零偏移。外壳升起时，内部滚筒等隐藏部件淡入。
