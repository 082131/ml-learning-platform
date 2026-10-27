// Code for ml/projects/capstone-finetune. finetune.py was run with --smoke (a tiny random model, no download)
// using CPython 3.13.16, PyTorch 2.14.1, transformers 5.20.2 and datasets 5.1.0. The full run downloads
// DistilBERT and IMDb from the Hugging Face Hub, which was not reachable while this brief was written, so its
// results are not shown here.
import type { CodeExample, ProjectBrief } from '@/lib/types';

export const setupCode: CodeExample = {
  id: 'capstone-finetune-setup',
  language: 'bash',
  source: `python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\\Scripts\\activate
pip install torch==2.14.1 transformers==5.20.2 datasets==5.1.0 accelerate==1.15.0 scikit-learn==1.9.1
python finetune.py --smoke           # seconds, no download: checks the code path
python finetune.py                   # downloads DistilBERT (67M parameters) and IMDb, then trains`,
  annotations: [],
};

export const finetuneCode: CodeExample = {
  id: 'capstone-finetune-script',
  language: 'python',
  source: `import argparse
import time

import numpy as np
from datasets import Dataset, load_dataset
from transformers import (AutoModelForSequenceClassification, AutoTokenizer,
                          DataCollatorWithPadding, Trainer, TrainingArguments, set_seed)

MODEL = "distilbert/distilbert-base-uncased"
SEED = 42

def tiny_setup():
    """A randomly initialized two-word-vocabulary model and six reviews: checks the code path offline in seconds."""
    from tokenizers import Tokenizer, models, pre_tokenizers
    from transformers import DistilBertConfig, PreTrainedTokenizerFast
    vocab = {"[PAD]": 0, "[UNK]": 1, "[CLS]": 2, "[SEP]": 3, "good": 4, "bad": 5}
    core = Tokenizer(models.WordLevel(vocab, unk_token="[UNK]"))
    core.pre_tokenizer = pre_tokenizers.Whitespace()
    tokenizer = PreTrainedTokenizerFast(tokenizer_object=core, pad_token="[PAD]", unk_token="[UNK]")
    config = DistilBertConfig(vocab_size=len(vocab), dim=32, n_layers=1, n_heads=2, hidden_dim=64,
                              num_labels=2, pad_token_id=0)
    model = AutoModelForSequenceClassification.from_config(config)
    texts = ["good good", "bad", "good", "bad bad", "good film", "bad film"]
    data = Dataset.from_dict({"text": texts, "label": [1, 0, 1, 0, 1, 0]})
    return tokenizer, model, data, data

def real_setup(n_train, n_eval):
    imdb = load_dataset("stanfordnlp/imdb")
    train = imdb["train"].shuffle(seed=SEED).select(range(n_train))
    evaluation = imdb["test"].shuffle(seed=SEED).select(range(n_eval))
    tokenizer = AutoTokenizer.from_pretrained(MODEL)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL, num_labels=2)
    return tokenizer, model, train, evaluation

def accuracy(eval_pred):
    logits, labels = eval_pred
    return {"accuracy": float((np.argmax(logits, axis=-1) == labels).mean())}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--smoke", action="store_true", help="tiny random model, no download")
    parser.add_argument("--train-size", type=int, default=5000)
    parser.add_argument("--eval-size", type=int, default=2000)
    args = parser.parse_args()
    set_seed(SEED)
    if args.smoke:
        tokenizer, model, train, evaluation = tiny_setup()
    else:
        tokenizer, model, train, evaluation = real_setup(args.train_size, args.eval_size)

    def tokenize(batch):
        return tokenizer(batch["text"], truncation=True, max_length=256)
    train = train.map(tokenize, batched=True)
    evaluation = evaluation.map(tokenize, batched=True)

    training_args = TrainingArguments(
        output_dir="runs/smoke" if args.smoke else "runs/distilbert-imdb",
        num_train_epochs=1 if args.smoke else 2,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=64,
        learning_rate=2e-5,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="no",
        logging_steps=50,
        seed=SEED,
        report_to="none",
    )
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train,
        eval_dataset=evaluation,
        processing_class=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=accuracy,
    )
    start = time.perf_counter()
    trainer.train()
    minutes = (time.perf_counter() - start) / 60
    metrics = trainer.evaluate()
    print(f"eval accuracy {metrics['eval_accuracy']:.3f} on {len(evaluation)} reviews, "
          f"training took {minutes:.1f} min")

if __name__ == "__main__":
    main()`,
  annotations: [
    {
      id: 'tiny',
      range: { line: 12 },
      kind: 'function',
      title: 'A smoke test for the whole pipeline',
      what: 'Builds a one-layer DistilBERT with random weights, a six-word tokenizer and six reviews in memory.',
      why: 'Catches API and shape errors in seconds, before you spend GPU time or download anything. Keep it working as the script grows.',
    },
    {
      id: 'subset',
      range: { line: 29 },
      kind: 'framework',
      title: 'A seeded subset',
      what: 'A fixed, shuffled 5,000 of the 25,000 training reviews (and 2,000 test reviews for evaluation).',
      why: 'Fits a free notebook GPU. Shuffle first: the IMDb splits are ordered by label.',
    },
    {
      id: 'head',
      range: { line: 32 },
      kind: 'framework',
      title: 'Pretrained body, new classification head',
      what: 'Loads DistilBERT’s pretrained weights and adds a randomly initialized two-class head.',
      why: 'transformers warns that some weights are newly initialized. That is expected: the head is what fine-tuning trains first.',
    },
    {
      id: 'truncate',
      range: { line: 52 },
      kind: 'framework',
      title: 'Truncate to 256 tokens',
      what: 'Longer reviews are cut; padding happens per batch in the collator.',
      why: 'Memory and time grow with sequence length. Measure how many reviews are cut and whether it hurts accuracy.',
    },
    {
      id: 'args',
      range: { line: 56 },
      kind: 'framework',
      title: 'Training settings',
      what: 'Two epochs, batch 16, learning rate 2e-5 with weight decay, evaluation after each epoch, no checkpoints saved.',
      why: 'Small learning rates are typical for fine-tuning: large ones destroy what pretraining learned.',
    },
    {
      id: 'processing-class',
      range: { line: 74 },
      kind: 'framework',
      title: 'processing_class',
      what: 'The tokenizer is passed as processing_class; in transformers 5 the Trainer has no tokenizer argument.',
      why: 'Older tutorials use tokenizer=..., which fails with the pinned version.',
    },
    {
      id: 'timer',
      range: { line: 80 },
      kind: 'syntax',
      title: 'Record the cost',
      what: 'Wall-clock training time.',
      why: 'The brief asks for cost next to accuracy: time, GPU type and, if you pay for it, money.',
    },
  ],
};

