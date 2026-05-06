import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getFromChain,
  getBridgeQuotes,
  getFromAccount,
} from '../../ducks/bridge/selectors';
import { setTxAlerts } from '../../ducks/bridge/actions';

/**
 * Sets tx alerts for the active quote
 */
export const useTxAlerts = () => {
  const dispatch = useDispatch();

  const fromChain = useSelector(getFromChain);
  const { activeQuote } = useSelector(getBridgeQuotes);
  const { trade } = activeQuote ?? {};
  const account = useSelector(getFromAccount);
  const abortController = useRef<AbortController | null>(new AbortController());

  useEffect(() => {
    return () => {
      abortController.current?.abort();
      abortController.current = null;
    };
  }, []);

  useEffect(() => {
    // Cancel any ongoing request
    abortController.current?.abort();
    dispatch(setTxAlerts(null));
  }, [trade, fromChain?.chainId, account?.address]);
};
