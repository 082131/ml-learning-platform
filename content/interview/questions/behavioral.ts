import type { InterviewQuestion } from '@/lib/interview/types';

// Behavioral round. There is no single right answer, so each "answer" is the structure of a strong story with an
// example of how it sounds. Replace the example with your own project.
export const behavioralQuestions: InterviewQuestion[] = [
  {
    id: 'beh-proud-project',
    role: 'behavioral',
    kind: 'behavioral',
    level: 'core',
    topic: 'Motivation',
    prompt: 'Tell me about a project you are most proud of.',
    answer: `Pick a project where you can explain the problem, your own decisions and a measured result. Keep it to about two minutes, then let the interviewer dig.

Structure: one or two sentences of context and why it mattered to the business. Your specific role, saying "I" for what you did and "we" for what the team did. Two or three decisions you made, including one where you chose between real alternatives. The result as a number. What you would do differently.

How it sounds: "Our support team answered the same questions by hand. I proposed and built the retrieval pipeline behind an assistant for them. The first version retrieved the wrong articles for product-code questions, so I added keyword search alongside embeddings and built a 200-question evaluation set to prove it helped; recall at 5 went from 61% to 88%. After launch, median handling time fell by about a third. Looking back, I would have built the evaluation set before the first prototype, because we argued from anecdotes for two weeks."`,
    covers: [
      'Why the project mattered, in business terms',
      "Your own contribution, separate from the team's",
      'A decision with alternatives and a reason',
      'A measured result',
      'An honest lesson',
    ],
    redFlags: [
      'A tour of technologies with no problem or result',
      '"We" throughout, so your part is unclear',
      'Five minutes of context before anything happens',
    ],
    followUps: [
      'What was the hardest technical decision?',
      'What would you change if you started again today?',
    ],
  },
  {
    id: 'beh-failure',
    role: 'behavioral',
    kind: 'behavioral',
    level: 'core',
    topic: 'Growth',
    prompt: 'Tell me about a time you failed, with real consequences.',
    answer: `Choose a real failure that was yours, with a visible cost, and spend most of the answer on what you did about it. Interviewers are checking ownership and whether you learn, not looking for a flawless record.

Structure: what happened and the blast radius, stated plainly. Your part in the cause, without blaming others or tooling. What you did immediately. The root cause. The change you made that outlasted the incident.

How it sounds: "I shipped a feature pipeline change that silently turned a column into nulls. The model kept serving with a default value for two days, and recommendation click-through dropped about 8% before someone noticed. I had tested the code but not the output data. I rolled back, backfilled, and wrote up the timeline for the team. The root cause was that nothing checked null rates between the pipeline and the model. I added data checks that block publication on null-rate and volume changes, and a dashboard alert on the model's default-value rate. That check has since caught two upstream breakages before they reached users."`,
    covers: [
      'A real failure with a stated impact',
      'Ownership without blame',
      'Immediate response and root cause',
      'A lasting process change, ideally with evidence it worked',
    ],
    redFlags: [
      'A disguised strength ("I work too hard")',
      'Blaming a teammate, a manager or a tool',
      'No change afterwards',
    ],
    followUps: ['How did you tell stakeholders?', 'How do you know the fix works?'],
  },
  {
    id: 'beh-conflict',
    role: 'behavioral',
    kind: 'behavioral',
    level: 'core',
    topic: 'Conflict',
    prompt: 'Tell me about a disagreement with a colleague over a technical decision. What happened?',
    answer: `Show that you can disagree about substance, understand the other person's reasons, and reach a decision that sticks, whichever way it goes.

Structure: the decision and why it mattered. Their position, described fairly enough that they would agree with your summary. What you did to resolve it: usually gathering evidence or agreeing on criteria rather than arguing harder. The outcome, and the state of the working relationship afterwards.

How it sounds: "A senior engineer wanted to fine-tune a model for our document classifier; I thought a prompt with retrieval would be enough. His concern was latency and per-call cost at our volume, which was fair. Rather than debate, I suggested we agree on the criteria first: accuracy on a held-out set, p95 latency and monthly cost. I ran both over three days. Mine was accurate enough but twice the cost at volume; his was cheaper but needed labeled data we did not have yet. We shipped mine to collect labels, with a plan to fine-tune once we had 5,000, which we did a quarter later. We wrote the comparison up so the next team would not repeat it."

It is fine to tell a story where you were the one who was wrong.`,
    covers: [
      'A substantive disagreement, not a personality clash',
      'The other view represented fairly',
      'Resolution through shared criteria or data',
      'Commitment to the outcome; relationship intact',
    ],
    redFlags: [
      '"I was right and they came around"',
      'Escalating to a manager as the first move',
      'Claiming you never have conflicts',
    ],
    followUps: ['What if the data had been inconclusive?', 'Tell me about a time you disagreed and lost.'],
  },
  {
    id: 'beh-ambiguity',
    role: 'behavioral',
    kind: 'behavioral',
    level: 'senior',
    topic: 'Ambiguity',
    prompt:
      'Tell me about a time you were given a vague goal. How did you turn it into something you could deliver?',
    answer: `The interviewer wants to see you create structure instead of waiting for it.

Structure: the vague ask, in the requester's words. How you found the real goal: who you talked to and what you asked. How you narrowed it: the measurable target, what you deliberately left out, and the first small deliverable. How you kept people aligned as you learned more. The result.

How it sounds: "My manager asked me to 'make the model better'. I asked the three teams using it what 'better' meant to them. Sales cared about false alarms; operations cared about latency. Nobody was asking for higher overall accuracy. I wrote a one-page proposal with one target, halve false positives for the top customer segment at the same recall, listed what I would not address, and got agreement before starting. I delivered a first improvement in two weeks from threshold tuning per segment, which gave me room to do the deeper feature work. False positives in that segment fell by 55% in the quarter. I sent a short update every week so nobody was surprised by the scope."`,
    covers: [
      'Actively clarifies with stakeholders',
      'Converts the goal into a measurable target and explicit non-goals',
      'Delivers something small early',
      'Keeps stakeholders aligned',
    ],
    redFlags: [
      'Waiting for someone to write the spec',
      'Building something large on an untested assumption',
      'No success measure',
    ],
    followUps: [
      'Stakeholders wanted conflicting things. How did you choose?',
      'What did you decide not to do?',
    ],
  },
  {
    id: 'beh-pushback',
    role: 'behavioral',
    kind: 'behavioral',
    level: 'senior',
    topic: 'Judgment',
    prompt:
      'A stakeholder wants to ship a model this week, and you think the evidence is weak. What do you say?',
    answer: `This tests whether you can hold a line on risk while still helping the business move. "No" and "fine" are both weak answers.

A strong answer separates what is known from what is not, proposes the cheapest way to close the gap, and offers a way to ship that limits the damage if you are wrong.

How it sounds: "I would say: here is what we have shown, accuracy on last quarter's data is above target. Here is the main thing we have not shown: how it behaves on the new customer segment, which was not in that data. I would explain what could go wrong there in terms they care about, such as wrongly rejected applications. Then I would offer options with their costs: wait five days while I evaluate that segment; or ship this week to 5% of traffic with the old system as fallback, an agreed threshold that triggers rollback, and a daily review. I would recommend the second, say who decides, and write down the risk we are accepting."

If you have a real story like this, tell it, including what happened after launch.`,
    covers: [
      'States what is proven and the biggest unknown',
      'Explains risk in business terms',
      'Offers bounded options: limited rollout, fallback, rollback threshold',
      'Clear recommendation and decision owner; risk documented',
    ],
    redFlags: [
      'Flat refusal with no alternative',
      'Shipping and hoping',
      'Vague worry with no specific risk named',
    ],
    followUps: [
      'They overrule you and ship to everyone. What do you do?',
      'How do you decide how much evidence is enough?',
    ],
  },
  {
    id: 'beh-learning',
    role: 'behavioral',
    kind: 'behavioral',
    level: 'core',
    topic: 'Growth',
    prompt: 'Tell me about a time you had to learn something new quickly to get a job done.',
    answer: `Show a method for learning, not just that you survived.

Structure: what you had to learn and the deadline. How you approached it: what you read or built first, who you asked, how you checked your understanding. What you delivered. What you carried forward or taught others.

How it sounds: "Our team was asked to move model serving onto Kubernetes, and I had never used it. I had three weeks. I spent the first two days on the core objects only, pods, deployments, services, and deployed a toy model to a local cluster so I could break it on purpose. I wrote down each failure and its cause. I asked a platform engineer for an hour to review my manifests, which caught a probe mistake that would have caused restart loops. We migrated the first service on schedule. I turned my notes into a short guide, and the next two services were migrated by teammates without me."

For a career changer or new graduate, a course project or self-study story works, as long as it ends with something you built.`,
    covers: [
      'A concrete learning strategy: scope down, build something, seek review',
      'Verifies understanding instead of assuming it',
      'Delivers on the actual goal',
      'Shares what was learned',
    ],
    redFlags: ['"I am a fast learner" with no example', 'Learning in isolation and never asking for review'],
    followUps: ['What did you get wrong at first?', 'What are you learning right now, and how?'],
  },
  {
    id: 'beh-prioritization',
    role: 'behavioral',
    kind: 'behavioral',
    level: 'senior',
    topic: 'Prioritization',
    prompt: 'Tell me about a time you had more work than time. How did you decide what not to do?',
    answer: `The signal is whether you make trade-offs explicitly and tell people, rather than working longer hours and letting things slip quietly.

Structure: the competing demands and the constraint. The criteria you used: impact, urgency, who is blocked, cost of delay. What you dropped or deferred, and how you told the people affected. The outcome, including the cost of what you gave up.

How it sounds: "In one sprint I had a retraining pipeline to finish, a production latency issue, and a request for a new feature set from another team. I could do two. The latency issue was affecting users now, so it came first. Between the other two, the pipeline unblocked three people and the features benefited one experiment, so I chose the pipeline. I told the other team that day, with a date two weeks out and a pointer to a simpler feature they could use meanwhile. They were not delighted, but they could plan. The latency fix shipped in three days and the pipeline that sprint. In hindsight I should have raised the overload a week earlier, when it was already visible."`,
    covers: [
      'Explicit criteria for the trade-off',
      'Says no or "later" clearly and early',
      'Tells affected people and offers an alternative',
      'Acknowledges the cost of the choice',
    ],
    redFlags: [
      '"I worked nights and did everything"',
      'Dropping work without telling anyone',
      'Letting whoever shouts loudest decide',
    ],
    followUps: ['How did the other team react?', 'What would you have done if your manager disagreed?'],
  },
  {
    id: 'beh-influence',
    role: 'behavioral',
    kind: 'behavioral',
    level: 'senior',
    topic: 'Proactivity',
    prompt: 'Tell me about something you improved that nobody asked you to.',
    answer: `This looks for initiative beyond assigned tasks, and for the ability to bring others along, since an improvement nobody adopts is not one.

Structure: the problem you noticed and how you knew it was worth solving, ideally with a number. What you did first to prove value cheaply. How you got others to adopt it. The result and whether it lasted.

How it sounds: "Every model release on my team included a manual evaluation that took someone half a day and was done differently each time. Twice we shipped regressions that the manual check missed. Nobody owned it. I spent a few evenings scripting the evaluation for one model with fixed test sets and a report, and used it on my next release. It caught a regression in one segment before launch, which I showed at the team meeting. Two teammates asked to use it, so I generalized it with a small config file and wrote a page of documentation. Within two months it ran in continuous integration for all five models, and release evaluation went from half a day to ten minutes."`,
    covers: [
      'Spots a problem and sizes it',
      'Proves value with a small first version',
      'Gets adoption from others',
      'Lasting, measured effect',
    ],
    redFlags: [
      'A side project nobody used',
      'Rewriting something without checking that it was a problem',
      'Neglecting assigned work for it',
    ],
    followUps: ['Who pushed back, and why?', 'Who maintains it now?'],
  },
  {
    id: 'beh-explain',
    role: 'behavioral',
    kind: 'behavioral',
    level: 'core',
    topic: 'Communication',
    prompt:
      'Explain to a non-technical executive why the model that scored 95% in testing is doing worse with real customers.',
    answer: `This is a live test of communication: can you be accurate without jargon, and lead with what the listener needs?

Lead with the conclusion and what happens next, then give one plain analogy, then the plan. Avoid defending the model or explaining the mathematics.

How it sounds: "The short version: the model was tested on last year's customers, and this year's customers behave differently, so the test score overstated how it would do. It is like studying past exam papers and then finding the exam has changed. Right now it is getting about 85 in 100 right instead of 95, and most of the extra mistakes are with the new small-business customers we started signing in spring. Three things are happening. This week we are routing those customers to manual review so they are not affected. Within three weeks we will retrain with recent data that includes them. And we are adding a weekly check on live results, so in future we see a slide like this within days instead of hearing it from customers. I will send you an update in two weeks with the new numbers."

Then stop, and invite questions.`,
    covers: [
      'Conclusion first, in plain words',
      'One analogy, no jargon',
      'Impact stated in terms the listener cares about',
      'A concrete plan with dates, and prevention',
    ],
    redFlags: [
      'Words like "distribution shift" or "overfitting" left unexplained',
      'Defensiveness',
      'No plan or timeline',
    ],
    followUps: [
      'The executive asks, "Why did nobody catch this?"',
      'How would you explain the same thing to an engineer?',
    ],
  },
  {
    id: 'beh-why-role',
    role: 'behavioral',
    kind: 'behavioral',
    level: 'core',
    topic: 'Motivation',
    prompt: 'Why this role, and why this company?',
    answer: `A strong answer connects three things: what you have done, what this role involves, and something specific about the company that you could not say about its competitors.

Structure: the thread in your background that leads here. What about the day-to-day work of this role you want more of, shown through something you have already done. One or two specific facts about the company: a product you have used, a technical post or paper from the team, a problem at their scale. What you would bring.

How it sounds: "In my last role the part I enjoyed most was getting models from a notebook into something reliable; I moved our serving to Kubernetes and built the evaluation gate for releases. This role is that work full time. I have used your product for a year, and I read your engineering post on cutting inference latency with request batching; the problem of serving many customer-specific models on shared GPUs is one I would like to work on. I think my experience on both the data and the deployment side would be useful to a team that size."

Prepare this for each company; a generic answer is easy to spot.`,
    covers: [
      'A coherent thread from past work to this role',
      'Evidence you know what the job involves day to day',
      'Specific, researched facts about the company',
      'What you offer, not only what you want',
    ],
    redFlags: [
      'An answer that would fit any company',
      'Leading with salary, prestige or "I want to learn AI"',
      'Criticizing a current employer',
    ],
    followUps: [
      'What would make you leave this role in a year?',
      'What do you think is hardest about our problem?',
    ],
  },
];
