// Link-preview cards, one per page on khensu.nu and dev.khensu.nu. `tools/og.sh` screenshots /og/<slug>/ to
// public/og/<slug>.jpg (1200 x 630), the size Meta (Instagram, Facebook, WhatsApp), iMessage and X all crop well,
// and the square ones (1080 x 1080) for Instagram link pages and posts. `bg` fills the card; `product` sits on the
// right instead. `note` is a small sentence under the line (the materials); `foot` are small bold footnotes.
// `thumb` cards carry only the phone and a few big words, for the tiny thumbnails next to a link.
// The marketing cards spell the names out in full: kħėñšü.ñü, šûñüłîñk.šħîēłð, ñü.îšħẽřü.
export type Card = {
  title: string;
  em?: string;
  line: string;
  note?: string;
  foot?: string[];
  bg?: string;
  product?: string;
  screen?: string;
  alt: string;
  thumb?: boolean;
};

const EARTH = '/khensu/hero/earth.jpg';
const SHIELD_ALT = 'suñůlink.shield in solid brass on an iPhone 18 Pro, the ñü.isheru in stone and platinum, over Earth wrapped in the khėnsu.ñü network';
const SHIELD_NOTE =
  'Ceramic powder-coated titanium or anti-microbial pure brass¹. Set with the ñü.îšħẽřü gemstone, platinum, and a laser-etched pyrite hexagon, mirror of the Triangulum constellation.';
const SHIELD_FOOT = [
  '¹ Both rust-proof for immunity on bluewater sails, weekend-warrior ready, and power hacker user.',
  '² CNC’d to add 0 mm to your actual phone thickness, based on the camera bump.',
];

