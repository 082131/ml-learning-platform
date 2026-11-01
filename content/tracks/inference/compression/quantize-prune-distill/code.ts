// Code for the compression lesson. The pruning printout is checked against NumPy 2.5.3 on CPython 3.13 in
// src/lib/inference/prune.test.ts. The distillation results come from distill.py in this folder, run with
// NumPy 2.5.3 and scikit-learn 1.9.1.
import { ann, annLine } from '@/lib/inference/annotate';
import type { DigitsModel } from '@/lib/inference/digitsModel';
import { PRUNE_SOURCE, pruneExperiment, pruneSlots, temperatureExperiment, type PruneState } from '@/lib/inference/prune';
import type { CodeExample } from '@/lib/types';
import digitsJson from '../../precision/precision-quantization/digits_mlp.json';

export const digits = digitsJson as DigitsModel;

export const initial: PruneState = { sparsity: 50, scope: 'layer' };

export const experiment = pruneExperiment('prune', digits, initial);

/** Test image 0 is a 7 that the teacher thinks looks a little like a 9. */
export const tempExperiment = temperatureExperiment('temperature', digits, { image: 0, temperature: 4 });

const st = (s: unknown) => s as PruneState;
const P = PRUNE_SOURCE;

export const pruneCode: CodeExample = {
  id: 'prune-numpy',
  language: 'python',
  source: P,
  slots: { sparsity: (s) => pruneSlots(st(s)).sparsity!, thresholds: (s) => pruneSlots(st(s)).thresholds! },
  annotations: [
    ann(P, 'k', 'k = int(', 'int(sparsity * values.size)', {
      kind: 'math',
      title: 'How many to remove',
      what: 'The share of the weights to set to zero, as a whole number. 50% of W1’s 1,024 weights is 512.',
      why: 'int rounds down, so the target is never exceeded by rounding.',
    }),
    ann(P, 'sort', 'return np.sort', 'np.sort(np.abs(values), axis=None)[k - 1]', {
      kind: 'math',
      title: 'The threshold',
      what: 'Sorts the absolute values of all weights and takes the k-th smallest.',
      why: 'Small weights change the output least when removed. This is the whole idea of magnitude pruning.',
    }),
    ann(P, 'scope', '{{thresholds}}', '{{thresholds}}', {
      kind: 'parameter',
      title: 'Per layer or global',
      what: 'Per layer removes the same share of every matrix. Global uses one threshold, so layers with many small weights lose more.',
      why: 'Global pruning lets the large first layer give up more weights and protects the small output layer, which usually keeps accuracy longer.',
    }),
    ann(P, 'where', 'P1 = np.where', 'np.where(np.abs(W1) > t1, W1, 0.0)', {
      kind: 'framework',
      title: 'np.where(condition, a, b)',
      what: 'Takes each weight from W1 where its magnitude is above the threshold, and 0.0 elsewhere.',
      why: 'The shapes do not change. The matrix is still dense; only its values are zero.',
    }),
    ann(P, 'eval', 'correct = (', 'argmax(axis=1) == y', {
      kind: 'math',
      title: 'Measure on held-out data',
      what: 'Runs the pruned model on the 360 test images and counts correct predictions.',
      why: 'The only way to know what pruning cost. These images were not used for training.',
    }),
  ],
};

const D = `def distillation_loss(student_logits, teacher_logits, labels, T=4.0, alpha=0.9):
    soft_teacher = softmax(teacher_logits / T)               # softened targets
    log_soft_student = log_softmax(student_logits / T)
    kl = (soft_teacher * (np.log(soft_teacher) - log_soft_student)).sum(axis=1).mean()
    ce = -log_softmax(student_logits)[np.arange(len(labels)), labels].mean()
    return alpha * T**2 * kl + (1 - alpha) * ce`;

/** The distillation loss of Hinton et al. (2015). */
export const distillLoss: CodeExample = {
  id: 'distill-loss',
  language: 'python',
  source: D,
  annotations: [
    ann(D, 'soft', 'soft_teacher =', 'teacher_logits / T', {
      kind: 'math',
      title: 'Divide by the temperature',
      what: 'Shrinks the gaps between logits, so softmax spreads probability over the runner-up classes.',
      why: 'At T = 1 the teacher is 98.9% sure test image 0 is a 7, which teaches little more than the label. At T = 4 it says 7: 0.600, 9: 0.194.',
    }),
    ann(D, 'kl', 'kl = (', 'np.log(soft_teacher) - log_soft_student', {
      kind: 'math',
      title: 'KL divergence',
      what: 'How far the student’s softened distribution is from the teacher’s. It is zero only when they match.',
      why: 'The student learns the teacher’s whole output, not just its top answer.',
    }),
    ann(D, 't2', 'return alpha', 'T**2', {
      kind: 'math',
      title: 'T²',
      what: 'Gradients of the softened loss shrink by about 1/T²; multiplying by T² restores their scale.',
      why: 'Keeps the soft and hard terms balanced when you change T (Hinton et al., 2015).',
    }),
  ],
};

export const distillOutput: CodeExample = {
  id: 'distill-output',
  language: 'bash',
  source: `python distill.py   # NumPy 2.5.3, scikit-learn 1.9.1
# teacher, 64 -> 16 -> 10 (1,210 parameters): 349 of 360
# students, 64 -> 8 -> 10 (610 parameters), seeds 0-4:
#   all 1,437 labels                       [338, 343, 339, 338, 349]  mean 341.4
#   distilled on all 1,437 images, T = 4   [346, 347, 338, 343, 346]  mean 344.0
#   only the first 100 labels              [247, 303, 299, 297, 316]  mean 292.4`,
  annotations: [],
};

const T = `import torch.nn.utils.prune as prune

layers = [(model.fc1, "weight"), (model.fc2, "weight")]
prune.global_unstructured(layers, pruning_method=prune.L1Unstructured, amount=0.5)
for module, name in layers:
    prune.remove(module, name)        # bake the zeros into the weight and drop the mask`;

/** The same pruning in PyTorch. Not run here: no PyTorch was installed while writing the lesson. */
export const torchPrune: CodeExample = {
  id: 'prune-torch',
  language: 'python',
  source: T,
  annotations: [
    annLine(T, 'global', 'prune.global_unstructured', {
      kind: 'framework',
      title: 'global_unstructured',
      what: 'One magnitude threshold across all listed weights; amount=0.5 removes half of them.',
      why: 'It adds a mask and keeps the original weight, so you can fine-tune with the mask applied.',
    }),
    annLine(T, 'remove', 'prune.remove(module, name)', {
      kind: 'framework',
      title: 'prune.remove',
      what: 'Replaces the weight with weight × mask and deletes the mask.',
      why: 'Do this before saving for serving; otherwise the checkpoint has both the original weights and the mask.',
    }),
  ],
};
