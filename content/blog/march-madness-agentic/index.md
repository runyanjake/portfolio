---
title: March Madness, Meet Agentic AI
slug: march-madness-agentic
date: 2025-03-19
author: Jake Runyan
tags: [ai, agents, sports]
excerpt: Filling out an NCAA bracket with an LLM and advanced metrics.
---

It's that time of year again, and once again, I haven't been as good as I hoped to about keeping up to date with NCAA Men's basketball.
I usually make this resolution after watching a Purdue game here or there (all of immediate family are Purdue alumni + UCSC had only d3), and the track record of following through has not been exactly great. Luckily I've watched enough high school mixtapes and have enough sports-forward friends that I'm still motivated to follow along and do March Madness (this is usually the extent of my NCAAM following for the season).

The difference this time is that we're smack dab in the middle of agentic AI, and as someone who can't name more than a few players who are actively NCAA eligible, I've gotta turn to other means.
In one of last year's brackets, a friend of mine who watched equally little basketball shocked all participants by doing insanely well using Opp PPG (Opponent Points per Game) as the decider for all matchups.

It's goofy but the idea of using advanced metrics to come up with a data driven decision is not a new one.

I looked for a place that publishes NCAA stats and found `https://barttorvik.com/teamstats.php?year=2025&sort=2`. Other sports media are already filling brackets based on this information, but I'm not so sure they're vibe coding their predictions like I am.

## Blah Blah Blah ChatGPT

Web search is so good for everyday use - I gave the LLM the blank bracket webpage as a first pass, and it was reasonably able to parse the page and figure out some matchups. Issue was, it got confused by the First Four placeholders. I could have prompted around it but decided to just hand feed the LLM after a quick sanitization of the html using Sublime's find and replace feature.

It worked right away, the LLM was able to show it understood the organization - this is a pretty basic use case. I then provided the advanced stats page and asked for the first round of outcomes.

## The Results

I mean, to me they look good. A number of high seeds make it to later rounds, yet we see that there are some upsets based on comparison of metrics.

...That's about it, I have my bracket!

## Let's Do Something Better

So we could make this a lot better. Some ideas:

1. Consider more data
  - The BartTorvik site has a lot more info. I could have given more roster information and such.
2. Make an actual agent that can deeply reason about the outcomes of each game
  - Tool for looking up roster
  - Again pull more info from BartTorvik
  - Tool for looking up the coaches/player's twitter and doing sentiment analysis on their tweets
  - Does weather play a factor in sports? Doesn't matter we could have the agent take it into consideration.

Ultimately I think developing an actual agent is a bit overkill as we can very very trivially fit everything in the context of an arbitrary LLM, and web search is gonna get us pretty much where we want.

At this point I'm memeing a bit, and FWIW the window for bracket submissions closes tonight.
So it looks like I won't be implementing anything for this year but at the very least vibe coding my predictions was fun.
