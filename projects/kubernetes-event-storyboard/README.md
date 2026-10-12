# Kubernetes 事件分镜

帮助值班工程师检查导出的 Kubernetes 事件和工作负载快照。对重复事件分组，区分观察时间与发生时间，将每项调查建议关联到对象身份和发布修订版本。导出 HTML 时间线及供助手使用的脱敏 JSON 上下文包。

仅使用标准库。四个阶段，约八小时。评分器会测试 Go 和 TypeScript 实现。

## 动手构建

1. [解析事件和工作负载快照](stages/01-parse-snapshots/docs/zh.md)
2. [对重复事件分组并保留时间戳](stages/02-group-occurrences/docs/zh.md)
3. [将证据关联到工作负载修订版本](stages/03-connect-revisions/docs/zh.md)
4. [导出脱敏的助手上下文包](stages/04-export-storyboard/docs/zh.md)

```bash
python3 scripts/project_test.py kubernetes-event-storyboard --init /tmp/kubernetes-event-storyboard-work
python3 scripts/project_test.py kubernetes-event-storyboard --stage 1 --path /tmp/kubernetes-event-storyboard-work --strict
python3 scripts/project_test.py kubernetes-event-storyboard --all --solution --strict
```

全新的 starter 在实现前会失败。运行参考方案绝不会授予学习者完成证书。

## 运行你自己的快照包

```bash
cd projects/kubernetes-event-storyboard/solution
go run . --input fixtures/rollout.json --out /tmp/context-pack.json
node --experimental-strip-types cli.ts /tmp/context-pack.json /tmp/timeline.html
python3 demo.py
```

输入封装导出的 core/v1 Kubernetes 列表：`{observedAt:"RFC3339",events:{items:[...]},workloads:{items:[...]}}`。工作负载可包含 Pod、ReplicaSet 和 Deployment。包含解析修订版本所需的所有者快照；修订证据缺失或冲突时仍为未知。这是离线快照适配器，不使用集群凭据，也不访问实时集群。

发生时间范围属于事件序列。observedAt 是你的采集时间。同一事件 UID 的重复快照计数取最大值去重；不同事件 UID 的计数相加。上下文包无法恢复丢失事件，也不能证明不同时钟之间的先后顺序。

Go CLI 写出 schema-version-1 JSON。TypeScript 消费该产物，渲染响应式、经过转义的时间线，附带 Warning 筛选和上下文下载。直接打开 /tmp/timeline.html，或用本地 HTTP 服务提供其所在目录。事件消息和工作负载载荷被省略；对象名、UID、原因和修订版本号仍然可见。对外分享上下文前应审查这些标识。

[核心 Event API](https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/) 和 [Kubernetes 对象名称与 UID](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/) 描述了底层对象模型。

## 完成证据

```bash
python3 scripts/project_test.py kubernetes-event-storyboard --all --path /tmp/kubernetes-event-storyboard-work --strict --report /tmp/kubernetes-event-storyboard-result.json
```

本地报告未经签名，是自行报告的证据。可编辑图表计算示例值；CLI 运行实际实现。
