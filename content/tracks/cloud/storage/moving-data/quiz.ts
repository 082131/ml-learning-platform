import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'bits-bytes',
    type: 'numeric',
    prompt: 'How many hours does it take to copy 5 TB (5,000 GB) over a 10 Gbit/s link at 100% efficiency? Round to two decimals.',
    answer: 1.11,
    tolerance: 0.01,
    hint: 'GB × 8 gives gigabits. Divide by 10 Gbit/s for seconds, then by 3600.',
    explain: '5,000 × 8 = 40,000 Gbit; / 10 = 4,000 s; / 3600 ≈ 1.11 h. Forgetting the 8 would give 8 minutes.',
  },
  {
    id: 'reads-not-size',
    type: 'numeric',
    prompt: 'A 3 TB dataset sits in another region ($0.02/GB). You run 4 experiments a month, 5 epochs each, reading straight from that region. What is the monthly transfer cost in dollars?',
    answer: 1200,
    tolerance: 0,
    hint: 'Full reads = 4 × 5. GB moved = 3,000 × full reads.',
    explain: '20 full reads × 3,000 GB = 60,000 GB × $0.02 = $1,200. Copying once would cost 3,000 × $0.02 = $60.',
  },
  {
    id: 'which-storage',
    type: 'choice',
    prompt: 'A single-node fine-tune reads 300 GB of shards for 8 epochs. The instance has 3.8 TB of local NVMe. Where should the epochs read from?',
    options: [
      { text: 'A shared file system, so other jobs can read the same files', correct: false, explain: 'Nothing else needs the data here, and a shared file system costs more per GB and must be provisioned for throughput.' },
      { text: 'S3 directly each epoch, since S3 to EC2 in one region is free', correct: false, explain: 'Free, yes, but every epoch pays request latency and charges. With a local disk available, the reads can be faster and simpler.' },
      { text: 'Local NVMe, filled from S3 once at the start of the job', correct: true, explain: 'One copy of 300 GB, then seven more epochs at disk speed. If the instance stops, S3 still holds the source of truth.' },
    ],
  },
  {
    id: 'gravity',
    type: 'choice',
    prompt: 'Your 80 TB dataset lives on Google Cloud; GPUs are cheaper this month on AWS. Which question best decides where to train?',
    options: [
      { text: 'Does the GPU saving beat the egress for moving the data, and do you need it moved more than once?', correct: true, explain: 'Data gravity: 80 TB out of a cloud at about $0.09/GB is roughly $7,000 per move. Cheaper GPUs only win if the saving exceeds that, ideally with a one-time move.' },
      { text: 'Which provider has more regions near the team?', correct: false, explain: 'Engineers’ location barely matters for training. The data’s location and the cost of moving it do.' },
      { text: 'Which provider offers the newer GPU model?', correct: false, explain: 'Newer GPUs may finish faster, but the decision still hinges on whether moving 80 TB is worth it.' },
    ],
  },
  {
    id: 'cross-zone',
    type: 'choice',
    prompt: 'A distributed training job runs half its nodes in zone a and half in zone b, exchanging gradients every step. What is the hidden cost?',
    options: [
      { text: 'None: all traffic within a region is free', correct: false, explain: 'Reading from S3 within a region is free, but VM-to-VM traffic between zones is charged per GB, each way.' },
      { text: 'Per-GB charges both ways on every gradient exchange, and higher latency per step', correct: true, explain: 'Gradient traffic is huge and constant. Keep a training cluster in one zone (often in a placement group) and spread only things that must survive a zone failure.' },
      { text: 'Doubled storage charges, since each zone keeps its own copy of the model', correct: false, explain: 'Storage is not the issue. The constant network traffic between zones is.' },
    ],
  },
];

export const moveExercise: Exercise = {
  id: 'cloud-move-plan',
  prompt:
    'Write `transfer_plan(dataset_gb, reads, price_per_gb, gbps, efficiency=0.8)`. It returns a dict with "remote_cost" (read every time from the remote location), "copy_cost" (copy once, read locally), and "copy_hours" (hours for one copy over the link: GB × 8 / (Gbit/s × efficiency) / 3600), each rounded to 2 decimals.',
  starter: `def transfer_plan(dataset_gb, reads, price_per_gb, gbps, efficiency=0.8):
    return {}`,
  hints: [
    'remote_cost = dataset_gb × reads × price; copy_cost = dataset_gb × price.',
    'Use round(x, 2) on each value.',
  ],
  solution: `def transfer_plan(dataset_gb, reads, price_per_gb, gbps, efficiency=0.8):
    return {
        "remote_cost": round(dataset_gb * reads * price_per_gb, 2),
        "copy_cost": round(dataset_gb * price_per_gb, 2),
        "copy_hours": round(dataset_gb * 8 / (gbps * efficiency) / 3600, 2),
    }`,
  explanation:
    'The ratio remote_cost / copy_cost is exactly the number of reads, which is why counting reads is the whole argument for caching.',
  tests: `p = transfer_plan(2000, 20, 0.02, 5)
assert p == {"remote_cost": 800.0, "copy_cost": 40.0, "copy_hours": 1.11}
assert transfer_plan(100_000, 1, 0.09, 1)["copy_hours"] == 277.78
assert transfer_plan(500, 10, 0, 25)["remote_cost"] == 0
assert transfer_plan(1000, 3, 0.09, 10, efficiency=1)["copy_hours"] == 0.22`,
};
