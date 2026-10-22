import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'reassign',
    type: 'numeric',
    prompt: 'Four lines run in order: `x = 4`, `y = x`, `x = x + 3`, `print(y)`. What is printed?',
    answer: 4,
    tolerance: 0,
    hint: 'y = x makes y refer to the value x had at that moment. Changing x afterwards does not change y.',
    explain: 'y got the value 4 on line 2. Line 3 makes x refer to a new value, 7, and leaves y alone.',
  },
  {
    id: 'divide-type',
    type: 'choice',
    prompt: 'What is the type of `6 / 2` in Python 3?',
    options: [
      {
        text: 'float (the value is 3.0)',
        correct: true,
        explain: '/ always gives a float, even when the division is exact.',
      },
      {
        text: 'int (the value is 3)',
        correct: false,
        explain: 'That is what 6 // 2 (floor division) gives. / always gives a float.',
      },
      { text: 'str', correct: false, explain: 'Dividing numbers gives a number; nothing here is text.' },
    ],
  },
  {
    id: 'concat-error',
    type: 'choice',
    prompt: 'Why does `"Total: " + 5` raise `TypeError: can only concatenate str (not "int") to str`?',
    options: [
      {
        text: '+ cannot join a str and an int; convert first with str(5), or use an f-string',
        correct: true,
        explain:
          'Python never guesses whether you meant addition or joining. "Total: " + str(5) or f"Total: {5}" both work.',
      },
      {
        text: 'Strings cannot be used with + at all',
        correct: false,
        explain: '+ joins two strings fine: "a" + "b" is "ab".',
      },
      {
        text: 'The space inside the quotes is not allowed',
        correct: false,
        explain: 'Strings can contain any text, spaces included.',
      },
    ],
  },
  {
    id: 'float-sum',
    type: 'choice',
    prompt: '`print(0.1 + 0.2)` prints `0.30000000000000004`. Why?',
    options: [
      {
        text: 'Floats are stored in binary, and 0.1 and 0.2 have no exact binary form, so the sum is slightly off',
        correct: true,
        explain:
          'Every language that uses standard (IEEE 754) floats gives the same result. Compare floats with a tolerance, or round for display.',
      },
      {
        text: 'It is a bug in Python',
        correct: false,
        explain: 'JavaScript, C and NumPy print the same digits. It is how binary floating point works.',
      },
      {
        text: 'print adds digits to long numbers',
        correct: false,
        explain: 'print shows the shortest text that turns back into exactly the stored float.',
      },
    ],
  },
  {
    id: 'trace-order',
    type: 'order',
    prompt: 'Put these lines in the only order that runs without error. It prints "pears cost 3.0".',
    items: ['price = 1.5', 'total = price * 2', 'text = str(total)', 'print("pears cost " + text)'],
    explain:
      "Each line uses the name the line before it created, and a name must be assigned before it is used. Running print first would raise NameError: name 'text' is not defined.",
  },
];

export const receiptExercise: Exercise = {
  id: 'receipt-line',
  prompt:
    'Write `receipt(item, price, quantity)` that returns a string such as `"apples x3: 7.5"`: the item, an x, the quantity, a colon, and price times quantity.',
  starter: `def receipt(item, price, quantity):
    total = price * quantity
    # Build and return the text.
    pass`,
  hints: [
    'You can join strings with +, but quantity and total are numbers: wrap them in str().',
    'An f-string is shorter: f"{item} x{quantity}: {total}".',
    'Remember to `return` the string; printing it is not the same as returning it.',
  ],
  solution: `def receipt(item, price, quantity):
    total = price * quantity
    return f"{item} x{quantity}: {total}"`,
  explanation:
    'An f-string calls str() on each value inside the braces, so numbers need no conversion. Because price is a float, the total prints with a decimal point: 2.0 * 4 is 8.0.',
  tests: `assert receipt("apples", 2.5, 3) == "apples x3: 7.5", f'receipt("apples", 2.5, 3) returned {receipt("apples", 2.5, 3)!r}'
assert receipt("pears", 2.0, 4) == "pears x4: 8.0", 'a float price gives a float total: "pears x4: 8.0"'
assert receipt("tea", 3, 2) == "tea x2: 6", 'an int price times an int quantity is an int: "tea x2: 6"'`,
};
