// Unicode confusables is not typed
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { confusables } from 'unicode-confusables';

import { getTokenStandardAndDetailsByChain } from '../../../store/actions';

import {
  findConfusablesInRecipient,
  validateEvmHexAddress,
} from './sendValidations';

jest.mock('unicode-confusables');
jest.mock('../../../store/actions', () => ({
  getTokenStandardAndDetailsByChain: jest.fn(),
}));

const mockGetTokenStandardAndDetailsByChain = jest.mocked(
  getTokenStandardAndDetailsByChain,
);

describe('SendValidations', () => {
  describe('findConfusablesInRecipient', () => {
    const mockConfusables = jest.mocked(confusables);

    beforeEach(() => {
      jest.clearAllMocks();
      mockConfusables.mockReturnValue([]);
    });

    it('returns successful validation when no confusables found', async () => {
      const result = await findConfusablesInRecipient('example.eth');

      expect(result).toEqual({});
    });

    it('returns warning when confusable characters found', async () => {
      mockConfusables.mockReturnValue([
        { point: 'а', similarTo: 'a' },
        { point: 'е', similarTo: 'e' },
      ]);

      const result = await findConfusablesInRecipient('exаmple.eth');

      expect(result).toEqual({
        confusableCharacters: [
          { point: 'а', similarTo: 'a' },
          { point: 'е', similarTo: 'e' },
        ],
      });
    });

    it('handles zero-width confusable characters', async () => {
      mockConfusables.mockReturnValue([
        { point: '‌', similarTo: '' },
        { point: 'a', similarTo: 'a' },
      ]);

      const result = await findConfusablesInRecipient('exa‌mple.eth');

      expect(result).toEqual({
        error: 'invalidAddress',
        warning: 'confusableZeroWidthUnicode',
      });
    });

    it('filters out duplicate confusable points', async () => {
      mockConfusables.mockReturnValue([
        { point: 'а', similarTo: 'a' },
        { point: 'а', similarTo: 'a' },
        { point: 'е', similarTo: 'e' },
      ]);

      const result = await findConfusablesInRecipient('exаmple.eth');

      expect(result.confusableCharacters).toEqual([
        { point: 'а', similarTo: 'a' },
        { point: 'е', similarTo: 'e' },
      ]);
    });

    it('filters out confusable characters with undefined similarTo', async () => {
      mockConfusables.mockReturnValue([
        { point: 'а', similarTo: 'a' },
        { point: 'х', similarTo: undefined },
        { point: 'е', similarTo: 'e' },
      ]);

      const result = await findConfusablesInRecipient('exаmple.eth');

      expect(result.confusableCharacters).toEqual([
        { point: 'а', similarTo: 'a' },
        { point: 'е', similarTo: 'e' },
      ]);
    });
  });

  describe('validateEvmHexAddress', () => {
    it('validates valid hex address successfully', async () => {
      expect(
        await validateEvmHexAddress(
          '0x1234567890123456789012345678901234567890',
        ),
      ).toEqual({});
    });

    it('rejects burn address', async () => {
      expect(
        await validateEvmHexAddress(
          '0x0000000000000000000000000000000000000000',
        ),
      ).toEqual({
        error: 'invalidAddress',
      });
    });

    it('rejects ERC721 token address with allowAcknowledge', async () => {
      mockGetTokenStandardAndDetailsByChain.mockResolvedValue({
        standard: 'ERC721',
      });

      expect(
        await validateEvmHexAddress(
          '0x1234567890123456789012345678901234567890',
          '0x1',
        ),
      ).toEqual({
        error: 'tokenContractError',
        allowAcknowledge: true,
      });

      expect(mockGetTokenStandardAndDetailsByChain).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        undefined,
        undefined,
        '0x1',
      );
    });

    it('rejects ERC20 token address with allowAcknowledge', async () => {
      mockGetTokenStandardAndDetailsByChain.mockResolvedValue({
        standard: 'ERC20',
      });

      expect(
        await validateEvmHexAddress(
          '0x1234567890123456789012345678901234567890',
          '0x1',
        ),
      ).toEqual({
        error: 'tokenContractError',
        allowAcknowledge: true,
      });
    });
  });
});
