import { BalanceChangeResult } from '@metamask/assets-controllers';
import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { getIntlLocale } from '../../../../ducks/locale/locale';
import { getCurrentCurrency } from '../../../../ducks/metamask/metamask';
import { TextColor } from '../../../../helpers/constants/design-system';
import { getPrivacyMode } from '../../../../selectors';
import {
  selectBalanceBySelectedAccountGroup,
  selectBalanceChangeBySelectedAccountGroup,
} from '../../../../selectors/assets';
import { determineBalanceColor } from './get-display-balance';
import { useAccountGroupBalanceDisplay } from './useAccountGroupBalanceDisplay';

jest.mock('react-redux');
jest.mock('../../../../ducks/locale/locale');
jest.mock('../../../../ducks/metamask/metamask');
jest.mock('../../../../selectors');
jest.mock('../../../../selectors/assets');
jest.mock('./get-display-balance');

const mockUseSelector = jest.mocked(useSelector);
const mockSelectBalanceChangeBySelectedAccountGroup = jest.mocked(
  selectBalanceChangeBySelectedAccountGroup,
);
const mockSelectBalanceBySelectedAccountGroup = jest.mocked(
  selectBalanceBySelectedAccountGroup,
);
const mockDetermineBalanceColor = jest.mocked(determineBalanceColor);

// type utility for testing purposes only
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockVar = any;

describe('useAccountGroupBalanceDisplay', () => {
  let mockBalanceChange: BalanceChangeResult;
  let mockBalanceSelector: jest.Mock;

  beforeEach(() => {
    mockBalanceChange = {
      amountChangeInUserCurrency: 100.5,
      percentChange: 5.25,
      period: '1d',
      currentTotalInUserCurrency: 0,
      previousTotalInUserCurrency: 0,
      userCurrency: 'USD',
    };

    mockBalanceSelector = jest.fn().mockReturnValue(mockBalanceChange);

    mockSelectBalanceChangeBySelectedAccountGroup.mockReturnValue(
      mockBalanceSelector as MockVar,
    );
    mockSelectBalanceBySelectedAccountGroup.mockReturnValue({
      totalBalanceInUserCurrency: 0,
    } as MockVar);
    mockDetermineBalanceColor.mockReturnValue(TextColor.successDefault);

    mockUseSelector.mockImplementation((selector) => {
      if (selector === getCurrentCurrency) {
        return 'USD';
      }

      if (selector === getIntlLocale) {
        return 'en-US';
      }

      if (selector === getPrivacyMode) {
        return false;
      }

      if (selector === mockBalanceSelector) {
        return mockBalanceSelector();
      }

      if (selector === selectBalanceBySelectedAccountGroup) {
        return mockSelectBalanceBySelectedAccountGroup({} as MockVar);
      }

      throw new Error(`unmocked selector called: ${selector.name}`);
    });
  });

  it('returns correct data structure', () => {
    const { result } = renderHook(() => useAccountGroupBalanceDisplay('1d'));

    expect(result.current).toEqual({
      privacyMode: false,
      color: TextColor.successDefault,
      amountChange: 100.5,
      percentChange: 0.0525,
      portfolioChange: mockBalanceChange,
    });
  });

  it('returns unavailable changes when the spot balance is omitted from the change result', () => {
    mockBalanceChange = {
      ...mockBalanceChange,
      amountChangeInUserCurrency: 0,
      percentChange: 0,
      currentTotalInUserCurrency: 0,
      previousTotalInUserCurrency: 0,
    };
    mockBalanceSelector.mockReturnValue(mockBalanceChange);
    mockSelectBalanceBySelectedAccountGroup.mockReturnValue({
      totalBalanceInUserCurrency: 100,
    } as MockVar);

    const { result } = renderHook(() => useAccountGroupBalanceDisplay('1d'));

    expect(result.current.amountChange).toBeUndefined();
    expect(result.current.percentChange).toBeUndefined();
    expect(result.current.color).toBe(TextColor.textAlternative);
    expect(result.current.portfolioChange).toBe(mockBalanceChange);
  });

  it('keeps a genuine zero change for an empty account group', () => {
    mockBalanceChange = {
      ...mockBalanceChange,
      amountChangeInUserCurrency: 0,
      percentChange: 0,
      currentTotalInUserCurrency: 0,
      previousTotalInUserCurrency: 0,
    };
    mockBalanceSelector.mockReturnValue(mockBalanceChange);
    mockSelectBalanceBySelectedAccountGroup.mockReturnValue({
      totalBalanceInUserCurrency: 0,
    } as MockVar);

    const { result } = renderHook(() => useAccountGroupBalanceDisplay('1d'));

    expect(result.current.amountChange).toBe(0);
    expect(result.current.percentChange).toBe(0);
  });
});