export const smokeOutput: CodeExample = {
  id: 'capstone-finetune-smoke',
  language: 'bash',
  source: `python finetune.py --smoke
# (progress bars and a pin_memory warning on a machine without a GPU)
# eval accuracy 1.000 on 6 reviews, training took 0.0 min`,
  annotations: [],
};

export const brief: ProjectBrief = {
  goal: 'Fine-tune a pretrained transformer (DistilBERT) to classify movie reviews as positive or negative, compare it with a simple TF-IDF baseline on the same data, and report accuracy, cost and the kinds of reviews it gets wrong.',
  dataset:
    'IMDb from the Hugging Face Hub (`stanfordnlp/imdb`): 25,000 training and 25,000 test reviews labeled neg (0) or pos (1). The brief uses a seeded subset of 5,000 training and 2,000 test reviews so a free notebook GPU or a laptop can finish; scale up once everything works.',
  milestones: [
    'Set up the pinned environment and pass python finetune.py --smoke',
    'Train a TF-IDF + logistic regression baseline on the same 5,000 reviews and score it on the same 2,000',
    'Run the full fine-tuning, record GPU type, training time and peak memory, and track the run',
    'Compare the two models on accuracy with a bootstrap interval, and on cost (time, memory, model size)',
    'Collect the 20 most confident mistakes of each model and sort them into categories (sarcasm, mixed opinions, truncated reviews, label noise)',
    'Change one thing (max_length, learning rate or training-set size), predict the effect, run it and compare',
    'Write a report: setup, results table, cost, failure categories with examples, and a recommendation',
  ],
  rubric: [
    {
      criterion: 'Fair comparison',
      detail:
        'Baseline and transformer use the same training and evaluation reviews, chosen by a seed and never mixed.',
    },
    {
      criterion: 'Working pipeline',
      detail: 'The smoke test passes, and the full run reproduces from the pinned versions and the seed.',
    },
    {
      criterion: 'Cost',
      detail:
        'Training time, hardware, peak memory and model size are measured, not estimated, and set against the accuracy gain.',
    },
    {
      criterion: 'Failure analysis',
      detail: 'Errors are read and grouped into categories with counts and examples, for both models.',
    },
    {
      criterion: 'Experiment',
      detail: 'One controlled change with a stated prediction and a measured result.',
    },
    {
      criterion: 'Recommendation',
      detail: 'Says which model to use and under what constraints, based on the numbers in the report.',
    },
  ],
  hints: [
    'No GPU? Free notebook services such as Google Colab or Kaggle offer one; select a GPU runtime and install the pinned versions there.',
    'If memory runs out, lower per_device_train_batch_size and raise gradient_accumulation_steps to keep the effective batch size.',
    'Use the GPU training lesson’s estimator for a first guess at time and memory, then compare it with your measurement.',
    'Count how many reviews exceed 256 tokens before deciding whether truncation matters.',
    'For the baseline, TfidfVectorizer(ngram_range=(1, 2), min_df=2) with LogisticRegression is a strong and fast start.',
  ],
};
