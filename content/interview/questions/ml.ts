import type { InterviewQuestion } from '@/lib/interview/types';

// Machine Learning Engineer: the "ML breadth" and "ML system design" rounds.
export const mlQuestions: InterviewQuestion[] = [
  {
    id: 'ml-bias-variance',
    role: 'ml',
    kind: 'technical',
    level: 'core',
    topic: 'Fundamentals',
    prompt:
      'Your model scores 99% on the training set and 81% on validation. Walk me through what is happening and what you would try, in order.',
    answer: `That gap is the signature of high variance: the model has fit patterns that hold only in the training rows. Before changing the model I would rule out the boring causes: a leak or duplicate rows that inflate the training score, and a validation set drawn from a different distribution or time period than training.

If the split is sound, I work from cheapest to most expensive. First, look at a learning curve: if validation is still rising with more data, more data or augmentation is the best fix. Then reduce capacity or add regularization (L2, dropout, shallower trees, early stopping), and remove noisy features. I change one thing at a time and judge it on validation, keeping the test set untouched until the end.`,
    covers: [
      'Names it as overfitting / high variance, not just "bad accuracy"',
      'Checks the split first: leakage, duplicates, distribution or time mismatch',
      'Uses a learning curve to decide between more data and less capacity',
      'Lists concrete regularizers and applies them one at a time',
      'Keeps the test set out of the tuning loop',
    ],
    redFlags: [
      'Jumping straight to a bigger or different model',
      'Tuning against the test set',
      'Not asking how the split was made',
    ],
    followUps: [
      'Training and validation are both 70%. What now?',
      'How would the learning curve look if more data will not help?',
    ],
  },
  {
    id: 'ml-imbalance-metric',
    role: 'ml',
    kind: 'technical',
    level: 'core',
    topic: 'Evaluation',
    prompt:
      'A fraud model reports 99.2% accuracy, and 0.5% of transactions are fraud. Is the model good? Which metrics would you report instead, and how do you pick the threshold?',
    answer: `The accuracy tells us almost nothing: predicting "not fraud" for everything scores 99.5%, so this model is below the trivial baseline on that metric.

I would report precision and recall at the operating threshold, plus the precision-recall curve and PR AUC, because with 0.5% positives ROC AUC looks flattering: the false positive rate is diluted by the huge negative class. The threshold is a business decision, not a default of 0.5. I would put a cost on a missed fraud and on a false alarm (review time, a blocked customer) and choose the threshold that minimizes expected cost, or the highest recall that keeps the review queue within what the team can handle. I would also check calibration if the score is used as a probability.`,
    covers: [
      'Compares against the majority-class baseline',
      'Precision, recall and PR AUC; why ROC AUC is optimistic under heavy imbalance',
      'Threshold set from costs or capacity, not 0.5',
      'Mentions calibration when scores are used as probabilities',
    ],
    redFlags: [
      'Accepting accuracy at face value',
      'Saying "use F1" without tying it to the cost of each error',
      'Resampling the validation set, which changes the metric you report',
    ],
    followUps: [
      'You oversampled the minority class in training. What happens to predicted probabilities?',
      'Fraud labels arrive 30 days late. How does that change evaluation?',
    ],
  },
  {
    id: 'ml-leakage',
    role: 'ml',
    kind: 'technical',
    level: 'core',
    topic: 'Data',
    prompt:
      'Offline AUC was 0.94, but in production the model performs near chance. Give me the most likely causes and how you would confirm each.',
    answer: `The first suspect is leakage: a feature that encodes the label or was only known after the prediction time. I would rank features by importance and ask of the top ones, "was this value available at the moment we predict?" Aggregates computed over the full table, post-event status fields, and target encoding fit on all rows are the usual culprits.

Second is a bad split: random splitting of time-ordered or grouped data lets near-duplicates of a user or session sit on both sides. I would re-evaluate with a time-based or group split and expect the offline number to fall toward the online one.

Third is training-serving skew: the serving path computes a feature differently, with different defaults or units. I would log served feature vectors and compare their distributions to training. Last, real drift since the training window.`,
    covers: [
      'Target leakage and point-in-time correctness',
      'Split leakage: time order and groups',
      'Training-serving skew, confirmed by comparing logged serving features',
      'A concrete test for each hypothesis, not just a list',
    ],
    redFlags: [
      'Blaming drift first without checking leakage',
      'Proposing to retrain before finding the cause',
    ],
    followUps: [
      'How does a feature store prevent the first cause?',
      'How would you have caught this before launch?',
    ],
  },
  {
    id: 'ml-regularization',
    role: 'ml',
    kind: 'technical',
    level: 'core',
    topic: 'Fundamentals',
    prompt: 'Explain L1 versus L2 regularization. Why does L1 produce exact zeros and L2 does not?',
    answer: `Both add a penalty on weight size to the loss. L2 adds the sum of squared weights; L1 adds the sum of absolute values.

The gradient explains the sparsity. The L2 penalty's gradient is proportional to the weight, so the pull toward zero shrinks as the weight gets small and it never quite arrives. The L1 penalty's gradient has constant magnitude whatever the weight's size, so a weight whose loss gradient is smaller than that constant is pushed all the way to zero and held there. Geometrically, the L1 ball has corners on the axes, and the loss contours tend to touch it at a corner.

In practice L1 does feature selection but is unstable among correlated features, picking one arbitrarily; L2 spreads weight across them. Elastic net combines the two. Both need features on a comparable scale.`,
    covers: [
      'Penalty forms and their gradients',
      'Constant versus proportional pull explains exact zeros',
      'Behaviour with correlated features',
      'Scaling features before regularizing',
    ],
    redFlags: ['Reciting "L1 is sparse" with no mechanism', 'Forgetting that the penalty depends on scale'],
    followUps: [
      'What is the Bayesian view of each penalty?',
      'How does weight decay in AdamW differ from L2 in the loss?',
    ],
  },
  {
    id: 'ml-gbdt-vs-nn',
    role: 'ml',
    kind: 'technical',
    level: 'core',
    topic: 'Modeling',
    prompt:
      'You have 200,000 rows of tabular data with mixed numeric and categorical columns. Would you start with gradient-boosted trees or a neural network? Defend the choice.',
    answer: `Gradient-boosted trees. On medium-sized tabular data they are the strongest baseline in most published comparisons and in my experience: they handle mixed types, missing values, skewed scales and non-monotonic interactions with little preprocessing, train in minutes on CPU, and are simpler to tune.

A neural network earns its place when there is something for representation learning to exploit: very large data, high-cardinality IDs that benefit from embeddings, text or image inputs alongside the table, or a need to train jointly with other objectives.

So I would start with a logistic regression for a floor, then a boosted model with early stopping, and only try a network if the error analysis points at something trees cannot use. I would compare them on the same time-based split.`,
    covers: [
      'Trees as the default for tabular data, with reasons',
      'When a network wins: scale, embeddings, multimodal inputs',
      'A simple baseline first',
      'Same split and metric for the comparison',
    ],
    redFlags: ['"Deep learning is always better"', 'No baseline', 'Ignoring training and serving cost'],
    followUps: [
      'How do boosting and bagging differ in what error they reduce?',
      'How would you serve a boosted model at 5 ms p99?',
    ],
  },
  {
    id: 'ml-optimizer',
    role: 'ml',
    kind: 'technical',
    level: 'core',
    topic: 'Deep learning',
    prompt:
      'Training loss goes to NaN after a few hundred steps. How do you debug it? Then: loss is flat from step one. How is that a different investigation?',
    answer: `NaN means something overflowed or was undefined. I would find the first step where it appears and check, in order: the learning rate (lower it tenfold; add warmup), exploding gradients (log the gradient norm and clip it), numerically unsafe operations such as log of zero or division by a tiny variance, and bad input rows containing NaN or infinity. Mixed precision can overflow in float16, so I would retest in float32.

A flat loss is the opposite problem: the model is not learning at all. I would check that gradients are non-zero and reach the early layers, that the optimizer actually holds the model's parameters, that labels line up with inputs, and that the learning rate is not tiny. The best single test is to overfit one small batch: if the model cannot drive loss to near zero on eight examples, the bug is in the code, not the data.`,
    covers: [
      'Locates the first bad step instead of guessing',
      'Learning rate, gradient clipping, unsafe math, bad inputs',
      'Flat loss: gradient flow, optimizer wiring, label alignment',
      'Overfit-one-batch as the standard sanity test',
    ],
    redFlags: ['Only "lower the learning rate"', 'No instrumentation: never logs gradient norms'],
    followUps: [
      'Why does warmup help with Adam?',
      'Validation loss rises while validation accuracy also rises. Explain.',
    ],
  },
  {
    id: 'ml-ab-test',
    role: 'ml',
    kind: 'technical',
    level: 'senior',
    topic: 'Experimentation',
    prompt:
      'Your new ranking model beats the old one offline. Design the online test, and tell me what would make you distrust a "win".',
    answer: `I would randomize by user, not by request, so a person sees one consistent experience and observations within a user are not treated as independent. Before starting I fix one primary metric tied to the business goal, guardrail metrics (latency, error rate, complaints, revenue), the minimum effect worth detecting, and from those the sample size and duration. The run should cover at least one full week to absorb weekly cycles.

I would distrust a win if: the sample ratio between arms differs from the planned split, which signals a broken assignment or logging; the result was read early and repeatedly without a sequential correction; the lift exists only in one of many slices we looked at; a novelty effect is fading over the test; or a guardrail moved the wrong way. I would also check that the offline and online metrics agree in direction, because if they do not, the offline metric needs fixing.`,
    covers: [
      'Unit of randomization and why',
      'Pre-registered primary metric, guardrails, power and duration',
      'Sample ratio mismatch, peeking, multiple comparisons, novelty',
      'Reconciling offline and online metrics',
    ],
    redFlags: [
      'Stopping the test the day it reaches p < 0.05',
      'No guardrail metrics',
      'Randomizing by request for a per-user experience',
    ],
    followUps: [
      'Users in the two arms interact with each other (a marketplace). What breaks?',
      'You can only afford 1% of traffic. What do you do?',
    ],
  },
  {
    id: 'ml-monitoring',
    role: 'ml',
    kind: 'technical',
    level: 'senior',
    topic: 'Production',
    prompt:
      'Labels for your model arrive six weeks after each prediction. How do you know today whether the model is still healthy?',
    answer: `Without labels I monitor the things that change before accuracy does. First, input health: schema, null rates, ranges and the distribution of each important feature against the training baseline, with a drift statistic such as PSI or a KS test and thresholds set from normal week-to-week variation. Second, the output: the distribution of scores and the rate of positive predictions; a sudden shift in either is the cheapest alarm there is. Third, operational metrics: latency, error rate, fallback rate.

For early quality signal I look for a proxy label that arrives sooner, or send a small sample for human review. When true labels land I compute the real metric by cohort of prediction date, so I can see decay over time, and compare against a retraining trigger. Drift alerts are a reason to investigate, not an automatic retrain.`,
    covers: [
      'Input drift, prediction drift and operational metrics as leading signals',
      'Thresholds grounded in normal variation',
      'Proxy labels or sampled human review',
      'Delayed-label evaluation by cohort; retraining trigger',
    ],
    redFlags: ['"Monitor accuracy" with no labels', 'Retraining automatically on any drift alert'],
    followUps: [
      'A feature drifts but accuracy holds. Do you retrain?',
      'How do you tell data drift from concept drift?',
    ],
  },
  {
    id: 'ml-calibration',
    role: 'ml',
    kind: 'technical',
    level: 'senior',
    topic: 'Evaluation',
    prompt:
      "A team multiplies your model's score by the order value to get expected loss. What property must the score have, how do you measure it, and how do you fix it?",
    answer: `The score must be calibrated: among cases scored 0.2, about 20% should be positive. Ranking metrics such as AUC say nothing about this; a model can rank perfectly and be badly calibrated.

I measure it with a reliability diagram, binning predictions and plotting mean predicted against observed frequency, and summarize with expected calibration error or the Brier score. Log loss also punishes miscalibration.

Common causes are resampling or class weighting in training, which shifts the base rate, and models such as boosted trees or large networks that are overconfident. The fix is a post-hoc calibrator fit on held-out data: Platt scaling for a sigmoid-shaped distortion, isotonic regression when there is enough data, temperature scaling for networks. If I undersampled negatives I can correct the probabilities analytically. I then monitor calibration over time, since it drifts with the base rate.`,
    covers: [
      'Defines calibration and separates it from ranking quality',
      'Reliability diagram, ECE or Brier score',
      'Why resampling breaks calibration',
      'Platt, isotonic or temperature scaling on held-out data',
    ],
    redFlags: ['Treating any score in [0, 1] as a probability', 'Fitting the calibrator on training data'],
    followUps: [
      'When does isotonic regression overfit?',
      'Give the correction formula after undersampling negatives at rate r.',
    ],
  },
  {
    id: 'ml-sd-recsys',
    role: 'ml',
    kind: 'system-design',
    level: 'senior',
    topic: 'Recommendation',
    prompt: 'Design the "recommended for you" feed for a video app with 50 million daily users.',
    answer: `I would start by framing. The business goal is long-term retention, so I avoid optimizing clicks alone: the ML objective is a blend of predicted watch time and completion, with explicit negative signals. I would confirm scale, a latency budget of around 200 ms, and how fresh recommendations must be.

The system is a funnel. Candidate generation narrows millions of videos to a few hundred using several cheap sources: a two-tower model with approximate nearest neighbour search, plus popular, fresh and followed-creator candidates. A heavier ranking model scores those with user, video and context features and predicts several outcomes. A final re-ranking step applies diversity, freshness and policy rules.

Training data is logged impressions with outcomes, using point-in-time features. I would call out position bias and the feedback loop, and reserve a small slice of exploration traffic. Evaluation is offline recall at K and NDCG, then an A/B test on retention with guardrails. Deep dives: cold start for new users and videos, and feature freshness.`,
    covers: [
      'Business goal translated into an ML objective, with the click-bait risk named',
      'Multi-stage funnel: retrieval, ranking, re-ranking, each with a latency budget',
      'Training data from logs: point-in-time features, position bias, feedback loops',
      'Offline metrics and an online experiment with guardrails',
      'Cold start and exploration',
    ],
    redFlags: [
      'One giant model scoring every video',
      'Optimizing click-through with no discussion of what it rewards',
      'No baseline such as "most popular"',
    ],
    followUps: [
      'How do you keep the embedding index fresh as videos are uploaded?',
      'How would you detect that the feed is narrowing what users see?',
    ],
  },
  {
    id: 'ml-sd-fraud',
    role: 'ml',
    kind: 'system-design',
    level: 'senior',
    topic: 'Risk',
    prompt:
      'Design a real-time fraud detection system for card payments. The decision must return in 100 ms.',
    answer: `Framing first: the output is approve, decline or step-up, and errors are asymmetric, so the metric is fraud loss prevented at a fixed false-positive budget, not accuracy. Labels come from chargebacks, which arrive weeks late and only for approved transactions, so the data is biased by past decisions.

Features drive this problem: transaction attributes, and velocity aggregates per card, device and merchant over several windows. Those must be computed by a streaming job into a low-latency online store, with the same definitions used to build point-in-time training sets, or skew will hurt.

For the model I would start with rules plus gradient-boosted trees: strong on tabular data, fast, explainable enough for dispute handling. The score feeds a policy layer with thresholds per segment.

Serving: a stateless scoring service, feature fetch under about 20 ms, a fallback rule set if the model or store times out. Evaluation uses a time-based split and PR curves; launch in shadow mode, then a canary. Monitoring covers score drift, approval rate and delayed-label performance. Adversaries adapt, so retraining is frequent.`,
    covers: [
      'Asymmetric costs and the right metric',
      'Delayed and selectively observed labels',
      'Streaming velocity features with online/offline consistency',
      'Latency budget broken down, with a fallback path',
      'Shadow launch, drift monitoring, frequent retraining against adversaries',
    ],
    redFlags: [
      'Random train/test split on time-ordered data',
      'No fallback when the model is slow',
      'Ignoring that declined transactions have no label',
    ],
    followUps: [
      'How would you get labels for transactions you declined?',
      'A new attack pattern appears that the model has never seen. What catches it?',
    ],
  },
  {
    id: 'ml-sd-search-ranking',
    role: 'ml',
    kind: 'system-design',
    level: 'senior',
    topic: 'Ranking',
    prompt: 'Design the ranking model behind product search for an e-commerce site.',
    answer: `The goal is for shoppers to find and buy what they searched for, so I would optimize a blend of relevance and conversion, with guardrails so that sponsored or high-margin items do not swamp relevance.

Retrieval combines lexical matching, which is precise for brands and model numbers, with embedding retrieval for vocabulary mismatch; I would merge the two lists and pass a few hundred candidates to a learning-to-rank model. Features are query-product match scores, product quality and popularity, price, availability, and user context. Gradient-boosted trees with a pairwise or listwise objective such as LambdaMART are a strong first ranker.

Labels come from clicks, add-to-carts and purchases, which are biased by position: items shown higher get more clicks regardless of quality. I would correct with position as a training-only feature or inverse propensity weighting, and add a small set of human relevance judgments as an unbiased check. Offline I report NDCG; online, conversion and zero-result rate. Deep dives: long-tail queries with little data, and new products with no history.`,
    covers: [
      'Hybrid retrieval then a learning-to-rank stage',
      'Pairwise or listwise objective and NDCG',
      'Position bias in click labels and a correction for it',
      'Tail queries and cold-start products',
      'Online metrics and guardrails',
    ],
    redFlags: [
      'Treating clicks as unbiased relevance labels',
      'Pointwise classification with no ranking metric',
      'No lexical retrieval for exact identifiers',
    ],
    followUps: [
      'How would you add personalization without hurting relevance?',
      'How do you evaluate a change that affects only rare queries?',
    ],
  },
];
