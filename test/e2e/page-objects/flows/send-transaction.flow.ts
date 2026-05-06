import HomePage from '../pages/home/homepage';
import { Driver } from '../../webdriver/driver';
import TransactionConfirmation from '../pages/confirmations/transaction-confirmation';
import ActivityListPage from '../pages/home/activity-list';
import { createInternalTransaction } from './transaction';

/**
 * This function initiates the steps required to send a transaction from the homepage to final confirmation.
 *
 * @param params - An object containing the parameters.
 * @param params.driver - The webdriver instance.
 * @param params.recipientAddress - The recipient address.
 * @param params.amount - The amount of the asset to be sent in the transaction.
 */
export const sendRedesignedTransactionToAddress = async ({
  driver,
  recipientAddress,
  amount,
}: {
  driver: Driver;
  recipientAddress: string;
  amount: string;
}): Promise<void> => {
  console.log(
    `Start flow to send amount ${amount} to recipient ${recipientAddress} on home screen`,
  );

  await createInternalTransaction({
    driver,
    recipientAddress,
    amount,
  });

  // confirm transaction when user lands on confirm transaction screen
  const transactionConfirmationPage = new TransactionConfirmation(driver);
  await transactionConfirmationPage.clickFooterConfirmButton();
};

/**
 * This function initiates the steps required to send a transaction from the homepage to final confirmation.
 *
 * @param params - An object containing the parameters.
 * @param params.driver - The webdriver instance.
 * @param params.recipientAccount - The recipient account.
 * @param params.amount - The amount of the asset to be sent in the transaction.
 */
export const sendRedesignedTransactionToAccount = async ({
  driver,
  recipientAccount,
  amount,
}: {
  driver: Driver;
  recipientAccount: string;
  amount: string;
}): Promise<void> => {
  console.log(
    `Start flow to send amount ${amount} to recipient account ${recipientAccount} on home screen`,
  );
  await createInternalTransaction({
    driver,
    recipientName: recipientAccount,
    amount,
  });

  // confirm transaction when user lands on confirm transaction screen
  const transactionConfirmationPage = new TransactionConfirmation(driver);
  await transactionConfirmationPage.clickFooterConfirmButton();
};

export const validateTransaction = async (driver: Driver, quantity: string) => {
  const homePage = new HomePage(driver);
  await homePage.goToActivityList();
  const activityList = new ActivityListPage(driver);
  await activityList.checkConfirmedTxNumberDisplayedInActivity(1);

  await activityList.checkTxAction({ action: 'Sent' });
  await activityList.checkTxAmountInActivity(`${quantity} ETH`, 1);
};
