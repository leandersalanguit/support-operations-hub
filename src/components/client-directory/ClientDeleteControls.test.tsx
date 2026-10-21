import { create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { ClientGridCard } from './ClientGridCard';
import { ClientListItem } from './ClientListItem';

const client = {
  id: 'client-a',
  name: 'Client A',
  phoneNumbers: [],
  ownedProducts: [],
} as any;

const sharedProps = {
  client,
  phones: [],
  copiedPhone: null,
  onCopyPhone: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe('client directory delete controls', () => {
  it.each([
    ['list', ClientListItem],
    ['grid', ClientGridCard],
  ] as const)('hides the %s delete control for support agents', (_view, Component) => {
    const renderer = create(<Component {...sharedProps} canDelete={false} />);

    expect(renderer.root.findAll((node) => node.type === 'button' && node.props.title === 'Delete client')).toHaveLength(0);
  });

  it.each([
    ['list', ClientListItem],
    ['grid', ClientGridCard],
  ] as const)('shows the %s delete control for team leads', (_view, Component) => {
    const renderer = create(<Component {...sharedProps} canDelete />);

    expect(renderer.root.findAll((node) => node.type === 'button' && node.props.title === 'Delete client').length).toBeGreaterThan(0);
  });
});
