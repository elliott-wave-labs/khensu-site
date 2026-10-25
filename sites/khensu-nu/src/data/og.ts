import sectionSpecs from './og-sections.json';

// Link-preview cards, one per page on khensu.nu and dev.khensu.nu. `tools/og.sh` screenshots /og/<slug>/ to
// public/og/<slug>.jpg (1200 x 630), the size Meta (Instagram, Facebook, WhatsApp), iMessage and X all crop well,
// and the square ones (1080 x 1080) for Instagram link pages and posts. `bg` fills the card; `product` sits on the
// right instead; only the home and shield cards carry the phone. `note` is a small sentence under the line (the materials); `foot` are small bold footnotes.
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
  webe: { title: 'webË', em: 'A people-run internet.', line: 'Names, sites, feeds, payments and contracts, post-quantum and run by the people.', bg: EARTH, alt: 'iMessage leaking a text as a spike on the wire, then the same send as one 2-second beat on webË with suñůlink.shield' },
  void: { title: 'ñü.vœîð', em: '64 KiB chunks. One key each.', line: 'Eight copies, no file names, and a footer inside the ciphertext. A wrong key opens nothing.', bg: EARTH, alt: 'ñü.vœîð, stealth storage on khėnsu.ñü' },
  media: { title: 'ñü.media', em: 'Same look, a fraction of the bits.', line: 'Photos and video measured against JPEG, HEIC, H.264, HEVC and AV1.', bg: '/khensu/codec/compare-720p.jpg', alt: 'ñü.media against H.264 at the same bitrate' },
  moments: { title: 'ñü.mømëntš', em: 'Picture pulse. On your device.', line: 'Your shots share one wash and morph as the colour walks. Nobody else sees your clips.', bg: '/khensu/creators/hero.webp', alt: 'ñü.mømëntš picture pulse: stills morph under one wash, green to purple to blue to yellow' },
  quality: { title: 'How we measure', em: 'Check every number.', line: 'The tests behind ñü.media, with public tools you can run yourself.', bg: '/khensu/codec/compare-aurora.jpg', alt: 'An aurora clip compared across codecs' },
  memory: { title: 'ñü.řåł', em: 'Your private AI.', line: 'It learns what you’re looking forward to, on your device. No tracking, ever.', bg: EARTH, alt: 'ñü.řåł, the private on-device AI on khėnsu.ñü, over Earth at night' },
  creators: { title: 'ñü.ċřêæțẽ', em: 'You own everything.', line: 'Your rights, your fans, and $10 per 1,000 plays with no cut.', bg: EARTH, alt: '100% to creators, then the Burst numbers 100%, 42¢ and <1¢ on ñü.ċřêæțẽ' },
  waves: { title: 'ñü.ŵævẽš', em: 'Every instrument, where it belongs.', line: 'Stereo becomes objects you can drag around you. Switch to the original or Opus 5.1 any time.', bg: EARTH, alt: 'ñü.ŵævẽš spatial audio on khėnsu.ñü, instruments placed around you over Earth' },
  nueu: {
    title: 'nu.e.u',
    em: 'The chart, on this device.',
    line: 'Natal, transits, bonds, the solar return and the planetary hours. Birth data stays in the browser.',
    bg: EARTH,
    alt: 'nu.e.u, the enneagram on a dark chart, birth data kept in the browser',
  },
  universes: {
    title: 'nu.universes',
    em: 'Google Earth for the universe.',
    line: 'Fly from Earth to the cosmic web at real distances. NASA, ESA and 2MASS catalogues, in nu.waves.',
    bg: '/universes/m33-1800.webp',
    alt: 'nu.universes: the M33 Triangulum Galaxy in the Hubble mosaic, at its real distance on the 3D map',
  },
  'all-healing-tones': {
    title: 'All healing tones (3D)',
    em: '10 sounds in the 3D spacetime bubble™.',
    line: '528 · 432 · 396 Hz Solfeggio singing bowls and all 7 Root → Crown planetary chakra tones, generated live on your device.',
    bg: EARTH,
    alt: 'All 10 healing tones and Solfeggio singing bowls orbiting inside the 3D spacetime bubble on waves.khensu.nu',
  },
  'all-chakras-3d': {
    title: 'All 7 chakra tones (3D)',
    em: 'Root → Crown in the 3D spacetime bubble™.',
    line: 'Seven planetary chakra tones from Root (194.18 Hz) below you to Crown (172.06 Hz) above, generated on your device.',
    bg: EARTH,
    alt: 'All 7 planetary chakra tones orbiting inside the 3D spacetime bubble on waves.khensu.nu',
  },
  nufi: { title: 'ñũ.Fî', em: 'A basic income first.', line: 'Creators paid for every view, nodes for every job. Private, with no cut.', bg: EARTH, alt: 'ñũ.Fî private payments on khėnsu.ñü' },
  bi: { title: 'ñũ.Bî', em: 'Paid by the network.', line: 'One worldwide rate for real work. An equal share for every person is in research.', bg: EARTH, alt: 'ñũ.Bî over Earth: a basic income, paid by the network, Indra’s net turning' },
  network: { title: 'The network', em: 'A gift to everyone.', line: 'Freedom, privacy and a basic income. Contracts for any work and nodes paid for real jobs.', bg: EARTH, alt: 'The khėnsu.ñü network wrapped around Earth at night' },
  shield: { title: 'šûñüłîñk.šħîēłð', em: 'made in morocco.', line: 'post-quantum E2EE stealth transceiver shield²', note: SHIELD_NOTE, foot: SHIELD_FOOT, bg: EARTH, product: '/khensu/renders/og-brass.png', alt: SHIELD_ALT },
  buy: { title: 'šûñüłîñk.šħîēłð', em: 'made in morocco.', line: 'post-quantum E2EE stealth transceiver shield²', note: SHIELD_NOTE, foot: SHIELD_FOOT, bg: EARTH, product: '/khensu/renders/og-brass.png', alt: SHIELD_ALT },
  thumb: { title: 'šûñüłîñk.šħîēłð', line: 'post-quantum E2EE stealth transceiver shield node', product: '/khensu/renders/og-brass.png', alt: SHIELD_ALT, thumb: true },
  transfer: { title: 'Private transfer', em: 'Send 4K privately, free.', line: 'Native resolution, end to end. Against Dropbox and Aspera.', bg: '/khensu/codec/compare-nasa4k.jpg', alt: 'A 4K clip sent with khėnsu.ñü private transfer' },
  app: { title: 'khėnsu.ñü', em: 'For iPhone, iPad and Mac.', line: 'Messages, calls, feeds and payments, post-quantum.', bg: EARTH, alt: 'khėnsu.ñü for iPhone, iPad and Mac over Earth at night' },
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
  mirrora: {
    title: 'mîřrørå',
    em: 'Elliott’s Mirror.',
    line: 'Many dimensions, one instance. A generic object with many pointers — each an atman, the same atman.',
    bg: EARTH,
    alt: 'mîřrørå — Elliott’s Mirror, quantum mirror theory on khėnsu.ñü',
  },
  sla: { title: 'SLA', em: '100% uptime.', line: 'Dead-man\'s switch on. Activated 14 October 2026, 2:22 pm, Venice CA. We did it.', bg: EARTH, alt: 'khėnsu.ñü SLA: 100% uptime and dead-man\'s switch' },
  kronos: {
    title: 'Kronos',
    em: 'harness × OT · one breath.',
    line: 'Agent brain + partner. Pair-locked nu.harness × nu.ot.222. Always-live HTTPS, publish now, dead-man’s switch.',
    bg: EARTH,
    alt: 'Kronos — agent brain and pair-locked nu.harness × nu.ot.222 on khėnsu.ñü',
  },
  'design-quantumglass': {
    title: 'nu.glass',
    em: 'Quantum × Liquid Glass.',
    line: 'See-through specular film, rim refraction and clear number-light bubble explosion.',
    bg: EARTH,
    alt: 'nu.glass — Quantum × Liquid Glass design system on khėnsu.ñü',
  },
  'skills-music-theory': {
    title: 'skills.music.theory',
    em: 'Hear the note, write the pattern.',
    line: 'Music theory as live code for nu.waves, nu.media and ñü.řåł — animated notes, intervals, chords and 3D stems.',
    bg: EARTH,
    alt: 'skills.music.theory — live-coded music theory on khėnsu.ñü',
  },
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

