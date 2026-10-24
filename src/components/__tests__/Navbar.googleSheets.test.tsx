import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Navbar, NavbarProps } from '../Navbar';

const baseProps: NavbarProps = {
  interactions: [],
  onResetSampleData: vi.fn(),
  onClearAll: vi.fn(),
  sheetsSync: {
    state: 'disabled',
    pendingCount: 0,
    failedCount: 0,
    retrying: false,
    errorMessage: null,
    onRetryFailed: vi.fn(),
  },
};

function textContent(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(textContent).join('');
  if (value && typeof value === 'object' && 'children' in value) {
    return textContent((value as { children?: unknown }).children);
  }
  return '';
}

describe('Navbar Google Sheets status', () => {
  let renderer: ReactTestRenderer | undefined;

  afterEach(async () => {
    if (renderer) {
      await act(async () => renderer?.unmount());
      renderer = undefined;
    }
  });

  it('keeps sync status in the Navbar without a workbook shortcut', async () => {
    await act(async () => {
      renderer = create(<Navbar {...baseProps} />);
    });

    expect(renderer?.root.findAllByType('a')).toHaveLength(0);
    const statuses = renderer?.root.findAllByProps({ role: 'status' }) ?? [];
    expect(statuses).toHaveLength(2);
    expect(textContent(statuses[0])).toContain('Sheets sync not enabled');
    expect(statuses[0].props.className).toContain('sm:flex');
    expect(statuses[1].parent?.props.className).toContain('sm:hidden');
  });

  it('reports an empty queue without claiming sync success', async () => {
    await act(async () => {
      renderer = create(
        <Navbar
          {...baseProps}
          sheetsSync={{ ...baseProps.sheetsSync!, state: 'ready' }}
        />
      );
    });

    expect(renderer?.root.findAllByType('a')).toHaveLength(0);
    expect(textContent(renderer?.root.findAllByProps({ role: 'status' })[0])).toContain('Sheets · No queued sync events');
    expect(textContent(renderer?.root.findAllByProps({ role: 'status' })[0])).not.toContain('synced');
  });

  it('reports failed events and exposes the retry action', async () => {
    const onRetryFailed = vi.fn();
    await act(async () => {
      renderer = create(
        <Navbar
          {...baseProps}
          sheetsSync={{
            ...baseProps.sheetsSync!,
            state: 'ready',
            pendingCount: 2,
            failedCount: 1,
            onRetryFailed,
          }}
        />
      );
    });

    const retryButton = renderer?.root.findAllByProps({ children: 'Retry failed' })[0];
    const desktopStatus = renderer?.root.findAllByProps({ role: 'status' })[0];
    expect(textContent(desktopStatus)).toContain('1 failed · 2 pending');
    expect(desktopStatus?.parent?.findAllByProps({ title: 'Connected to Supabase Realtime Database' })).toHaveLength(1);
    await act(async () => retryButton?.props.onClick());
    expect(onRetryFailed).toHaveBeenCalledOnce();
  });
});
