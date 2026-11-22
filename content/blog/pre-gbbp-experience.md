# Pre-GBBP Experience

## Pre-GBBP

Pre-GBBP is the unpaid testing phase for Singapore government employees ahead of the paid [Government Bug Bounty Programme (GBBP)](https://www.tech.gov.sg/products-and-services/for-citizens/crowdsourcing/crowdsourced-vulnerability-discovery-programme/). Pre-GBBP18 and 19 were my first two, and a great chance to adapt a workflow I'd mostly used on larger HackerOne programmes.

So far, Pre-GBBP19 has turned up **39 accepted issues**, including **Critical** and **High** findings, with **19** more waiting to be triaged. Happy to have helped secure the applications!

## Scope

The scope covered staging and test environments for applications from several agencies. Along with the list of apps, I had user guides, test accounts, access to staging Singpass and access control matrices.

## Recon

On a large programme, I usually use recon to work out which apps are worth a closer look. Here the app list was already given, so I wanted to see how much of my usual workflow I could keep while spending more time on each app.

What was new for me was the documentation. I kept the user guides and access control matrices alongside the captures. The guides told me what each app was meant to do, and the matrices showed what each account was meant to see. It felt nice to not be walking in the dark for once!

That's the core idea behind [Anthropic's guide to context engineering](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents). If the model has the information it needs, it should be able to carry out its role well.

## Roles

With that context in place, I split the work into roles. Each role had a clear job and deliberately **generic prompts**, [as explained in another post](/blog/recon-with-ai/#section-prompting). They all ran on Opus 5, since I was still testing the roles.

[A study of agent teams](https://arxiv.org/abs/2512.08296) compared team setups with the prompts held constant, and the biggest gain came on a task that could be split up. Testing lots of apps splits up pretty naturally. Here are the roles, (adorably) illustrated.

![](/images/blog/pre-gbbp-agents.svg)

Agent roles

### Jackdaw

Opus named the tool Jackdaw, which fits the idea of a crow collecting shiny things (or in this case, shiny things that lead to bugs).

![](/images/blog/pre-gbbp-jackdaw-photo.png)

Nordic jackdaw (*Coloeus monedula monedula*), cropped from [a photo by hedera.baltica](https://commons.wikimedia.org/wiki/File:Nordic_jackdaw_%2852563242448%29.jpg) under [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/)

> [**Jackdaw's methodology**](/blog/recon-with-ai/#section-methodology) involves scripts to gather recon material and save it for the other roles. The models can start from those captures, which saves them work and tokens.

Pre-GBBP came with plenty of documentation, so I used Jackdaw to file the guides by app. Each app had its own little "birdhouse", so when a question came up about an app, everything about it was already there. Jackdaw also swept each app while logged out and logged in.

![](/images/blog/pre-gbbp-recon.svg)

Building Jackdaw's recon base

### Miner

The Miner focused on one application at a time. It started from the guides, JavaScript bundles and captures that Jackdaw saved, then tested the application itself, clicking every button, following every link and going as deep as it could. This is the role that helped me find the first bug!

![](/images/blog/pre-gbbp-miner.svg)

The Miner looks closely at one app at a time

### Farmer

Once I'd confirmed an issue, I wanted to see where else the pattern showed up. That was the Farmer's job. It looked across related applications, took the vulnerability class and steps to reproduce, and tried variations on other endpoints.

> If the developers made a mistake here, they probably made a mistake in surrounding endpoints!

![](/images/blog/pre-gbbp-farmer.svg)

Farmer farming all my bugs

### Cheerleader

Agents, like humans, sometimes come back with "nothing found" pretty quickly. The Cheerleader gave those runs a second look and helped me see what we'd covered and which questions were still open.

A colleague went to Valentina "Chompie" Palmiotti's [**BinChomp** talk](https://www.youtube.com/watch?v=03Xh_6_6U4M) at [un]prompted.au, and her idea of nudging an agent when it gives up early is what inspired the Cheerleader.

![](/images/blog/pre-gbbp-cheerleader.svg)

Cheering agents on

### Writer

The Writer helped me, well, write. It kept notes on what we'd tried, what worked and what didn't, so the other roles could check which questions were still open.

It also drafted the reports I reviewed before submission. It had access to my previous HackerOne reports, so it could follow the way I write for triagers.

![](/images/blog/pre-gbbp-writer.svg)

The Writer's notes

## Workflow

![](/images/blog/pre-gbbp-workflow-overview.svg)

How the roles fit together

The Miner and Farmer worked from the same guides and captures. When a question was still open, their notes gave the Cheerleader some context, and the Writer used the same notes to put a draft together. The user guides came in handy again when confirming issues, because they showed what each app was meant to allow.

I stepped in when a lead was turning into a rabbit hole, and I read every draft before deciding what to submit on YesWeHack. Having been on the triage side, I wanted each report to have a clear proof of concept and no AI slop. That meant checking that each issue was valid and that the report gave enough detail to reproduce it.

## Results

I spent Pre-GBBP18 tweaking Jackdaw and submitted about 18 reports. That round wasn't hosted on YesWeHack, so I have no idea how many were valid or duplicates.

Pre-GBBP19 was on YesWeHack, so this time I could see how every report did. Here's where things stood on 22 November.

| Outcome | Reports |
| --- | ---: |
| Submitted | **67** |
| Valid (accepted or duplicate) | **42** |
| Accepted | 39 |
| Closed as duplicates (sad) | 3 |
| Informative | 6 |
| Awaiting triage | 19 |

Pre-GBBP19 report status at the time of writing

The results were pretty good, and confirmation that I was doing _something_ right. Pre-GBBP only covers staging and test environments though, so the workflow still needs more testing on real production systems.

## Finding a Critical

![](/images/construction-bit.svg)

More on how this one turned up once GovTech gives permission to share it. :D

## Moving Forward

Next, I want to improve how the roles hand work to each other. Every role ran on Opus 5 this time, so I'm also looking at cheaper models for some of them. One example is a **Surface Miner** on Sonnet, since a lot of the mechanical work doesn't need the higher tier models.

## References

**Studies and guides**

- [Effective context engineering for AI agents](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents), Anthropic
- [Towards a Science of Scaling Agent Systems](https://arxiv.org/abs/2512.08296), Kim et al.

**Talks**

- [BinChomp](https://www.youtube.com/watch?v=03Xh_6_6U4M), Valentina "Chompie" Palmiotti, [un]prompted.au

**Programmes**

- [Crowdsourced Vulnerability Discovery Programme](https://www.tech.gov.sg/products-and-services/for-citizens/crowdsourcing/crowdsourced-vulnerability-discovery-programme/), GovTech