export const CARDS: Record<string, Card> = {
  home: { title: 'khėnsu.ñü', em: 'webË, private by design.', line: 'Post-quantum. Run by the people. suñůlink.shield, set with the ñü.isheru.', bg: EARTH, product: '/khensu/renders/og-brass.png', alt: SHIELD_ALT },
  webe: { title: 'webË', em: 'A people-run internet.', line: 'Names, sites, feeds, payments and contracts, post-quantum and run by the people.', bg: EARTH, alt: 'The webË network wrapped around Earth at night' },
  void: { title: 'ñü.vœîð', em: '64 KiB chunks. One key each.', line: 'Eight copies, no file names, and a footer inside the ciphertext. A wrong key opens nothing.', bg: EARTH, alt: 'ñü.vœîð, stealth storage on khėnsu.ñü' },
  media: { title: 'ñü.media', em: 'Same look, a fraction of the bits.', line: 'Photos and video measured against JPEG, HEIC, H.264, HEVC and AV1.', bg: '/khensu/codec/compare-720p.jpg', screen: '/khensu/creators/compare-nu.webp', alt: 'ñü.media against H.264 at the same bitrate' },
  moments: { title: 'ñü.mømëntš', em: 'Templates. Beat sync. On your device.', line: 'A creator editor for stories and carousels. Nobody else sees your clips.', bg: '/khensu/creators/hero.webp', screen: '/khensu/creators/fans-1080.webp', alt: 'ñü.mømëntš, the on-device template and video editor on khėnsu.ñü' },
  quality: { title: 'How we measure', em: 'Check every number.', line: 'The tests behind ñü.media, with public tools you can run yourself.', bg: '/khensu/codec/compare-aurora.jpg', alt: 'An aurora clip compared across codecs' },
  memory: { title: 'ñü.řåł', em: 'Your private AI.', line: 'It learns what you’re looking forward to, on your device. No tracking, ever.', bg: EARTH, product: '/khensu/memory/phone_burgundy.webp', alt: 'iPhone showing khėnsu.ñü ñü.řåł planning a sailing trip in Greece' },
  creators: { title: 'ñü.ċřêæțẽ', em: 'You own everything.', line: 'Your rights, your fans, and $10 per 1,000 plays with no cut.', bg: EARTH, product: '/khensu/renders/phone-front.webp', alt: 'ñü.ċřêæțẽ on khėnsu.ñü over Earth and Indra\'s Net' },
  waves: { title: 'ñü.ŵævẽš', em: 'Every instrument, where it belongs.', line: 'Stereo becomes objects you can drag around you. Switch to the original or Opus 5.1 any time.', bg: EARTH, product: '/khensu/renders/og-brass.png', alt: 'ñü.ŵævẽš spatial audio on khėnsu.ñü, instruments placed around you over Earth' },
  nufi: { title: 'ñũ.Fî', em: 'A basic income first.', line: 'Creators paid for every view, nodes for every job. Private, with no cut.', bg: EARTH, alt: 'ñũ.Fî private payments on khėnsu.ñü' },
  bi: { title: 'ñũ.Bî', em: 'A basic income, paid by the network.', line: 'Node operators paid for real work at one worldwide rate, and an equal share for every person next.', bg: EARTH, alt: 'ñũ.Bî, the ñü basic income, over Earth wrapped in the khėnsu.ñü network' },
  network: { title: 'The network', em: 'A gift to everyone.', line: 'Freedom, privacy and a basic income. Contracts for any work and nodes paid for real jobs.', bg: EARTH, alt: 'The khėnsu.ñü network wrapped around Earth at night' },
  shield: { title: 'šûñüłîñk.šħîēłð', em: 'made in morocco.', line: 'post-quantum E2EE stealth transceiver shield²', note: SHIELD_NOTE, foot: SHIELD_FOOT, bg: EARTH, product: '/khensu/renders/og-brass.png', alt: SHIELD_ALT },
  buy: { title: 'šûñüłîñk.šħîēłð', em: 'made in morocco.', line: 'post-quantum E2EE stealth transceiver shield²', note: SHIELD_NOTE, foot: SHIELD_FOOT, bg: EARTH, product: '/khensu/renders/og-brass.png', alt: SHIELD_ALT },
  thumb: { title: 'šûñüłîñk.šħîēłð', line: 'post-quantum E2EE stealth transceiver shield node', product: '/khensu/renders/og-brass.png', alt: SHIELD_ALT, thumb: true },
  transfer: { title: 'Private transfer', em: 'Send 4K privately, free.', line: 'Native resolution, end to end. Against Dropbox and Aspera.', bg: '/khensu/codec/compare-nasa4k.jpg', alt: 'A 4K clip sent with khėnsu.ñü private transfer' },
  app: { title: 'khėnsu.ñü', em: 'For iPhone, iPad and Mac.', line: 'Messages, calls, feeds and payments, post-quantum.', bg: EARTH, product: '/khensu/renders/og-maroon.png', alt: 'khėnsu.ñü on iPhone with suñůlink.shield' },
  privacy: { title: 'Privacy', em: 'Nothing to collect.', line: 'No accounts on servers, no cookies, no tracking, no data to sell.', bg: EARTH, alt: 'The khėnsu.ñü mark over Earth at night' },
  security: { title: 'Security', em: 'Nothing to read.', line: 'Post-quantum encryption, a five-hop mixnet, and no server that can read anything.', bg: EARTH, alt: 'khėnsu.ñü security, over Earth at night' },
  compliance: { title: 'Compliance', em: 'GDPR and every major privacy law.', line: 'Nothing on servers to request, breach or hand over. FIPS 203 and 204, CNSA 2.0.', bg: EARTH, alt: 'khėnsu.ñü privacy law and standards compliance' },
  indra: { title: 'îňðřæ.ōġ', em: 'The card that moves in Messages.', line: 'Indra’s Net over Earth. Chakra climb Root to Crown. Direct MP4 beside every still.', bg: EARTH, alt: 'îňðřæ.ōġ — Indra’s Net and chakra morph over Earth on khėnsu.ñü' },
  avatars: { title: 'ñü.ævätåřş', em: 'Style on device. Stream smaller.', line: 'Ink, toon, pixel, glass — packed by nu.media over nu.network. Ready for AR.', bg: EARTH, alt: 'ñü.ævätåřş on-device style filters on khėnsu.ñü' },
  aura: {
    title: 'ñü.åůřâ',
    em: 'First show. Venice → N/U.',
    line: '$444 sets · $44k gem cuts · diamond $4.4m · moldavite $44m (three only). Quiet sensing as jewelry.',
    bg: EARTH,
    product: '/khensu/aura/legacy.aura.jpg',
    alt: 'ñü.åůřâ — Elliott’s first fashion show on khėnsu.ñü, legacy Aura reel from Venice Beach',
  },
  eyes: {
    title: 'ñü.êýêš',
    em: 'Clear glass. Button for the sun.',
    line: '4K cams, jawbone, EEG. Same chips as the shield. Part of nu.devices.',
    bg: EARTH,
    alt: 'ñü.êýêš clear autodim glasses on khėnsu.ñü',
  },
  devices: {
    title: 'nu.devices',
    em: 'Wear the set.',
    line: 'Glasses, ears, ring, brooch, necklace, bracelet, shield. Cost + labour + 10%. Recycle.',
    bg: EARTH,
    alt: 'nu.devices wearable set on khėnsu.ñü',
  },
  vegan: {
    title: 'nu.vegan',
    em: 'Plant only.',
    line: 'Elliott’s dishes and drinks. Don’t forget to compost :-)',
    bg: EARTH,
    alt: 'nu.vegan kitchen on khėnsu.ñü',
  },
  sla: { title: 'SLA', em: '100% uptime.', line: 'Dead-man\'s switch on. Activated 14 October 2026, 2:22 pm, Venice CA. We did it.', bg: EARTH, alt: 'khėnsu.ñü SLA: 100% uptime and dead-man\'s switch' },
  'dev-index': { title: 'Developers', em: 'Build on webË.', line: 'Specs, repositories and the post-quantum stack behind khėnsu.ñü.', bg: EARTH, alt: 'khėnsu.ñü developers' },
  'dev-architecture': { title: 'Architecture', em: 'How khėnsu.ñü works.', line: 'MLS with ML-KEM-1024, a mixnet, and a network run by people.', bg: EARTH, alt: 'khėnsu.ñü architecture' },
  'dev-webe': { title: 'webË', em: 'The specification.', line: 'Names, sites, feeds, contracts and network work, version 1.0.', bg: EARTH, alt: 'The webË specification' },
  'dev-contracts': { title: 'Contracts', em: 'Any work, any reward.', line: 'Private, self-enforcing agreements, proved with STARKs, settled in the shielded pool.', bg: EARTH, alt: 'Writing webË contracts' },
  'dev-work': { title: 'Earn with your node', em: 'Six jobs, paid in receipts.', line: 'Proofs, storage, renditions, private lookups, randomness and mesh bridging.', bg: EARTH, alt: 'The jobs a khėnsu.ñü node does for the network' },
  'dev-node': { title: 'Run a node', em: 'Get paid for real work.', line: 'Mac or Raspberry Pi 5: mixnet, mailbox and call relay.', bg: EARTH, alt: 'Run a khėnsu.ñü node' },
  'dev-shell': { title: 'suñůlink.shield', em: 'Open hardware.', line: 'Specs, CAD and radio for khėnsu.ñü’s stealth transceiver.', bg: EARTH, product: '/khensu/renders/og-brass.png', alt: SHIELD_ALT },
  'dev-security': { title: 'Security', em: 'Post-quantum only.', line: 'ML-KEM-1024 and ML-DSA-87, no classical fallback. GDPR by design.', bg: EARTH, alt: 'khėnsu.ñü security' },
  'dev-repositories': { title: 'Repositories', em: 'Open source.', line: 'Apache-2.0 core, AGPL-3.0 apps, node and chain.', bg: EARTH, alt: 'khėnsu.ñü repositories and licences' },
  'dev-contribute': { title: 'Contribute', em: 'Code and consensus.', line: 'Pull requests for code, governance for the network’s rules.', bg: EARTH, alt: 'Contribute to khėnsu.ñü' },
  'dev-specs': { title: 'Specifications', em: 'Every protocol, public.', line: 'webË, the protocol, the threat model, network work and compliance.', bg: EARTH, alt: 'khėnsu.ñü specifications' },
};

