import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'pick-relationship',
    type: 'choice',
    prompt: 'You want to see whether penguins with longer bills also have deeper bills. Which plot?',
    options: [
      {
        text: 'A scatter plot: bill length on x, bill depth on y',
        correct: true,
        explain: 'Two numeric columns per penguin: one point each shows how they vary together.',
      },
      {
        text: 'A histogram of bill length',
        correct: false,
        explain: 'A histogram shows one column at a time; it cannot show how two columns relate.',
      },
      {
        text: 'A line plot of bill depth',
        correct: false,
        explain:
          'Lines connect points in order. Penguins have no natural order, so the line would zigzag meaninglessly.',
      },
    ],
  },
  {
    id: 'pick-distribution',
    type: 'choice',
    prompt:
      'You want to know whether most penguins weigh about the same, or whether there are two groups. Which plot?',
    options: [
      {
        text: 'A histogram of body mass',
        correct: true,
        explain: 'A histogram shows the shape of one column, including whether it has one peak or two.',
      },
      {
        text: 'A bar chart of the mean body mass',
        correct: false,
        explain: 'One mean hides the spread: two separate groups and one tight group can have the same mean.',
      },
      {
        text: 'A scatter plot of body mass against row number',
        correct: false,
        explain: 'Row order depends on how the file was written, so the x axis means nothing.',
      },
    ],
  },
  {
    id: 'pick-time',
    type: 'choice',
    prompt:
      'A model’s validation loss was recorded after each of 50 training epochs. Which plot shows how it changed?',
    options: [
      {
        text: 'A line plot with epoch on x and loss on y',
        correct: true,
        explain: 'The x values are ordered, so connecting them shows the trend from one epoch to the next.',
      },
      {
        text: 'A histogram of the 50 losses',
        correct: false,
        explain: 'A histogram throws away the order, which is exactly what you want to see here.',
      },
      {
        text: 'A bar chart with one bar per epoch',
        correct: false,
        explain: 'It would work, but 50 bars are hard to read; a line shows the same values with less ink.',
      },
    ],
  },
  {
    id: 'bins',
    type: 'choice',
    prompt: 'What changes when you raise `bins` in `ax.hist(values, bins=...)`?',
    options: [
      {
        text: 'The bars get narrower and each holds fewer values; the total stays the same',
        correct: true,
        explain:
          'The range is split into more equal parts. The counts always add up to the number of values.',
      },
      {
        text: 'More values are plotted',
        correct: false,
        explain: 'Every value is in exactly one bar whatever the number of bins.',
      },
      {
        text: 'The y axis switches from counts to percentages',
        correct: false,
        explain: 'That is density=True. bins only changes how the x range is split.',
      },
    ],
  },
  {
    id: 'subplots',
    type: 'choice',
    prompt: 'What does `fig, ax = plt.subplots()` give you?',
    options: [
      {
        text: 'A Figure (the whole image) and an Axes (one plot area with its axes) to draw on',
        correct: true,
        explain: 'You call ax.scatter, ax.hist, ax.set_xlabel and so on, on the Axes.',
      },
      {
        text: 'A finished, empty image file',
        correct: false,
        explain:
          'Nothing is saved until fig.savefig is called. In the browser runner, figures are shown after the code runs.',
      },
      {
        text: 'The x axis and the y axis as two objects',
        correct: false,
        explain: 'ax is one plot area that contains both axes. plt.subplots(1, 2) gives two plot areas.',
      },
    ],
  },
];

export const histExercise: Exercise = {
  id: 'plot-masses',
  prompt:
    'Write `plot_masses(ax, masses)` that draws a histogram of `masses` with 10 bins on `ax`, labels the x axis "Body mass (g)" and the y axis "Penguins".',
  starter: `import matplotlib.pyplot as plt

def plot_masses(ax, masses):
    # Draw the histogram on ax, then label both axes.
    pass`,
  hints: [
    '`ax.hist(masses, bins=10)` draws the bars.',
    '`ax.set_xlabel("Body mass (g)")` and `ax.set_ylabel("Penguins")` add the labels.',
    'Draw on the `ax` you are given, not with `plt.hist`, so the tests can find your bars.',
  ],
  solution: `import matplotlib.pyplot as plt

def plot_masses(ax, masses):
    ax.hist(masses, bins=10)
    ax.set_xlabel("Body mass (g)")
    ax.set_ylabel("Penguins")`,
  explanation:
    'Functions that take an ax to draw on are how plotting code is usually organized: the caller decides the figure layout, and the function only draws.',
  tests: `import matplotlib.pyplot as plt
fig, ax = plt.subplots()
plot_masses(ax, [3700, 3800, 4100, 5000, 5200, 4400, 3900])
assert len(ax.patches) == 10, f"expected 10 bars, got {len(ax.patches)}"
assert sum(p.get_height() for p in ax.patches) == 7, "the bars should hold all 7 masses"
assert ax.get_xlabel() == "Body mass (g)", f"x label is {ax.get_xlabel()!r}"
assert ax.get_ylabel() == "Penguins", f"y label is {ax.get_ylabel()!r}"
plt.close(fig)`,
};
