# 证据对照：强化学习

中文主题：[强化学习](../reinforcement-learning.md)。

以下为当前中文区块的来源索引。文末保留冻结上游 `0d4b1ca0c6d75b8e413be88ca4174598eba4d1e0` 的原始逐条定位记录，便于回查英文原文。原始记录中的 `docs/en.md` 与行号属于该上游版本，不是当前 `docs/zh.md` 的行号，也不表示本次已执行这些命令或重现性能数据。

当前中文来源按区块登记如下。正文说明、代码注释和图中标签见链接的中文主题；命令、API 标识与数值保留原样。

## PPO 训练循环

对应主题区块：**PPO 训练循环**（`architecture`）。

来源文件：

- [`phases/09-reinforcement-learning/08-ppo/docs/zh.md`](../../phases/09-reinforcement-learning/08-ppo/docs/zh.md)
- [`phases/09-reinforcement-learning/08-ppo/code/main.py`](../../phases/09-reinforcement-learning/08-ppo/code/main.py)
- [`phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md`](../../phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md)

构建器核对的标识与数值：

- `log_pi_old`
- `v_old`

## RLHF 三阶段

对应主题区块：**RLHF 三阶段**（`flow`）。

来源文件：

- [`phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md`](../../phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 价值公式

对应主题区块：**价值公式**（`concepts`）。

来源文件：

- [`phases/09-reinforcement-learning/01-mdps-states-actions-rewards/docs/zh.md`](../../phases/09-reinforcement-learning/01-mdps-states-actions-rewards/docs/zh.md)
- [`phases/09-reinforcement-learning/02-dynamic-programming/docs/zh.md`](../../phases/09-reinforcement-learning/02-dynamic-programming/docs/zh.md)
- [`phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md`](../../phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md)
- [`phases/09-reinforcement-learning/05-dqn/docs/zh.md`](../../phases/09-reinforcement-learning/05-dqn/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 策略公式

对应主题区块：**策略公式**（`concepts`）。

来源文件：

- [`phases/09-reinforcement-learning/06-policy-gradients-reinforce/docs/zh.md`](../../phases/09-reinforcement-learning/06-policy-gradients-reinforce/docs/zh.md)
- [`phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md`](../../phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md)
- [`phases/09-reinforcement-learning/08-ppo/docs/zh.md`](../../phases/09-reinforcement-learning/08-ppo/docs/zh.md)
- [`phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md`](../../phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md)
- [`phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md`](../../phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 选择方法

对应主题区块：**选择方法**（`command-table`）。

来源文件：

- [`phases/09-reinforcement-learning/02-dynamic-programming/docs/zh.md`](../../phases/09-reinforcement-learning/02-dynamic-programming/docs/zh.md)
- [`phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md`](../../phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md)
- [`phases/09-reinforcement-learning/05-dqn/docs/zh.md`](../../phases/09-reinforcement-learning/05-dqn/docs/zh.md)
- [`phases/09-reinforcement-learning/08-ppo/docs/zh.md`](../../phases/09-reinforcement-learning/08-ppo/docs/zh.md)
- [`phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md`](../../phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md)
- [`phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md`](../../phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 更新代码

对应主题区块：**更新代码**（`task-table`）。

来源文件：

- [`phases/09-reinforcement-learning/03-monte-carlo-methods/docs/zh.md`](../../phases/09-reinforcement-learning/03-monte-carlo-methods/docs/zh.md)
- [`phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md`](../../phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md)
- [`phases/09-reinforcement-learning/05-dqn/docs/zh.md`](../../phases/09-reinforcement-learning/05-dqn/docs/zh.md)
- [`phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md`](../../phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md)
- [`phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md`](../../phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md)

构建器核对的标识与数值：

- `random`
- `choice`
- `s_next`
- `max`
- `values`
- `a_next`
- `sync_every`
- `copy`
- `probs_ref`
- `dot`
- `bag`
- `mean_r`
- `std_r`

## PPO 裁剪更新

对应主题区块：**PPO 裁剪更新**（`annotated-code`）。

来源文件：

- [`phases/09-reinforcement-learning/08-ppo/code/main.py`](../../phases/09-reinforcement-learning/08-ppo/code/main.py)

构建器核对的标识与数值：

- `adv_norm`
- `zip`
- `softmax`
- `logits`
- `log`
- `max`
- `math.exp`
- `log_pi_old`
- `exp`
- `pg_scale`
- `N_ACTIONS`
- `range`
- `grad_logpi`
- `N_FEAT`
- `lr_a`
- `value`
- `lr_v`

## 默认值与数值

对应主题区块：**默认值与数值**（`defaults`）。

来源文件：

- [`phases/09-reinforcement-learning/01-mdps-states-actions-rewards/docs/zh.md`](../../phases/09-reinforcement-learning/01-mdps-states-actions-rewards/docs/zh.md)
- [`phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md`](../../phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md)
- [`phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md`](../../phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md)
- [`phases/09-reinforcement-learning/08-ppo/docs/zh.md`](../../phases/09-reinforcement-learning/08-ppo/docs/zh.md)
- [`phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md`](../../phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md)
- [`phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md`](../../phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md)

构建器核对的标识与数值：

- `0.99`
- `0.1`
- `0.2`
- `0.5`
- `0.01`
- `0.95`
- `0.01-0.05`
- `8`

## 故障排查

对应主题区块：**故障排查**（`troubleshooting`）。

来源文件：

- [`phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md`](../../phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md)
- [`phases/09-reinforcement-learning/05-dqn/docs/zh.md`](../../phases/09-reinforcement-learning/05-dqn/docs/zh.md)
- [`phases/09-reinforcement-learning/06-policy-gradients-reinforce/docs/zh.md`](../../phases/09-reinforcement-learning/06-policy-gradients-reinforce/docs/zh.md)
- [`phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md`](../../phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md)
- [`phases/09-reinforcement-learning/08-ppo/docs/zh.md`](../../phases/09-reinforcement-learning/08-ppo/docs/zh.md)
- [`phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md`](../../phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md)

构建器核对的标识与数值：

- `K_EPOCHS`

## 缩略语

对应主题区块：**缩略语**（`glossary`）。

来源文件：

- [`phases/09-reinforcement-learning/01-mdps-states-actions-rewards/docs/zh.md`](../../phases/09-reinforcement-learning/01-mdps-states-actions-rewards/docs/zh.md)
- [`phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md`](../../phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md)
- [`phases/09-reinforcement-learning/05-dqn/docs/zh.md`](../../phases/09-reinforcement-learning/05-dqn/docs/zh.md)
- [`phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md`](../../phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md)
- [`phases/09-reinforcement-learning/08-ppo/docs/zh.md`](../../phases/09-reinforcement-learning/08-ppo/docs/zh.md)
- [`phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md`](../../phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md)
- [`phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md`](../../phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 问答

对应主题区块：**问答**（`qa`）。

来源文件：

- [`phases/09-reinforcement-learning/03-monte-carlo-methods/docs/zh.md`](../../phases/09-reinforcement-learning/03-monte-carlo-methods/docs/zh.md)
- [`phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md`](../../phases/09-reinforcement-learning/04-q-learning-sarsa/docs/zh.md)
- [`phases/09-reinforcement-learning/06-policy-gradients-reinforce/docs/zh.md`](../../phases/09-reinforcement-learning/06-policy-gradients-reinforce/docs/zh.md)
- [`phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md`](../../phases/09-reinforcement-learning/09-reward-modeling-rlhf/docs/zh.md)
- [`phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md`](../../phases/09-reinforcement-learning/12-rl-for-games/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 提示

对应主题区块：**提示**（`tips`）。

来源文件：

- [`phases/09-reinforcement-learning/01-mdps-states-actions-rewards/docs/zh.md`](../../phases/09-reinforcement-learning/01-mdps-states-actions-rewards/docs/zh.md)
- [`phases/09-reinforcement-learning/02-dynamic-programming/docs/zh.md`](../../phases/09-reinforcement-learning/02-dynamic-programming/docs/zh.md)
- [`phases/09-reinforcement-learning/05-dqn/docs/zh.md`](../../phases/09-reinforcement-learning/05-dqn/docs/zh.md)
- [`phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md`](../../phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/zh.md)
- [`phases/09-reinforcement-learning/08-ppo/docs/zh.md`](../../phases/09-reinforcement-learning/08-ppo/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 冻结上游的原始定位记录

以下文本原样保留，只用作历史审计证据；英文说明不属于站点可见文案。

````text
# Evidence: reinforcement-learning

P09 = phases/09-reinforcement-learning. L01 = P09/01-mdps-states-actions-rewards, L02 = P09/02-dynamic-programming, L03 = P09/03-monte-carlo-methods, L04 = P09/04-q-learning-sarsa, L05 = P09/05-dqn, L06 = P09/06-policy-gradients-reinforce, L07 = P09/07-actor-critic-a2c-a3c, L08 = P09/08-ppo, L09 = P09/09-reward-modeling-rlhf, L12 = P09/12-rl-for-games. All doc paths are docs/en.md.

## Architecture: PPO training loop (7 nodes)
- envs "N parallel envs, T steps each": L08/docs:57; L08/code/main.py:67 (n_envs, horizon)
- actor "Actor, softmax policy": L08/code/main.py:34-42, 73; L07/docs:28
- buf "Rollout buffer, s, a, r, log_pi_old": L08/docs:60, 76-89; L08/code/main.py:76-83
- critic "Critic, v_old per state": L08/code/main.py:81; L07/docs:29
- gae "GAE, advantages, returns": L08/docs:58, 93-95; L08/code/main.py:90-100
- clip "Clipped surrogate, K epochs, minibatches": L08/docs:60-63, 66; L08/code/main.py:123-127
- diag "Diagnostics, mean KL, clip fraction": L08/docs:131-134; L08/code/main.py:157-158
- edges action, transition, value, advantage, update: L08/docs:57-64

## Flow: RLHF in three stages
1. SFT on human demonstrations: L09/docs:24
2. prompt, chosen, rejected rows: L09/docs:28, 132
3. scalar head on SFT model, Bradley-Terry loss: L09/docs:30-36
4. policy from SFT, frozen reference: L09/docs:40
5. RM score minus beta KL: L09/docs:43
6. PPO on token level policy: L09/docs:46
7. mean KL past about 5 to 10: L09/docs:116

## Concepts: Value formulas
- MDP tuple: L01/docs:181
- Return: L01/docs:32
- Bellman V: L01/docs:38
- Value iteration: L02/docs:34
- TD(0): L04/docs:27
- Q-learning: L04/docs:35
- SARSA: L04/docs:43
- DQN loss over replay D: L05/docs:29, 32

## Concepts: Policy formulas
- Policy gradient: L06/docs:27 (trajectory subscript dropped)
- TD advantage delta_t: L07/docs:34
- GAE: L07/docs:47
- PPO ratio: L08/docs:27 (written inline as a quotient)
- PPO clip: L08/docs:35 (theta argument dropped)
- Bradley-Terry: L09/docs:32
- RLHF reward: L09/docs:43
- GRPO advantage over G samples: L12/docs:57

## Command table: Choose a method
- tabular known model, VI or PI: L02/docs:153
- tabular samples only, Q-learning: L04/docs:136
- on-policy safety critical, SARSA or Expected SARSA: L04/docs:137
- high dimensional, DQN, Double DQN in production: L04/docs:138; L05/docs:137
- continuous control, PPO Gaussian or SAC and TD3: L08/docs:153; L04/docs:139
- LLM alignment, DPO first, RLHF-PPO with KL: L09/docs:179, 186; L08/docs:155
- LLM reasoning, GRPO with verifier: L09/docs:180
- board games, AlphaZero or MuZero: L12/docs:160

## Task table: Update lines
- G = r + gamma * G: L03/docs:80
- epsilon greedy: L03/docs:116-117 (two lines joined)
- Q-learning target: L04/docs:103
- SARSA target: L04/docs:83
- TD step: L04/docs:84, 104
- DQN target sync: L05/docs:126-127 (two lines joined)
- RLHF reward with KL: L09/docs:109
- GRPO advantage: L12/docs:123

## Annotated code: PPO clipped update (14 lines)
- condensed from L08/code/main.py:130-155. Keeps 130-134, 136, 148-155. Lines 143-146 (if not clipped ... else 0.0) joined into one conditional expression. clip_hits and kl lines 137-141 dropped.
- comment "advantages normalized per minibatch": L08/code/main.py:128
- comment "clipped means zero gradient": L08/docs:123
- comment "new over old probability": L08/docs:30

## Defaults and numbers
- gamma 0.99, horizon 1/(1 - gamma), 100 steps: L01/docs:28, 120
- tabular alpha and epsilon 0.1, 4x4 GridWorld: L04/docs:115
- PPO clip 0.2, 0.1 timid, 0.3 unstable: L08/docs:45, 139
- c_v 0.5: L08/docs:53; L07/docs:62
- c_e 0.01: L08/docs:53; L07/docs:62
- GAE lambda 0.95, 0 is TD, 1 is MC: L07/docs:50
- RLHF beta 0.01-0.05, keeps policy near SFT: L09/docs:45
- GRPO G 8, 8 to 64 standard, below 4 noisy: L12/docs:117, 147

## Troubleshooting
- mean KL past 0.1, reduce K_EPOCHS or LR: L08/docs:133, 140
- clip fraction near 0, raise LR or K_EPOCHS: L08/docs:134
- clip fraction 0.5 and more, lower them: L08/docs:134
- reward climbs, human eval drops: L09/docs:166
- length hacking: L09/docs:167
- max bias, Double DQN: L04/docs:126; L05/docs:137
- deadly triad, keep target net and replay: L05/docs:135
- entropy collapse, entropy bonus: L06/docs:139; L07/docs:136

## Glossary
- MDP: L01/docs:1, 181
- TD: L04/docs:1, 16
- DQN replay, target net, reward clipping: L05/docs:1, 14-18
- A2C synchronous, batched parallel envs: L07/docs:52, 126
- GAE weighted sum of TD residuals: L07/docs:44-47
- PPO clipped ratio, many epochs: L08/docs:1, 3
- RLHF SFT, RM, PPO: L09/docs:16
- GRPO Group Relative Policy Optimization, no critic: L12/docs:57, 209

## Questions
- on-policy vs off-policy: L03/docs:201-202
- Q-learning max vs SARSA next action, cautious: L04/docs:32, 38, 46, 48
- baseline unbiased, lower variance: L06/docs:34-36
- KL keeps policy near RM data: L09/docs:48
- GRPO halves memory, per prompt normalization, sparse reward: L12/docs:76

## Tips
- five MDP tuples first: L01/docs:144
- check against DP V*: L02/docs:16; L04/docs:119
- epsilon 1.0 to 0.01 over first 10%: L05/docs:136
- normalize advantages per batch: L07/docs:133; L08/docs:142
- exp(log_new - log_old) for numerical stability: L08/docs:144
- K = 10 epochs, minibatches of 64: L08/docs:66
````
