import { AddressBookController } from '@metamask/address-book-controller';
import { createDeepEqualSelector } from '../../shared/lib/selectors/selector-creators';
import { isEqualCaseInsensitive } from '../../shared/lib/string-utils';

/**
 * The MetaMask state for the address book controller.
 */
export type AddressBookMetaMaskState = {
  metamask: {
    addressBook: AddressBookController['state']['addressBook'];
  };
};

export const getFullAddressBook = (state: AddressBookMetaMaskState) =>
  state.metamask.addressBook;

export const getMemoizedFullAddressBook = createDeepEqualSelector(
  [getFullAddressBook],
  (addressBook) => addressBook,
);

export const getAddressBookByNetwork = createDeepEqualSelector(
  [
    getMemoizedFullAddressBook,
    (_state: AddressBookMetaMaskState, chainId: `0x${string}`) => chainId,
  ],
  (addressBook, chainId) => {
    if (!addressBook[chainId]) {
      return [];
    }
    return Object.values(addressBook[chainId]);
  },
);

export const getAddressBookEntryByNetwork = createDeepEqualSelector(
  [
    (
      state: AddressBookMetaMaskState,
      _address: string,
      chainId: `0x${string}`,
    ) => getAddressBookByNetwork(state, chainId),
    (_state, address) => address,
  ],
  (addressBook, address) => {
    return addressBook.find((contact) =>
      isEqualCaseInsensitive(contact.address, address),
    );
  },
);
