import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'ready',
    type: 'choice',
    prompt: 'Why does the server have separate /healthz and /readyz endpoints?',
    options: [
      {
        text: 'Liveness decides whether to restart the process; readiness decides whether to send it traffic, which should wait until the model is loaded and warm',
        correct: true,
        explain:
          'A replica that is still loading a large model is alive but not ready. Restarting it would make startup loop forever; sending it traffic would fail requests.',
      },
      {
        text: 'One is for HTTP and one is for HTTPS',
        correct: false,
        explain: 'Both are plain endpoints; they answer different questions.',
      },
      {
        text: 'Readiness measures latency and liveness measures errors',
        correct: false,
        explain: 'Neither measures performance. That is the job of metrics, in the next lesson.',
      },
    ],
  },
  {
    id: 'timeout',
    type: 'choice',
    prompt: 'The API answers 504 after 0.5 s when the model hangs. What happens to the model call itself?',
    options: [
      {
        text: 'It keeps running in its worker thread until it finishes; the timeout only stops the request from waiting',
        correct: true,
        explain:
          'Python cannot kill a thread. Under a flood of slow requests, abandoned calls still use the CPU, so pair timeouts with a limit on concurrent work.',
      },
      {
        text: 'It is cancelled and its CPU time freed immediately',
        correct: false,
        explain: 'asyncio cancels the waiting coroutine, not the thread running ONNX Runtime.',
      },
      {
        text: 'The server restarts',
        correct: false,
        explain: 'Only a failing liveness check leads to a restart.',
      },
    ],
  },
  {
    id: 'workers',
    type: 'choice',
    prompt:
      'Our first image ran uvicorn --workers 2 and every kept-alive request took about 47 ms; with one worker, 2.5 ms. What is the lesson?',
    options: [
      {
        text: 'Measure the container you ship: a configuration change can add latency that unit tests and local runs never show',
        correct: true,
        explain:
          'The model took well under a millisecond either way. Only an end-to-end load test against the real image found the difference.',
      },
      {
        text: 'Two workers are always slower than one',
        correct: false,
        explain:
          'Many deployments run several workers well; this one combination of server, client and connection reuse did not.',
      },
      {
        text: 'The model is slow in containers',
        correct: false,
        explain: 'The model was the same; the delay was in how requests reached it.',
      },
    ],
  },
  {
    id: 'canary',
    type: 'numeric',
    prompt:
      'A canary must collect 1,597 requests. Traffic is 200 requests per second and the canary gets 5%. How many minutes until it can raise the alarm? (one decimal)',
    answer: 2.7,
    tolerance: 0.05,
    hint: 'The canary receives 200 × 0.05 requests per second.',
    explain: '10 requests per second, so 159.7 s, or 2.7 minutes. At 1% it would take 13.3 minutes.',
  },
];

export const validateExercise: Exercise = {
  id: 'serve-validate',
  prompt:
    'Write `validate(images)` that returns an error message for a bad request body and None for a good one. A good body is a list of 1 to 64 images; each image is a list of exactly 64 numbers from 0 to 16.',
  starter: `def validate(images):
    pass`,
  hints: [
    'Check the outer list first: isinstance(images, list) and 1 <= len(images) <= 64.',
    'Then each image: a list of length 64.',
    'Then each pixel: isinstance(p, (int, float)) and not isinstance(p, bool) and 0 <= p <= 16.',
  ],
  solution: `def validate(images):
    if not isinstance(images, list) or not 1 <= len(images) <= 64:
        return "send 1 to 64 images"
    for i, image in enumerate(images):
        if not isinstance(image, list) or len(image) != 64:
            return f"image {i} must have 64 pixels"
        for p in image:
            if isinstance(p, bool) or not isinstance(p, (int, float)) or not 0 <= p <= 16:
                return f"image {i} has a pixel outside 0 to 16"
    return None`,
  explanation:
    'This is what Pydantic does for you from the type annotations, with better messages and the location of each error. Validation also documents the contract: the OpenAPI page FastAPI generates lists the same limits.',
  tests: `good = [[0] * 64]
assert validate(good) is None, 'one image of 64 zeros is valid'
assert validate([]) is not None, 'an empty list is rejected'
assert validate([[0] * 64] * 65) is not None, '65 images is too many'
assert validate([[0] * 63]) is not None, '63 pixels is too few'
assert validate([[17] + [0] * 63]) is not None, 'a pixel of 17 is out of range'
assert validate([["a"] * 64]) is not None, 'text is not a pixel'
assert validate([[True] * 64]) is not None, 'booleans are not pixels'`,
};
