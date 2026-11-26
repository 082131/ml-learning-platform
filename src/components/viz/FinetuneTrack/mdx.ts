import { DedupView, MaskView, PackView } from './Data';
import { ComputeView, DecisionView, PaybackView, TokenLossView } from './Basics';
import { DpoMarginView, DpoTrainView, KlPolicyView, PreferenceView } from './Alignment';
import { GateView, WinRateView } from './Evaluation';
import { LoraCountView, LoraMatrixView, MemoryView } from './Peft';
import { BatchView, LrScheduleView, SftCurves } from './Training';

/** Registers the LLM fine-tuning track visualizations for lessons (picked up by src/mdx-components.tsx). */
export default {
  FtTokenLossView: TokenLossView,
  FtDecisionView: DecisionView,
  FtPaybackView: PaybackView,
  FtComputeView: ComputeView,
  FtLrScheduleView: LrScheduleView,
  FtBatchView: BatchView,
  FtMaskView: MaskView,
  FtPackView: PackView,
  FtDedupView: DedupView,
  FtSftCurves: SftCurves,
  FtLoraCountView: LoraCountView,
  FtLoraMatrixView: LoraMatrixView,
  FtMemoryView: MemoryView,
  FtPreferenceView: PreferenceView,
  FtKlPolicyView: KlPolicyView,
  FtDpoMarginView: DpoMarginView,
  FtDpoTrainView: DpoTrainView,
  FtWinRateView: WinRateView,
  FtGateView: GateView,
};
