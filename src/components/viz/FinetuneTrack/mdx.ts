import { DedupView, MaskView, PackView } from './Data';
import { ComputeView, DecisionView, PaybackView, TokenLossView } from './Basics';
import { DpoMarginView, DpoTrainView, KlPolicyView, PreferenceView } from './Alignment';
import { GateView, WinRateView } from './Evaluation';
import { LoraCountView, LoraMatrixView, MemoryView } from './Peft';
import { BatchView, LrScheduleView, SftCurves } from './Training';

/** Registers the LLM fine-tuning track visualizations for lessons (picked up by src/mdx-components.tsx). */
export default {
  TokenLossView,
  DecisionView,
  PaybackView,
  ComputeView,
  LrScheduleView,
  BatchView,
  MaskView,
  PackView,
  DedupView,
  SftCurves,
  LoraCountView,
  LoraMatrixView,
  MemoryView,
  PreferenceView,
  KlPolicyView,
  DpoMarginView,
  DpoTrainView,
  WinRateView,
  GateView,
};
