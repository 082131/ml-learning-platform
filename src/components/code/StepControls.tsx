import { Button } from '@/components/ui';
import s from './StepThrough.module.css';

interface StepControlsProps {
  index: number;
  count: number;
  playing: boolean;
  onGo: (index: number) => void;
  onTogglePlay: () => void;
}

/** First, previous, play/pause, next, last and a scrubber. */
export function StepControls({ index, count, playing, onGo, onTogglePlay }: StepControlsProps) {
  const last = count - 1;
  return (
    <div className={s.controls}>
      <div className={s.buttons} role="group" aria-label="Step controls">
        <Button size="sm" onClick={() => onGo(0)} disabled={index === 0} aria-label="First step">
          |◀
        </Button>
        <Button size="sm" onClick={() => onGo(index - 1)} disabled={index === 0}>
          <span aria-hidden="true">◀</span> Previous
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={onTogglePlay}
          disabled={count < 2}
          aria-pressed={playing}
        >
          {playing ? 'Pause' : 'Play'}
        </Button>
        <Button size="sm" onClick={() => onGo(index + 1)} disabled={index === last}>
          Next <span aria-hidden="true">▶</span>
        </Button>
        <Button size="sm" onClick={() => onGo(last)} disabled={index === last} aria-label="Last step">
          ▶|
        </Button>
      </div>
      <label className={s.scrub}>
        <span className={s.counter}>
          Step {index + 1} of {count}
        </span>
        <input
          type="range"
          min={1}
          max={count}
          value={index + 1}
          onChange={(e) => onGo(Number(e.target.value) - 1)}
          aria-label="Step"
          aria-valuetext={`Step ${index + 1} of ${count}`}
        />
      </label>
    </div>
  );
}
