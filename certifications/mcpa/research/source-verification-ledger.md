# MCPA 来源核验台账

本课程中的每项考试事实都映射到官方来源，并记录检索日期。协议事实映射到 MCP 规范；课程与题目均为原创。来源变化时，请同步更新此处事实与日期。

## 来源

- **PAGE**: MCPA certification page, https://training.linuxfoundation.org/certification/model-context-protocol-associate-mcpa/ (retrieved 2026-09-24; page last modified 2026-09-16).
- **PRESS**: MCPA launch announcement, https://www.linuxfoundation.org/press/agentic-ai-foundation-launches-mcpa-certification-to-validate-mcp-expertise (Linux Foundation, 14 September 2026).
- **SPEC**: Model Context Protocol specification 2026-07-28, https://modelcontextprotocol.io/specification/2026-07-28.

## 已核验考试事实

| 事实 | 值 | 来源 | 备注 |
|------|-------|--------|-------|
| Credential | Model Context Protocol Associate (MCPA) | PAGE, PRESS | First official MCP certification; first from the Agentic AI Foundation. |
| Provider | Agentic AI Foundation, via Linux Foundation Training and Certification | PAGE, PRESS | Vendor-neutral. |
| Level | Beginner / Foundational | PAGE | "Experience Level: Beginner". |
| Format | Online, proctored, multiple choice | PAGE, PRESS | |
| Time limit | 90 minutes | PAGE | The PAGE states "Duration of Exam 90 minutes". The PRESS states 120 minutes. This curriculum uses the certification page value of 90 and flags the discrepancy. Reverify before relying on either. |
| Fee | 250 USD, exam only | PAGE | Bundle with THRIVE-ONE annual subscription is 495 USD. |
| Validity | 2 years | PAGE | |
| Exam eligibility | 12 months | PAGE | |
| Retakes | One retake included | PAGE | |
| Aligned specification | MCP 2026-07-28 | PAGE, PRESS, SPEC | The exam is aligned to the latest MCP release. |
| Number of items | Not published | PAGE | The official page does not state an item count. This curriculum's full mock uses 60 questions as a practice size, not an official figure. |
| Passing score | Not published | PAGE | No scaled score or cut score is published. |
| Prerequisites | None required; recommended experience listed | PAGE | JSON-RPC, LLM APIs, agentic patterns, security basics, reading MCP manifests. |

## 已核验领域与权重

来源：PAGE（Domains and Competencies），由 PRESS 交叉核验。

| 领域 | 权重 | 已公布子能力 |
|--------|--------|---------------------------------|
| MCP Fundamentals | 16% | MCP Purpose and Scope; Core MCP Concepts; Interoperability and Value |
| Architecture and Components | 14% | Schemas and Structured Data; MCP Hosts, Clients and Servers; Model Interaction Flow |
| Interactions and Execution | 26% | Interaction Patterns and Response Handling; Error Handling; Tool Invocation Lifecycle; Protocol Primitives |
| Security and Governance | 24% | Trust Boundaries; Permissions and Consent; Risk and Safety Controls; Auditability and Observability |
| Use Cases and Ecosystem | 20% | Roles, Responsibilities and Adoption; Operational Use Cases; Ecosystem and Portability |

权重合计 100%。`tracks/mcpa-f.json` 中的领域目标依据公开子能力名称和 MCP 2026-07-28 规范原创编写，并非复制考试目标。
