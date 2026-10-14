// Product hosts. Nav and in-page links use these; page files still live under sites/khensu-nu
// until each host is wired on the load balancer. nu.Fi is fi.khensu.nu (not nufi).
export const PRODUCTS = {
  webe: 'https://webe.khensu.nu',
  void: 'https://void.khensu.nu',
  media: 'https://media.khensu.nu',
  memory: 'https://memory.khensu.nu',
  create: 'https://create.khensu.nu',
  waves: 'https://waves.khensu.nu',
  fi: 'https://fi.khensu.nu',
  bi: 'https://bi.khensu.nu',
  shield: 'https://shield.khensu.nu',
  network: 'https://network.khensu.nu',
} as const;

/** Old path on khensu.nu → product URL (no trailing slash). */
export const PATH_TO_PRODUCT: Record<string, string> = {
  '/webe': PRODUCTS.webe,
  '/void': PRODUCTS.void,
  '/media': PRODUCTS.media,
  '/memory': PRODUCTS.memory,
  '/creators': PRODUCTS.create,
  '/waves': PRODUCTS.waves,
  '/sounds': PRODUCTS.waves,
  '/nufi': PRODUCTS.fi,
  '/bi': PRODUCTS.bi,
  '/shield': PRODUCTS.shield,
  '/network': PRODUCTS.network,
};