export type SectionSpec = {
  slug: string;
  page: 'bi' | 'create' | 'safety';
  anchor: string;
  route: boolean;
  render: boolean;
  card?: string;
  title: string;
  description: string;
  cardTitle: string;
  em: string;
  line: string;
  alt: string;
  eyebrow: string;
  beats: string[];
  kind: string;
  accent: number[];
  foot: string;
  figures?: string[];
};

export const SECTIONS = sectionSpecs as SectionSpec[];

for (const s of SECTIONS) {
  if (s.card || CARDS[s.slug]) continue;
  CARDS[s.slug] = { title: s.cardTitle, em: s.em, line: s.line, alt: s.alt, bg: EARTH };
}

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
    bytes: 3695159,
    hash: 'sha-256=ebe55119c3771a75f40f2d2ec25f25af80c3a8bb24ca284277195d8b1f1bc66e',
    duration: 4,
    wideBytes: 2821809,
    wideHash: 'sha-256=786ddddd046bfb384fefdbb22a8a628fc1f6c036ff424ccff4a3e18513400b09',
  },
  waves: {
    bytes: 764849,
    hash: "sha-256=0742872f77903d105d843d5572d2d93251da4ab142de40d23f342859e035fa3d",
    duration: 4,
    wideBytes: 572979,
    wideHash: "sha-256=6e365667def7e5d01caaa383d56b7e3355698e565cfcc38c8d265bffcf95d124"
  },
  "all-healing-tones": {
    bytes: 912180,
    hash: "sha-256=afea7b8af063f9ca1504380e6cfd282bb0ba5afa7adcf2b468c273cdd4e83b8d",
    duration: 4,
    wideBytes: 808617,
    wideHash: "sha-256=2387bdb8b91c744a7acfaad3a023e6a1be5346ba93c92b4371987199bdcfd902"
  },
  "all-chakras-3d": {
    bytes: 879237,
    hash: "sha-256=063df50dc790f7ec3f96da2e339c0eea366cb08e6ae555cc8c82d0c686fa7b23",
    duration: 4,
    wideBytes: 762468,
    wideHash: "sha-256=0241a27d7dbc0334be200f848559f4f45970ca738dc96e6a71f536fe05995eaa"
  },
  indra: {
    bytes: 765777,
    hash: "sha-256=8f4eebe3bb347511cc725ba3d9b29e3f399b1ac875ea614530e50b5a500404fc",
    duration: 4,
    wideBytes: 572447,
    wideHash: "sha-256=420d4b9c7191e943cfd667b42610480903294ea2ac0cfdd19a4268ed7321c724"
  },
  aura: {
    bytes: 474805,
    hash: 'sha-256=b14d9d6df51d61d95e206cd490e798a0fbe9704196d9840e705b2ebb03c6b43d',
    duration: 3,
    wideBytes: 332666,
    wideHash: 'sha-256=479d09dedad7707bba8adad1bd8d4bef1fee9b9800a6795ac289ef7c792ec4a9',
  },
  avatars: {
    bytes: 386449,
    hash: 'sha-256=5352149acb4813d0a816b4231cae04723afc68aafa0ba250b11e4ae5474382d8',
    duration: 3,
    wideBytes: 274273,
    wideHash: 'sha-256=c9e2e7346f2e6011bfe3b490499f7451547696226bde433d5d5495e977d31d53',
  },
  bi: {
    bytes: 337640,
    hash: 'sha-256=7e07731d5dd23788ee728b377e5b4e27f5de83c3c7f355613d4b6d99f2a46a18',
    duration: 3,
    wideBytes: 581368,
    wideHash: 'sha-256=c9336744a4bb1b245f8948e040774197af7e4b8c7f30375feb350a047218e34e',
  },
  devices: {
    bytes: 428045,
    hash: 'sha-256=bc4cbdb2720483c50d2fe5e47830ba47fec3382754cffdd709e5a9c4c3237fda',
    duration: 3,
    wideBytes: 310865,
    wideHash: 'sha-256=abe84da5c58d0ef5667bc2688b181a2dc32f362fecc6d2a6cf150151eb3fcb17',
  },
  eyes: {
    bytes: 423075,
    hash: 'sha-256=1625a5d304b898db7b102955718fd4335b6f9fa59f3356d47b900ebd56f9e783',
    duration: 3,
    wideBytes: 311094,
    wideHash: 'sha-256=f20b5cb9cd14a4d1f5465a2adf742afb40938fd602a79bc8b897129ed0f592d5',
  },
  nufi: {
    bytes: 432765,
    hash: 'sha-256=400bb4716e4580d75d74ca1501abb3067411d2c30bea4b6dd954b4efdbd01694',
    duration: 3,
    wideBytes: 309768,
    wideHash: 'sha-256=547125ccc3eff12ce36bf299058abcaf56bf18d3c51d7a6dd7d01288876818a8',
  },
  app: {
    bytes: 440643,
    hash: 'sha-256=48764df7666e9395d87d823894346b8f521ac51c13a6c8266b71a1f5211d698c',
    duration: 3,
    wideBytes: 304716,
    wideHash: 'sha-256=7a14019cb38dbe53f48f5d495cd78b6525aa1c4b2d343aeed27baa240bbeb5c1',
  },
  'design-quantumglass': {
    bytes: 435974,
    hash: 'sha-256=4623e4a11a9f17b192da0b44db7321c60021222430d33328f61d22496a045777',
    duration: 3,
    wideBytes: 301865,
    wideHash: 'sha-256=c25e2e34f1626b076c048aba68c7b236787d56b2c25b245728755dd1111c7b12',
  },
  kronos: {
    bytes: 420170,
    hash: 'sha-256=e6e91b3ff3904b626009cd43f7c59cfebda49d51cbd5d3e1513a15f2114890e0',
    duration: 3,
    wideBytes: 297126,
    wideHash: 'sha-256=76ea646e80732fcaa90ec6f77c455a019248940312db24b12fed77b8380dca5d',
  },
  media: {
    bytes: 84550,
    hash: 'sha-256=cdb4542e27edefa3ae4ff7a6f409710c63c1b40dc11d995e9b99280f1d148354',
    duration: 3,
    wideBytes: 65272,
    wideHash: 'sha-256=9067baade547881c38bc67030efc9e642011d49ab89f0cc7fe843e926e73edb3',
  },
  memory: {
    bytes: 431058,
    hash: 'sha-256=d49edc7ea8fea1137586128324657c368400635d93defc06d45305586d4661f8',
    duration: 3,
    wideBytes: 298840,
    wideHash: 'sha-256=62f7cd204f95a17f2c1bceb5950f4cb320edf5a9ea7929532dbad8108f9798b9',
  },
  moments: {
    bytes: 1178068,
    hash: 'sha-256=3665aa31c214fee15056aaf93212e48bfe74638854d2ba38181654a8bc31cf6f',
    duration: 3,
    wideBytes: 1655209,
    wideHash: 'sha-256=c5313ea2d48072955eb6195b51a61dc3e136b21650732707b14b967f6bd29006',
  },
  network: {
    bytes: 432686,
    hash: 'sha-256=05538d7935c26b879271635f02e14b3bfbb8e374b1f9b0604d559d13afbb1591',
    duration: 3,
    wideBytes: 303879,
    wideHash: 'sha-256=2a769271322fc2d896f0c4470a894b878ef2105c300c44bf8c8a298858d253e8',
  },
  'skills-music-theory': {
    bytes: 409387,
    hash: 'sha-256=ad8aefe325e0c7b414249dca0e678a28a695b502b77c52ee03a19a6216cbaaa4',
    duration: 3,
    wideBytes: 290010,
    wideHash: 'sha-256=9b92b83faf28a208a411246ba6cc6276f0f03829e01d29285d1e969cf2cbb059',
  },
  sla: {
    bytes: 435218,
    hash: 'sha-256=69802bf81066e47ebd14c8176188d9ecc5acc144b78f2e10392393572090277b',
    duration: 3,
    wideBytes: 310991,
    wideHash: 'sha-256=414275704e83d963a63b2d4a0811d3137e35eac007c03c53bbba95317b435799',
  },
  vegan: {
    bytes: 429626,
    hash: 'sha-256=b307e15636f41d9c63a16d0c98f340a0cf8f02f7856e5cf1bb148be062310611',
    duration: 3,
    wideBytes: 303555,
    wideHash: 'sha-256=55e80aceec5fea2da917e68d7168a4af491f0c1b735610d13f72806c74688dff',
  },
  void: {
    bytes: 419155,
    hash: 'sha-256=e51af0bbe2aab3407772fdd2f1446491f4f8474906475765e4cf77cedcfe56bb',
    duration: 3,
    wideBytes: 293715,
    wideHash: 'sha-256=8a6b8281d3ebd0e82ed321e3d4d89b63bdef5aef42abf8c9729aaf173f14bfec',
  },
  webe: {
    bytes: 45851,
    hash: 'sha-256=9323d5b2fe3e8f19fe6587cdf44c9b313f28578e88e6deda1ddb3fbece5b3961',
    duration: 3,
    wideBytes: 33995,
    wideHash: 'sha-256=6361cef52bfac1badd70cc694b39284e500f8e45487e97ef85346ef43cb6f23b',
  },
  compliance: {
    bytes: 438834,
    hash: 'sha-256=3f8507bd9260098447ca837683cda289fc828ec008f38091ee173a6100b33cfd',
    duration: 3,
    wideBytes: 308863,
    wideHash: 'sha-256=a996035b54c900585ccbba3113d8e9da227863ec524dc9401e9a3c6914635f22',
  },
  security: {
    bytes: 443561,
    hash: 'sha-256=0b79a0673a2879ec1580c414700c89730dfff17ac46db61da182b69268cc6841',
    duration: 3,
    wideBytes: 307259,
    wideHash: 'sha-256=158c4f8ac00dd24a1a38ef0c62dc6c1a26c02bd946d761ce8a0e114b32f1b1dd',
  },
  universes: {
    bytes: 3601064,
    hash: 'sha-256=06b1ee5b29d44fa3992661afbc3e73875a203ec8757bf79ef364e367906e30f0',
    duration: 6,
    wideBytes: 3623875,
    wideHash: 'sha-256=0434930953e2bcf967d94b09bcf0009e57bddc8b85bbd44bf10a2c472b980881',
  },
  'bi-numbers': {
    bytes: 310516,
    hash: 'sha-256=f7a1841dc207108dd6821550fd755102a43eae756f43ccccde8f7020853f7a56',
    duration: 3,
    wideBytes: 556480,
    wideHash: 'sha-256=6004441c2651c1af8e7791066521efb0c92f784e57e10c464b09954e987e8b67',
  },
  'bi-scale': {
    bytes: 340994,
    hash: 'sha-256=ce09446ae2510b7fea898e6c1eb959b2ec83e7b127f62a350c12b5e565e1dea7',
    duration: 3,
    wideBytes: 581986,
    wideHash: 'sha-256=bf2d36a56bf4c6b60fba63f7a170b1ac32a4f62c7b46a326800d250d27e1afbb',
  },
  'bi-send': {
    bytes: 310148,
    hash: 'sha-256=24f728c047c18436153ba8305e1aa8997e7d2c0c3cd971db895bc0757fd42d29',
    duration: 3,
    wideBytes: 559122,
    wideHash: 'sha-256=9644d9748e69cc270e9257ff5bcacfccbc678d0407a80cf3be2155a143a70822',
  },
  'bi-tried': {
    bytes: 327072,
    hash: 'sha-256=e4a9687ad4afd2c2ff7c3b7bf76fb92eefc7dca7dd4a444743c85ce66e569af4',
    duration: 3,
    wideBytes: 566272,
    wideHash: 'sha-256=a7a14b9a0b013739f33d80e9fd05e60e3090b3b7db2f62c3bc5891a92f3c8726',
  },
  'bi-allies': {
    bytes: 330844,
    hash: 'sha-256=71e228f88dcfcabb5ecbb0257188a5ac38b1544d6ce6edc7d8e65e2dea415069',
    duration: 3,
    wideBytes: 577577,
    wideHash: 'sha-256=67cb8c4fd222a4549e30763623d089c604a4341fc33a51abbaf340928ad46e97',
  },
  'bi-stages': {
    bytes: 336215,
    hash: 'sha-256=a49fc54306fc4a742b57b203382c495aa45c017da924250cc6eb3da4e6cb583e',
    duration: 3,
    wideBytes: 582582,
    wideHash: 'sha-256=49eb7fa2c97405b7851f85771958110c763db7aefe164314be4f26ba8a56c2ed',
  },
  'bi-how': {
    bytes: 334575,
    hash: 'sha-256=308f7c755c7c2861ecfbaf1d066fd997daaa2ed0554d3aad50eba22cc1944000',
    duration: 3,
    wideBytes: 578835,
    wideHash: 'sha-256=3a63fcf30505a97dd5b1c782268ffed43564d040b6eb5300f52525128cd1a450',
  },
  'bi-fair': {
    bytes: 318532,
    hash: 'sha-256=d5143c3e2b9b0a14c9e1b75b1d9b35173f4622e6d47544746e685016276d46bc',
    duration: 3,
    wideBytes: 563277,
    wideHash: 'sha-256=6ef3d144e2865644885939445b8dbb2e54fb4139edfa0181d897c1e5998c184c',
  },
  'bi-sources': {
    bytes: 325173,
    hash: 'sha-256=7dbe1745455aed764e1ae69d25f2e9d46afb6d540e8ec3f7feb8d746348ba643',
    duration: 3,
    wideBytes: 566221,
    wideHash: 'sha-256=2cec7346d1240ef1f64f4b2c724ae5345d945d21953fbd5f4d0b923e89eb13d8',
  },
  'bi-safe': {
    bytes: 323721,
    hash: 'sha-256=63f26d6b01149c86a0b363f4b2afaa866f54dfd054687728d31b90634553df45',
    duration: 3,
    wideBytes: 589172,
    wideHash: 'sha-256=89701cc12bbb637b9d5ab1fc792c84a26ab1c263606ba7ec329f849e6d1d3d45',
  },
  'bi-governments': {
    bytes: 287353,
    hash: 'sha-256=71ed52670241fb5409a04f5b2afd8237191033ad2163cfe11b43267cc5347163',
    duration: 3,
    wideBytes: 539331,
    wideHash: 'sha-256=1c5bfb63bd8fe7b0fd196556de245207fcf52dd49039cf4bdd45bf1bf3c1c790',
  },
  'bi-thanks': {
    bytes: 321208,
    hash: 'sha-256=9f780bb1094399ead4106eefe17e0adacf8d550b2acba3c70b335b53ce71ca2e',
    duration: 3,
    wideBytes: 563957,
    wideHash: 'sha-256=58f71f98bfa6930e7509d710a3a8e74d544e070c6cf82deb1e4646ec8a160229',
  },
  'bi-status': {
    bytes: 326653,
    hash: 'sha-256=c6b8f60f7e65ebcda84fd761d7a69d2d5fc21105f839eecf14f373456506214b',
    duration: 3,
    wideBytes: 565713,
    wideHash: 'sha-256=61a823a0bc5be887ab2797468f31f6be2daf2b765922b12a6a90b7da5eb57808',
  },
  'create-hero': {
    bytes: 312190,
    hash: 'sha-256=f64ca12a4ef67151bdd9e542a953b09b615e07a11ba79df75afdfee59b246979',
    duration: 3,
    wideBytes: 582315,
    wideHash: 'sha-256=3bfa48b88f55139e5e9bbc7f45bfa82a161c164e67cff97c0bea671e279133bd',
  },
  'create-rights': {
    bytes: 246982,
    hash: 'sha-256=66a10c91205c0601bd8de928ff18e8f1c7c79db9c5295163001c39a645791dfa',
    duration: 3,
    wideBytes: 537211,
    wideHash: 'sha-256=7c62605355e934bf9d471c40e9efac9110f229b63eaf0e9ea90b9e956b5ada5d',
  },
  'create-pay': {
    bytes: 290589,
    hash: 'sha-256=fdee0f70107c97e004787319eb899889fe7845328e029f5938cad300027d314c',
    duration: 3,
    wideBytes: 571146,
    wideHash: 'sha-256=992cf01131ab34d789b799496bb462766f91bb6878f8cad4629cd30cd12b7e56',
  },
  'create-payouts': {
    bytes: 247208,
    hash: 'sha-256=84a3d640330aa6478bef4b2d08ef5b18b604b4576ba6e6390d02c7bf1623b16e',
    duration: 3,
    wideBytes: 547681,
    wideHash: 'sha-256=a1a97797a04a02e515b30bfd7b0e0af65e0a722907466d041600cb1ab21ed69c',
  },
  'create-fans': {
    bytes: 301054,
    hash: 'sha-256=9d57c79fb577c5f94f82434d96ea9c6f78d3e4e669fe97f40036b8cefd5b55ab',
    duration: 3,
    wideBytes: 585553,
    wideHash: 'sha-256=b1ae18e7d7865355113ba4ff700987c605499297c667d2af8e94f4489678eec2',
  },
  'create-data': {
    bytes: 317354,
    hash: 'sha-256=73fbca7bf46579cc656c6754a28d7fc8c15f4eb5a143d428713303253b55b6d3',
    duration: 3,
    wideBytes: 604545,
    wideHash: 'sha-256=7066d994da8e4292d4b5dde2dcb05e3e310e20707abe7f6a9477658236f4657e',
  },
  'create-sounds': {
    bytes: 339888,
    hash: 'sha-256=23e31bbf100634c4d165ec646918db6eaac76a3df8e186cd7e17810c469aa7d1',
    duration: 3,
    wideBytes: 578638,
    wideHash: 'sha-256=6402fd081f470758b5bc6a8a67a522718f081caddf04d979b560437815a488d4',
  },
  'create-old': {
    bytes: 323575,
    hash: 'sha-256=5472b5340302e8d15c228d65d6b0951b719cf60c38f6ff8ca219c5bbe7bcd2cc',
    duration: 3,
    wideBytes: 564651,
    wideHash: 'sha-256=4d91bdc78bb0c5328eb2114a2062fef0d82ea409fe76f8f3918f4e7e84d30eb0',
  },
  'create-back': {
    bytes: 322206,
    hash: 'sha-256=baf8ca7ab9cf6d0f1eb63434ad79b3df6cee779459564c5d7fc7b48f0f36824f',
    duration: 3,
    wideBytes: 574424,
    wideHash: 'sha-256=1e044ddfdc6dce1dde31aad9249505086b718e6546fe0cfb4afbf8b98c69ca80',
  },
  'create-econ': {
    bytes: 323590,
    hash: 'sha-256=5fd802c7c22cea68c8e5932a6eaa5997ce28b9a30ca21ba7b042c98c3b145b77',
    duration: 3,
    wideBytes: 599214,
    wideHash: 'sha-256=589aba722844f8f7b9ae431267dfc6cc21addb7dd2fda49de3cc93873673af34',
  },
  'create-start': {
    bytes: 288876,
    hash: 'sha-256=44ad93733d9bea130028be1aa9d5351b1cb67b800128ea9bbe8df62dfef15667',
    duration: 3,
    wideBytes: 579928,
    wideHash: 'sha-256=27c21b1894f2b926db68f1c65956306411b76e8f6061872400c0e5d2621a8be2',
  },
  'create-fine': {
    bytes: 316068,
    hash: 'sha-256=2e2f8d0f512174a218e736a44db4eba8eaf34c6fb7cbe2924b6adcb1100820cb',
    duration: 3,
    wideBytes: 593964,
    wideHash: 'sha-256=2e912905fda6d628673da356e71678e6230293627a6b21adbaffd3f8b7e78552',
  },
  safety: {
    bytes: 290469,
    hash: 'sha-256=5824138e989821b86c1606904be69872be80ee350fa3be67270d51fd8493f555',
    duration: 3,
    wideBytes: 596365,
    wideHash: 'sha-256=ef97c5e1f1db11424d43731485ce677be0f26cfa90c97388eaec00c3a4bb72f2',
  },
  'safety-nudity': {
    bytes: 291493,
    hash: 'sha-256=f0ff54674a2a61c5d20f1d5f4f3725fd4cd6bebd7269f1289e8d19842a174aa5',
    duration: 3,
    wideBytes: 597636,
    wideHash: 'sha-256=d2d0f05a73a3821d6a4bf70a9f9cdb1f760d398fb34a424ba4876675ade654ea',
  },
  'safety-hate': {
    bytes: 268475,
    hash: 'sha-256=540aecab3cfa702de472773a3e48fff08f3de48467eaa288f3cf64ba7bd925cc',
    duration: 3,
    wideBytes: 585823,
    wideHash: 'sha-256=1c042a8ff667b3587e24900f3c849fa4fcc208878360ba8e6af83b928082ab2f',
  },
  'safety-rule': {
    bytes: 283073,
    hash: 'sha-256=a556515c15610a4668ea126a140081aacdc13b74cd3b38a354f53dbfc74662f6',
    duration: 3,
    wideBytes: 544318,
    wideHash: 'sha-256=d8e291ba3a53f17233235755810e6183a9a01f290228954a3d750a812eff4a3a',
  },
  'safety-facts': {
    bytes: 257861,
    hash: 'sha-256=7c192ffaca9fb197ea54ec7b2af5808c10581c2d4fbac21baeab4d4af840ddf4',
    duration: 3,
    wideBytes: 546635,
    wideHash: 'sha-256=e8f8429e81828ae0d2a5566768541fa0ed0e6f12e608e663028283e97b1360f0',
  },
  'safety-exception': {
    bytes: 392757,
    hash: 'sha-256=877739769b76be718331fd6bc4ad1a8812158059d7b094972f511a545dfebbe4',
    duration: 3,
    wideBytes: 620219,
    wideHash: 'sha-256=472476ef6e75c518a309cf0a86492747a2f9611e0c59ed9120d4732db814fc1a',
  },
};
// The shield pages share the buy card's animation; every nav page has its own custom preview.
export const previewFor = (card: string) =>
  card === 'shield' || card === 'dev-shell' ? 'buy' : card in PREVIEWS ? card : undefined;

export const cardFor = (path: string, prefix = '') => {
  const parts = path.replace(/^\/|\/$/g, '').split('/');
  const last = parts[parts.length - 1] || '';
  if (parts[0] === 's' && parts[1] && CARDS[parts[1]]) return parts[1];
  if (last === 'all-healing-tones' || last === 'healing') return 'all-healing-tones';
  if (last === 'all-chakras-3d') return 'all-chakras-3d';
  if (parts[0] === 't' || (parts[0] === 'waves' && parts.length > 1)) {
    return CARDS[last] ? last : 'waves';
  }
  const slug = prefix + (parts[0] || 'index');
  // /sounds redirects to nu.waves; share its card and Indra preview.
  const key = slug === 'index' ? 'home' : slug === 'sounds' ? 'waves' : slug;
  return CARDS[key] ? key : prefix ? `${prefix}index` : 'home';
};
