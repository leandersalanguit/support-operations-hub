import { act, create } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InteractionForm } from '../InteractionForm';

const submitData = {
  date: new Date().toISOString().slice(0, 10),
  dayOfWeek: 'Sunday',
  agent: 'Alex Agent',
  clientName: 'Client A',
  channel: 'Chat',
  chatTicketDetail: '',
  phoneDetail: '',
  clientProduct: 'Product A',
  caseClassification: 'General Inquiry',
  status: 'Solved',
  license: 'support_active',
  inEvent: true,
  firstTimeUser: false,
  additionalNotes: 'Issue resolved',
} as any;

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: () => ({}),
    handleSubmit: (callback: (data: typeof submitData) => void) => () => callback(submitData),
    control: {},
    setValue: vi.fn(),
    watch: (field: string) => submitData[field as keyof typeof submitData],
    reset: vi.fn(),
    getValues: (field?: string) => field ? submitData[field as keyof typeof submitData] : submitData,
    clearErrors: vi.fn(),
    formState: { errors: {}, isSubmitted: false },
  }),
}));

vi.mock('../../application', () => ({
  useTaxonomies: () => ({ products: ['Product A'], classifications: ['General Inquiry'], supportTiers: [] }),
  useClientMatch: () => ({ matchedClient: null, clientPhoneNumbers: [] }),
}));

vi.mock('../../utils/storage', () => ({
  loadLastAgent: () => '',
  saveLastAgent: vi.fn(),
  loadFormViewMode: () => 'vertical',
  saveFormViewMode: vi.fn(),
}));

vi.mock('../interaction-form', () => ({
  InteractionGeneralFields: () => null,
  InteractionChannelFields: () => null,
  InteractionProductFields: () => null,
  InteractionContextFields: () => null,
  InteractionNotesField: () => null,
}));

vi.mock('../PasteExcelModal', () => ({ PasteExcelModal: () => null }));

describe('InteractionForm Ctrl+Enter shortcut', () => {
  let renderer: ReturnType<typeof create> | undefined;

  afterEach(async () => {
    if (renderer) {
      await act(async () => renderer?.unmount());
      renderer = undefined;
    }
  });

  it('submits once when Ctrl+Enter bubbles from the form to its wrapper', async () => {
    const onAddInteraction = vi.fn();
    await act(async () => {
      renderer = create(<InteractionForm onAddInteraction={onAddInteraction} />);
    });

    const form = renderer!.root.findByType('form');
    const event = {
      key: 'Enter',
      ctrlKey: true,
      metaKey: false,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      target: { tagName: 'INPUT' },
    } as any;

    // React delivers one key event to each ancestor as it bubbles.
    await act(async () => {
      form.props.onKeyDown(event);
      form.parent!.props.onKeyDown?.(event);
    });

    expect(onAddInteraction).toHaveBeenCalledTimes(1);
  });

  it('still submits once through the form submit event', async () => {
    const onAddInteraction = vi.fn();
    await act(async () => {
      renderer = create(<InteractionForm onAddInteraction={onAddInteraction} />);
    });

    const form = renderer!.root.findByType('form');
    await act(async () => {
      form.props.onSubmit({ preventDefault: vi.fn() });
    });

    expect(onAddInteraction).toHaveBeenCalledTimes(1);
  });
});
