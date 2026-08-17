import log from 'loglevel';
import { valuesFor } from './util';

export default function txHelper(
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31973
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unapprovedTxs: Record<string, any> | null,

  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31973
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  personalMsgs: Record<string, any> | null,

  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31973
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typedMessages: Record<string, any> | null,
  chainId?: string,

  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31973
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  log.debug('tx-helper called with params:');
  log.debug({
    unapprovedTxs,
    personalMsgs,
    typedMessages,
    chainId,
  });

  const txValues = chainId
    ? valuesFor(unapprovedTxs).filter((txMeta) => txMeta.chainId === chainId)
    : valuesFor(unapprovedTxs);

  const personalValues = valuesFor(personalMsgs);
  const typedValues = valuesFor(typedMessages);

  const allValues = txValues
    .concat(personalValues)
    .concat(typedValues)
    .sort((a, b) => {
      return a.time - b.time;
    });

  log.debug(`tx helper found ${txValues.length} unapproved txs`);
  log.debug(
    `tx helper found ${personalValues.length} unsigned personal messages`,
  );
  log.debug(`tx helper found ${typedValues.length} unsigned typed messages`);

  return allValues;
}
