import type { GlossaryTerm } from '@/lib/types';

// ml/deep glossary terms taught in the text lessons (merged by ./glossary.ts).
export default [
  {
    id: 'token',
    term: 'Token',
    short: 'One unit of text a language model reads or writes: a word, a piece of a word, a character or a byte.',
    long: 'A tokenizer splits text into tokens and gives each one an integer ID. Models never see characters directly; they see the sequence of token IDs.',
    introducedIn: 'ml/deep/tokenization',
    aliases: ['tokens'],
  },
  {
    id: 'tokenizer',
    term: 'Tokenizer',
    short: 'The program that turns text into a list of token IDs (encoding) and back into text (decoding).',
    long: 'A tokenizer is trained once on a corpus, before the model, and then stays fixed. A model only works with the tokenizer it was trained with.',
    introducedIn: 'ml/deep/tokenization',
    aliases: ['tokenization'],
  },
  {
    id: 'vocabulary',
    term: 'Vocabulary',
    short:
      'The fixed list of every token a tokenizer can produce; a token’s position in the list is its token ID.',
    long: 'Its size (50,257 for GPT-2) sets the number of rows of the embedding table and the number of outputs of a language model’s last layer.',
    introducedIn: 'ml/deep/tokenization',
    aliases: ['vocab', 'token ID', 'token IDs'],
  },
  {
    id: 'byte-pair-encoding',
    term: 'Byte-pair encoding (BPE)',
    short:
      'Builds a vocabulary by starting from single characters (or bytes) and repeatedly merging the most frequent adjacent pair into a new token.',
    long: 'The learned merges are applied in the same order to tokenize new text, so frequent words become one token and rare words split into several known pieces.',
    introducedIn: 'ml/deep/tokenization',
    aliases: ['BPE'],
  },
  {
    id: 'embedding',
    term: 'Embedding',
    short:
      'A learned vector of numbers that represents a token (or another item): one row of an embedding table.',
    long: 'An embedding table has shape (vocabulary size, d). Looking up a token ID returns its row. Training moves the rows so that tokens used in similar ways get similar vectors.',
    introducedIn: 'ml/deep/embeddings',
    aliases: ['embeddings', 'embedding table', 'embedding matrix'],
  },
  {
    id: 'softmax',
    term: 'Softmax',
    short:
      'Turns a list of scores into positive weights that add up to 1: exponentiate each score, then divide by the sum.',
    long: 'softmax(z)ᵢ = exp(zᵢ) / Σⱼ exp(zⱼ). Larger scores get larger weights. Subtracting the largest score first gives the same result without overflow.',
    introducedIn: 'ml/deep/attention',
  },
  {
    id: 'attention',
    term: 'Attention',
    short:
      'A layer where each position builds its output as a weighted average of value vectors, weighted by how well its query matches every key.',
    long: 'Scaled dot-product attention computes softmax(Q Kᵀ / √d_k) V. In self-attention the queries, keys and values all come from the same sequence.',
    introducedIn: 'ml/deep/attention',
    aliases: ['self-attention', 'scaled dot-product attention'],
  },
  {
    id: 'query-key-value',
    term: 'Query, key, value (Q, K, V)',
    short:
      'Three vectors computed from each token by learned matrices: the query asks, the keys are matched against it, and the values are what gets mixed into the output.',
    introducedIn: 'ml/deep/attention',
    aliases: ['query', 'key', 'value'],
  },
  {
    id: 'causal-mask',
    term: 'Causal mask',
    short:
      'Stops each position from attending to later positions by setting those scores to −∞ before the softmax, so their weights become 0.',
    long: 'Decoder (GPT-style) models use it so that the prediction at position t depends only on tokens 0 to t.',
    introducedIn: 'ml/deep/attention',
    aliases: ['causal masking', 'look-ahead mask'],
  },
  {
    id: 'transformer',
    term: 'Transformer',
    short:
      'A neural network built from a stack of identical blocks, each made of multi-head attention and a feed-forward network, with residual connections and layer normalization.',
    introducedIn: 'ml/deep/transformers',
    aliases: ['transformer block'],
  },
  {
    id: 'multi-head-attention',
    term: 'Multi-head attention',
    short:
      'Runs several attention computations (heads) side by side on slices of the vectors, then joins their outputs and mixes them with one more matrix.',
    introducedIn: 'ml/deep/transformers',
    aliases: ['attention heads'],
  },
  {
    id: 'residual-connection',
    term: 'Residual connection',
    short: 'Adds a sub-layer’s input to its output (x + f(x)), so information and gradients can pass around it.',
    introducedIn: 'ml/deep/transformers',
    aliases: ['skip connection'],
  },
  {
    id: 'layer-normalization',
    term: 'Layer normalization',
    short:
      'Rescales each token’s vector to mean 0 and variance 1 across its features, then applies a learned scale and shift.',
    introducedIn: 'ml/deep/transformers',
    aliases: ['LayerNorm', 'layer norm'],
  },
  {
    id: 'positional-encoding',
    term: 'Positional encoding',
    short:
      'Information about each token’s position added to its embedding, because attention by itself ignores word order.',
    introducedIn: 'ml/deep/transformers',
    aliases: ['position embedding', 'positional embedding'],
  },
] satisfies GlossaryTerm[];
