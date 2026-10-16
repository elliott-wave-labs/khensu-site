// Product hosts. Nav and in-page links use these; page files still live under sites/khensu-nu
// until each host is wired on the load balancer. nu.Fi is fi.khensu.nu (not nufi).
export const PRODUCTS = {
  webe: 'https://webe.khensu.nu',
  void: 'https://void.khensu.nu',
  media: 'https://media.khensu.nu',
  // Apex until Hover has moments.khensu.nu A → sites LB and product_hosts is re-enabled.
  moments: 'https://khensu.nu/moments',
  memory: 'https://memory.khensu.nu',
  create: 'https://create.khensu.nu',
  waves: 'https://waves.khensu.nu',
  fi: 'https://fi.khensu.nu',
  bi: 'https://bi.khensu.nu',
  shield: 'https://shield.khensu.nu',
  network: 'https://network.khensu.nu',
  sla: 'https://sla.khensu.nu',
  // Own-cert hosts (dig A → 34.107.228.246 verified 15 Oct 2026).
  avatars: 'https://avatars.khensu.nu',
  indra: 'https://indra.og.khensu.nu',
  /** Install hub — nu:get.apps.khensu.nu (never /apps). Apex /app redirects here once host SSL is ACTIVE. */
  getApps: 'https://get.apps.khensu.nu',
  /** Kronos — harness + OT one page. Apex until Hover A + own_certificate ACTIVE. */
  kronos: 'https://khensu.nu/kronos',
  /** @deprecated use PRODUCTS.kronos — kept as aliases */
  skillsAgent: 'https://khensu.nu/kronos',
  skillsAgentHarness: 'https://khensu.nu/kronos#nu-harness',
  skillsWeeklyUpdates: 'https://khensu.nu/kronos#nu-ot-222',
  skillsMusicTheory: 'https://khensu.nu/skills-music-theory',
  /** nu.glass — Quantum × Liquid Glass. Apex until Hover A + own_certificate ACTIVE. */
  nuGlass: 'https://khensu.nu/design-quantumglass',
  /** ñü.åůřâ — fashion house. Apex until own_certificate CN matches aura.khensu.nu. */
  aura: 'https://khensu.nu/aura',
  /** ñü.êýêš — glasses. Apex until Hover A + own_certificate ACTIVE. */
  eyes: 'https://khensu.nu/eyes',
  /** nu.devices — wearable set. Apex until Hover A + own_certificate ACTIVE. */
  devices: 'https://khensu.nu/devices',
  /** nu.vegan — kitchen. Apex until Hover A + own_certificate ACTIVE. */
  vegan: 'https://khensu.nu/vegan',
} as const;

/** Old path on khensu.nu → product URL (no trailing slash). */
export const PATH_TO_PRODUCT: Record<string, string> = {
  '/webe': PRODUCTS.webe,
  '/void': PRODUCTS.void,
  '/media': PRODUCTS.media,
  '/moments': PRODUCTS.moments,
  '/memory': PRODUCTS.memory,
  '/creators': PRODUCTS.create,
  '/waves': PRODUCTS.waves,
  '/sounds': PRODUCTS.waves,
  '/nufi': PRODUCTS.fi,
  '/bi': PRODUCTS.bi,
  '/shield': PRODUCTS.shield,
  '/network': PRODUCTS.network,
  '/sla': PRODUCTS.sla,
  '/deadman': PRODUCTS.sla,
  '/avatars': PRODUCTS.avatars,
  '/indra': PRODUCTS.indra,
  '/app': PRODUCTS.getApps,
  '/apps': PRODUCTS.getApps,
  '/kronos': PRODUCTS.kronos,
  '/skills-agent': PRODUCTS.kronos,
  '/skills-agent-harness': PRODUCTS.skillsAgentHarness,
  '/skills-agent-weekly': PRODUCTS.skillsWeeklyUpdates,
  '/skills-music-theory': PRODUCTS.skillsMusicTheory,
  '/design-quantumglass': PRODUCTS.nuGlass,
  '/aura': PRODUCTS.aura,
  '/eyes': PRODUCTS.eyes,
  '/devices': PRODUCTS.devices,
  '/vegan': PRODUCTS.vegan,
};
