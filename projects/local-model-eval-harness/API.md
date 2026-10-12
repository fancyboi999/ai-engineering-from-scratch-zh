# 公共实现契约

record.py 写出 cli.py 使用的同一 {manifest,source,labels,records} 契约。--baseline 仅比较标签指纹相同的记录；--min-accuracy 提供本地 CI 门禁。

除非适配器定义其他方法，报告的 confidence 是模型自报。ECE 随分箱和样本数变化。不下载或启动模型，样本也不是硬件基准。

### main.py

```python
def validate(records)
def correct(record, labels)
def accuracy(records, labels)
def calibration(records, labels, bins=5)
def percentile(values, p)
def scorecard(records, labels, source)
```

阶段测试规定正常结果和拒绝输入。不要用参考导入替换学习者导入。最终阶段还针对你的累积实现运行提供的输入驱动器。
