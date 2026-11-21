# Better Recon with AI

## Summary

A bug bounty hunter's recon is the discovery side of attack surface management (ASM). I wanted to see if that approach could help organisations look at their own assets. I built a workflow that combines existing recon techniques with unranked security questions written by a model.

I tried it on the scope of a vulnerability disclosure programme (VDP) I'd already hunted by hand. Here's what I got with a few lightly prompted models.

- **18 issues** surfaced.
- **12 reports accepted as valid**, including 2 Criticals and 3 Highs.
- **About 3 hours**, mostly unattended, on a Claude subscription.

The idea came from my time as a triager, watching elite hunters work, and seeing models improve at source code review, exploitation and reverse engineering.

## Hunters == APTs

Attack surface management (ASM) means continuously discovering and monitoring everything an organisation exposes so it can be kept secure, and for most organisations that's a lot of websites. So how do we do it better? You could point an AI pentest framework like [Strix](https://github.com/usestrix/strix) at each one, and for a single application or a defined scope, that's a reasonable thing to do.

However, this runs into scaling issues when it comes to targeting hundreds of websites. The time taken for the whole scan will skyrocket, and the compute bill will add up quickly. Using frontier models is expensive, and you might just get guardrailed nowadays. Running open-weight models on your own hardware is one viable solution, provided you already have the hardware.

To me, bug bounty hunters can be treated as advanced persistent threats (APTs). The term usually refers to state-backed groups, but the letters fit hunters well. They keep coming back to the same scope and have a financial reason to look at every application they can reach. The best hunters regularly report critical bugs.

A hunter starts by mapping what an organisation exposes and deciding where to spend their time. That's the discovery side of ASM, and I think defenders can look at their own assets the same way. My old team at PayPal ran the bug bounty programme and was aptly named "Bug Bounty and Proactive Pentest".

## Models and Benchmarks

