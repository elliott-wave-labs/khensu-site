// Product hosts. Nav, footer product links and canonicals always use the subdomain
// (https://safety.khensu.nu), never https://khensu.nu/<page>. A missing A record is a Hover
// request (A → 34.107.228.246, no AAAA), not a reason to fall back to an apex path.
// New hosts use own_certificate = true. Never join the shared products pack on day one.
export const PRODUCTS = {
  // nocap and postcap serve the same page (/khensu-nu/nocap), with no redirect between them: separate links for
  // marketing. Both Hover A → 34.107.228.246 verified 4 Nov 2026.
  nocap: 'https://nocap.khensu.nu',
  postcap: 'https://postcap.khensu.nu',
  feed: 'https://feed.khensu.nu',
  vegan: 'https://vegan.khensu.nu',
  mirrora: 'https://mirrora.khensu.nu',
  webe: 'https://webe.khensu.nu',
  void: 'https://void.khensu.nu',
  media: 'https://media.khensu.nu',
  moments: 'https://moments.khensu.nu',
  memory: 'https://memory.khensu.nu',
  create: 'https://create.khensu.nu',
  waves: 'https://waves.khensu.nu',
  // nu.universes (header i.verse, part of nu.waves). iverse.khensu.nu is the main host; universes, rabbithole and
  // portal.khensu.nu open the same page; inverse.khensu.nu 301s to iverse (autocorrect typo). Cert
  // moqom-aura-iverse-khensu-nu-2 (Hover A verified 21 Oct 2026; inverse added 23 Oct).
  universes: 'https://iverse.khensu.nu',
  // nu.e.u. Nav, footer and canonical are the subdomain. Apex /nueu still serves the page.
  // u, neue, new and nu 301 there. Never the shared products pack.
  nueu: 'https://nueu.khensu.nu',
  fi: 'https://fi.khensu.nu',
  bi: 'https://bi.khensu.nu',
  shield: 'https://shield.khensu.nu',
  network: 'https://network.khensu.nu',
  sla: 'https://sla.khensu.nu',
  avatars: 'https://avatars.khensu.nu',
  indra: 'https://indra.og.khensu.nu',
  getApps: 'https://get.apps.khensu.nu',
  kronos: 'https://kronos.khensu.nu',
  /** @deprecated use PRODUCTS.kronos — kept as aliases */
  skillsAgent: 'https://kronos.khensu.nu',
  skillsAgentHarness: 'https://kronos.khensu.nu#nu-harness',
  skillsWeeklyUpdates: 'https://kronos.khensu.nu#nu-ot-222',
  skillsMusicTheory: 'https://skills.music.theory.khensu.nu',
  nuGlass: 'https://design.quantumglass.khensu.nu',
  // ŒĄ.ÑÜ fashion house. Nav label ŒA/aura. Main host oea.khensu.nu (dig A verified
  // 25 Oct 2026). aura.khensu.nu 301s here. Own cert moqom-oea-aura-iverse-khensu-nu
  // (oea added to the aura/iverse SAN; never the shared products pack).
  oea: 'https://oea.khensu.nu',
  aura: 'https://oea.khensu.nu',
  eyes: 'https://eyes.khensu.nu',
  devices: 'https://devices.khensu.nu',
  // Both hosts are on the moments SAN and already serve these pages. Nav and footer
  // use the subdomain. Apex /compliance and /security stay up as fallbacks.
  compliance: 'https://compliance.khensu.nu',
  security: 'https://security.khensu.nu',
  safety: 'https://safety.khensu.nu',
  // Help Us: join the foundation. Apex /help serves the page until help.khensu.nu has
  // its Hover A record and own cert.
  help: 'https://help.khensu.nu',
} as const;

/** Old path on khensu.nu → product URL (no trailing slash). */
export const PATH_TO_PRODUCT: Record<string, string> = {
  '/nocap': PRODUCTS.nocap,
  '/vegan': PRODUCTS.vegan,
  '/mirrora': PRODUCTS.mirrora,
  '/webe': PRODUCTS.webe,
  '/void': PRODUCTS.void,
  '/media': PRODUCTS.media,
  '/moments': PRODUCTS.moments,
  '/memory': PRODUCTS.memory,
  '/creators': PRODUCTS.create,
  '/waves': PRODUCTS.waves,
  '/universes': PRODUCTS.universes,
  '/nueu': PRODUCTS.nueu,
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
  '/aura': PRODUCTS.oea,
  '/oea': PRODUCTS.oea,
  '/eyes': PRODUCTS.eyes,
  '/devices': PRODUCTS.devices,
  '/compliance': PRODUCTS.compliance,
  '/security': PRODUCTS.security,
  '/safety': PRODUCTS.safety,
  '/help': PRODUCTS.help,
};
