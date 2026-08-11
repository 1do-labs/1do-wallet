import log from 'loglevel';
import {
  getErrorMessage as _getErrorMessage,
  hasProperty,
  isObject,
  isErrorWithMessage,
} from '@metamask/utils';

export { isErrorWithMessage } from '@metamask/utils';

/**
 * Attempts to obtain the message from a possible error object, defaulting to an
 * empty string if it is impossible to do so.
 *
 * @param error - The possible error to get the message from.
 * @returns The message if `error` is an object with a `message` property;
 * the string version of `error` if it is not `undefined` or `null`; otherwise
 * an empty string.
 */
// TODO: Remove completely once changes implemented in @metamask/utils
export function getErrorMessage(error: unknown): string {
  return isErrorWithMessage(error) &&
    hasProperty(error, 'cause') &&
    isObject(error.cause) &&
    hasProperty(error.cause, 'message') &&
    typeof error.cause.message === 'string'
    ? error.cause.message
    : _getErrorMessage(error);
}

export function logErrorWithMessage(error: unknown) {
  log.error(isErrorWithMessage(error) ? getErrorMessage(error) : error);
}

/**
 * Creates an error instance with a readable message and cause.
 *
 * @param message - The message to create the error with.
 * @param cause - The cause of the error.
 * @returns The created error.
 */
export function createDiagnosticError(message: string, cause: unknown): Error {
  const error = new Error(message) as Error & { cause: unknown };
  error.cause = cause;
  return error;
}

/**
 * Creates an error instance from a network request response.
 *
 * @param response - The response from the network request.
 * @param errorPrefix - The prefix to add to the error message.
 * @returns The created error.
 */
export async function createErrorFromNetworkRequest(
  response: Response,
  errorPrefix?: string,
): Promise<Error> {
  const contentType = response.headers?.get('content-type');
  const statusCode = response.status;
  const networkErrorMessagePrefix = errorPrefix ? `${errorPrefix}: ` : '';

  try {
    if (contentType?.includes('application/json')) {
      const json = await response.json();
      const errorMessage = json?.error ?? json?.message ?? 'Unknown error';
      const networkError = `${networkErrorMessagePrefix}error: ${errorMessage}, statusCode: ${statusCode}`;
      return new Error(networkError);
    } else if (contentType?.includes('text/plain')) {
      const text = await response.text();
      const networkError = `${networkErrorMessagePrefix} error: ${text}, statusCode: ${statusCode}`;
      return new Error(networkError);
    }

    const error =
      'data' in response && typeof response.data === 'string'
        ? response.data
        : 'Unknown error';
    const networkError = `${networkErrorMessagePrefix} error: ${error}, statusCode: ${statusCode}`;
    return new Error(networkError);
  } catch {
    return new Error(`${networkErrorMessagePrefix} HTTP ${statusCode} error`);
  }
}
