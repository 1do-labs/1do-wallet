import { useCallback } from 'react';

import { useSendContext } from '../../context/send';

export const useSnapAmountOnInput = () => {
  const { value } = useSendContext();

  const validateAmountWithSnap = useCallback(
    async (amount: string) => {
      return {
        valid: false,
        errors: amount || value ? [{ code: 'Invalid' }] : [],
      };
    },
    [value],
  );

  return { validateAmountWithSnap };
};
