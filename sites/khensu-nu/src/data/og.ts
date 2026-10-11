// Link-preview cards, one per page on khensu.nu and dev.khensu.nu. `tools/og.sh` screenshots /og/<slug>/ to
// public/og/<slug>.jpg (1200 x 630), the size Meta (Instagram, Facebook, WhatsApp), iMessage and X all crop well.
// `bg` fills the card; `product` sits on the right instead.
export type Card = { title: string; em?: string; line: string; bg?: string; product?: string; alt: string };

const EARTH = '/khensu/hero/earth.jpg';
const SHIELD_ALT = 'suñůlink.shield in solid brass with the khensu.ñü mark inlaid in stone and platinum, over Earth wrapped in the khensu.ñü network';

export const CARDS: Record<string, Card> = {
  home: { title: 'khensu.ñü', em: 'webË, private by design.', line: 'Post-quantum. Run profitably by the people.', bg: EARTH, product: '/khensu/renders/og-maroon.png', alt: 'suñůlink.shield in maroon titanium with the ñü.isheru stone inlay, over Earth at night wrapped in the khensu.ñü network' },
  webe: { title: 'webË', em: 'A people-run internet.', line: 'Names, sites, feeds, payments and contracts, post-quantum and run by the people.', bg: EARTH, alt: 'The webË network wrapped around Earth at night' },
  media: { title: 'ñü.media', em: 'Same look, a fraction of the bits.', line: 'Photos and video measured against JPEG, HEIC, H.264, HEVC and AV1.', bg: '/khensu/codec/compare-720p.jpg', screen: '/khensu/creators/compare-nu.webp', alt: 'ñü.media against H.264 at the same bitrate' },
  quality: { title: 'How we measure', em: 'Check every number.', line: 'The tests behind ñü.media, with public tools you can run yourself.', bg: '/khensu/codec/compare-aurora.jpg', alt: 'An aurora clip compared across codecs' },
  memory: { title: 'Memory', em: 'Your private AI.', line: 'It learns what you’re looking forward to, on your device. No tracking, ever.', bg: EARTH, product: '/khensu/memory/phone_burgundy.webp', alt: 'iPhone showing khensu.ñü Memory planning a sailing trip in Greece' },
  creators: { title: 'For creators', em: 'You own everything.', line: 'Your rights, your fans, and $10 per 1,000 plays with no cut.', bg: '/khensu/creators/hero.webp', screen: '/khensu/creators/fans-1080.webp', alt: 'A creator performing, streamed in 1080p with ñü.media on khensu.ñü' },
  nufi: { title: 'ñüFi', em: 'Private money, post-quantum.', line: 'Pay, save and send in the shielded pool. No one sees the amount or who.', bg: EARTH, alt: 'ñüFi private payments on khensu.ñü' },
  network: { title: 'The network', em: 'A gift to everyone.', line: 'Freedom, privacy and a basic income. Contracts for any work and nodes paid for real jobs.', bg: EARTH, alt: 'The khensu.ñü network wrapped around Earth at night' },
  shield: { title: 'suñůlink.shield', em: '4.7 mm. 74 g titanium.', line: 'khensu.ñü’s network-profitable, post-quantum encrypted stealth transceiver.', bg: EARTH, product: '/khensu/renders/og-brass.png', alt: SHIELD_ALT },
  buy: { title: 'suñůlink.shield', em: 'Made in Morocco.', line: 'Titanium or solid brass, with the khensu.ñü mark inlaid flush in stone and platinum.', bg: EARTH, product: '/khensu/renders/og-brass.png', alt: SHIELD_ALT },
  transfer: { title: 'Private transfer', em: 'Send 4K privately, free.', line: 'Native resolution, end to end. Against Dropbox and Aspera.', bg: '/khensu/codec/compare-nasa4k.jpg', alt: 'A 4K clip sent with khensu.ñü private transfer' },
  app: { title: 'khensu.ñü', em: 'For iPhone, iPad and Mac.', line: 'Messages, calls, feeds and payments, post-quantum.', bg: EARTH, product: '/khensu/renders/og-maroon.png', alt: 'khensu.ñü on iPhone with suñůlink.shield' },
  privacy: { title: 'Privacy', em: 'Nothing to collect.', line: 'No accounts on servers, no cookies, no tracking, no data to sell.', bg: EARTH, alt: 'The khensu.ñü mark over Earth at night' },
  security: { title: 'Security', em: 'Nothing to read.', line: 'Post-quantum encryption, a five-hop mixnet, and no server that can read anything.', bg: EARTH, alt: 'khensu.ñü security, over Earth at night' },
  compliance: { title: 'Compliance', em: 'GDPR and every major privacy law.', line: 'Nothing on servers to request, breach or hand over. FIPS 203 and 204, CNSA 2.0.', bg: EARTH, alt: 'khensu.ñü privacy law and standards compliance' },
  'dev-index': { title: 'Developers', em: 'Build on webË.', line: 'Specs, repositories and the post-quantum stack behind khensu.ñü.', bg: EARTH, alt: 'khensu.ñü developers' },
  'dev-architecture': { title: 'Architecture', em: 'How khensu.ñü works.', line: 'MLS with ML-KEM-1024, a mixnet, and a network run by people.', bg: EARTH, alt: 'khensu.ñü architecture' },
  'dev-webe': { title: 'webË', em: 'The specification.', line: 'Names, sites, feeds, contracts and network work, version 1.0.', bg: EARTH, alt: 'The webË specification' },
  'dev-contracts': { title: 'Contracts', em: 'Any work, any reward.', line: 'Private, self-enforcing agreements, proved with STARKs, settled in the shielded pool.', bg: EARTH, alt: 'Writing webË contracts' },
  'dev-work': { title: 'Earn with your node', em: 'Six jobs, paid in receipts.', line: 'Proofs, storage, renditions, private lookups, randomness and mesh bridging.', bg: EARTH, alt: 'The jobs a khensu.ñü node does for the network' },
  'dev-node': { title: 'Run a node', em: 'Get paid for real work.', line: 'Mac or Raspberry Pi 5: mixnet, mailbox and call relay.', bg: EARTH, alt: 'Run a khensu.ñü node' },
  'dev-shell': { title: 'suñůlink.shield', em: 'Open hardware.', line: 'Specs, CAD and radio for khensu.ñü’s stealth transceiver.', bg: EARTH, product: '/khensu/renders/og-brass.png', alt: SHIELD_ALT },
  'dev-security': { title: 'Security', em: 'Post-quantum only.', line: 'ML-KEM-1024 and ML-DSA-87, no classical fallback. GDPR by design.', bg: EARTH, alt: 'khensu.ñü security' },
  'dev-repositories': { title: 'Repositories', em: 'Open source.', line: 'Apache-2.0 core, AGPL-3.0 apps, node and chain.', bg: EARTH, alt: 'khensu.ñü repositories and licences' },
  'dev-contribute': { title: 'Contribute', em: 'Code and consensus.', line: 'Pull requests for code, governance for the network’s rules.', bg: EARTH, alt: 'Contribute to khensu.ñü' },
  'dev-specs': { title: 'Specifications', em: 'Every protocol, public.', line: 'webË, the protocol, the threat model, network work and compliance.', bg: EARTH, alt: 'khensu.ñü specifications' },
};

export const cardFor = (path: string, prefix = '') => {
  const parts = path.replace(/^\/|\/$/g, '').split('/');
  const slug = prefix + (parts[0] || 'index');
  const key = slug === 'index' ? 'home' : slug;
  return CARDS[key] ? key : prefix ? `${prefix}index` : 'home';
};