// Animated cards (tools/og-anim.sh): square HEVC as nu:preview; landscape H.264 as og:video
// (Apple Messages, Android, and clients that ignore HEVC). WEBE.md 7.1 / design/indra.md.
// Bytes and hashes are written by tools/og-anim.sh so clients can check what they fetch.
export const PREVIEWS: Record<string, { bytes: number; hash: string; duration: number; wideBytes?: number; wideHash?: string }> = {
  home: {
    bytes: 2857046,
    hash: "sha-256=fea78d73e87182a3ef0f013af8952dd67ac977fdbe800b9c0bf5403b517d6182",
    duration: 4,
    wideBytes: 3670940,
    wideHash: "sha-256=eeed704eb3be72fe0db11d33e1e16505ee03586f95c7f1b17fd438b236cf8b70"
  },
  buy: {
    bytes: 3350813,
    hash: "sha-256=8dd3733d21e396d063da2a058cfb85609eef12e0762a780bcc125088cf1e5457",
    duration: 4,
    wideBytes: 3816001,
    wideHash: "sha-256=a68f7fd69e8ffc30f0a504fb61d762c25d441dd66f9457159a7e7387cced0b81"
  },
  thumb: {
    bytes: 2878670,
    hash: "sha-256=20b4a080630516d37cc3dd90a1c2d2a0213d213d87b3b787f3f610a47a63944a",
    duration: 4
  },
  creators: {
    bytes: 2800495,
    hash: "sha-256=125bc286593ecd87b391db595ead9a1a805f185ad93ff1d45a9ec8328399b7ce",
    duration: 4,
    wideBytes: 3667482,
    wideHash: "sha-256=366f6cd54d07107ba6fd7ccdb44879a0a7b06fc6e66325c340b7a6bcc25aedd2"
  },
  waves: {
    bytes: 764849,
    hash: "sha-256=0742872f77903d105d843d5572d2d93251da4ab142de40d23f342859e035fa3d",
    duration: 4,
    wideBytes: 572979,
    wideHash: "sha-256=6e365667def7e5d01caaa383d56b7e3355698e565cfcc38c8d265bffcf95d124"
  },
  indra: {
    bytes: 765777,
    hash: "sha-256=8f4eebe3bb347511cc725ba3d9b29e3f399b1ac875ea614530e50b5a500404fc",
    duration: 4,
    wideBytes: 572447,
    wideHash: "sha-256=420d4b9c7191e943cfd667b42610480903294ea2ac0cfdd19a4268ed7321c724"
  }
};
// The shield pages share the buy card's animation.
export const previewFor = (card: string) =>
  card === 'shield' || card === 'dev-shell' ? 'buy' : card === 'avatars' ? 'home' : card in PREVIEWS ? card : undefined;

export const cardFor = (path: string, prefix = '') => {
  const parts = path.replace(/^\/|\/$/g, '').split('/');
  const slug = prefix + (parts[0] || 'index');
  // /sounds redirects to nu.waves; share its card and Indra preview.
  const key = slug === 'index' ? 'home' : slug === 'sounds' ? 'waves' : slug;
  return CARDS[key] ? key : prefix ? `${prefix}index` : 'home';
};
