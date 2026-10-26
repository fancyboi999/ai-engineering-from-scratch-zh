import json

import numpy as np

from practice_check import check, equal, fixture, fixtures, raises, true

WEATHER = {
    "type": "object",
    "properties": {
        "city": {"type": "string"},
        "units": {"type": "string", "enum": ["celsius", "fahrenheit"]},
    },
    "required": ["city", "units"],
    "additionalProperties": False,
}

USER = {
    "type": "object",
    "required": ["id", "tags"],
    "properties": {
        "id": {"type": "integer"},
        "tags": {"type": "array", "items": {"type": "string", "enum": ["a", "b"]}},
        "score": {"type": "number"},
        "active": {"type": "boolean"},
    },
    "additionalProperties": False,
}

ORDER = {
    "type": "object",
    "required": ["customer", "lines"],
    "properties": {
        "customer": {
            "type": "object",
            "required": ["name"],
            "properties": {"name": {"type": "string"}, "vip": {"type": "boolean"}},
            "additionalProperties": False,
        },
        "lines": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["sku", "qty"],
                "properties": {"sku": {"type": "string"}, "qty": {"type": "integer"}, "note": {"type": "string"}},
            },
        },
        "priority": {"type": "string", "enum": ["low", "high"]},
    },
    "additionalProperties": False,
}


def clone(value):
    return json.loads(json.dumps(value))


def reply(calls, content=None):
    message = {"role": "assistant", "content": content}
    if calls is not None:
        message["tool_calls"] = [{"id": cid, "type": "function", "function": {"name": name, "arguments": args}} for cid, name, args in calls]
    return json.dumps({"choices": [{"message": message, "finish_reason": "tool_calls"}]})


REPLY = reply([
    ("call_abc123", "get_weather", "{\"city\":\"Bengaluru\",\"units\":\"celsius\"}"),
    ("call_def456", "get_weather", "{\"city\":42,\"units\":\"kelvin\",\"days\":3}"),
])


def errors_of(sub, schema, args, what):
    result = sub.validate_args(schema, args)
    true(isinstance(result, list) and all(isinstance(e, str) for e in result), f"对于{what}，validate_args 必须返回字符串列表", "str 列表", result)
    return result


@check("examples", "解析含两次工具调用的回复", "用 json.loads 解码回复正文。每个 arguments 字段也是 JSON 字符串，因此还需再解码一次。")
def example_parse(sub):
    equal(sub.parse_tool_calls(REPLY), [
        {"id": "call_abc123", "name": "get_weather", "arguments": {"city": "Bengaluru", "units": "celsius"}},
        {"id": "call_def456", "name": "get_weather", "arguments": {"city": 42, "units": "kelvin", "days": 3}},
    ], what="解析后的调用")


@check("examples", "检查回复中的每次调用", "check_reply 根据对应工具的 schema 校验每次调用，并保持调用顺序。")
def example_check_reply(sub):
    equal(sub.check_reply(REPLY, {"get_weather": WEATHER}), [
        ("call_abc123", []),
        ("call_def456", ["/city: expected string, got integer", "/units: value \"kelvin\" is not in [\"celsius\", \"fahrenheit\"]", "/days: unexpected property"]),
    ], what="check_reply 的结果")


@check("examples", "错误用户记录的诊断", "true 是布尔值，不是整数。数组项的路径含索引。键中的斜杠在路径中变为 ~1。")
def example_user(sub):
    args = {"id": True, "tags": ["a", "c", 3], "score": 1, "extra/x": 1, "active": 1}
    equal(errors_of(sub, USER, args, "用户记录"), [
        "/id: expected integer, got boolean",
        "/tags/1: value \"c\" is not in [\"a\", \"b\"]",
        "/tags/2: expected string, got integer",
        "/extra~1x: unexpected property",
        "/active: expected boolean, got integer",
    ], what="错误列表")


@check("properties", "有效参数不产生错误", "所有值类型正确且满足全部规则时，validate_args 返回空列表。")
def valid_args(sub):
    cases = [
        (WEATHER, {"city": "Pune", "units": "fahrenheit"}),
        (USER, {"id": 7, "tags": [], "score": 2.5, "active": False}),
        (USER, {"tags": ["b", "a"], "id": -3, "score": 4}),
        (ORDER, {"customer": {"name": "Ada", "vip": True}, "lines": [{"sku": "x1", "qty": 2, "note": "gift", "color": "red"}], "priority": "high"}),
    ]
    for schema, args in cases:
        equal(errors_of(sub, schema, args, json.dumps(args)), [], what=f"{json.dumps(args)} 的错误")


