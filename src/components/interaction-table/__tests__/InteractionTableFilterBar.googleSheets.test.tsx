import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it } from 'vitest';
import { InteractionTableFilterBar, InteractionTableFilterBarProps } from '../InteractionTableFilterBar';

const baseProps: InteractionTableFilterBarProps = {
  searchTerm: '',
  onSearchTermChange: () => undefined,
  dateFilter: 'ALL',
  onDateFilterChange: () => undefined,
  customDate: '',
  onCustomDateChange: () => undefined,
  selectedChannel: 'ALL',
  onChannelChange: () => undefined,
  selectedStatus: 'ALL',
  onStatusChange: () => undefined,
  dateSortOrder: 'desc',
  onToggleDateSort: () => undefined,
  inEventOnly: false,
  onToggleInEventOnly: () => undefined,
  selectedProduct: 'ALL',
  onProductChange: () => undefined,
  availableProducts: [],
  hasActiveFilters: false,
  onClearAllFilters: () => undefined,
  onScrollToBottom: () => undefined,
};

describe('InteractionTableFilterBar Google Sheets shortcut', () => {
  let renderer: ReactTestRenderer | undefined;

  afterEach(async () => {
    if (renderer) {
      await act(async () => renderer?.unmount());
      renderer = undefined;
    }
  });

  it('places a safely configured workbook link beside Interaction Logs', async () => {
    await act(async () => {
      renderer = create(
        <InteractionTableFilterBar
          {...baseProps}
          sheetsShortcutUrl="https://docs.google.com/spreadsheets/d/example/edit"
        />
      );
    });

    const heading = renderer?.root.findByProps({ children: 'Interaction Logs' });
    const link = renderer?.root.findByType('a');
    expect(link?.parent).toBe(heading?.parent);
    expect(link?.props.href).toBe('https://docs.google.com/spreadsheets/d/example/edit');
    expect(link?.props.target).toBe('_blank');
    expect(link?.props.rel).toBe('noopener noreferrer');
  });
});
