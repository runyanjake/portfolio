---
title: PWS News
date: 2026-11-14
author: Jake Runyan
tags: [ai, agents]
excerpt: A completely self-hosted news aggregator that aggregates news headlines using a custom embedding algorithm into a once-a-day generated report. 
---

![PWS Homepage](./headline.png)

PWS News is a public news aggregator that tracks stories across multiple news sources and presents them to the viewer in a grok-able way. It is built to be self-sufficient, relying only on self-hosted LLMs for inference and embeddings. It is a live service deployed on [PWS](/projects/pws), my homelab.

Given the static nature of its content, this website takes an aggressive caching stance, rendering an automated daily news report once and serving it and other historical reports from cache. Manual report generation runs are performed to capture breaking headlines.

## Links
1. [PWS News](https://news.whitney.rip)
2. [2026/11/14 Blog Post](/blog/2026.11.14-pws-news)
3. [PWS News Archive](https://news.whitney.rip/archive)
4. [PWS News Github](https://github.com/runyanjake/news)