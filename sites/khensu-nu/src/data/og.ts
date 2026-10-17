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
    bytes: 388831,
    hash: 'sha-256=50107ce14d951430a4364912a5f94a15a299234286b365c7fc1c5ef2ade37cc7',
    duration: 3,
    wideBytes: 281943,
    wideHash: 'sha-256=77bf830769ea7ecc1db37a5ec2c1c54d108360e3d20507901b6a33947db18055',
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
    bytes: 395400,
    hash: 'sha-256=d8790b39cc248ad2c678c971960c7110701cf119d2b174f999d2a534b1a3cd0d',
    duration: 3,
    wideBytes: 286080,
    wideHash: 'sha-256=0fe0897dda8dd602d9c771bda5e3373a2e739603d658da15a61b08b48dceb412',
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
    bytes: 403700,
    hash: 'sha-256=d85e0b958cf575e849a4f1ee2dc4a42bd001e1645ab50d05e42c51931b9dc6bc',
    duration: 3,
    wideBytes: 302308,
    wideHash: 'sha-256=bb97a04e8e41a7dca57ba534731e884e43cbae923bf2c232337664fca5d5404d',
  },
  memory: {
    bytes: 415668,
    hash: 'sha-256=b51c50035fe96fd0d803d1458d3f8e17cee6d89461e1114bd2ef7f65ed8aa978',
    duration: 3,
    wideBytes: 293055,
    wideHash: 'sha-256=ca042c73dda05f98657fda91f18063343091b6c4d30ca9c66a16321b30b4d530',
  },
  moments: {
    bytes: 377629,
    hash: 'sha-256=67a0a027131dbfe490b5030db4213a809db823785c617d3136c7abec798a0727',
    duration: 3,
    wideBytes: 281669,
    wideHash: 'sha-256=3d68e45fa3f19a85fc2b556e3dce969eb9b124d93d452fa40c0db24e6a9f1229',
  },
  network: {
    bytes: 392898,
    hash: 'sha-256=bdb17e2b647d71fc8a35270000f4240d1ec06c7384a4e979249ab1f67e718610',
    duration: 3,
    wideBytes: 284449,
    wideHash: 'sha-256=fcdc4c54214a1be31d4acbc2c549c9313793bf46aad63445dc2928cfab2b54ff',
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
    bytes: 393308,
    hash: 'sha-256=f2a21b7e7c1100966bd0c88de9f0f7ab24d28ca8498fe11ac21c5e1282ffb137',
    duration: 3,
    wideBytes: 284307,
    wideHash: 'sha-256=22e27dbe255d77cc24da58908660fcc7254a60c435e82ae8f9875ecf9075bb21',
  },
  compliance: {
    bytes: 438834,
    hash: 'sha-256=3f8507bd9260098447ca837683cda289fc828ec008f38091ee173a6100b33cfd',
    duration: 3,
    wideBytes: 308863,
    wideHash: 'sha-256=a996035b54c900585ccbba3113d8e9da227863ec524dc9401e9a3c6914635f22',
  },
  security: {
    bytes: 398240,
    hash: 'sha-256=534310f18a3650719bea7f68258931038c6605bfeae3e2d91d7f6ed466be4004',
    duration: 3,
    wideBytes: 287891,
    wideHash: 'sha-256=381f2756254c4c517e7e68662f207e5ddae6977e8e5d3ccfd9b3187e66aa3066',
  },
};
// The shield pages share the buy card's animation; every nav page has its own custom preview.
export const previewFor = (card: string) =>
  card === 'shield' || card === 'dev-shell' ? 'buy' : card in PREVIEWS ? card : undefined;

export const cardFor = (path: string, prefix = '') => {
  const parts = path.replace(/^\/|\/$/g, '').split('/');
  const last = parts[parts.length - 1] || '';
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