@check("properties", "先报告必需属性错误，再按输入顺序检查键", "对于对象，按 required 列表顺序报告缺失的必需属性，再按输入顺序遍历值的键。")
def error_order(sub):
    args = {"zeta": 1, "lines": [{"qty": "2"}, {"sku": "a", "qty": 1.5}], "alpha": 2}
    equal(errors_of(sub, ORDER, args, "订单"), [
        "/customer: missing required property",
        "/zeta: unexpected property",
        "/lines/0/sku: missing required property",
        "/lines/0/qty: expected integer, got string",
        "/lines/1/qty: expected integer, got number",
        "/alpha: unexpected property",
    ], what="错误列表")


@check("properties", "解析后参数与原字典的校验结果一致", "parse_tool_calls 必须原样返回解码后的参数，因此解析后调用的校验结果应与原字典一致。")
def roundtrip(sub):
    rng = np.random.default_rng(0)
    for _ in range(6):
        args = random_order_args(rng)
        parsed = sub.parse_tool_calls(reply([("call_1", "place_order", json.dumps(args))]))
        equal(parsed[0]["arguments"], args, what="解析后的参数")
        equal(errors_of(sub, ORDER, parsed[0]["arguments"], "解析后的参数"), errors_of(sub, ORDER, args, "字典"), what="解析后参数的错误")


@check("properties", "输入不变", "校验器若修改 schema 或参数，会破坏调用方代码。")
def inputs_unchanged(sub):
    schema = clone(ORDER)
    args = {"customer": {"name": 3}, "lines": [{"sku": "a"}], "extra": None}
    saved_schema = clone(schema)
    saved_args = clone(args)
    sub.validate_args(schema, args)
    sub.check_reply(reply([("c", "place_order", json.dumps(args))]), {"place_order": schema})
    equal(schema, saved_schema, what="调用后的 schema")
    equal(args, saved_args, what="调用后的参数")


@check("edge", "没有工具调用", "tool_calls 缺失或为 null 的回复不含调用，因此 parse_tool_calls 返回空列表。")
def no_calls(sub):
    equal(sub.parse_tool_calls(reply(None, content="Hello")), [], what="tool_calls 缺失时的调用")
    body = json.dumps({"choices": [{"message": {"role": "assistant", "content": "Hi", "tool_calls": None}}]})
    equal(sub.parse_tool_calls(body), [], what="tool_calls 为 null 时的调用")


@check("edge", "空 arguments 表示没有参数", "部分提供商用空字符串表示没有参数。空字符串或仅含空白的字符串都应视为 {}。")
def empty_arguments(sub):
    equal(sub.parse_tool_calls(reply([("call_1", "list_notes", ""), ("call_2", "list_notes", "  ")])), [
        {"id": "call_1", "name": "list_notes", "arguments": {}},
        {"id": "call_2", "name": "list_notes", "arguments": {}},
    ], what="解析后的调用")


@check("edge", "无效参数抛出 ValueError", "参数不是有效 JSON，或解码结果不是对象时，抛出 ValueError。")
def bad_arguments(sub):
    raises(ValueError, sub.parse_tool_calls, reply([("call_1", "get_weather", "{\"city\": \"Pune\"")]))
    raises(ValueError, sub.parse_tool_calls, reply([("call_1", "get_weather", "[1, 2]")]))


@check("edge", "根节点类型出错时停止遍历", "值的类型错误时，只报告该值的一条错误，不检查其子项。根路径是单个斜杠。")
def root_type(sub):
    equal(errors_of(sub, ORDER, ["customer"], "根节点处的列表"), ["/: expected object, got array"], what="错误列表")
    equal(errors_of(sub, ORDER, {"customer": "Ada", "lines": None}, "错误的子项类型"), ["/customer: expected object, got string", "/lines: expected array, got null"], what="错误列表")


@check("edge", "integer 与 number 的规则", "integer 只接受 int，因此 1.0 不通过。number 接受 int 和 float。两者都不接受 true 或 false。")
def number_rules(sub):
    schema = {"type": "object", "properties": {"i": {"type": "integer"}, "n": {"type": "number"}}}
    equal(errors_of(sub, schema, {"i": 1.0, "n": 3}, "1.0 和 3"), ["/i: expected integer, got number"], what="i = 1.0 且 n = 3 时的错误")
    equal(errors_of(sub, schema, {"i": False, "n": True}, "布尔值"), ["/i: expected integer, got boolean", "/n: expected number, got boolean"], what="布尔值的错误")


