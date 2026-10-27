import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/deep/transformers',
  title: 'Transformer blocks and sequence modeling',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Name the parts of a transformer block in order and trace the tensor shape through each one',
    'Split d_model into heads and merge them back, stating the shapes',
    'Count a block’s parameters with 4·d² + 2·d·d_ff + 9·d + d_ff and check it against GPT-2 small',
    'Explain residual connections, layer normalization and positional information',
    'Tell a decoder (causal) from an encoder and say which tasks each suits',
  ],
  prerequisites: ['ml/deep/attention'],
  concepts: [
    'transformer',
    'multi-head-attention',
    'residual-connection',
    'layer-normalization',
    'positional-encoding',
    'attention',
    'causal-mask',
    'tensor',
    'parameter',
  ],
  references: [
    {
      title: 'Vaswani et al. (2017), Attention Is All You Need (the original transformer)',
      url: 'https://arxiv.org/abs/1706.03762',
    },
    {
      title:
        'Radford et al. (2019), Language Models are Unsupervised Multitask Learners (GPT-2: pre-LayerNorm, learned positions)',
      url: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf',
    },
    {
      title:
        'Xiong et al. (2020), On Layer Normalization in the Transformer Architecture (pre-LN vs post-LN)',
      url: 'https://arxiv.org/abs/2002.04745',
    },
    {
      title: 'Ba, Kiros and Hinton (2016), Layer Normalization',
      url: 'https://arxiv.org/abs/1607.06450',
    },
    {
      title: 'torch.nn.TransformerEncoderLayer',
      url: 'https://docs.pytorch.org/docs/stable/generated/torch.nn.TransformerEncoderLayer.html',
      version: 'PyTorch 2.14',
    },
    {
      title: 'Hugging Face Transformers: GPT-2 model documentation',
      url: 'https://huggingface.co/docs/transformers/model_doc/gpt2',
      version: 'transformers 5.20',
    },
  ],
} satisfies LessonMeta;
