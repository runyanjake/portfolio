---
title: Pure RL With DeepSeek
slug: pure-rl-with-deepseek
date: 2025-01-22
author: Jake Runyan
tags: [ai, llm, deepseek, openwebui]
excerpt: Trying out DeepSeek-r1 locally with OpenWebUI and Ollama.
---

So apparently pure reinforcement learning is the move. The new DeepSeek models out of China throw modern LLM training
techniques out in favor of just purely using RL over more time and over more data to produce better models than the more bespoke methods.

## Open Source Stacks Rock!
I've experienced it once before with [ComfyUI](/blog/sdxl-pipeline-with-comfyui), but it seems like with AI the open source
community has really been putting in the work so those like me looking to start some passion projects can quicken their development cycles.

[OpenWebUI](https://github.com/ml-explore/OpenWebUI) is a great frontend UI for interacting with models. Some of their docker containers
come bundled with Ollama, which means the setup is literally as simple as building a super standard docker container with it.

## DeepSeek
This is the new LLM model out of China that's been said to have pretty good code gen abilities, and the main reason I started looking
at setting up this stack for myself. I've done previous attempts at self-hosting coding assistants, but found that the juice wasn't
worth the squeeze, as they say.

For this experiment I was looking at the 1.5b and 8b models for `deepseek-r1`, though the coding assistant model `deepseek-coder` is also available.

## My Experience
Man, it was pretty good. I've got a smaller GPU on PWS so I was limited to running the 8b model, but responses were good. I noticed
the best response times on the 1.5b model, and for some easier tasks the correctness between the two was hard to discern.

I particularly liked the features of OpenWebUI to allow for web search, which from initial testing seemed to find good results to build
context of the response with.

![DeepSeek with web search](https://images.whitney.rip/api/assets/b5817baf-631e-4fa0-a456-8c45f0dd93d0/thumbnail?size=preview&key=--mO7kUUzkeGbsE8f6bJKWg-toGLQWh_ZZRxqkUIQxYQlSfDu92Or2l1rF1ASwNx_Vw&c=5Hts56p%2B%2BrreaZ3B2WXOaHSF%2BeI%3D)

Some responses with web search are a little on the nose with the smaller models, for example a search about me gives results that are pulled
verbatim from my github profile and websites.

![Web search verbatim results](https://images.whitney.rip/api/assets/3db55a71-22f8-41b4-8972-d03c26dd60ce/thumbnail?size=preview&key=--mO7kUUzkeGbsE8f6bJKWg-toGLQWh_ZZRxqkUIQxYQlSfDu92Or2l1rF1ASwNx_Vw&c=047IZ6LxmjRH52yZJWg5g%2BmoqJ0%3D)

I'm still actively using chatgpt, claude, and others for coding work, but as local LLMs improve you can bet I'll be keeping up to date with this stack.

## Resources
[OpenWebUI](https://github.com/ml-explore/OpenWebUI)
[Deepseek with Ollama](https://ollama.ai/library/deepseek-coder)
Thank you to [DWS](https://dws.rip) for collaboration.
