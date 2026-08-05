import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toHex } from '@metamask/controller-utils';
import { useNftsCollections } from '../../../../../hooks/useNftsCollections';
import {
  getIsMainnet,
  getUseNftDetection,
  getNftIsStillFetchingIndication,
  getPreferences,
} from '../../../../../selectors';
import { Box, Icon, IconName, IconSize } from '../../../../component-library';
import NFTsDetectionNoticeNFTsTab from '../nfts-detection-notice-nfts-tab/nfts-detection-notice-nfts-tab';
import { endTrace, TraceName } from '../../../../../../shared/lib/trace';
import { useNfts } from '../../../../../hooks/useNfts';
import { NFT } from '../../../../multichain/asset-picker-amount/asset-picker-modal/types';
import { ASSET_ROUTE } from '../../../../../helpers/constants/routes';
import NftGrid from '../nft-grid/nft-grid';
import { sortAssets } from '../../util/sort';
import { NftEmptyState } from '../nft-empty-state';
import { showImportNftsModal } from '../../../../../store/actions';
import { useI18nContext } from '../../../../../hooks/useI18nContext';

// TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31860
// eslint-disable-next-line @typescript-eslint/naming-convention
export default function NftsTab() {
  const dispatch = useDispatch();
  const t = useI18nContext();
  const navigate = useNavigate();
  const useNftDetection = useSelector(getUseNftDetection);
  const isMainnet = useSelector(getIsMainnet);
  const { privacyMode } = useSelector(getPreferences);
  const nftsStillFetchingIndication = useSelector(
    getNftIsStillFetchingIndication,
  );

  const { collections } = useNftsCollections();

  const { currentlyOwnedNfts, previouslyOwnedNfts } = useNfts();

  const hasAnyNfts = Object.keys(collections).length > 0;

  useEffect(() => {
    if (!nftsStillFetchingIndication) {
      endTrace({ name: TraceName.AccountOverviewNftsTab });
    }
  }, [nftsStillFetchingIndication]);

  const handleNftClick = (nft: NFT) => {
    navigate(
      `${ASSET_ROUTE}/${toHex(nft.chainId)}/${nft.address}/${nft.tokenId}`,
    );
  };

  const handleImportNfts = useCallback(() => {
    dispatch(showImportNftsModal({}));
  }, [dispatch]);

  const sortedNfts = sortAssets(currentlyOwnedNfts, {
    key: 'collection.name',
    order: 'asc',
    sortCallback: 'alphaNumeric',
  });

  return (
    <>
      <Box className="nfts-tab">
        {isMainnet && !useNftDetection ? (
          <Box paddingTop={4} paddingInlineStart={4} paddingInlineEnd={4}>
            <NFTsDetectionNoticeNFTsTab />
          </Box>
        ) : null}
        {hasAnyNfts || previouslyOwnedNfts.length > 0 ? (
          <Box>
            <NftGrid
              nfts={sortedNfts}
              handleNftClick={handleNftClick}
              privacyMode={privacyMode}
            />
          </Box>
        ) : (
          <NftEmptyState
            className="mx-auto mt-5 mb-6"
            showImportButton={false}
          />
        )}
        <div className="asset-import-footer">
          <button
            type="button"
            className="asset-import-footer__button"
            data-testid="importNfts-button-bottom"
            onClick={handleImportNfts}
          >
            <Icon name={IconName.Add} size={IconSize.Sm} />
            <span>{t('importNFT')}</span>
          </button>
        </div>
      </Box>
    </>
  );
}
