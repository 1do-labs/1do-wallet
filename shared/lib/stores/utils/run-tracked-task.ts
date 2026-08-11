export async function runTrackedTask<Return>(
  _taskName: string,
  fn: () => Promise<Return>,
): Promise<Return> {
  return fn();
}
