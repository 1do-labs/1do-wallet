import { createModuleLogger, createProjectLogger } from '@metamask/utils';

const projectLogger = createProjectLogger('error-reporting');

export const localErrorLogger = createModuleLogger(
  projectLogger,
  globalThis.document ? 'ui' : 'background',
);

export function captureException(exception: unknown, hint?: unknown): void {
  console.error(exception, ...(hint ? [hint] : []));
}

export function captureMessage(message: string, context?: unknown): void {
  console.log(message, ...(context ? [context] : []));
}
