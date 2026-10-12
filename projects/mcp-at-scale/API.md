# 公共实现契约

运行 `python3 cli.py /absolute/inventory.json --serve` 启动 stdio 服务器。tools/call catalog_search 接受 query、max_chars 和 k；响应返回选中的公共 schema 及其字符数。

stdio 传输实现了文档所述的 2025-06-18 和 2025-11-25 初始化/工具子集，不声称完全符合当前 MCP。清单读取使用本地记录；生成的工具数并不代表 250 个不同集成。

### audit.py

```python
def audit_catalog(inventory=None)
```

### discovery.py

```python
def discover(tools, query, max_chars=1500, k=5)
```

### protocol.py

```python
def handle(request, state, inventory)
def serve(lines, output, inventory, tools=None)
```

### registry.py

```python
def catalog()
def execute(tool, arguments, inventory)
```

### client.ts

```typescript
export function exchange(server: string, requests: Request[], timeout = 3000): Promise<Response[]>
```

starter 提供记录和类的接口。方法在实现前会有意抛出异常。

阶段测试规定正常结果和应拒绝的输入。不要把学习者实现的导入替换成参考实现的导入。最后一阶段还会用提供的输入驱动器测试你的累积实现。
