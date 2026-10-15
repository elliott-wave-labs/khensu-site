---
title: 'Open source'
source: 'OPEN-SOURCE.md'
---

# Open source — khėnsu.ñü

All first-party khėnsu.ñü repositories are **public** as of the founder handover on **14 October 2026**. Full notice: [`FOUNDER-HANDOVER.md`](/specs/founder-handover). Dead-man's switch: [`DEAD-MANS-SWITCH.md`](https://github.com/elliott-wave-labs/khensu-specs/blob/main/DEAD-MANS-SWITCH.md). Licences: [`LICENSING.md`](/specs/licensing).

## Clone

```bash
git clone https://github.com/elliott-wave-labs/khensu-specs.git
git clone https://github.com/elliott-wave-labs/khensu-core.git
git clone https://github.com/elliott-wave-labs/khensu-apple.git
git clone https://github.com/elliott-wave-labs/khensu-tatenan.git
git clone https://github.com/elliott-wave-labs/khensu-chain.git
git clone https://github.com/elliott-wave-labs/khensu-services.git
git clone https://github.com/elliott-wave-labs/khensu-devnet.git
git clone https://github.com/elliott-wave-labs/khensu-site.git
```

Keep them side by side under one directory (see [`AGENTS.md`](https://github.com/elliott-wave-labs/khensu-specs/blob/main/AGENTS.md)).

## Org

[https://github.com/elliott-wave-labs](https://github.com/elliott-wave-labs)

## Live

- [https://khensu.nu/](https://khensu.nu/)
- [https://waves.khensu.nu/](https://waves.khensu.nu/)
- [https://dev.khensu.nu/](https://dev.khensu.nu/) — developers, specs, repositories
- Public SLA + dead-man's switch: [https://khensu.nu/sla](https://khensu.nu/sla)

## Install the apps from GitHub (App Store optional)

Walkthroughs (PWA, sideload, Xcode) live on [khensu.nu/sla](https://khensu.nu/sla) and in [`PUBLIC.md`](https://github.com/elliott-wave-labs/khensu-specs/blob/main/PUBLIC.md). Agent harness: [`nu.harness.md`](https://github.com/elliott-wave-labs/khensu-specs/blob/main/nu.harness.md).

Apple’s store is one path. The code stays public either way.

| App | Bundle ID | Source | Install without the App Store |
| --- | --- | --- | --- |
| khėnsu.ñü | `nu.khensu.ptah` | [khensu-apple](https://github.com/elliott-wave-labs/khensu-apple) | Build in Xcode, or sideload a Release `.ipa` ([INSTALL.md](https://github.com/elliott-wave-labs/khensu-apple/blob/main/docs/INSTALL.md)) |
| nu.waves | `nu.khensu.waves` | same repo, **Waves** scheme | Same, plus the PWA at [waves.khensu.nu](https://waves.khensu.nu/) (Safari → Add to Home Screen) |

Release IPAs (when attached): [github.com/elliott-wave-labs/khensu-apple/releases](https://github.com/elliott-wave-labs/khensu-apple/releases). Sideload with Sideloadly or AltStore on your Mac; signing stays on your machine.

Archive nu.waves for App Store Connect: `scripts/archive-waves.sh` in `khensu-apple` (writes `~/Desktop/khensu-waves-submit/`).
