export function canAccessFeature(tier: string, feature: 'hooks' | 'image-gen'): boolean {
  return tier === 'tier2'
}