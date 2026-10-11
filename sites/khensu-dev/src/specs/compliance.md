---
title: 'Compliance'
source: 'COMPLIANCE.md'
---

# Compliance

Version 1.0, 11 Oct 2026. Elliott Wave LLC makes khensu.ñü.

khensu.ñü complies with privacy and data protection law the strongest way there is: by not having your data. Messages, calls, payments, files, contacts and search stay on your devices, encrypted end to end with post-quantum cryptography. Nothing is processed on a server. This document lists every place personal data could exist, the laws that apply, and how each requirement is met.

## 1. Personal data inventory

Everything khensu.ñü, its network or its sites could touch, and what happens to it.

| Data | Where it exists | Who can read it | Kept |
| --- | --- | --- | --- |
| Messages, calls, media, files, payments | Your devices; sealed packets in transit and in mailboxes | Only the people in the conversation | On your devices until you delete them; mailbox copies expire after delivery or 30 days |
| Contacts, groups, search index, AI memory | Your devices only | You | Until you delete them |
| Handle (`name.khensu.nu`) and public keys | Key transparency log | Anyone, by your choice to publish a handle | Until you release the handle (section 3.4) |
| IP address | The entry node your device connects to, while connected | That node's software, in memory only | Not logged; gone when the connection closes |
| Push token (APNs) | Encrypted inside your wake capability; decrypted by the push gateway to send a wake | The gateway, in memory, for up to 20 seconds | Not stored |
| App Attest assertion | Sent once to the credential issuer at enrolment | The issuer, to check the app is genuine | Discarded after the check; only a commitment the issuer can't link to you is kept |
| Payment amounts and parties | Shielded notes | Only sender and recipient | Era trees and nullifiers are deleted 30 days after each era closes |
| Email you send us (support, security, suñůlink.shield reservations) | Our mailbox | Elliott Wave LLC | Until your request is handled, or for reservations until your shield ships; deleted sooner on request |
| Website visits | Google Cloud's content delivery network, to serve the page | Google Cloud, as our processor | We keep no logs; no cookies, analytics, trackers or third-party scripts |

There are no accounts with names, phone numbers or email addresses in the app. There is no advertising, no profiling, no data sale or sharing, and no data broker relationship of any kind.

## 2. Roles

- **Elliott Wave LLC** is the controller for the website, the email you send us, the credential issuer and the push gateway.
- **Node operators** run independent software that forwards sealed, fixed-size packets. The only personal data a node handles is the IP address of a device connected to it, in memory, for transmission. The node software has no IP logging and no way to read packet contents.
- **You** control everything in the app. Your devices do all the processing.
- **Developers** building on webË are controllers for their own apps. Section 6 covers what khensu-core does for them.

## 3. Privacy and data protection laws

### 3.1 Coverage

| Law | Where | How khensu.ñü meets it |
| --- | --- | --- |
| GDPR (Regulation (EU) 2016/679) | European Union and EEA | Sections 3.2–3.6 |
| UK GDPR and Data Protection Act 2018 | United Kingdom | As GDPR |
| ePrivacy Directive (2002/58/EC) | European Union | No cookies or device storage on the sites; the app stores only what you create |
| Revised Federal Act on Data Protection (nFADP) | Switzerland | As GDPR |
| CCPA as amended by CPRA | California | No sale or sharing, no cross-context behavioural advertising, no sensitive data inferences; rights honoured (3.5) |
| State privacy laws (Virginia, Colorado, Connecticut, Utah, Texas, Oregon, Montana, Iowa, Delaware, New Hampshire, New Jersey, Tennessee, Minnesota, Maryland, Indiana, Kentucky, Nebraska, Rhode Island and others) | United States | No targeted advertising, sale or profiling; universal opt-out signals are moot because nothing is collected |
| COPPA | United States | No personal information collected from anyone, including children (3.7) |
| LGPD (Lei 13.709/2018) | Brazil | As GDPR |
| PIPEDA and Québec Law 25 | Canada | As GDPR; no cross-border transfer of personal information |
| APPI | Japan | As GDPR |
| PIPA | South Korea | As GDPR |
| Privacy Act 1988 and the Australian Privacy Principles | Australia | As GDPR |
| Privacy Act 2020 | New Zealand | As GDPR |
| DPDP Act 2023 | India | As GDPR |
| PDPA | Singapore | As GDPR |
| POPIA | South Africa | As GDPR |

