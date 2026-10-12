# 公共实现契约

导入 query(directory, question, model)。模型回调返回 JSON {source:chunk_id,quote:exact_text}。--response 接受已记录响应并应用同一门禁。

默认回答器是本地抽取式实现。词汇重叠无法证明语义蕴含。有效引用仍可能无关或过时；内容哈希让读者检测来源变化。

### adapter.py

```python
def adapt_splits(doc, parts)
def framework_qa(question, doc, response)
```

### answer.py

```python
def answer(question, chunks, model)
```

### documents.py

```python
def load_documents(root)
def chunk_document(doc, size=200, overlap=30)
```

### retrieval.py

```python
def retrieve(chunks, query, k=3)
```

阶段测试规定正常结果和拒绝输入。不要用参考导入替换学习者导入。最终阶段还针对你的累积实现运行提供的输入驱动器。
