---
title: Let's Try Flux.1
slug: flux-1
date: 2024-08-16
author: Jake Runyan
tags: [ai, image-gen, flux]
excerpt: Revisiting AI image generation with the new Flux.1 model.
---

Stable diffusion and its peers have proven to be the beginning of the wide applications of image generation. Over the past year, AI-generated content has become a lot more prevalent on the internet, showing up everywhere from social media to content mill news sites.

In my last iteration of the [PWS Recipes site](https://recipes.whitney.rip), I used the recent release of SDXL in a ComfyUI pipeline to generate static content for the site.

Now, with the release of newer image generation model Flux, I go back for another stab at generating these images.

## Pipeline

Prompt generation is hard. Let's ironically use ChatGPT to generate a prompt for Flux.1.

![ChatGPT prompt generation](https://images.whitney.rip/api/assets/435dac50-16e4-40a5-bea2-edcf2dd5c4f4/thumbnail?size=preview&key=--mO7kUUzkeGbsE8f6bJKWg-toGLQWh_ZZRxqkUIQxYQlSfDu92Or2l1rF1ASwNx_Vw&c=8dK6qeKlRCpPdsFqTm9vAL%2FZnEE%3D)

The ComfyUI pipeline used is very simple. Just a single KSampler pass to generate the image.

![Simple ComfyUI Flux pipeline](https://images.whitney.rip/api/assets/26f430da-5ebf-4602-8506-7e9b6e1c5f59/thumbnail?size=preview&key=--mO7kUUzkeGbsE8f6bJKWg-toGLQWh_ZZRxqkUIQxYQlSfDu92Or2l1rF1ASwNx_Vw&c=RAlAj5RsNKMgG%2Br2JyQIc4C5vT8%3D)

And, we're done.

## Thoughts

So, obviously some things have improved since the last time I looked into this space, and others have not.

The most impressive leap forward has been in text generation, but that being said it's not always perfect:

![Flux text rendering example](https://images.whitney.rip/api/assets/d8a38230-9d9e-4030-93e5-66bfdd71c52e/thumbnail?size=preview&key=--mO7kUUzkeGbsE8f6bJKWg-toGLQWh_ZZRxqkUIQxYQlSfDu92Or2l1rF1ASwNx_Vw&c=LB3A5r05NyIAry%2F%2B1BOEAy33W0s%3D)

In the past we had to do with specially trained models that typically generated text with a lot of errors, usually smashing together characters.
The current state of text generation is far better, the text that is specified in the prompt is treated specially and is correct more than it is incorrect.
Despite this, background text (anything that not generated as a result of explicitly asking for it in the prompt) frequently has some of the original issues we faced, but that can be worked around.

![Flux background text issues](https://images.whitney.rip/api/assets/25c44c8f-166a-4137-b160-a9b48d32ea11/thumbnail?size=preview&key=--mO7kUUzkeGbsE8f6bJKWg-toGLQWh_ZZRxqkUIQxYQlSfDu92Or2l1rF1ASwNx_Vw&c=LYWhF3eUnkVe%2BWDqSLFnotHAbIc%3D)

Other things that are better in this model include hands and feet - previously generating anything with exposed hands or feet would often end up looking more like a horror illustration, but now they look more humanlike than not.
There are still issues with multiple hands showing up where there should only be one, but there is a large improvement in getting the correct number of digits, and making them curl in the correct ways.
Overall, a great step forward!

![Improved hand rendering](https://images.whitney.rip/api/assets/6a8f7c9e-2b30-4ecf-a561-b7ed27183ccc/thumbnail?size=preview&key=--mO7kUUzkeGbsE8f6bJKWg-toGLQWh_ZZRxqkUIQxYQlSfDu92Or2l1rF1ASwNx_Vw&c=LN4fyBFxwsCH6oxYqONM%2F9c6UEE%3D)

One thing that hasn't seen much improvement is generating photos of eggs. For some reason whole peeled eggs haven't come out very well in my experience.

![Imperfect egg rendering](https://images.whitney.rip/api/assets/5cf0c9ff-e7ed-4be8-a5f2-bf1edd1072c5/thumbnail?size=preview&key=--mO7kUUzkeGbsE8f6bJKWg-toGLQWh_ZZRxqkUIQxYQlSfDu92Or2l1rF1ASwNx_Vw&c=4nZLBTkioV4LsSdEJtfsEiKC8%2Fw%3D)

Overall, the steps are positive, and the release of new tools means we have new limits to push the boundaries of.

## Resources

[Flux.1](https://flux1.io/)

[ComfyUI](https://github.com/comfyanonymous/ComfyUI)