@check("edge", "未设置 additionalProperties false 时允许多余键", "只有 additionalProperties 设为 false 时，才拒绝不在 properties 中的键。")
def additional_default(sub):
    equal(errors_of(sub, ORDER, {"customer": {"name": "Ada"}, "lines": [{"sku": "a", "qty": 1, "gift": True}]}, "订单行中的多余键"), [], what="错误列表")


@check("edge", "路径中 ~ 和 / 的转义", "在 JSON pointer 中，~ 变成 ~0，/ 变成 ~1。必须先替换 ~。")
def pointer_escape(sub):
    schema = {"type": "object", "required": ["a/b", "c~d"], "properties": {}, "additionalProperties": False}
    equal(errors_of(sub, schema, {"x~/y": 1}, "转义的键"), ["/a~1b: missing required property", "/c~0d: missing required property", "/x~0~1y: unexpected property"], what="错误列表")


@check("edge", "未知工具名称", "工具不在 schemas 中时，check_reply 报告错误 /: unknown tool <name>。")
def unknown_tool(sub):
    equal(sub.check_reply(reply([("call_9", "delete_all", "{}")]), {"get_weather": WEATHER}), [("call_9", ["/: unknown tool delete_all"])], what="check_reply 的结果")


POOL = [None, True, False, 0, 3, -2, 1.5, 2.0, "", "a", "low", "high", "x1", [], [1], {}, {"name": "Bo"}]


def random_value(rng):
    return clone(POOL[int(rng.integers(0, len(POOL)))])


def random_order_args(rng):
    args = {}
    if rng.random() < 0.8:
        customer = {"name": "Ada"} if rng.random() < 0.6 else {}
        if rng.random() < 0.5:
            customer["vip"] = random_value(rng)
        if rng.random() < 0.3:
            customer["name"] = random_value(rng)
        args["customer"] = customer if rng.random() < 0.9 else random_value(rng)
    if rng.random() < 0.8:
        lines = []
        for _ in range(int(rng.integers(0, 4))):
            line = {}
            for key in ["sku", "qty", "note", "gift"]:
                if rng.random() < 0.6:
                    line[key] = random_value(rng)
            lines.append(line)
        args["lines"] = lines
    if rng.random() < 0.5:
        args["priority"] = random_value(rng)
    if rng.random() < 0.3:
        args["k/" + str(int(rng.integers(0, 9)))] = random_value(rng)
    return args


@fixture("validate")
def validate_cases(ref):
    rng = np.random.default_rng(42)
    for _ in range(25):
        args = random_order_args(rng)
        yield {"args": args}, ref.validate_args(ORDER, args)


@fixture("replies")
def reply_cases(ref):
    rng = np.random.default_rng(7)
    for _ in range(5):
        calls = []
        for index in range(int(rng.integers(1, 4))):
            name = ["place_order", "get_weather", "refund"][int(rng.integers(0, 3))]
            args = random_order_args(rng) if name == "place_order" else {"city": random_value(rng), "units": ["celsius", "kelvin"][int(rng.integers(0, 2))]}
            calls.append((f"call_{index}", name, json.dumps(args)))
        text = reply(calls)
        yield {"reply": text}, ref.check_reply(text, {"place_order": ORDER, "get_weather": WEATHER})


@check("reference", "25 个随机订单的错误与参考解一致", "对随机嵌套参数，错误字符串及顺序均应与参考解一致。")
def reference_validate(sub):
    for case, expected in fixtures("validate"):
        equal(errors_of(sub, ORDER, case["args"], json.dumps(case["args"])), expected, what=f"{json.dumps(case['args'])} 的错误")


@check("reference", "5 个随机回复的 check_reply 结果与参考解一致", "check_reply 给出的调用 ID 和错误应与参考解一致。")
def reference_replies(sub):
    for case, expected in fixtures("replies"):
        got = sub.check_reply(case["reply"], {"place_order": ORDER, "get_weather": WEATHER})
        equal([(cid, list(errs)) for cid, errs in got], [(cid, list(errs)) for cid, errs in expected], what="check_reply 的结果")
