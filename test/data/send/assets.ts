export const EVM_ASSET = {
  id: 'evm-account-id',
  address: '0xeDd1935e28b253C7905Cf5a944f0B5830FFA916a',
  chainId: 5,
  metadata: {},
  symbol: 'NEU',
  decimals: 0,
  rawBalanceHex: '0x5',
};

export const EVM_NATIVE_ASSET = {
  address: '0x0000000000000000000000000000000000000000',
  assetId: 'eip155:11155111/slip44:60',
  chainId: 5,
  decimals: 18,
  iconUrl: '',
  name: 'Ether',
  symbol: 'ETH',
  isNative: true,
  rawBalanceHex: '0x5',
};

export const MOCK_NFT1155 = {
  address: '0x4B3E2eD66631FE2dE488CB0c23eF3A91A41601f7',
  chainId: 8453,
  description:
    "Unlock early access to the 'Doodleverse (Draw Me Closer)' music video on Doodlesᵗᵛ with this exclusive pack. Each pack includes a premiere pass and one of three rarities of digital album art, celebrating the video’s premiere.",
  favorite: false,
  image: 'ipfs://QmY783gjv6wcX44G3qB2G8rJQAJ63hFi7ZwGeTTVVMrCrm',
  isCurrentlyOwned: true,
  logo: undefined,
  name: 'Doodleverse (Draw Me Closer) Pack',
  standard: 'ERC1155',
  tokenId: '17',
  tokenURI:
    'https://dweb.link/ipfs/QmQD4h1Dkkn75ZKSFXDtmW6kehpCkckStRazCdUgp7m9g1',
  balance: '5',
};

export const MOCK_NFT721 = {
  address: '0x4B3E2eD66631FE2dE488CB0c23eF3A91A41601f7',
  chainId: 8453,
  description:
    "Unlock early access to the 'Doodleverse (Draw Me Closer)' music video on Doodlesᵗᵛ with this exclusive pack. Each pack includes a premiere pass and one of three rarities of digital album art, celebrating the video’s premiere.",
  favorite: false,
  image: 'ipfs://QmY783gjv6wcX44G3qB2G8rJQAJ63hFi7ZwGeTTVVMrCrm',
  isCurrentlyOwned: true,
  logo: undefined,
  name: 'Doodleverse (Draw Me Closer) Pack',
  standard: 'ERC721',
  tokenId: '17',
  tokenURI:
    'https://dweb.link/ipfs/QmQD4h1Dkkn75ZKSFXDtmW6kehpCkckStRazCdUgp7m9g1',
};
