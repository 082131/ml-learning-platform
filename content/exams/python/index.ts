import type { ExamDef } from '@/lib/exam/types';
import { tasks } from './handson';
import { questions } from './questions';

export const pythonExam: ExamDef = {
  track: 'python',
  title: 'Python for Data & ML certification exam',
  summary:
    'Code-reading and scenario questions at the level of the Python Institute PCAP and PCAD exams and the PyTorch Certified Associate: the language in depth, NumPy, pandas, data cleaning, statistics and PyTorch.',
  certifications: [
    {
      name: 'PCAP – Certified Associate Python Programmer (PCAP-31-03)',
      vendor: 'Python Institute',
      url: 'https://pythoninstitute.org/pcap-exam-syllabus',
      format:
        'Modules and packages 12%, exceptions 12%, strings 9.5%, OOP 28.5%, advanced constructs and I/O 24%, testing and debugging 14%. 42 questions in 65 minutes, pass at 72%.',
    },
    {
      name: 'PCAD – Certified Associate Data Analyst with Python',
      vendor: 'Python Institute',
      url: 'https://pythoninstitute.org/pcad-exam-syllabus',
      format:
        'Data acquisition and pre-processing 29.2%, programming and databases 33.3%, statistics 8.3%, analysis and modeling 18.8%, visualization 10.4%. 48 items, pass at 75%.',
    },
    {
      name: 'PyTorch Certified Associate (PTCA)',
      vendor: 'PyTorch Foundation',
      url: 'https://training.linuxfoundation.org/certification/pytorch-certified-associate-ptca/',
      format:
        'PyTorch fundamentals 38%, performance and optimization 26%, model development 20%, data handling 16%. Online, proctored multiple choice, 120 minutes.',
    },
  ],
  domains: [
    { id: 'lang', title: 'Python language', count: 28, maps: 'PCAP sections 2, 4, 5 · PCAD block 2' },
    { id: 'numpy', title: 'NumPy', count: 14, maps: 'PCAD block 4 · PTCA fundamentals' },
    { id: 'pandas', title: 'pandas', count: 18, maps: 'PCAD blocks 1 and 4' },
    { id: 'clean', title: 'Data cleaning', count: 12, maps: 'PCAD block 1' },
    { id: 'stats', title: 'Analysis and statistics', count: 10, maps: 'PCAD blocks 3 and 5' },
    { id: 'torch', title: 'PyTorch', count: 18, maps: 'PTCA, all four domains' },
  ],
  minutes: 150,
  passPercent: 75,
  questions,
  handsOn: { minutes: 150, passPercent: 70, tasks },
};
