---
title: 'App commerce'
source: 'design/app-commerce.md'
---

# App commerce: in-app purchases and subscriptions

**Version 1.0, 11 October 2026.** Builds on `design/wallet.md` (self-custody wallet, shielded payments). Store rules quoted below change often and differ by country; rows marked *counsel* follow counsel's review for each storefront.

## 1. What this is

Apps, Mini Apps and webË sites built on khensu.ñü sell things to people: one-time purchases, subscriptions, add-ons, and very large catalogs of each. This document defines how those sales are paid, what khensu.ñü keeps, and how it works whether the app was installed from the App Store, from Google Play, or from GitHub, an installer or the nodes (`design/distribution.md`).

- **khensu.ñü keeps a flat 10% of each in-app purchase and subscription, the lowest fee in the industry.** It never scales up or down. The developer receives 90%. The network fee that pays node operators for carrying the payment comes out of khensu.ñü's 10%, not on top.
- **Tips to people stay at 100%.** A tip is a gift to a person, not a purchase, so khensu.ñü takes nothing (App Store guideline 3.2.1(vii) requires 100% to the recipient for tips outside In-App Purchase; `OPEN-QUESTIONS.md` 83 covers the network fee).
- **Creator subscriptions** are published on `khensu.nu/creators` as having no platform cut. Whether creator subscriptions stay at 0% or move to the 10% app rate is open (section 9).

## 2. What a developer keeps

Per $100 of sales, at each store's published standard rates (checked 11 October 2026):

| Where the sale is paid | Developer keeps | Notes |
| --- | --- | --- |
| khensu.ñü network payment | $90 | 10% to khensu.ñü, including the network fee |
| Epic Games Store | $88 | 12% (store.epicgames.com, Distribute) |
| Apple App Store, Small Business Program or subscription after year one | $85 | 15% |
| Google Play, subscriptions and first $1 million a year | $85 | 15% |
| Apple App Store, standard | $70 | 30% |
| Google Play, above $1 million a year | $70 | 30% |
| Apple In-App Purchase inside the khensu.ñü iPhone app | $76.50 or $63 | Apple's 15% or 30% first, then khensu.ñü's 10% of the gross (section 6) |

We don't scale up or down: it's always a flat 10%, the lowest in the industry, on the first dollar and the billionth. There's no tier that rises or falls with earnings, no small-business programme to apply for, no minimum payout and no payout schedule; each payment reaches the developer's wallet when it's made.

## 3. Business models supported

Everything Apple's [Advanced Commerce API](https://developer.apple.com/in-app-purchase/advanced-commerce-api/) is built for, without asking anyone for access:

| Model | Apple's Advanced Commerce API | khensu.ñü |
| --- | --- | --- |
| Very large catalogs of one-time purchases (courses, audiobooks, mini apps) | Approved apps only; each item a SKU in the developer's system | Any app. Items are entries in a catalog the developer signs and publishes on webË; no registration with anyone, any number of items, added at any time |
| Very large catalogs of subscriptions, one per creator | Approved apps only | Any app. Each creator's offer is its own subscription item |
| A subscription with add-ons, renewing as one | Approved apps only | A bundle item lists the base and add-ons; one standing order pays for the set |
| Manage subscriptions | `showManageSubscriptions` | The buyer's own wallet lists every standing order; cancelling is one tap on the buyer's device and needs nobody's agreement |
| Refunds | Report a Problem, `beginRefundRequest` | Refund window held in escrow (section 5.4) |
| Transaction history and status | App Store Server API, Server Notifications V2 | Sealed receipts to the developer's own node over the mixnet; no webhook to a server, nothing in the clear |
| Payment processing, tax, customer service | Apple | Payment over the network. Tax: the developer is the seller of record unless a partner is used (section 9) |

## 4. Privacy requirements

Stealth and privacy aren't settings (`THREAT-MODEL.md`; "there is no opt-in on security or stealth").

- **The developer doesn't learn who bought.** It learns that a purchase of item X at price P happened and receives the money, nothing else: no account, name, email, device ID, IP address or purchase history.
- **Purchases can't be linked to each other.** Two purchases by the same person, in the same app or different apps, look unrelated to the developer and to the network.
- **The network learns nothing.** Payments are shielded (`design/wallet.md`, `PLAN.md` Shielded payments); receipts travel over the mixnet inside the normal cover traffic.
- **khensu.ñü learns nothing either.** Its 10% arrives as a shielded output of each payment; khensu.ñü sees totals for its own wallet, not who paid or for what.

## 5. How it works

### 5.1 Catalog

The developer publishes a catalog on webË: items with an ID, title, price, type (one-time, subscription with period, bundle) and the developer's payment address. The catalog is signed with the developer's ML-DSA-87 key and versioned; the app verifies the signature before showing a price. Prices are in the network's token with an optional display currency.

### 5.2 Purchase

1. The buyer's device makes a fresh ML-DSA-87 entitlement key for this purchase only.
2. The wallet builds one shielded payment with two outputs: 90% to the developer, 10% to khensu.ñü. The payment memo (encrypted to the developer) carries the item ID, catalog version and the entitlement public key.
3. The developer's node sees the payment and signs a receipt: item, entitlement key, expiry for subscriptions. The receipt goes back over the mixnet, sealed to the buyer.
4. The app unlocks the item when it holds a valid receipt and can sign a challenge with the entitlement key.