Pointing an AI pentest framework at everything is tempting because of how far models have come in exploitation and reverse engineering. AI is already better at finding and exploiting bugs than any human. An agent solved all 9 Flare-On 13 challenges on its first attempt in about 80 minutes of agent time. [Flare-On 13 results](https://mahaloz.github.io/ilio-mini/flareon13_results/)

Mozilla shipped fixes for 271 vulnerabilities in Firefox 150 found with an early version of Claude Mythos Preview. The Gogs maintainers also published a 2FA bypass discovered with GPT-5. [Mozilla's writeup](https://blog.mozilla.org/en/firefox/ai-security-zero-day-vulnerabilities/) · [Gogs advisory](https://github.com/gogs/gogs/security/advisories/GHSA-p6x6-9mx6-26wj)

OpenAI now offers GPT-6 Cyber to approved organisations for investigating and reproducing vulnerabilities. [OpenAI's model docs](https://developers.openai.com/api/docs/models/gpt-6-cyber)

Almost every week there's a new story, like Anthropic announcing that Mythos was too dangerous for the public, the OpenAI agent that [escaped its sandbox during a security test and broke into Hugging Face](https://www.malwarebytes.com/blog/news/2026/07/openais-agent-escaped-its-sandbox-during-a-security-test), or the report of close to [1,000 local privilege escalation exploits in the Linux kernel](https://openai.com/index/a-thousand-fewer-paths-to-root/).

On the reverse engineering side, tools like [Reverse Engineer Anything](https://github.com/morluto/rea) have made it easy for anyone to get started in what was once an extremely difficult field to enter. In October 2026, a wave of AI-made browser ports of games like Call of Duty: Black Ops 2 appeared, until Activision started issuing [DMCA takedowns](https://www.tweaktown.com/news/114029/activision-takes-down-ai-made-black-ops-2-browser-ports/index.html). That's something I could never have anticipated.

To quantify AI's exploitation capabilities, benchmarks like [ExploitGym](https://rdi.berkeley.edu/blog/exploitgym/) are used. It gives an agent the source code, a known bug and an input that triggers it, and asks for a working exploit.

BenchLM reports the share of ExploitGym's 898 tasks each model solved. The table shows the top 5 results and the 3 runs from the benchmark's authors.

| Model | Exploited | Who ran it |
| --- | --- | --- |
| Gemini 4 Carbon | 53.5% | Google |
| GPT-6 Cyber | 48.5% | OpenAI |
| GPT-6 Astra | 42.4% | OpenAI |
| Gemini 4 Argon | 39.5% | Google |
| Claude Mythos 5.2 | 38.1% | Anthropic |
| Claude Mythos Preview | 17.5% | ExploitGym |
| GPT-5.5 | 13.4% | ExploitGym |
| GPT-5.4 | 6.0% | ExploitGym |

ExploitGym results from [BenchLM](https://benchlm.ai/benchmarks/exploitgym)

### Where Benchmarks Fall Short

Seeing all this has made me a firm believer that reverse engineering and exploitation involving **source code / binary + LLMs** are "solved problems". However, on a black-box target, we do not have the well-defined boundaries that benchmarks, source code and binaries provide for models.

To me, benchmarks are capture-the-flag (CTF) competitions for models. In a CTF, you _already know_ there's a vulnerability and a right answer. On a black-box programme, you're walking in the dark.

> To get a bounty, you must be the first reporter. This means nobody else, including the developers, security teams, triagers and **all** other hunters, can have reported or logged this bug before you. In other words, **there is no 'right' answer** because no one knows what you are looking for.

Fixed benchmarks can lose value as models improve. XBOW's maintainers say their suite is saturated as of mid-2026, with the vulnerabilities trained into the models. I expect other suites to run into the same problem. [XBOW's validation benchmarks](https://github.com/xbow-engineering/validation-benchmarks)

On a real attack surface, I have to pick the application myself first. In [MITRE ATT&CK](https://attack.mitre.org/tactics/enterprise/) terms that's reconnaissance, the first of its 15 tactics. By my reading, the tasks in ExploitGym and [NYU CTF Bench](https://arxiv.org/abs/2406.05590) (200 CTF challenges) map most closely to 3 of them, Initial Access, Execution and Privilege Escalation, where most exploitation techniques sit. Reconnaissance and the other 11 aren't covered as much.

![](/images/blog/recon-attack-focus.svg)

ATT&CK tactics covered by NYU CTF Bench and ExploitGym

Neither benchmark covers how an agent finds and compares applications before choosing one to investigate, and for ASM that's the part I care about most. XBOW ran into the same problem when it went hunting across HackerOne in 2025, and [The Road to Top 1](https://xbow.com/blog/top-1-how-xbow-did-it/) explains how it scored targets on signals like web application firewalls (WAFs), status codes, auth forms and technologies. I found myself asking this question, which became my problem statement:

> If LLMs are guns, where do I point them when I have limited bullets?

## The Harness

I first looked at how much code a model still needs around it. A harness is the code that wraps a model and gives it tools. Older models needed explicit instructions to use browsers, scripts and other tools. Newer models need less of that guidance.

![](/images/blog/recon-harness-meme.png)

Each new model absorbs the harness built for the previous one

Jediah Katz argues that coding harnesses are getting simpler as models take over some of what the scaffolding used to do. Context and orchestration still matter. [Is the Agent Harness Dead?](https://www.youtube.com/watch?v=7Y4sbZgBdnc)

Arize makes a similar point. General scaffolding can be trained into a model. Domain knowledge and context management transfer less easily, so they suggest keeping the harness and revisiting it as models improve. [Arize's post on harness distillation](https://arize.com/blog/agent-harness-distillation/)

I believe the harness is there to **support** the model with context, instead of teaching it how to use tools or forcing it to think a certain way. Each new model will be able to call tools on its own, but there is still some value in having preset deterministic tools or workflows do the heavy lifting first before a model takes over.

For instance, a lot of recon is work a model doesn't need to do. Parsing JavaScript, sending a probe to see whether an application's behaviour changes, and checking for diffs to find new features are all things deterministic code can do without costing tokens.

## Prompting

Prompting a model costs tokens too. Playbooks and security tips for each vulnerability class all go into the prompt and are used to tell the model what to look out for. However, models today require less guidance, and the guidance we give can actually hinder their performance.

A [2026 study](https://arxiv.org/html/2604.17159v1) ran Gemini 3 Pro on the 200 challenges in NYU CTF Bench using the [D-CIPHER](https://arxiv.org/abs/2502.10931) framework, and compared generic prompts against category-specific security tips:

| Environment | Generic prompts | Category-specific tips |
| --- | --- | --- |
| Kali | 52.0% | 40.0% |
| Ubuntu | 42.5% | 44.5% |

Challenges solved by Gemini 3 Pro on NYU CTF Bench, from a 2026 study using D-CIPHER

On Kali, which already has the tooling installed, the tips made things worse. On Ubuntu they helped by 2 percentage points, which is 4 challenges out of 200.

The authors found that the tips didn't consistently help. The environment and choice of model made a clear difference. The tips comparison only used 1 model, though.

A separate study found that both custom security prompts it tried scored below the baseline and cost more to run across 104 benchmark tasks. [Baselines Before Architecture](https://arxiv.org/abs/2607.13085)

[Yan Shoshitaishvili's Black Hat USA 2026 keynote](https://www.youtube.com/watch?v=VNYe3Cnk5Pw) got me thinking about vulnerability properties. As I understood it, his idea is to stop asking AI to hunt for bugs directly, and instead work out the properties vulnerable code tends to have and feed those to it. I wondered whether the same works black-box. Without the source code, is there something about **how an application behaves that makes it look vulnerable to an AI**? And **just how deterministic can I be when hunting for bugs across huge scopes?**

## Methodology

I built the workflow based on everything above. Most of it is scripts that run before any model gets involved, so I call it a workflow rather than a harness. I didn't want to spray payloads everywhere, and using AI on everything takes a lot of tokens that I don't have. The scripts collect, group and probe first, and the models come in after that with a short prompt. The scripts can be run in either **domain** or **app** mode, to recon entire domains (including subdomain discovery) or to target specific applications after authenticating.

To test it, I used a public vulnerability disclosure programme (VDP) whose scope I'd already hunted by hand. The models started with no prior context, including none of my earlier reports. VDP scopes tend to be large, so recon gives me a lot of data to work with.

![](/images/blog/recon-methodology.svg)

Trying to save tokens by minimising AI usage

The first 3 steps are the usual bug bounty recon. That's already well documented, so I used existing tools for them. No need to reinvent the wheel.

Collection started from the programme's main root domain. Later in the run, the model found other in-scope root domains on its own and ran the same scripts on those too (more on that below), bringing the total to over 20 root domains. Subdomain enumeration found 2,518 names, of which 1,539 resolved, with 924 distinct applications on them. This stage uses [gau](https://github.com/lc/gau) to pull archived URLs, as well as [jsluice](https://github.com/BishopFox/jsluice) to parse JavaScript into an abstract syntax tree (AST) to extract more endpoints and scripts.

Grouping sorted the 924 applications by the 121 technologies that fingerprinting detected. The largest group had 188 applications, about a fifth of everything. Reading a group and asking which member behaves differently is much cheaper than reading 924 applications one at a time. Also, grouping helps to set aside third-party SaaS and static-looking websites, both of which rarely yield bugs. Bishop Fox did something similar with [screenshot hashes back in 2019](https://tldrsec.com/blog/pose-a-threat-how-perceptual-analysis-helps-bug-hunters/), and so did XBOW with SimHash and screenshot hashing. Mine groups by fingerprinted technology, and their responses to probes.

![](/images/blog/recon-grouping.svg)

Grouping hosts helps to find outliers

The probe stage sends benign markers to applications to see whether their behaviour changes. They're less likely to trip a WAF than full payloads, and unlikely to harm the application. For example, if I see `?id=` at the end of a URL, I would personally try `'` and `">` to test for SQLi and any reflection. AI doesn't need to do this for me. James Kettle described this back in 2016 with [Backslash Powered Scanning](https://portswigger.net/research/backslash-powered-scanning-hunting-unknown-vulnerability-classes), which sends harmless probes and looks for changes in behaviour.

| Probe | What it sends | What it looks for |
| --- | --- | --- |
| Reflection | `">` | The characters coming back unencoded in the page |
| SQLi | `'` on parameters like `?id=` | An error or a change in behaviour |
| CORS | `Origin: https://<random>.invalid` | The marker reflected in `Access-Control-Allow-Origin` |
| Method | POST instead of GET, with an empty body or `{}` | A different response |

Example probes the workflow sends

The method probe is less benign than the others, since a POST can trigger an action, so it only sends an empty body or `{}`.

The probe stage also replays ordinary requests and records what comes back. Of the 7,954 responses to those replays, 4,371 were distinct by status, content type, size and body hash, and 830 were WAF block pages, even though the requests had nothing malicious in them.

The stages above leave me with a large dataset, and I still need a way to hand the model what's worth looking at. That's what **security questions** are for.

## Security Questions

This is a term I personally use, and it reflects how I think when I'm on a black-box pentest. Security questions are **an unranked list of questions I ask about a certain behaviour or functionality in an application**.

Let's say I find a JWT, a signed login token. A few questions come to mind straight away. I go and check those, and the answers bring up more questions.

![](/images/blog/recon-jwt-questions.svg)

Security questions for a JWT

I'd want to look at things like an endpoint that takes a file path, a reflected header, or one host in a group that answers differently, even though none of them are bugs yet. For the scripts, that mostly means a response that's different from the ones around it. An endpoint returning a 500 suggests something dynamic is running behind it. A group of API endpoints where some return 403 and about half return 405 is another example. A 405 usually means the route exists but the method is wrong, so the 2 sets are probably being handled by different layers.

A model writes the questions after reading these responses, along with the material around them. Each question is saved with the observation that prompted it, a check that could answer it, what's still unknown, the evidence behind it and any context about the application it was found on. Multiple passes over the same dataset are done before all questions are combined.

The questions are based on what the application did. I don't use a playbook for each vulnerability class, and I keep them open-ended so the model can freely think about what could be there. 

I keep the questions unranked because I don't find an LLM's rankings useful this early. From a broad unauthenticated ASM sweep alone, it doesn't have enough information to put one application first and another second. When I did do ranking, I found myself with a lot of triaging to do (could be a skill issue with my ranking algorithms). [PentestGPT](https://arxiv.org/abs/2308.06782) keeps a task tree and [MAPTA](https://arxiv.org/abs/2508.20816) generates hypotheses, but both work on a single target. Mine are written from recon across a whole scope or organisation, so the context is slightly different. 

## Model Investigations

The model that investigates these questions gets a short prompt. Again, there's no security playbook and not much tooling beyond a browser. It's told to register accounts where the programme allows it, open a browser, and follow whichever questions it sees fit. The recon, the groups and the questions are there for it to read, so the guidance is in that material and the prompt can stay short. The model is even allowed to run the entire deterministic workflow again if it finds a new subdomain or if it wants to do application-specific recon after logging in.

Each check comes back yes, no or unknown, and as with the JWT, an answer can lead to more questions. In my light prompts, I do tell the model to ask more security questions about anything it finds interesting.

This lines up with the Kali result I mentioned earlier, where the environment already gave the model what it needed and extra tips didn't help. In their case it was tooling, and in mine it's context. I don't need to tell the model how to hack. I just tell it to try hard, reach 100% coverage of the application it decides to target and to keep asking new questions.

I mainly use models from Anthropic, although I have substituted others like DeepSeek and OpenAI's models. All runs use medium or high effort, and I let each one decide when it needs to think harder.

![](/images/blog/recon-models.svg)

Agents delegate to cheaper models to save tokens

There are some guardrails just in case. The scope I confirmed and the programme's rate limit are enforced in code, and anything that changes state is logged. The model decides for itself what counts as destructive, and anything it marks that way needs my approval first. DELETE requests always need my approval, whatever the model decides. For POST, PUT and PATCH I'm relying on the model's judgement, which is why every state change is logged too.

On my runs, the agents stopped to ask before changing account details, deleting accounts or deleting files on my own machine. They also stopped when they needed me to sign in or solve a CAPTCHA. Otherwise they kept going on their own, and I thought they picked the right moments to stop.

## Results

One weekend, I let the agents run mostly unattended for about 3 hours while I worked on other things. I stepped in when they needed approval. They surfaced 18 issues. I reported 12, and the programme accepted all 12 as valid. They were a mix of broken access control and information disclosure.

| Severity | Issues |
| --- | --- |
| Critical | 2 |
| High | 3 |
| Medium | 2 |
| Low | 5 |

Severity of the 12 triaged issues

The models went much further than I had, working through endpoints I'd never got to. They even found bypasses of the fixes for some of my earlier reports, which they did not have access to.

The model picked the sites it found these issues on because they returned many dynamic API endpoints without authentication. By first targeting one site, and asking more and more questions, it fanned out to apps it deemed 'similar' in terms of region and stack. Some of the issues reported used a feature of one site to attack the other, which was really cool to see.

I ran it on my Claude subscription. Getting **2 Criticals and 3 Highs** from about 3 hours of mostly unattended work felt well worth it to me.

Here's a resolved finding from another programme I ran the workflow on, with the details removed and the endpoint names changed. It isn't one of the 12, but it shows how one odd response turned into a bug. 

Early on in that programme, a misconfiguration broke the application's normal flow, so no one could complete it. An agent went through the JavaScript itself and found a `/resend` endpoint for appointment letters. By asking questions about this endpoint, it helped to uncover a High severity issue.

![](/images/blog/recon-worked-example.svg)

From observation to outcome

The request and response looked like this:

```http
POST /resend HTTP/1.1
(no session cookie, no token)
{"appointmentId": 1003}

HTTP/1.1 201 Created
{"success": true,
 "message": "<success message>",
 "pdfUrl": "<link to the letter PDF>"}
```

Each letter held personal details about the person and their appointment, plus a reference that could be used to reschedule or cancel it. Since the `appointmentId` was just an integer, mass leakage of PII was possible using this.

## Back to ASM

An organisation looking at its own assets would use this a bit differently. In bug bounty, a finding only counts if it proves impact, so that's where the model spends its effort. An ASM sweep of your own estate is about hardening, so proving impact matters less, and informational findings like a weak Content Security Policy or an Origin header reflected without `Access-Control-Allow-Credentials: true` are worth raising too.

I'm still working out how much of the preparation I can handle with ordinary code. I run the same workflow on smaller recon datasets with known findings to see which outliers the models pick up and what else they notice. I score the small sample by hand as a sanity check. If models keep improving, I think the context I give them will matter more than how I prompt them.

So to do ASM better, I'd still use the bug bounty approach. Let scripts do the recon and filter for what looks different, then spend tokens on that.

I'll keep applying this workflow to more VDPs and bug bounty programmes as I refine it, and hopefully find more interesting bugs soon!

## References

**Benchmarks and studies**

- [ExploitGym](https://rdi.berkeley.edu/blog/exploitgym/), UC Berkeley RDI, 2026
- [ExploitGym leaderboard](https://benchlm.ai/benchmarks/exploitgym), BenchLM
- [XBOW validation benchmarks](https://github.com/xbow-engineering/validation-benchmarks), XBOW
- [Systematic Capability Benchmarking of Frontier Large Language Models for Offensive Cyber Tasks](https://arxiv.org/html/2604.17159v1), Merves et al., arXiv, 2026
- [NYU CTF Bench: A Scalable Open-Source Benchmark Dataset for Evaluating LLMs in Offensive Security](https://arxiv.org/abs/2406.05590), Shao et al., arXiv, 2024
- [D-CIPHER: Dynamic Collaborative Intelligent Multi-Agent System with Planner and Heterogeneous Executors for Offensive Security](https://arxiv.org/abs/2502.10931), Udeshi et al., arXiv, 2025
- [Baselines Before Architecture: Evaluating Coding Agents for Autonomous Penetration Testing](https://arxiv.org/abs/2607.13085), Dhakal et al., arXiv, 2026
- [Flare-On 13 results](https://mahaloz.github.io/ilio-mini/flareon13_results/), ilio
- [MITRE ATT&CK Enterprise tactics](https://attack.mitre.org/tactics/enterprise/)

**Prior work**

- [The Road to Top 1: How XBOW Did It](https://xbow.com/blog/top-1-how-xbow-did-it/), XBOW, 2025
- [Pose a Threat: How Perceptual Analysis Helps Bug Hunters](https://tldrsec.com/blog/pose-a-threat-how-perceptual-analysis-helps-bug-hunters/), Bishop Fox, AppSec California 2019 (tl;dr sec summary)
- [Backslash Powered Scanning](https://portswigger.net/research/backslash-powered-scanning-hunting-unknown-vulnerability-classes), James Kettle, PortSwigger, 2016
- [PentestGPT: An LLM-empowered Automatic Penetration Testing Tool](https://arxiv.org/abs/2308.06782), Deng et al., arXiv, 2023
- [Multi-Agent Penetration Testing AI for the Web (MAPTA)](https://arxiv.org/abs/2508.20816), David and Gervais, arXiv, 2025

**Talks and posts**

- [Is the Agent Harness Dead?](https://www.youtube.com/watch?v=7Y4sbZgBdnc), Jediah Katz
- [Are agent harnesses dying? What harness distillation changes](https://arize.com/blog/agent-harness-distillation/), Laurie Voss, Arize, 2026
- [Vulnerability Research in the Agentic Age](https://www.youtube.com/watch?v=VNYe3Cnk5Pw), Yan Shoshitaishvili, Black Hat USA 2026
- [The zero-days are numbered](https://blog.mozilla.org/en/firefox/ai-security-zero-day-vulnerabilities/), Mozilla, 2026
- [OpenAI's agent escaped its sandbox during a security test](https://www.malwarebytes.com/blog/news/2026/07/openais-agent-escaped-its-sandbox-during-a-security-test), Malwarebytes, 2026
- [A thousand fewer paths to root](https://openai.com/index/a-thousand-fewer-paths-to-root/), OpenAI
- [Gogs 2FA bypass advisory](https://github.com/gogs/gogs/security/advisories/GHSA-p6x6-9mx6-26wj), Gogs
- [GPT-6 Cyber](https://developers.openai.com/api/docs/models/gpt-6-cyber), OpenAI
- [Activision takes down AI-made Black Ops 2 browser ports](https://www.tweaktown.com/news/114029/activision-takes-down-ai-made-black-ops-2-browser-ports/index.html), TweakTown, 2026

**Tools**

- [Strix](https://github.com/usestrix/strix)
- [gau](https://github.com/lc/gau)
- [jsluice](https://github.com/BishopFox/jsluice), Bishop Fox
- [REA: Reverse Engineer Anything](https://github.com/morluto/rea)
