import ConfirmationNetworkSwitch from '../../../pages/confirmations/confirmation/components/confirmation-network-switch';
import { SmartTransactionStatusPage } from '../../../pages/smart-transactions/smart-transaction-status-page';
import {
  AvatarIcon,
  BannerAlert,
  FormTextField,
  Text,
} from '../../component-library';
import { AccountListItem } from '../../multichain/account-list-item';
import ActionableMessage from '../../ui/actionable-message/actionable-message';
import Box from '../../ui/box';
import Button from '../../ui/button';
import Chip from '../../ui/chip';
import DefinitionList from '../../ui/definition-list';
import Preloader from '../../ui/icon/preloader';
import OriginPill from '../../ui/origin-pill/origin-pill';
import Popover from '../../ui/popover';
import Spinner from '../../ui/spinner';
import TextField from '../../ui/text-field';
import TextArea from '../../ui/textarea/textarea';
import Tooltip from '../../ui/tooltip/tooltip';
import TruncatedDefinitionList from '../../ui/truncated-definition-list';
import Typography from '../../ui/typography';
import UrlIcon from '../../ui/url-icon';
import {
  ConfirmInfoRow,
  ConfirmInfoRowAddress,
  ConfirmInfoRowValueDouble,
} from '../confirm/info/row';
import MetaMaskTranslation from '../metamask-translation';
import { Skeleton } from '../../component-library/skeleton';
import { DefiReferralConsent } from '../../../pages/core/defi-referral-consent';
import { Delineator } from '../../ui/delineator';

export const safeComponentList = {
  a: 'a',
  AccountListItem,
  ActionableMessage,
  AvatarIcon,
  b: 'b',
  BannerAlert,
  Box,
  Button,
  Chip,
  ConfirmationNetworkSwitch,
  ConfirmInfoRow,
  ConfirmInfoRowAddress,
  ConfirmInfoRowValueDouble,
  DefiReferralConsent,
  DefinitionList,
  div: 'div',
  FormTextField,
  i: 'i',
  MetaMaskTranslation,
  OriginPill,
  p: 'p',
  Popover,
  Preloader,
  span: 'span',
  Spinner,
  Skeleton,
  Text,
  TextArea,
  TextField,
  Tooltip,
  TruncatedDefinitionList,
  Typography,
  SmartTransactionStatusPage,
  UrlIcon,
  Delineator,
};
