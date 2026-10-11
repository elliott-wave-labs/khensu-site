// Link-preview cards, one per page on khensu.nu and dev.khensu.nu. `tools/og.sh` screenshots /og/<slug>/ to
// public/og/<slug>.jpg (1200 x 630). `bg` fills the card; `product` sits on the right instead.
export type Card = { title: string; em?: string; line: string; bg?: string; product?: string; alt: string };

export const CARDS: Record<string, Card> = {
  home: { title: 'khensu.nu', line: 'webË, private by design. Post-quantum. Run profitably by the people.', bg: '/khensu/hero/earth.jpg', alt: 'The khensu.nu logo over Earth at night, wrapped in a glowing network' },
  buy: { title: 'suñůlink.shield', em: 'Pre-order. Made in Morocco.', line: 'khensu.nu’s network-profitable, post-quantum encrypted stealth transceiver.', bg: '/khensu/hero/earth.jpg', product: '/khensu/shell/assembled_black_brass.png', alt: 'suñůlink.shield in brass on the back of an iPhone, over Earth wrapped in the khensu.nu network' },
  shield: { title: 'suñůlink.shield', line: 'khensu.nu’s network-profitable, post-quantum encrypted stealth transceiver.', bg: '/khensu/hero/earth.jpg', product: '/khensu/shell/assembled_black_brass.png', alt: 'suñůlink.shield in brass on the back of an iPhone, over Earth wrapped in the khensu.nu network' },
  media: { title: 'nu-media', em: 'Every number, measured.', line: 'Photos and video against JPEG, HEIC, H.264, HEVC and AV1.', bg: '/khensu/hero/earth.jpg', alt: 'The khensu.nu logo over Earth at night, wrapped in a glowing network' },
  app: { title: 'khensu.nu', em: 'For iPhone, iPad and Mac.', line: 'Messages, calls, feeds and payments, post-quantum.', bg: '/khensu/hero/earth.jpg', alt: 'The khensu.nu logo over Earth at night' },
  privacy: { title: 'Privacy', em: 'Nothing to collect.', line: 'No accounts on servers, no tracking, no data to sell.', bg: '/khensu/hero/earth.jpg', alt: 'The khensu.nu logo over Earth at night' },
  'dev-index': { title: 'Developers', em: 'Build on webË.', line: 'Specs, repositories and the post-quantum stack behind khensu.nu.', bg: '/khensu/hero/earth.jpg', alt: 'khensu.nu developers' },
  'dev-architecture': { title: 'Architecture', em: 'How khensu.nu works.', line: 'MLS with ML-KEM-1024, a mixnet, and a network run by people.', bg: '/khensu/hero/earth.jpg', alt: 'khensu.nu architecture' },
  'dev-security': { title: 'Security', em: 'Post-quantum only.', line: 'ML-KEM-1024 and ML-DSA-87, with no classical fallback.', bg: '/khensu/hero/earth.jpg', alt: 'khensu.nu security' },
  'dev-webe': { title: 'webË', em: 'A new network, alongside the internet.', line: 'Names, sites, feeds and post-quantum web contracts.', bg: '/khensu/hero/earth.jpg', alt: 'The webË specification' },
  'dev-node': { title: 'Run a node', em: 'Get paid for real work.', line: 'Mac or Raspberry Pi 5: mixnet, mailbox and call relay.', bg: '/khensu/hero/earth.jpg', alt: 'Run a khensu.nu node' },
  'dev-shell': { title: 'suñůlink.shield', em: 'Open hardware.', line: 'khensu.nu’s network-profitable, post-quantum encrypted stealth transceiver.', bg: '/khensu/hero/earth.jpg', product: '/khensu/shell/assembled_black_brass.png', alt: 'suñůlink.shield in brass over Earth wrapped in the khensu.nu network' },
  'dev-repositories': { title: 'Repositories', em: 'Open source.', line: 'Apache-2.0 core, AGPL-3.0 apps, node and chain.', bg: '/khensu/hero/earth.jpg', alt: 'khensu.nu repositories and licences' },
  'dev-contribute': { title: 'Contribute', em: 'Code and consensus.', line: 'Pull requests for code, governance for the network’s rules.', bg: '/khensu/hero/earth.jpg', alt: 'Contribute to khensu.nu' },
};

export const cardFor = (path: string, prefix = '') => {
  const slug = prefix + (path.replace(/^\/|\/$/g, '') || 'index');
  const key = slug === 'index' ? 'home' : slug;
  return CARDS[key] ? key : prefix ? `${prefix}index` : 'home';
};
