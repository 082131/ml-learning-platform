import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  NumberField,
  OutlineBadge,
  Popover,
  SectionLabel,
  Sheet,
  SimulatedBadge,
  Slider,
  Tabs,
  Tooltip,
} from './index';

describe('Button', () => {
  it('calls onClick and renders the square bullet only for primary', async () => {
    const onClick = vi.fn();
    const { container } = render(
      <>
        <Button variant="primary" onClick={onClick}>
          Go
        </Button>
        <Button>Other</Button>
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Other' })).toHaveAttribute('type', 'button');
  });
  it('ButtonLink renders a link', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/x">Home</ButtonLink>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/x');
  });
});

describe('Card', () => {
  it('shows a padded number and becomes a link when given `to`', () => {
    render(
      <MemoryRouter>
        <Card number={7} to="/learn/x">
          <h3>Title</h3>
        </Card>
      </MemoryRouter>,
    );
    expect(screen.getByText('007', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/learn/x');
  });
  it('renders without a link', () => {
    render(<Card>Plain</Card>);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Plain')).toBeInTheDocument();
  });
});

describe('SectionLabel', () => {
  it('formats [03/12] —— > LABEL', () => {
    const { container } = render(<SectionLabel index={3} total={12} label="Intuition" />);
    expect(container).toHaveTextContent('[03/12]> Intuition');
  });
  it('accepts a code prefix', () => {
    const { container } = render(<SectionLabel code="T.01" label="Track" />);
    expect(container).toHaveTextContent('[T.01]> Track');
  });
});

describe('Badge', () => {
  it('renders the outline-only and simulated labels as text', () => {
    render(
      <>
        <Badge tone="ok">Done</Badge>
        <OutlineBadge />
        <SimulatedBadge />
      </>,
    );
    expect(screen.getByText('Outline only')).toBeInTheDocument();
    expect(screen.getByText('Simulated trace')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });
});

describe('Tabs', () => {
  const tabs = [
    { id: 'a', label: 'One', content: 'Panel one' },
    { id: 'b', label: 'Two', content: 'Panel two' },
    { id: 'c', label: 'Three', content: 'Panel three' },
  ];
  it('switches panels on click and with arrow, Home and End keys', async () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} label="Stages" onChange={onChange} />);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel one');
    await userEvent.click(screen.getByRole('tab', { name: 'Two' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel two');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Three' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Three' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'One' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel three');
    await userEvent.keyboard('{Home}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Three' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('c');
    expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('tabindex', '-1');
  });
});

describe('Slider', () => {
  it('is labeled, shows the formatted value and reports changes', () => {
    function Harness() {
      const [v, setV] = useState(0.1);
      return (
        <Slider
          label="Learning rate"
          value={v}
          min={0}
          max={1}
          step={0.1}
          onChange={setV}
          format={(x) => x.toFixed(2)}
        />
      );
    }
    render(<Harness />);
    const slider = screen.getByRole('slider', { name: 'Learning rate' });
    expect(screen.getByText('0.10')).toBeInTheDocument();
    slider.focus();
    // Range inputs respond to arrow keys in browsers; jsdom needs a change event.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(slider, '0.5');
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    expect(screen.getByText('0.50')).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-valuetext', '0.50');
  });
});

describe('NumberField', () => {
  it('reports valid values and explains invalid ones without reporting them', async () => {
    const onChange = vi.fn();
    render(<NumberField label="Batch size" value={8} min={1} max={64} onChange={onChange} />);
    const input = screen.getByRole('spinbutton', { name: 'Batch size' });
    await userEvent.clear(input);
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a number.');
    await userEvent.type(input, '100');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a number from 1 to 64.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).toHaveBeenLastCalledWith(10);
    await userEvent.clear(input);
    await userEvent.type(input, '32');
    expect(onChange).toHaveBeenLastCalledWith(32);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('Sheet', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open</button>
        <Sheet open={open} onClose={() => setOpen(false)} title="Details">
          <a href="#x">Inside</a>
        </Sheet>
      </>
    );
  }
  it('opens as a modal dialog, traps focus, closes on Escape and restores focus', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Details' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Inside' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });
  it('closes with the Close button', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Popover', () => {
  it('opens on click or Enter, closes on Escape, a second click or an outside click', async () => {
    render(
      <p>
        A{' '}
        <Popover trigger="model" label="Definition: Model">
          A function with parameters.
        </Popover>{' '}
        here. <button>Elsewhere</button>
      </p>,
    );
    const trigger = screen.getByRole('button', { name: 'model' });
    await userEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Definition: Model' })).toHaveTextContent(
      'A function with parameters.',
    );
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(trigger);
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Tooltip', () => {
  it('shows on hover and on keyboard focus, and hides on Escape', async () => {
    render(
      <Tooltip content="Switch theme">
        <button>Theme</button>
      </Tooltip>,
    );
    const button = screen.getByRole('button', { name: 'Theme' });
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(button).toHaveAttribute('aria-describedby', tip.id);
    expect(tip).not.toBeVisible();
    await userEvent.hover(button);
    expect(tip).toBeVisible();
    await userEvent.unhover(button);
    expect(tip).not.toBeVisible();
    await userEvent.tab();
    expect(tip).toBeVisible();
    await userEvent.keyboard('{Escape}');
    expect(tip).not.toBeVisible();
  });
});
