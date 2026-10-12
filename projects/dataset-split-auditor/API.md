# 公共实现契约

向 CLI 传入 {train,test} 记录，或传入 {records} 并指定 --split 0.25 --seed experiment-1。在 CI 中添加 --check，划分不可用时返回 exit 2。

规范化检测精确的规范化副本，不检测改写。稳定分组哈希不保证类别平衡或时间感知评估。导出分区中仍保留源文本。

### main.py

```python
def fingerprint(text)
def validate(records)
def audit(train, test)
def split_groups(records, test_fraction=0.2, seed='course')
def summarize(train, test)
```

阶段测试规定正常结果和拒绝输入。不要用参考导入替换学习者导入。最终阶段还针对你的累积实现运行提供的输入驱动器。
