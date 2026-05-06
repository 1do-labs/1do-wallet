import { useSelector } from 'react-redux';
import {
  selectIsMetamaskNotificationsEnabled,
  selectIsFeatureAnnouncementsEnabled,
  getFeatureAnnouncementsReadCount,
  getFeatureAnnouncementsUnreadCount,
  getOnChainMetamaskNotificationsReadCount,
  getOnChainMetamaskNotificationsUnreadCount,
} from '../../selectors/metamask-notifications/metamask-notifications';

const useFeatureAnnouncementCount = () => {
  const isFeatureAnnouncementsEnabled = useSelector(
    selectIsFeatureAnnouncementsEnabled,
  );

  const featureAnnouncementsUnreadCount = useSelector(
    getFeatureAnnouncementsUnreadCount,
  );

  const featureAnnouncementsReadCount = useSelector(
    getFeatureAnnouncementsReadCount,
  );

  return isFeatureAnnouncementsEnabled
    ? { featureAnnouncementsUnreadCount, featureAnnouncementsReadCount }
    : { featureAnnouncementsUnreadCount: 0, featureAnnouncementsReadCount: 0 };
};

const useWalletNotificationCount = () => {
  const isMetamaskNotificationsEnabled = useSelector(
    selectIsMetamaskNotificationsEnabled,
  );

  const onChainMetamaskNotificationsUnreadCount = useSelector(
    getOnChainMetamaskNotificationsUnreadCount,
  );

  const onChainMetamaskNotificationsReadCount = useSelector(
    getOnChainMetamaskNotificationsReadCount,
  );

  return isMetamaskNotificationsEnabled
    ? {
        onChainMetamaskNotificationsUnreadCount,
        onChainMetamaskNotificationsReadCount,
      }
    : {
        onChainMetamaskNotificationsUnreadCount: 0,
        onChainMetamaskNotificationsReadCount: 0,
      };
};

export function useUnreadNotificationsCounter() {
  const { featureAnnouncementsUnreadCount } = useFeatureAnnouncementCount();
  const { onChainMetamaskNotificationsUnreadCount } =
    useWalletNotificationCount();

  const notificationsUnreadCount =
    featureAnnouncementsUnreadCount + onChainMetamaskNotificationsUnreadCount;

  return {
    notificationsUnreadCount,
  };
}

export function useReadNotificationsCounter() {
  const { featureAnnouncementsReadCount } = useFeatureAnnouncementCount();
  const { onChainMetamaskNotificationsReadCount } =
    useWalletNotificationCount();

  const notificationsReadCount =
    featureAnnouncementsReadCount + onChainMetamaskNotificationsReadCount;

  return {
    notificationsReadCount,
  };
}
