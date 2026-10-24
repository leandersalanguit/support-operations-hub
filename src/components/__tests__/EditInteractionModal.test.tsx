import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { EditInteractionModal } from '../EditInteractionModal';

vi.mock('../common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../common')>();
  return { ...actual, Modal: ({ children }: { children: unknown }) => children };
});

const interaction = {
  id: 'interaction-a', createdAt: '2026-10-20T00:00:00.000Z', date: '2026-10-20', dayOfWeek: 'Tuesday',
  agent: 'Alex', clientName: 'Client A', channel: 'Chat', channelDetails: '', clientProduct: 'Product C',
  caseClassification: 'General Inquiry', status: 'Solved', license: 'support_active', inEvent: false,
  firstTimeUser: false, additionalNotes: 'Notes', time: '12:00',
} as any;

describe('EditInteractionModal ownership choice', () => {
  it.each([true, false])('passes retain-previous-product=%s and keeps the modal open on failure', async (retainPreviousProduct) => {
    const onSave = vi.fn().mockRejectedValue(new Error('RPC failed'));
    const onClose = vi.fn();
    let renderer: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<EditInteractionModal interaction={interaction} isOpen onClose={onClose} onSave={onSave} />);
    });

    const productControl = renderer!.root.find((node) => node.props.value === 'Product C' && typeof node.props.onChange === 'function');
    await act(async () => productControl.props.onChange('Product B'));
    const checkbox = renderer!.root.find((node) => node.type === 'input' && node.props.type === 'checkbox');
    expect(checkbox.props.checked).toBe(true);
    if (!retainPreviousProduct) {
      await act(async () => checkbox.props.onChange({ target: { checked: false } }));
    }

    const form = renderer!.root.findByType('form');
    await act(async () => {
      await form.props.onSubmit({ preventDefault: () => undefined });
    });

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ clientProduct: 'Product B' }), retainPreviousProduct);
    expect(onClose).not.toHaveBeenCalled();
    expect(renderer!.root.findByProps({ role: 'alert' }).children.join('')).toContain('RPC failed');
    await act(async () => renderer!.unmount());
  });
});
