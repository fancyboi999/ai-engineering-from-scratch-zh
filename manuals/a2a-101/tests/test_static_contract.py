"""离线检查中文手册的静态契约，不运行采集或调用 provider。"""
import hashlib
import json
import re
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANUAL = json.loads((ROOT / "manual.json").read_text())
SECTION_FILES = [
    section["file"]
    for part in [*MANUAL["parts"], MANUAL["reference"]]
    for section in part["sections"]
]
DOCUMENTS = [ROOT / MANUAL["front"], *(ROOT / name for name in SECTION_FILES)]


def blocks(document):
    return re.findall(r"^```([^\n]*)\n(.*?)^```$", document, re.M | re.S)


def section_anchor(name):
    return "s-" + re.sub(r"^r-\d+-", "ref-", re.sub(r"^\d+-\d+-", "", Path(name).stem))


class A2AStaticContractTests(unittest.TestCase):
    def test_pinned_version_and_complete_sections(self):
        self.assertEqual(MANUAL["id"], "a2a-101")
        self.assertEqual(MANUAL["pin"]["version"], "1.0.1")
        self.assertEqual(MANUAL["pin"]["commit"], "3303592")
        self.assertEqual(len(SECTION_FILES), 35)
        self.assertEqual(len(set(SECTION_FILES)), 35)
        self.assertEqual(len(list((ROOT / "sections").glob("*.md"))), 35)
        for path in DOCUMENTS:
            self.assertTrue(path.is_file(), path)

    def test_chinese_metadata_and_document_contract(self):
        for field in ("subtitle", "summary", "audience"):
            self.assertRegex(MANUAL[field], r"[\u4e00-\u9fff]")
        for path in DOCUMENTS:
            text = path.read_text()
            self.assertRegex(text, r"^# .+\n\n> .+")
            self.assertTrue(text.rstrip().splitlines()[-1].startswith("Sources: "), path)
            for lang, _ in blocks(text):
                self.assertTrue(lang.strip(), path)
            if path.parent.name == "sections" and not path.name.startswith("r-"):
                self.assertEqual(sum(lang == "takeaways" for lang, _ in blocks(text)), 1, path)
                paragraphs = [s for s in re.split(r"\n\n+", text) if not s.startswith(("#", ">"))]
                self.assertTrue(any("读完本节后，你可以" in s for s in paragraphs[:2]), path)

    def test_references_and_explicit_heading_anchors(self):
        anchors = {"s-front", *(section_anchor(s) for s in SECTION_FILES)}
        references = []
        for path in DOCUMENTS:
            text = path.read_text()
            # 清单内部的原始记录不是正文标题或站内引用。
            prose = re.sub(r"^```[^\n]*\n.*?^```$", "", text, flags=re.M | re.S)
            anchors.update(re.findall(r"\{#([^}]+)\}", prose))
            references.extend(re.findall(r"\]\(#([^)]+)\)", text))
            for lang, body in blocks(text):
                if lang == "figure":
                    anchors.add(re.search(r"^id: (.+)$", body, re.M).group(1))
        self.assertFalse(set(references) - anchors)

    def test_figures_have_xml_and_source_coverage(self):
        ids = {MANUAL["plate"]["figure"]}
        for path in DOCUMENTS:
            for lang, body in blocks(path.read_text()):
                if lang == "figure":
                    ids.add(re.search(r"^id: (.+)$", body, re.M).group(1))
                    for key in ("title", "claim", "caption"):
                        self.assertRegex(body, rf"(?m)^{key}: .*?[\u4e00-\u9fff]")
        self.assertEqual(len(ids), 32)
        self.assertEqual({p.stem for p in (ROOT / "figures").glob("*.svg")}, ids)
        self.assertEqual({p.stem for p in (ROOT / "figures/src").glob("*.js")}, ids)
        for name in ids:
            xml = ET.parse(ROOT / "figures" / f"{name}.svg").getroot()
            self.assertEqual(xml.tag, "{http://www.w3.org/2000/svg}svg")
            for tag in ("title", "desc"):
                content = "".join(xml.find(f"{{http://www.w3.org/2000/svg}}{tag}").itertext())
                self.assertRegex(content, r"[\u4e00-\u9fff]")

    def test_listing_provenance(self):
        total = 0
        for path in DOCUMENTS:
            for lang, body in blocks(path.read_text()):
                if lang != "listing":
                    continue
                total += 1
                metadata, code = body.split("\n---\n", 1)
                source = re.search(r"^source: (.+)$", metadata, re.M).group(1)
                source_text = (ROOT / source).read_text()
                for line in code.splitlines():
                    if not line.strip() or line.strip() == "…":
                        continue
                    for piece in line.strip().split("…"):
                        if len(piece.strip()) >= 3:
                            self.assertIn(piece.strip(), source_text, (path, source))
        self.assertEqual(total, 42)

    def test_http_json_body_labels_and_cjk_piece_spacing(self):
        svg = ET.parse(ROOT / "figures/fig-two-json-bindings.svg").getroot()
        texts = list(svg.iter("{http://www.w3.org/2000/svg}text"))
        bodies = [node for node in texts if (node.text or "").strip() in ("请求体：", "响应体：")]
        self.assertEqual(len(bodies), 3)
        for label, expected in zip(bodies, ("SendMessageRequest", "SendMessageResponse", "Task")):
            value = texts[texts.index(label) + 1]
            self.assertEqual(value.text, expected)
            self.assertEqual(label.text.strip(), "请求体：" if expected == "SendMessageRequest" else "响应体：")
            self.assertEqual(label.get("y"), value.get("y"))
            # 四个全角字形各占一个 em，类型文本必须位于标签之后。
            label_end = float(label.get("x")) + 4 * float(label.get("font-size"))
            self.assertGreater(float(value.get("x")), label_end)

    def test_task_store_header_and_lifeline_geometry(self):
        svg = ET.parse(ROOT / "figures/fig-reading-a-sequence.svg").getroot()
        ns = "{http://www.w3.org/2000/svg}"
        header = next(node for node in svg.iter(ns + "rect") if node.get("x") == "366" and node.get("y") == "8")
        bottom = float(header.get("y")) + float(header.get("height"))
        labels = [node for node in svg.iter(ns + "text") if node.get("x") == "416" and float(node.get("y")) < bottom]
        self.assertEqual([node.text for node in labels], ["任务存储", "test-runner", "内部"])
        for node in labels:
            self.assertGreater(float(node.get("y")), float(header.get("y")))
            self.assertLess(float(node.get("y")) + float(node.get("font-size")) * 0.24, bottom)
        lifeline = next(node for node in svg.iter(ns + "line") if node.get("x1") == node.get("x2") == "416")
        self.assertEqual(float(lifeline.get("y1")), bottom)
        self.assertEqual(lifeline.get("y2"), "432")

    def test_registry_label_knockout_covers_cjk_width(self):
        svg = ET.parse(ROOT / "figures/fig-finding-an-agent.svg").getroot()
        ns = "{http://www.w3.org/2000/svg}"
        nodes = list(svg.iter())
        label = next(node for node in nodes if node.tag == ns + "text" and node.text == "或查询注册中心")
        mask = nodes[nodes.index(label) - 1]
        self.assertEqual(mask.tag, ns + "rect")
        self.assertEqual(mask.get("class"), "m-knock")
        half_width = len(label.text) * float(label.get("font-size")) / 2
        center = float(label.get("x"))
        self.assertLess(float(mask.get("x")), center - half_width)
        self.assertGreater(float(mask.get("x")) + float(mask.get("width")), center + half_width)
        # 同一 mask 覆盖路由 y=123，保留原路径，不让线穿过文字。
        self.assertLess(float(mask.get("y")), 123)
        self.assertGreater(float(mask.get("y")) + float(mask.get("height")), 123)
        self.assertTrue(any(node.get("d") == "M200 123 H430 V72 H459" for node in svg.iter(ns + "path")))

    def test_frozen_evidence_bytes(self):
        digest = hashlib.sha256()
        paths = sorted(
            path for directory in ("capture", "research")
            for path in (ROOT / directory).rglob("*")
            if path.is_file() and path.name != "README.md"
        )
        self.assertEqual(len(paths), 43)
        for path in paths:
            digest.update(path.relative_to(ROOT).as_posix().encode())
            digest.update(b"\0")
            digest.update(path.read_bytes())
            digest.update(b"\0")
        # 冻结上游 56c886c 的原始规范、研究、代码与录制记录，不含中文导引。
        self.assertEqual(digest.hexdigest(), "cad412c175fc189c4d97e732bb7ca3f6d191f78245f4b1099170209e23ee0ea2")


if __name__ == "__main__":
    unittest.main()
