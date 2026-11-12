# 公开实现契约

工具契约迁移检查器评估可调用工具的新旧 JSON schema，并用录下的调用检查向后兼容性。

### main.py

```python
def load_contract(raw: Any) -> Dict[str, Any]
def load_calls(raw: Any) -> List[Dict[str, Any]]
def validate_call(contract: Dict[str, Any], args: Any) -> Tuple[bool, List[str]]
def classify_changes(old_contract: Dict[str, Any], new_contract: Dict[str, Any]) -> List[Dict[str, Any]]
def generate_counterexamples(old_contract: Dict[str, Any], new_contract: Dict[str, Any]) -> List[Dict[str, Any]]
def replay_calls(old_contract: Dict[str, Any], new_contract: Dict[str, Any], calls: List[Dict[str, Any]]) -> Dict[str, Any]
def build_report(old_contract: Dict[str, Any], new_contract: Dict[str, Any], changes: List[Dict[str, Any]], counterexamples: List[Dict[str, Any]], replay_result: Dict[str, Any]) -> Dict[str, Any]
def export_fixtures(output_path: str, counterexamples: List[Dict[str, Any]], broken_calls: List[Dict[str, Any]]) -> Dict[str, Any]
```

### CLI 调用

```bash
python3 cli.py --old samples/catalog_v1.json --new samples/catalog_v2.json --calls samples/saved_calls.json --output report.json --strict
```

### 退出码

- `0`：报告判为兼容，即没有破坏性变更、没有无法判定的变更，且所有在旧契约下有效的已保存调用仍然通过。在旧契约下就已无效的调用会单独列出，不影响结果。未传入 `--strict` 时，CLI 也以 0 退出。
- `1`：启用了 `--strict`，且 `report["compatible"]` 为 `False`（原因可能是破坏性变更、无法判定的关键词或被破坏的历史调用）。
