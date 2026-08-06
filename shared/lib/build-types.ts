export function isMain() {
  return process.env.METAMASK_BUILD_TYPE === 'main';
}

export function isBeta() {
  return process.env.METAMASK_BUILD_TYPE === 'beta';
}

export function isExperimental() {
  return process.env.METAMASK_BUILD_TYPE === 'experimental';
}

export function isFlask() {
  return process.env.METAMASK_BUILD_TYPE === 'flask';
}