### 3.2 Principles (GDPR Article 5)

- **Data minimisation and purpose limitation:** the protocol has no field for a name, phone number, email address, location or contact list. Data that doesn't exist can't be misused, breached or repurposed.
- **Storage limitation:** every server-side item in section 1 is transient or deleted on a fixed schedule.
- **Integrity and confidentiality:** ML-KEM-1024, ML-DSA-87, AES-256-GCM and SHA-512 everywhere, with no classical fallback (section 5).
- **Accountability:** this document, the open specifications and reproducible builds let anyone check every claim.

### 3.3 Lawful bases

| Processing | Basis (GDPR Article 6) |
| --- | --- |
| Forwarding packets (IP address in memory) | 6(1)(b), to provide the service you asked for |
| Push wakes | 6(1)(b) |
| App Attest check at enrolment | 6(1)(f), preventing spam and abuse, with the issuer unable to link the check to you |
| Replying to your email; reservations | 6(1)(b) |
| Serving the website | 6(1)(f), delivering the pages you request |

No processing relies on consent that could be withdrawn and no processing involves special category data (Article 9). There is no automated decision-making or profiling (Article 22).

### 3.4 Rights

| Right | How you use it |
| --- | --- |
| Access and portability (Articles 15, 20) | Everything is already on your device. Export it in the app in an open format at any time |
| Erasure (Article 17) | Delete a message, a conversation or the whole app; your devices hold the only readable copies. Releasing your handle publishes a revocation, PIR mirrors drop the record within one epoch, and the log keeps only a hash commitment that can't be read back to the handle |
| Rectification (Article 16) | Edit your profile and handle record in the app |
| Restriction and objection (Articles 18, 21) | There is no processing to restrict or object to beyond delivering what you send |
| Email we hold | Write to hello@elliottwave.studio; we answer within 30 days, free of charge |

### 3.5 International transfers

Content never leaves your devices readable, so no readable personal data is transferred anywhere. Packets cross borders the way any internet traffic does, sealed. Email and website delivery use providers bound by the EU Standard Contractual Clauses and the EU–US Data Privacy Framework where applicable.

### 3.6 Security and breaches

- A breach of any node, mailbox, the issuer or the gateway exposes sealed packets, nothing readable (`THREAT-MODEL.md`).
- Breaches of the data in section 1 that we control are notified to the supervisory authority within 72 hours and to affected people without undue delay (GDPR Articles 33, 34; state breach laws).
- Data protection by design and by default (Article 25) is the architecture: stealth and end-to-end encryption can't be turned off.
- A data protection impact assessment (Article 35) covers the app, the network, the issuer and the gateway, and is published with the specifications.

### 3.7 Children

khensu.ñü is for people 13 and older, or the age of digital consent in their country if higher (16 in some EU member states). The app collects no personal information from anyone, so it collects none from children. Parental controls on Apple devices (Screen Time) apply as with any app.

### 3.8 Representatives

Elliott Wave LLC is established in the United States. Our processing of people in the EU and UK is occasional, low-risk and involves no special category data, so the Article 27 representative requirement doesn't apply (GDPR Article 27(2)(a)). Contact for every privacy matter: hello@elliottwave.studio.

## 4. Platform and content rules

| Rule | How khensu.ñü meets it |
| --- | --- |
| EU Digital Services Act (Regulation (EU) 2022/2065) | Public content (feeds, forums, sites) has notice and action through signed label lists and the illegal-content hash list (`WEBE.md` 10); private messages are interpersonal communications outside content moderation duties. Points of contact and transparency reports are published here |
| UK Online Safety Act 2023 | Public content as above; private messages stay end-to-end encrypted. We never scan private content |
| Child sexual abuse material | Known material is blocked from public content by hash list; reports go to NCMEC (US) and the relevant national hotline |
| Lawful access | We answer valid legal process with what we hold, which is the section 1 inventory. We can't decrypt content, and there is no key, mode or update that could. Every request is counted in the transparency report |
| Apple App Review Guidelines | Privacy nutrition label: Data Not Collected. Required reason APIs declared in the privacy manifest |

