# 公开 API

所有函数都位于 `main.py`。除非另有说明，无效输入抛出 `ValueError`。CLI 失败时以非零状态退出；保留原始输入。

### `parse_vtt`

```python
def parse_vtt(text):
```

将 UTF-8 WebVTT 文本解析为 cues {id,start,end,settings,text,duration}。保留时间戳字符串和提供的 ID；无 ID 时分配 cue-N。允许重叠，但起点不递减。忽略 NOTE 块；拒绝 STYLE/REGION 块和畸形/重复/空 cue。

### `propose`

```python
def propose(cues, translations, glossary):
```

返回含 proposed text、needs_translation 和 required_terms 的 cue 提案。translations 将已知 cue ID 映射到非空目标文本。glossary 将源短语映射到必需目标短语；对提供提案中残留源词按最长优先替换。缺失翻译保留源文本且维持未批准。

### `inspect`

```python
def inspect(proposals, cps=17):
```

返回含 characters、cps、budget 和 flags 的审核行。去掉 cue 标签后计数可见非空白 Unicode 码点；budget=floor(duration*cps)。标记指出缺失翻译、缺失必需术语和阅读预算超限。cps 必须正且有限。

### `export_localized`

```python
def export_localized(proposals, decisions=None, cps=17):
```

返回 {schema_version,fingerprint,cues,all_reviewed,vtt}。审核 {fingerprint,cues:{id:{text,approved,override_budget?}}} 绑定提案和阅读预算。批准文本必须符合词表和结构语法；超预算批准需显式 override_budget=true。所有 cue 获批之前，vtt 为 None。

## 文件与集成

输入 JSON 含 vtt、translations、glossary 和可选 cps。输出 review.html 和 translation-decisions.json。下载 decisions.json，编辑 cue 文本和 approved 标记，再用 --decisions decisions.json 重跑。只有全部 cue 获批才创建 reviewed.vtt；超预算 cue 还需 override_budget=true。用 parse_vtt 或视频播放器的 WebVTT 轨道消费 reviewed.vtt。
