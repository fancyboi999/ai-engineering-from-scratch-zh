# 让训练独自运行前先启动 watchdog

> rollout engine 退出后，Miles 训练不会报错退出，因此需要用一个小脚本替你停止训练。

我们让一次训练独自运行了一个小时。回来时 GPU 已经空闲，日志却增长到了 147 MB。rollout engine 在启动时就已退出，但训练一直在向它发送请求。

读完本节后，你可以识别 rollout engine 已退出的训练，并启动 watchdog，在几分钟内停止它。

**我们的结果：**rollout engine 退出后，一次训练在 63 分钟内记录了 200,533 条 HTTP 503 错误，却一直没有失败退出。watchdog 在 183 s 内停止了同类故障测试。健康训练的回放显示，连续检查六次还不够，因此脚本默认等待十次。

## engine 退出后的表现 {#s-add-a-watchdog-what-a-dead-engine-looks-like}

下面这次训练使用了当前 GPU 不支持的设置。rollout engine 在启动期间退出。trainer 没有停止，而是继续向 engine 发送请求，持续了 63 分钟：

```listing
title: engine 已退出，但训练没有察觉
source: capture/gpu/out-gb10/engine-died-503.log
lang: text
note: 前三行是 engine 的故障信息。最后两行是 trainer 侧的第一条和最后一条错误，两者相隔 63 分钟。
---
[2026-10-17 21:03:03] Enable deterministic inference because of legacy rl_on_policy_target.
AssertionError: FlashAttention v3 Backend requires SM>=80 and SM<=90. Please use `--attention-backend flashinfer`.
[2026-10-17 21:03:24] Received sigquit from a child process. It usually means the child failed.
[2026-10-17 21:03:30.637 rollout_executor] http_utils.py:241 - Error: Server error '503 Service Unavailable' for url 'http://172.17.0.3:20035/generate'
[2026-10-17 22:06:46.137 rollout_executor] http_utils.py:241 - Error: Server error '503 Service Unavailable' for url 'http://172.17.0.3:20035/generate'
```

```listing
title: 训练记录了多少条错误
source: capture/gpu/out-gb10/engine-died-count.txt
lang: text
note: 对该次训练的完整日志运行一次 grep。
---
$ grep -c "503 Service Unavailable" true-on-policy-fa3.log
200533
```

训练记录了 200,533 条错误，却始终没有报告失败。

