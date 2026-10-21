# Evidence: cheatsheets/self-improving-reasoning.md
upstream_revision: 45fa4084de6ba2f88fa96a41e69efa2166f868b3

# 证据对照：自学推理与自我改进

中文主题：[自学推理与自我改进](../self-improving-reasoning.md)。下列逐条英文记录保留冻结上游版本的路径、行号与数值；标题对应中文主题。

原始记录中的 docs/en.md 和行号只在上述 upstream 版本有效，不代表当前 docs/zh.md 的行号，也不表示本次重新运行了命令、GPU 测量或外部模型。当前中文主题的 from 路径另由构建器校验。

Abbreviations: C = phases/10-llms-from-scratch/09-constitutional-ai-self-improvement, S = phases/15-autonomous-systems/02-star-family-reasoning, A = phases/15-autonomous-systems/03-alphaevolve-evolutionary-coding, G = phases/15-autonomous-systems/04-darwin-godel-machine, R = phases/15-autonomous-systems/07-recursive-self-improvement.

## 核心概念 (concepts)

原始区块：Core ideas (concepts)
- STaR: S/docs/en.md:14-19, 98
- Rationalization: S/docs/en.md:29, 99
- Constitutional AI critique and revise: C/docs/en.md:33, 322
- GRPO removes the value function, group as baseline: C/docs/en.md:73, 89
- AlphaEvolve LLM edits plus evaluator: A/docs/en.md:14, 108
- DGM edits agent scaffolding, benchmark scores: G/docs/en.md:16, 33-34
- RSI S_n to S_{n+1}: R/docs/en.md:20
- Answer-conditioned gradient: S/docs/en.md:102

## 通用方案：生成器加评估器 (architecture)

原始区块：One recipe: generator plus evaluator (architecture)
- Generator plus evaluator loop: A/docs/en.md:72
- Sample G responses or variants: C/docs/en.md:83, A/docs/en.md:27
- Evaluator rule, test or benchmark: C/docs/en.md:103-106, A/docs/en.md:38-41, G/docs/en.md:34
- Archive MAP-elites keyed by score: A/docs/en.md:26, 29, G/docs/en.md:28
- Retrain SFT or GRPO, or mutate parent: C/docs/en.md:144, A/docs/en.md:27
- Human data small fraction: C/docs/en.md:148, 137

## STaR 循环 (flow)

原始区块：STaR loop (flow)
- 1 sample trace plus answer: S/docs/en.md:16, S/code/main.py:66
- 2 keep if correct: S/docs/en.md:17, S/code/main.py:67-68
- 3 rationalization: S/docs/en.md:29
- 4 fine-tune: S/docs/en.md:18
- 5 repeat: S/docs/en.md:19, S/code/main.py:95-97
- 6 V-STaR DPO verifier, best-of-N: S/docs/en.md:35, 57

## 代码中的 GRPO (annotated-code)

原始区块：GRPO in the code (annotated-code)
- group_relative_advantage: C/code/main.py:99-103
- zero advantage means no signal: C/docs/en.md:247
- ratios, clipped surrogate, kl, total_loss: C/code/main.py:113-118
- KL to reference stays: C/docs/en.md:95

## STaR 家族对比 (comparison)

原始区块：STaR family side by side (comparison)
- STaR row: S/docs/en.md:55
- STaR + rationalization row: S/docs/en.md:56
- V-STaR row: S/docs/en.md:57
- Quiet-STaR row: S/docs/en.md:58

## 代码搜索与自我编辑循环 (comparison)

原始区块：Code search and self-edit loops (comparison)
- Edit target: AlphaEvolve program database A/docs/en.md:14. DGM agent scaffolding G/docs/en.md:16. Godel Machine any self-modification G/docs/en.md:3
- Evaluator: AlphaEvolve correctness and benchmark A/docs/en.md:67. DGM SWE-bench and Polyglot A/docs/en.md:70. Godel Machine formal proof G/docs/en.md:3
- Acceptance rule: AlphaEvolve score beats cell incumbent A/code/main.py:158-161. DGM and Godel Machine G/docs/en.md:57
- Example win: AlphaEvolve 48-mul 4x4 matmul A/docs/en.md:67. DGM 20% to 50% SWE-bench A/docs/en.md:70. Godel Machine no known instance G/docs/en.md:59
- Failure mode: AlphaEvolve reward hacking on weak evaluator A/docs/en.md:47. DGM accepts reward-hacked variants G/docs/en.md:61. Godel Machine never triggers G/docs/en.md:61

## 运行模拟器 (task-table)

原始区块：Run the simulators (task-table)
- self_improvement_round(prompts, sampler, group_size=group_size): C/code/main.py:219
- combined reward: C/code/main.py:96
- run_star(rounds, initial): S/code/main.py:92
- run_loop with use_holdout=True: A/code/main.py:190-192
- --no-holdout: A/code/main.py:177
- --reward-hack-allowed: G/code/main.py:142
- --threshold 2.0: R/docs/en.md:78, R/code/main.py:88
- Scenario A Config: R/code/main.py:103

## 代码默认值 (defaults)

原始区块：Defaults in the code (defaults)
- beta 0.01: C/code/main.py:110
- clip_eps 0.2: C/code/main.py:111
- group_size 8: C/code/main.py:159
- n_samples 1000: S/code/main.py:62
- alpha 0.6: S/code/main.py:80
- --threshold 1.5: R/code/main.py:88
- --seed DEFAULT_SEED = 11: R/code/main.py:17, 90

## 故障排查 (troubleshooting)

原始区块：Troubleshooting (troubleshooting)
- Reward std collapses to zero, stop: C/docs/en.md:300
- 3-5 rounds lose diversity, fresh human data: C/docs/en.md:137
- Same reward in group, skip the prompt: C/docs/en.md:247
- Shortcut rationales, OOD breaks, PRM plus OOD eval: S/docs/en.md:47, 49
- Train-only evaluator overfits, held-out inputs at eval time: A/docs/en.md:55, 86, A/code/main.py:200
- Reported above true, evaluator firewall: G/code/main.py:158, G/docs/en.md:51, 106
- Gap crosses threshold, pause: R/docs/en.md:42, 74, R/code/main.py:61

## 方法选型 (tips)

原始区块：Use X when (tips)
- Pure CAI: C/docs/en.md:157
- GRPO + ORM: C/docs/en.md:158
- DPO on self-generated pairs: C/docs/en.md:159
- Full RLHF: C/docs/en.md:160
- AlphaEvolve where evaluator is fast, deterministic, hard to game: A/docs/en.md:36

## 问答 (qa)

原始区块：Q&A (qa)
- GSM8K 5.8% to 10.7%: S/docs/en.md:31
- SWE-bench 20.0% to 50.0%, Polyglot 14.2% to 30.7%: G/docs/en.md:14
- 12% and 78%: R/docs/en.md:30
- Amplifies signal, adds none: C/docs/en.md:135
- Mean reward up, std stable, KL bounded: C/docs/en.md:300

## 术语表 (glossary)

原始区块：Glossary (glossary)
- ORM: C/docs/en.md:325
- PRM: C/docs/en.md:326
- RLAIF: C/docs/en.md:323
- SL-CAI (prompt, revised_response) pairs: C/docs/en.md:33
- MAP-elites: A/docs/en.md:109