The entitlement key is used for this one item and nothing else, so receipts from different purchases share nothing that could link them. The receipt is kept in the buyer's encrypted backup (`design/wallet.md`) so it survives a lost device.

### 5.3 Subscriptions and add-ons

The buyer's wallet holds a standing order: item, amount, period. Each period the wallet makes the payment while the user has any device online and the developer's node extends the receipt's expiry for the same entitlement key. Nothing is pulled from the buyer; the developer can't charge again, raise the price or charge after cancellation. A price change takes effect only when the buyer accepts it on their device. Add-ons are added to the same standing order; the receipt lists the set.

Renewals for one subscription use the same entitlement key, so the developer can tell that a subscriber renewed, which it needs for the subscription to work, but not who the subscriber is or what else they buy.

### 5.4 Refunds

Payments for an item can be marked with a refund window in the catalog (default 14 days for one-time purchases, 48 hours for each renewal). During the window the payment sits in a time-locked escrow output: the developer's key can release it early or refund it, and after the window it releases to the developer automatically. A buyer's refund request is a sealed message to the developer signed with the entitlement key. Disputes without the developer's agreement are open (section 9).

### 5.5 Developer records

The developer's node keeps its sales: item, price, time, entitlement key hash, refund state. This is what it needs for accounting and tax; it contains nothing about buyers.

## 6. App Store and Google Play builds

The network payment works in every build. What a store build is allowed to show is decided by the store's rules for that country, and the app follows them:

| Build and storefront | Digital goods may be paid with | *counsel* |
| --- | --- | --- |
| GitHub, installer or nodes (`design/distribution.md`); Mac outside the Mac App Store; web | khensu.ñü network payment only | No store rules apply |
| App Store, United States storefront | In-App Purchase, and a button or link to pay on the network (guideline 3.1.1(a) as revised in 2025 after *Epic v. Apple*) | Yes |
| App Store, European Union | In-App Purchase, alternative payment processing, or link-outs under Apple's EU terms (store fee and Core Technology Commission apply) | Yes |
| App Store, Japan | Alternative payments under the Mobile Software Competition Act terms | Yes |
| App Store, elsewhere | In-App Purchase for digital goods; physical goods (suñůlink.shield) on the network (guidelines 3.1.3(e), 3.1.5(a)) | Yes |
| Google Play | Google Play Billing, plus user-choice or alternative billing where Google allows it | Yes |

When a purchase goes through Apple's or Google's billing, the store pays its share first and khensu.ñü's 10% is of the gross, so the developer gets $76.50 at 15% or $63 at 30% on $100. A purchase made this way is linked to the buyer's Apple or Google account by the store, outside khensu.ñü's control; the app says so before the store's sheet opens.

To sell a large third-party catalog through In-App Purchase, khensu.ñü applies for Apple's Advanced Commerce API (large catalogs, per-creator subscriptions, add-ons). Apple states that using it doesn't change the commission rate.

**If a store removes or rejects the app,** everyone keeps their wallet, receipts and subscriptions: they live on the user's devices and backups, not in the store. Installing the GitHub, installer or node build restores every purchase from the backup (`design/distribution.md`).

## 7. Compared with Apple's system

| | Apple In-App Purchase | khensu.ñü |
| --- | --- | --- |
| Who knows the buyer | Apple (Apple Account), the developer gets a stable app account token if it asks | Nobody |
| Linking across apps | Apple can | Nobody can |
| Access to large-catalog features | Application and approval | Every app |
| Cancelling | In Settings, through Apple | On the buyer's device, immediately |
| Payout | Monthly, after a minimum | Each payment, as it's made |
| Works if the app leaves the store | Purchases tied to that store | Purchases kept in the user's backup |
| Commission | 15–30% | 10% |

## 8. What exists

- `design/wallet.md` section 9: devnet invoice, pay and receipt prototype on branch `payments-devnet` in `khensu-devnet` (in progress).
- Nothing in this document is built beyond that prototype. Build order: catalog format and signature; two-output payment with memo; receipt and entitlement key; standing orders; escrow refunds; store-build gating per storefront.

## 9. Open questions

- **Creator subscriptions at 0% or 10%.** The creators page says no platform cut on subscriptions. Decide before that page changes.
- **10% on the store-billing path.** Taking 10% after Apple's 30% leaves the developer 63%. Alternatives: take 10% of what the store pays out, or nothing on that path.
- **Seller of record and tax.** With direct payments the developer is the seller; sales tax and VAT on digital goods are the developer's. A licensed partner could act as merchant of record for developers who want that, with its fee shown.
- **Disputes.** Refunds without the developer's agreement (chargeback-like) need an arbiter; options are a developer-chosen arbiter key in the catalog or none.
- **Sanctions and consumer law** at the pool boundary (`design/wallet.md`) and for subscriptions (auto-renewal disclosure laws in the US and EU).

## 10. Patent assessment

To be added to `PATENTS.md` once built. Candidate subject matter: per-purchase entitlement keys bound into a shielded payment memo with a developer-signed receipt; buyer-held standing orders for subscriptions; escrowed refund windows on shielded outputs. Prior art to check: Apple StoreKit and Advanced Commerce API, Google Play Billing, Zcash memos and payment disclosure, Chaumian e-cash, Privacy Pass, Lightning offers (BOLT 12).
