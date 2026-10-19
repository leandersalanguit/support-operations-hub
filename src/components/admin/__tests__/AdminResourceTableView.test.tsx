import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  state: [] as any[],
  hookIndex: 0,
  confirmProps: null as any,
  markup: '',
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: (initialValue: unknown) => {
      const index = harness.hookIndex++;
      if (harness.state[index] === undefined) harness.state[index] = initialValue;
      return [
        harness.state[index],
        (nextValue: unknown) => {
          harness.state[index] =
            typeof nextValue === 'function' ? (nextValue as (previous: unknown) => unknown)(harness.state[index]) : nextValue;
        },
      ];
    },
    useEffect: () => undefined,
    useMemo: (factory: () => unknown) => factory(),
    useCallback: (callback: unknown) => callback,
    useRef: (initialValue: unknown) => {
      const index = harness.hookIndex++;
      if (harness.state[index] === undefined) harness.state[index] = { current: initialValue };
      return harness.state[index];
    },
  };
});

vi.mock('../../../infrastructure/supabase/resourceAdminRepo', () => ({
  resourceAdminRepo: {
    fetchItems: vi.fn(),
    toggleActive: vi.fn(),
    getAuditLogs: vi.fn(),
  },
}));

vi.mock('../GenericResourceAddModal', () => ({ GenericResourceAddModal: () => null }));
vi.mock('../CatalogAuditLogModal', () => ({ CatalogAuditLogModal: () => null }));
vi.mock('../EditResourceModal', () => ({ EditResourceModal: () => null }));
vi.mock('../AdminResourceTableRow', () => ({ AdminResourceTableRow: () => null }));
vi.mock('../../common/ConfirmModal', () => ({
  ConfirmModal: (props: unknown) => {
    harness.confirmProps = props;
    return null;
  },
}));

import { AdminResourceTableView } from '../AdminResourceTableView';
import { ADMIN_RESOURCE_CONFIGS } from '../../../utils/adminResourceConfig';
import { resourceAdminRepo } from '../../../infrastructure/supabase/resourceAdminRepo';

const item = { id: 'resource-1', name: 'Installer', is_active: true };
const config = ADMIN_RESOURCE_CONFIGS['admin-installers'];

function renderTable(onTaxonomiesChanged?: () => Promise<void> | void) {
  harness.hookIndex = 0;
  harness.confirmProps = null;
  harness.markup = renderToStaticMarkup(
    React.createElement(AdminResourceTableView, { config, onTaxonomiesChanged })
  );
  return harness.confirmProps as {
    onConfirm: () => Promise<void>;
    isLoading?: boolean;
  };
}

function seedTableState() {
  harness.state = [
    [item], // items
    false, // isLoading
    null, // error
    '', // searchQuery
    'all', // statusFilter
    false, // isAddModalOpen
    false, // isAuditModalOpen
    null, // itemToEdit
    item, // itemToToggle
    false, // isTogglingStatus
    { current: false }, // statusToggleInFlight
    [], // auditLogs
    false, // isAuditLoading
    null, // auditError
  ];
}

describe('AdminResourceTableView status toggle', () => {
  beforeEach(() => {
    seedTableState();
    vi.mocked(resourceAdminRepo.fetchItems).mockReset();
    vi.mocked(resourceAdminRepo.toggleActive).mockReset();
    vi.mocked(resourceAdminRepo.getAuditLogs).mockReset();
    vi.mocked(resourceAdminRepo.fetchItems).mockResolvedValue([{ ...item, is_active: false }]);
  });

  it('keeps the saved status and shows the error when the save fails', async () => {
    vi.mocked(resourceAdminRepo.toggleActive).mockRejectedValue(new Error('Save failed'));
    const confirmModal = renderTable();

    await confirmModal.onConfirm();

    expect(harness.state[0][0].is_active).toBe(true);
    expect(harness.state[2]).toBe('Save failed');
    renderTable();
    expect(harness.markup).toContain('Save failed');
  });

  it('locks confirmation and ignores repeated calls while a save is pending', async () => {
    const finishSaves: Array<() => void> = [];
    vi.mocked(resourceAdminRepo.toggleActive).mockImplementation(
      () => new Promise<void>((resolve) => { finishSaves.push(resolve); })
    );
    const confirmModal = renderTable();

    const firstSave = confirmModal.onConfirm();
    const pendingModal = renderTable();
    const secondSave = confirmModal.onConfirm();

    expect(pendingModal.isLoading).toBe(true);
    expect(resourceAdminRepo.toggleActive).toHaveBeenCalledTimes(1);

    finishSaves.forEach((finishSave) => finishSave());
    await Promise.all([firstSave, secondSave]);
  });

  it('reloads items and refreshes taxonomies after a successful save', async () => {
    vi.mocked(resourceAdminRepo.toggleActive).mockResolvedValue(undefined);
    const onTaxonomiesChanged = vi.fn().mockResolvedValue(undefined);
    const confirmModal = renderTable(onTaxonomiesChanged);

    await confirmModal.onConfirm();

    expect(resourceAdminRepo.fetchItems).toHaveBeenCalledTimes(1);
    expect(harness.state[0][0].is_active).toBe(false);
    expect(onTaxonomiesChanged).toHaveBeenCalledTimes(1);
  });
});
