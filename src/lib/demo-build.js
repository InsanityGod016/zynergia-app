export function isLocalDemoBuild({ mode, flag, ci }) {
  return mode === 'demo' && flag === 'true' && !ci;
}

export function isLocalReviewBuild({ mode, flag, ci }) {
  return mode === 'review' && flag === 'true' && !ci;
}
