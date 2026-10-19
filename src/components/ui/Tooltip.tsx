import { cloneElement, useId, useState, type ReactElement } from 'react';
import s from './Tooltip.module.css';

interface TooltipProps {
  content: string;
  /** A single focusable element. It receives aria-describedby. */
  children: ReactElement<{ 'aria-describedby'?: string }>;
}

/** Shows on hover and on keyboard focus (never hover-only); Escape hides it. */
export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return (
    <span
      className={s.root}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      onKeyDown={(e) => e.key === 'Escape' && setVisible(false)}
    >
      {cloneElement(children, { 'aria-describedby': id })}
      <span id={id} role="tooltip" className={s.tip} hidden={!visible}>
        {content}
      </span>
    </span>
  );
}