**Router：**把每条 rollout 请求转发给 engine 的小型服务。[第 8.6 节](#s-which-router-to-use)会进一步说明。

**503 Service Unavailable：**没有 rollout engine 可以接收请求时，router 返回的 HTTP 状态码。

```figure
id: fig-1-2
kind: timeline
title: engine 退出不会让训练停止
claim: 没有 watchdog 时，engine 退出后训练仍运行了 63 分钟，GPU 一直空闲。
caption: 上方轨道是我们的失败训练。下方轨道是在会写出同类错误的容器上进行的 watchdog 测试。
```

## watchdog 为什么要连续检查十次 {#s-add-a-watchdog-why-the-watchdog-waits-for-ten-checks}

我们正常结束的 17 次训练中，日志里完全没有 `503 Service Unavailable`。但[第 3.1 节](#s-train-math-on-gsm8k)的一次 16-answer 训练记录了 22,357 条这类错误。错误会成批出现，持续约 60 s，每分钟最多 2,209 条。客户端会重试每次请求，因此训练仍完成了所有步骤。

失败训练中的错误从未停止。持续 63 分钟的每一分钟内，都至少出现 2,669 条错误。

只看错误总数无法区分这两类运行，时间间隔可以。watchdog 每隔 30 s 统计过去 60 s 的错误数。只有连续多次检查都超过 100 条错误时，它才会停止训练。

```listing
title: 在健康训练记录上回放 watchdog 规则
source: capture/gpu/out-gb10/503-bursts.txt
lang: text
note: 这是 16-answer 训练中真实错误的时间记录，对应 30 个不同的检查起始时刻。最后一列表示 engine 已退出且错误一直持续的情况。
---
$ python3 watchdog_replay.py out-gb10/e2-n16-503-per-second.txt
healthy run: 22357 errors from 2026-10-22 07:16:29, checks every 30 s over the last 60 s, limit 100
checks  healthy offsets stopped  most checks in a row  dead engine stopped after
     6  17 of 30                    6                     153 to 182 s
     8   0 of 30                    6                     213 to 242 s
    10   0 of 30                    6                     273 to 302 s
```

**实际测量结果：**我们使用这次健康训练的真实错误时间回放了规则。连续检查 6 次时，30 个起始时刻中有 17 个会错误停止训练，因为两次错误峰值仅相隔 45 s。没有一种情况会连续触发超过 6 次。连续检查 10 次时，没有误停健康训练，而 engine 退出时会在约五分钟内停止。

## 启动 watchdog {#s-add-a-watchdog-start-the-watchdog}

脚本每隔 30 秒读取容器日志中最近 60 秒的内容。如果连续多次检查都超过错误数量上限，它就会停止容器。

如果 Docker 自身发生故障，脚本会报告错误。如果无法列出容器，脚本以状态码 2 退出。读取日志失败不计为一次检查。错误上限或检查次数不是整数，或者检查次数为 0 时，脚本也会以状态码 2 退出。

第三个参数是连续检查次数。默认值为 10；在我们的回放中，健康训练没有达到这个次数：

```bash
#!/bin/sh
name=${1:-miles-plain}
limit=${2:-100}
checks=${3:-10}
for value in "$limit" "$checks"; do
  case $value in
    ''|*[!0-9]*|??????????*) echo "limit and checks must be whole numbers below one billion"; exit 2;;
  esac
done
if [ "$checks" -lt 1 ]; then
  echo "checks must be 1 or more"
  exit 2
fi
strikes=0
while :; do
  if ! running=$(docker ps -q --filter "name=^${name}$"); then
    echo "$(date -u +%FT%TZ) $name: docker ps failed, the watchdog cannot see the run and stops"
    exit 2
  fi
  [ -n "$running" ] || break
  if logs=$(docker logs --since 60s "$name" 2>&1); then
    errors=$(printf '%s\n' "$logs" | grep -c "503 Service Unavailable")
    if [ "$errors" -gt "$limit" ]; then
      strikes=$((strikes + 1))
    else
      strikes=0
    fi
  else
    echo "$(date -u +%FT%TZ) $name: docker logs failed, this check does not count"
  fi
  if [ "$strikes" -ge "$checks" ]; then
    echo "$(date -u +%FT%TZ) $name: more than $limit errors from the rollout engine in each of $checks checks, last $errors in 60 s, stopping the run"
    docker stop "$name"
    exit 1
  fi
  sleep 30
done
echo "$(date -u +%FT%TZ) $name: the run ended"
```

将脚本保存为 `~/miles-lab/watchdog.sh`，或直接下载：

```bash
curl -fsSL -o ~/miles-lab/watchdog.sh https://raw.githubusercontent.com/fancyboi999/ai-engineering-from-scratch-zh/main/manuals/miles-101/capture/gpu/watchdog.sh
```

训练启动后，立即在另一个终端运行 watchdog，并传入[第 1.1 节](#s-run-grpo-on-one-gpu)中使用的容器名称：

```bash
sh ~/miles-lab/watchdog.sh miles-plain 100 10
```

## 先测试 watchdog {#s-add-a-watchdog-test-the-watchdog-first}

可以用两个故意输出错误的容器测试它，无需 GPU。第一个容器每秒打印十条错误且不会停止，模拟已退出的 engine：

```listing
title: watchdog 停止持续输出错误的容器
source: capture/gpu/out-gb10/watchdog-test.txt
lang: text
note: 该容器每秒打印十条错误。
---
$ sh capture/gpu/watchdog.sh wd-dead 100
2026-10-22T15:41:09Z wd-dead: more than 100 errors from the rollout engine in each of 6 checks, last 578 in 60 s, stopping the run
wd-dead
$ echo $?
1
```

容器启动 183 s 后，watchdog 停止了它，并以状态码 1 退出。这次测试发生在默认值调整为 10 之前，因此连续检查次数是 6。改成 10 次后，需要再多检查四次，因此大约晚两分钟停止。同一脚本可以按顺序启动多次训练，根据这个退出码跳到下一次运行。退出码为 2 表示 watchdog 无法访问 Docker，训练此时没有保护。

第二个容器会连续 60 s 打印错误，然后安静两分钟，如此重复三次，模拟繁忙 engine 的错误峰值。watchdog 让它运行到结束，总计 541 s，并以状态码 0 退出。它两分钟的安静间隔比真实记录中的 45 s 更长，因此还应使用前面的回放结果进行验证。

## 控制 GPU 温度 {#s-add-a-watchdog-guard-the-gpu-heat}

GB10 在连续负载数小时后反复达到 84 C。[前言](#s-front-how-we-tested-it)提到的 heat guard 在五天内暂停了训练 1,005 次。GB10 或其他长时间运行时容易过热的 GPU 都可以使用它。只运行几步的短任务不需要 heat guard。

下载我们实际使用的脚本，并在主机的第三个终端中启动，不要在容器内运行。`rm` 会删除上一次会话留下的停止文件，因为只要文件存在，脚本就会立即退出。确认没有其他任务队列用该文件停止 heat guard 后，再删除它。命令遇到第一个错误时就会停止，因此下载失败不会误启动旧版本：

```bash
curl -fsSL -o ~/miles-lab/heat-guard.sh https://raw.githubusercontent.com/fancyboi999/ai-engineering-from-scratch-zh/main/manuals/miles-101/capture/gpu/heat-guard.sh \
  && rm -f ~/miles-lab/queue2.done \
  && sh ~/miles-lab/heat-guard.sh
```

脚本每隔 5 s 用 `nvidia-smi` 读取 GPU 温度。当温度达到 84 C 时，它会暂停第一个使用 `radixark/miles:latest` 镜像的运行容器。温度降至 74 C 或以下且暂停至少 45 s 后，脚本会恢复容器；最长暂停 120 s。每次暂停和恢复都会写入 `~/miles-lab/runs/thermostat.log`。

按 Ctrl+C 停止脚本。退出前它会恢复自己暂停的容器，因此训练不会一直停在暂停状态。我们的检查显示，在暂停期间按 Ctrl+C 后，训练会在 5 s 内恢复。文件 `~/miles-lab/queue2.done` 存在时，脚本也会停止；我们的训练队列用它通知脚本退出。

比较耗时时要查看暂停日志。与暂停重叠的训练步骤会因为等待而变慢，并非计算本身增加。[第 5.3 节](#s-repeat-a-run)会介绍如何只统计 clean step。

watchdog 只负责停止训练。要查明 engine 为什么退出，应查看第一条错误之前的 engine 日志。[第 7.1 节](#s-troubleshoot-by-symptom)列出了我们遇到的原因。

```takeaways
- 每次让训练独自运行时，都在另一个终端启动 watchdog。
- 将连续检查次数设为 10，因为健康训练的错误峰值可能只相隔 45 s。
- 先在模拟容器上测试 watchdog，再用于真实训练。
- GPU 容易过热时运行 heat guard，并保留暂停日志。
- 查看第一条 503 错误之前的 engine 日志，定位故障原因。
```

来源：capture/gpu/watchdog.sh；capture/gpu/heat-guard.sh；capture/gpu/out-gb10/thermostat.log；capture/gpu/watchdog_replay.py；capture/gpu/out-gb10/503-bursts.txt；capture/gpu/out-gb10/e2-n16-503-per-second.txt；capture/gpu/out-gb10/engine-died-503.log；capture/gpu/out-gb10/engine-died-count.txt；capture/gpu/out-gb10/watchdog-test.txt；capture/gpu/summary/miles-gb10-lab.json (excluded runs)；Miles main 08752a12 中的 rollout client。
