---
title: 'After release'
source: 'POST-RELEASE.md'
---

# After release

**3 November 2026.** khėnsu.ñü is on Product Hunt and ñü.ċřêæțẽ is open to everyone with no Pro tier. This is the runbook for the hours and days after a release. `LAUNCH.md` has the launch copy; this file is what to do once it is out.

Tone everywhere: present tense, factual, warm. The network is a gift to humanity and all beings; never say it "can't be stopped". No dollar or token earnings promises in public replies (`LAUNCH.md`).

## 1. State at release

| Piece | State on 3 Nov 2026 |
| --- | --- |
| Sites | khensu.ñü and every product host answer HTTP 200 over valid TLS (create, feed, waves, bi, fi, mirrora, sla, safety, security, dev, get.apps, kronos, iverse, moments, media, network) |
| Feed service | `khensu-feed` on Cloud Run, redeployed with the 3–64 character handle rule and the founder handle `ė` (`PROTOCOL.md` 3.5). Health check is `GET /v1/feed?limit=1`; Cloud Run reserves `/healthz` |
| Feed | Empty. The first post is Elliott's, as `ė` |
| Money | Off. Likes, tips and pack prices on the create page are on-device previews; ñũ.Fî there is a demo ledger. No Pro tier |
| Takedown contact | [e@khensu.nu](mailto:e@khensu.nu), shown under both post forms |
| Help Us | Page at `khensu.nu/help`; `help.khensu.nu` waits on its Hover A record (section 6) |

## 2. First hour

1. **First post as `ė`.** Open [create.khensu.nu](https://create.khensu.nu), Create tab, upload the mîřrørå Hopf 3-sphere clip (record the canvas at [mirrora.khensu.nu](https://mirrora.khensu.nu/#shapes-section)), handle `ė`, caption, Post. The first post claims the handle and keeps its token in this browser only (`localStorage` key `nu.feed.tokens`). Post from the browser you will keep using; a cleared browser cannot post as `ė` again.
2. **Check it shows.** `curl -s "https://khensu-feed-449257903768.us-central1.run.app/v1/feed?limit=5"` lists the post, and the Feed tab plays it.
3. **Product Hunt.** Post the first maker comment from `LAUNCH.md`, then reply to every comment in the first hours. Link subdomains (`https://create.khensu.nu`), never `khensu.nu/<page>`.
4. **Sweep the hosts** once Product Hunt traffic starts:

   ```sh
   for h in khensu.nu create.khensu.nu feed.khensu.nu waves.khensu.nu bi.khensu.nu fi.khensu.nu \
     mirrora.khensu.nu sla.khensu.nu safety.khensu.nu dev.khensu.nu get.apps.khensu.nu; do
     printf "%-22s %s\n" "$h" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://$h/)"
   done
   ```

   Any non-200 is an incident: check the URL map and the certificate first (`nu.harness.md`).

## 3. Safety, from the first public upload

- **Reports.** Every post has a report menu. Three reports from different networks hide a post automatically. Hiding is not a child-safety process.
- **Takedowns.** Requests to e@khensu.nu get an answer within 24 hours. The feed service has no delete endpoint yet, so a takedown is done in the `khensu-feed` bucket: set `"hidden": true` in `posts/<id>.json`, delete the video and poster objects it points to unless the material must be preserved (CSAM below), and keep a note of what was removed and why.
- **Child sexual abuse material.** US law (18 U.S.C. 2258A) requires reporting apparent CSAM to NCMEC's CyberTipline once we know of it and preserving the report for 90 days. Register the provider account with NCMEC this week, before inviting uploads at scale. Until then, any such report goes straight to e@khensu.nu, the post is hidden at once, and Elliott files a CyberTipline report by hand (`COMPLIANCE.md`, `khensu-services/README.md`).
- **The violet flame** ([safety.khensu.nu](https://safety.khensu.nu)) stays the public statement of the on-device cover and the public-forum ban.

## 4. Keep off until decided

- Real tips, sales, payouts and any paid tier. When they turn on: a flat 10% of in-app purchases and subscriptions, tips 100% to the person (`AGENTS.md`).
- Generated detail in the composer (off unless the person turns it on).
- Any server-side processing of user content beyond storing and serving public feed posts.

## 5. First week

| When | Task | Where |
| --- | --- | --- |
| Daily | Host sweep (section 2.4) and feed check | terminal |
| Daily | Answer Product Hunt, e@khensu.nu and the foundation Slack | |
| Weekly | Dead-man's switch keep-alive (email or SMS) | `DEAD-MANS-SWITCH.md` |
| Weekly | `nu.ot/YYYY-MM-DD.md` and `nu.ot.222.md`: Elliott pushes these himself | `nu.ot/` |
| This week | NCMEC registration | section 3 |
| This week | App builds: archive, TestFlight, then App Store review for `nu.khensu.ptah` with the founder handle rule in KhensuKit | `khensu-apple` |
| This week | `help.khensu.nu` Hover A record, then its own certificate | section 6 |
| After each ship | `work-completed.md` and `work-ip.md` | `khensu-work-log` skill |

## 6. New host: help.khensu.nu

1. Elliott adds the Hover record: type **A**, hostname **help**, value **34.107.228.246**, no AAAA.
2. Wait until `dig +short help.khensu.nu A` returns `34.107.228.246`.
3. Add the host to the URL map with a path matcher that rewrites `/` to `/khensu-nu/help`, and give it its own certificate (`own_certificate = true`, or add it to an existing hand-made SAN cert; the project's certificate quota is 10). Never the shared products pack.
4. Wait for the certificate to be ACTIVE and for `openssl s_client -servername help.khensu.nu` to show it covers the host. Until then `khensu.nu/help` serves the same page.

## 7. Publishing during release

Publish as soon as something is built; never hold for a patent filing.

```sh
cd ~/Documents/GitHub/khensu/khensu-site/sites/khensu-nu && pnpm -s build
cd ~/Documents/GitHub/moqom-cloud && MOQOM_SITES_SKIP_BUILD=1 \
  MOQOM_SITES_DIR=$HOME/Documents/GitHub/khensu/khensu-site/sites \
  sh moqom-pq/deploy/tools/publish-sites.sh khensu-nu
```

For the developer docs run `python3 tools/sync-specs.py` in `khensu-site` first and publish `khensu-dev`. The publish removes remote files that are not in the build, so publish from the full working tree. Feed service changes deploy with `khensu-services/deploy/feed/deploy.sh deploy`.

## 8. Help us

Everyone who wants to help joins the foundation on Slack: [join the foundation](https://join.slack.com/t/fdation/shared_invite/zt-4dgleu0fq-GEZDhIq4u_kF~wzbFpXNNw). The Help Us page ([help.khensu.nu](https://help.khensu.nu)) links it next to running a node, contributing code, creating and reporting bugs.
