---
title: Self-Hosted Copilot With Ollama
slug: copilot-with-ollama
date: 2024-12-30
author: Jake Runyan
tags: [ai, llm, self-hosted, ollama]
excerpt: Replacing paid coding assistants with a self-hosted Ollama-backed setup.
---

During the end of 2024, there's been a lot of coding companions on the market. One I've liked is Cursor, which is a fork of VSCode and uses Clyde as an underlying model
for the companion, among a few others. Its free tier worked well, and you could game the system a bit by going through the signup process multiple time to get more use
out of the tool. However they started to patch some of these holes, and I had to look for a fully self hosted solution, as the pricing model for a personal use coding
companion is, in my opionion, a little steep.

## Self host it!
Hosting LLMs via LM Studio or Ollama are pretty good ways to make this project happen. Since I've used LM Studio enough before, I used Ollama to self host my LLM.

Various VSCode plugins are built for self-hosted LLMs, and it's pretty simple to mix and match. In this experiment I'll try a few tools: [LLama Coder](https://marketplace.visualstudio.com/items?itemName=ex3ndr.llama-coder),
[Code GPT](https://marketplace.visualstudio.com/items?itemName=DanielSanMedium.dscodegpt), and [twinny](https://marketplace.visualstudio.com/items?itemName=rjmacarthy.twinny).

## Running a model
So it's pretty easy to run a model in Ollama. First, get a list of ollama models with `ollama list`. Then use `ollama run` to download and run your intended model.
```
ollama list
ollama run stable-code:3b-code-q4_0
```

## Querying the model directly
By default you'd be able to just directly interface with the LLM from the interactive prompt. The inference is quite fast.
Querying via the API is also simple. The run command starts a server, much like in LM Studio, which has the OpenAI style endpoints that you can curl with some example curls:
```
curl http://localhost:11434/api/generate -d '{
  "model": "stable-code:3b-code-q4_0",
  "prompt": "Write a hello world program in Java.",
  "stream": false
}'
```
Packages for Ollama are available in most programming languages if you want to use the OpenAI sytle api programmatically.

## LLama Coder Plugin
The Llama Code plugin is able to do tab complete via your local LLM. Luckily it expects a default Ollama setup, which we just configured.
All we need is the `ollama` cli installed and it should be able to detect it once we install the extension.

## Settings
Next we'll visit the plugin page, click on the settings wheel, and select Settings. For a default installation nothing needs to be saved.

## Usage
When writing code, after a space bar press and time waits, the LLM will be fed with the context and a suggestion will be given.

## Aider-composer
This plugin supposedly allows for composer like features (code diff that you can apply/reject).

## Setup
Certain python packages are required:
```
pip install aider-chat flask
```

## Resources

[Andrea Grandi's dive into this topic](https://www.andreagrandi.it/posts/self-hosting-copilot-replacement/)