## 5. Cryptography and security standards

| Standard | Use |
| --- | --- |
| FIPS 203 (ML-KEM) | ML-KEM-1024 for every key exchange |
| FIPS 204 (ML-DSA) | ML-DSA-87 for every signature |
| FIPS 197 and SP 800-38D | AES-256-GCM |
| FIPS 180-4 | SHA-512 |
| NSA CNSA 2.0 | The khensu.ñü suite is the CNSA 2.0 suite: ML-KEM-1024, ML-DSA-87, AES-256, SHA-384/512 |
| RFC 9420 (MLS) | Group messaging, with the `MLS_256_MLKEM1024_AES256GCM_SHA512_MLDSA87` suite |
| EU Cyber Resilience Act (Regulation (EU) 2024/2847) | Coordinated vulnerability disclosure (security.txt, 3-day acknowledgement), security updates for the supported life of each product, a software bill of materials for every release, and actively exploited vulnerabilities reported to ENISA within 24 hours |
| Reproducible builds | Node, firmware and Pi image builds are reproducible; every release hash is in the transparency log and the network archive (`PROTOCOL.md` 12.6) |

## 6. For developers on webË

Apps built on `khensu-core` inherit the architecture above:

- Content is end-to-end encrypted on device; there is no server-side API to send user data to.
- Stealth and post-quantum encryption can't be turned off, so a webË app can't leak who talks to whom.
- Sites can't reach the ordinary web or third parties unless their policy lists them, so third-party tracking is blocked by construction.
- The App Store privacy label for a webË app built only on `khensu-core` is Data Not Collected, unless the developer adds collection of their own.

A developer who adds their own collection is the controller for it and must meet these laws themselves. App commerce (`design/app-commerce.md`) gives buyers anonymous entitlements, so developers receive no buyer identity.

## 7. Accessibility

| Law or standard | How khensu.ñü meets it |
| --- | --- |
| WCAG 2.2 Level AA | The sites and the app |
| European Accessibility Act (Directive (EU) 2019/882) | Messaging and e-commerce features meet EN 301 549 |
| Americans with Disabilities Act; Section 508 | WCAG 2.2 AA |
| Apple accessibility | VoiceOver, Dynamic Type, Voice Control, Switch Control, Reduce Motion and Increase Contrast throughout, using Apple's standard controls |

## 8. Export controls

khensu.ñü's encryption is mass-market software under the US Export Administration Regulations (ECCN 5D992.c under License Exception ENC, section 740.17(b)(1)), with the annual self-classification report filed with BIS and the NSA. Open-source repositories are published under section 734.3(b)(3) with notice to BIS. App Store export compliance documentation is filed with Apple. The app isn't offered in countries under comprehensive US embargo.

## 9. Payments

- Network payments are self-custodied: khensu.ñü never holds your funds or keys.
- No card data touches khensu.ñü, its nodes or its sites, so PCI DSS scope is nil.
- Where a licensed third party provides card payments or on-ramps, that party meets its own licensing, anti-money-laundering and sanctions obligations.

## 10. suñůlink.shield

suñůlink.shield ships with:

| Area | Standard |
| --- | --- |
| Radio, US and Canada | FCC Part 15 (15.247 for Wi-Fi HaLow at 902–928 MHz; 15.247 and 15.407 for Wi-Fi and Bluetooth), ISED RSS-247 |
| Radio, EU and UK | Radio Equipment Directive 2014/53/EU (CE) and Radio Equipment Regulations 2017 (UKCA), including the RED cybersecurity requirements (EN 18031-1) |
| Product safety | IEC 62368-1 |
| Battery | IEC 62133-2, UN 38.3, EU Battery Regulation (EU) 2023/1542 |
| Wireless charging | Qi2 certification (Wireless Power Consortium) |
| Materials | RoHS (2011/65/EU), REACH (EC 1907/2006), California Proposition 65 |
| Recycling | WEEE (2012/19/EU) take-back |
| Security | The EU Cyber Resilience Act requirements in section 5; open firmware with post-quantum secure boot |

## 11. Contact

- Privacy and data protection: hello@elliottwave.studio
- Security: security@elliottwave.studio, `/.well-known/security.txt`
- Legal process: hello@elliottwave.studio

Elliott Wave LLC.
