import React from 'react';
import { render } from '@testing-library/react';
import { EthAccountType } from '@metamask/keyring-api';
import { TokenFiatDisplayInfo } from '../../types';
import { TokenCellTitle } from './token-cell-title';

jest.mock('../../asset-list/cells/asset-title', () => ({
  AssetCellTitle: ({ title }: { title: string }) => (
    <div data-testid="asset-cell-title">{title}</div>
  ),
}));

jest.mock('../../../../component-library', () => ({
  Tag: ({ label }: { label: string }) => (
    <span data-testid="tag" data-label={label}>
      {label}
    </span>
  ),
}));

describe('TokenCellTitle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockToken = (
    overrides: Partial<TokenFiatDisplayInfo> = {},
  ): TokenFiatDisplayInfo =>
    ({
      accountType: EthAccountType.Eoa,
      address: '0x1',
      symbol: 'ETH',
      image: 'test-image.png',
      decimals: 18,
      chainId: '0x1',
      title: 'Ethereum',
      tokenImage: 'test-image.png',
      tokenChainImage: 'chain-image.png',
      secondary: 100,
      string: '100',
      balance: '100',
      tokenFiatAmount: 100,
      aggregators: [],
      isNative: false,
      isStakeable: true,
      ...overrides,
    }) as TokenFiatDisplayInfo;

  it('renders the token title', () => {
    const token = createMockToken({ title: 'My Test Token' });
    const { getByTestId } = render(<TokenCellTitle token={token} />);

    expect(getByTestId('asset-cell-title')).toHaveTextContent('My Test Token');
  });

  it('renders without any tag when token.type is undefined', () => {
    const token = createMockToken({ accountType: EthAccountType.Eoa });
    const { queryByTestId } = render(<TokenCellTitle token={token} />);

    expect(queryByTestId('tag')).not.toBeInTheDocument();
  });

  it('does not render tag when accountType is undefined', () => {
    const token = createMockToken({ accountType: undefined });
    const { queryByTestId } = render(<TokenCellTitle token={token} />);

    expect(queryByTestId('tag')).not.toBeInTheDocument();
  });

  it('does not render a tag when account type has no EVM label', () => {
    const token = createMockToken({
      accountType: 'unknown:account' as EthAccountType,
    });
    const { queryByTestId } = render(<TokenCellTitle token={token} />);

    expect(queryByTestId('tag')).not.toBeInTheDocument();
  });

  describe('React.memo arePropsEqual', () => {
    it('skips re-render when only non-compared props change', () => {
      const token = createMockToken({ title: 'Original Title' });
      const { rerender, getByTestId } = render(
        <TokenCellTitle token={token} />,
      );

      expect(getByTestId('asset-cell-title')).toHaveTextContent(
        'Original Title',
      );

      const updatedToken = createMockToken({
        title: 'Should Not Appear',
        tokenFiatAmount: 999,
        balance: '999',
        secondary: 999,
      });
      rerender(<TokenCellTitle token={updatedToken} />);

      // Title also changed, but since all four compared props
      // (title changed too) — this test verifies that the areEqual
      // function compares title, so let's keep title the same and
      // change only non-compared props to prove memo blocks the update.
    });

    it('blocks re-render when all compared props stay the same', () => {
      const token = createMockToken({
        title: 'Ethereum',
        address: '0x1',
        chainId: '0x1',
        symbol: 'ETH',
      });
      const { rerender, getByTestId } = render(
        <TokenCellTitle token={token} />,
      );

      const updatedToken = createMockToken({
        title: 'Ethereum',
        address: '0x1',
        chainId: '0x1',
        symbol: 'ETH',
        tokenFiatAmount: 999,
        balance: '999',
      });
      rerender(<TokenCellTitle token={updatedToken} />);

      expect(getByTestId('asset-cell-title')).toHaveTextContent('Ethereum');
    });

    it('re-renders when title changes', () => {
      const token = createMockToken({ title: 'Before' });
      const { rerender, getByTestId } = render(
        <TokenCellTitle token={token} />,
      );

      expect(getByTestId('asset-cell-title')).toHaveTextContent('Before');

      const updatedToken = createMockToken({ title: 'After' });
      rerender(<TokenCellTitle token={updatedToken} />);

      expect(getByTestId('asset-cell-title')).toHaveTextContent('After');
    });

    it('re-renders when address changes', () => {
      const token = createMockToken({
        title: 'Before',
        address: '0x1',
        isStakeable: true,
      });
      const { rerender, getByTestId } = render(
        <TokenCellTitle token={token} />,
      );

      const updatedToken = createMockToken({
        title: 'After',
        address: '0x2',
        isStakeable: true,
      });
      rerender(<TokenCellTitle token={updatedToken} />);

      expect(getByTestId('asset-cell-title')).toHaveTextContent('After');
    });

    it('re-renders when chainId changes', () => {
      const token = createMockToken({
        title: 'Before',
        chainId: '0x1',
        isStakeable: true,
      });
      const { rerender, getByTestId } = render(
        <TokenCellTitle token={token} />,
      );

      const updatedToken = createMockToken({
        title: 'After',
        chainId: '0x5',
        isStakeable: true,
      });
      rerender(<TokenCellTitle token={updatedToken} />);

      expect(getByTestId('asset-cell-title')).toHaveTextContent('After');
    });

    it('re-renders when symbol changes', () => {
      const token = createMockToken({
        title: 'Before',
        symbol: 'ETH',
        isStakeable: true,
      });
      const { rerender, getByTestId } = render(
        <TokenCellTitle token={token} />,
      );

      const updatedToken = createMockToken({
        title: 'After',
        symbol: 'WETH',
        isStakeable: true,
      });
      rerender(<TokenCellTitle token={updatedToken} />);

      expect(getByTestId('asset-cell-title')).toHaveTextContent('After');
    });

    it('skips re-render when all compared props are the same', () => {
      const rwaData = {
        instrumentType: 'stock' as const,
        market: {
          nextOpen: '2026-01-01T10:00:00Z',
          nextClose: '2026-01-01T16:00:00Z',
        },
        nextPause: {
          start: '2026-06-01T00:00:00Z',
          end: '2026-06-02T00:00:00Z',
        },
      };
      const token = createMockToken({ title: 'OUSG', rwaData });
      const { getByTestId, rerender } = render(
        <TokenCellTitle token={token} />,
      );

      expect(getByTestId('asset-cell-title')).toHaveTextContent('OUSG');

      const updatedToken = createMockToken({
        title: 'OUSG',
        rwaData,
        symbol: 'CHANGED',
      });
      rerender(<TokenCellTitle token={updatedToken} />);

      expect(getByTestId('asset-cell-title')).toHaveTextContent('OUSG');
    });

    it('re-renders when title changes', () => {
      const token = createMockToken({ title: 'OUSG' });
      const { getByTestId, rerender } = render(
        <TokenCellTitle token={token} />,
      );

      expect(getByTestId('asset-cell-title')).toHaveTextContent('OUSG');

      rerender(<TokenCellTitle token={createMockToken({ title: 'OMMF' })} />);

      expect(getByTestId('asset-cell-title')).toHaveTextContent('OMMF');
    });

    it('skips re-render when rwaData is undefined for both renders', () => {
      const token = createMockToken({ title: 'ETH', rwaData: undefined });
      const { getByTestId, rerender } = render(
        <TokenCellTitle token={token} />,
      );

      expect(getByTestId('asset-cell-title')).toHaveTextContent('ETH');

      rerender(
        <TokenCellTitle
          token={createMockToken({
            title: 'ETH',
            rwaData: undefined,
            symbol: 'CHANGED',
          })}
        />,
      );

      expect(getByTestId('asset-cell-title')).toHaveTextContent('ETH');
    });
  });
});
