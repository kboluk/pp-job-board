export const normalizeTag = tag => {
  let normalizedTag = tag || []
  if (tag && typeof tag === 'string') normalizedTag = [tag]
  return normalizedTag
}
