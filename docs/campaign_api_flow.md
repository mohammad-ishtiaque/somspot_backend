# Influencer Campaign — Full API Flow

Base URL: whatever you run the server on (e.g. `http://localhost:5000`) — no
`/api` prefix, routes are mounted directly (`/campaign/...`, `/creator/...`).

Auth header: `Authorization: Bearer <accessToken>` from `POST /auth/login`.
Keep three tokens handy — merchant, creator, admin.

> ⚠️ **The one thing that trips people up:** creators are assigned to a
> campaign **before** it's approved, not after. `PATCH /campaign/admin/review`
> rejects the approve request until every slot is filled.

**How to use this doc:** the table below is for scanning — find the call you
need, note the step number, jump to it with the link. Everything below that
is one collapsed section per call; click to expand only the one you're
working on.

---

## Quick reference

| # | Method | Endpoint | Auth | Purpose |
|---|---|---|---|---|
| [0a](#0a) | `POST` | `/category/create` | admin | Seed a creator-type category |
| [0c](#0c) | `POST` | `/business/create` | merchant | Create a business |
| [0c](#0c) | `PATCH` | `/business/verify` | admin | Approve the business |
| [0d](#0d) | `PATCH` | `/creator/profile` | creator | Set niche/stats/social accounts — one call |
| [0e](#0e) | — | — | — | `/user/edit-profile` vs `/creator/profile` — which one? |
| [1](#step-1) | `POST` | `/campaign/create` | merchant | **Create the campaign** |
| [2](#step-2) | `GET` | `/creator/admin/list` | admin | Browse creators to assign |
| [2](#step-2) | `GET` | `/creator/admin/get` | admin | One creator's full profile |
| [3](#step-3) | `POST` | `/campaign/admin/assign-creator` | admin | **Assign a creator** (repeat) |
| [4](#step-4) | `PATCH` | `/campaign/admin/review` | admin | **Approve / reject the campaign** |
| [5](#step-5) | `GET` | `/creator/tasks` | creator | List my assigned tasks |
| [5](#step-5) | `GET` | `/creator/task` | creator | One task |
| [5](#step-5) | `PATCH` | `/creator/submit-draft` | creator | Submit draft video |
| [5](#step-5) | `PATCH` | `/creator/submit-post` | creator | Submit live post URL |
| [6](#step-6) | `PATCH` | `/campaign/review-draft` | merchant | Approve/reject the draft |
| [7](#step-7) | `PATCH` | `/campaign/verify-publication` | merchant/admin | Verify live post → pay creator |
| [ref](#ref-my) | `GET` | `/campaign/my` | merchant | List my campaigns |
| [ref](#ref-get) | `GET` | `/campaign/get` | merchant/admin | One campaign, full detail |
| [ref](#ref-update) | `PATCH` | `/campaign/update` | merchant/admin | Edit a campaign |
| [ref](#ref-delete) | `DELETE` | `/campaign/delete` | merchant/admin | Delete a campaign |
| [ref](#ref-apps) | `GET` | `/campaign/applications` | merchant/admin | View assigned creators (read-only) |
| [ref](#ref-app) | `GET` | `/campaign/application` | merchant/admin | One submission's full detail, by id |
| [ref](#ref-admin-list) | `GET` | `/campaign/admin/list` | admin | Every campaign, all merchants |
| [ref](#ref-merchant-view) | `GET` | `/creator/merchant/get` | merchant | "View Profile" — a creator assigned to your own campaign |
| [ref](#ref-wallet) | `GET` | `/creator/dashboard` | creator | Home screen — one call |
| [ref](#ref-wallet) | `GET` | `/creator/wallet` | creator | Wallet screen 1 — balance + recent commissions |
| [ref](#ref-wallet) | `GET` | `/creator/wallet/analytics` | creator | Wallet screen 2 — earnings this period + trend |

---

<a id="0a"></a>
<details>
<summary><b>Step 0a · POST /category/create</b> — seed a creator-type category (admin)</summary>

Campaign's `influencerCategory` and Creator's `category` both point at the
same `Category` collection, filtered by `type`. You need at least one
`type: "creator"` category before you can create a campaign or set a
creator's niche.

```
Body: form-data (multipart)
```

| Field | Required | Notes |
|---|---|---|
| `name` | yes | e.g. `"Fashion"` |
| `type` | no | `merchant` (default) or `creator` — use `creator` here |
| `slug` | no | auto-slugified from `name` if omitted |
| `icon` | no | file upload, field name `icon` |
| `order` | no | number, sort order |

Save the returned `_id` — you'll need it for `influencerCategory` and for the
creator's `category`.

Repeat once more with `"type": "merchant"` for Business's category (needed
in step 0c, unrelated to the campaign flow itself).

</details>

<a id="0c"></a>
<details>
<summary><b>Step 0c · POST /business/create</b> + <b>PATCH /business/verify</b> — business, then approval</summary>

```
POST /business/create
Auth: merchant
Body: form-data
```

| Field | Required | Notes |
|---|---|---|
| `name` | yes | |
| `category` | yes | a **merchant**-type Category id (from 0a) |
| `description`, `phone`, `whatsapp`, `address` | no | text |
| `openingHours` | no | JSON string, e.g. `[{"day":"mon","open":"09:00","close":"18:00"}]` |
| `lat`, `lng`, `timezone` | no | timezone auto-derived from lat/lng if omitted |
| `logo`, `coverImage` | no | single-file fields |
| `gallery` | no | up to 8 files |

```
PATCH /business/verify
Auth: admin
Body (JSON): { "businessId": "<id>", "action": "approve" }
```

`action` is `approve` or `reject` (add `rejectionReason` for reject). You now
have a `businessId` to create campaigns against.

</details>

<a id="0d"></a>
<details>
<summary><b>Step 0d · PATCH /creator/profile</b> — creator setup (profile + social, one call)</summary>

Register a `CREATOR`-role account first (`POST /auth/register` →
`activate-account` → `login`). Then, optionally but recommended so the
creator shows up properly in the admin picker:

```
PATCH /creator/profile
Auth: creator
Body (JSON) — every field optional
```

| Field | Notes |
|---|---|
| `bio` | free text |
| `category` | a **creator**-type Category id (from 0a) — validated; `400 Invalid creator category` if it doesn't exist or is the wrong type |
| `followerCount` | self-reported number |
| `engagementRate` | self-reported percentage |
| `socials` | array of `{ platform, handle, url? }` — see below |

`socials[]` entries — `platform` (`tiktok` · `instagram` · `facebook` ·
`youtube` · `x`, required), `handle` (required), `url` (optional). Each
entry **upserts by platform**:
sending `tiktok` again updates that one; an `instagram` entry from a
previous call that you don't resend is left untouched. So you can either set
everything at once, or update just one platform later without resending the
rest of the profile.

Full setup in one call:
```json
{
  "bio": "I run the biggest food review page in Mogadishu.",
  "category": "<creator-type categoryId>",
  "followerCount": 50000,
  "engagementRate": 4.2,
  "socials": [
    { "platform": "tiktok", "handle": "@ahmedeats", "url": "https://tiktok.com/@ahmedeats" },
    { "platform": "instagram", "handle": "@ahmedeats_ig" }
  ]
}
```

Updating just one social later, everything else untouched:
```json
{ "socials": [{ "platform": "tiktok", "handle": "@newhandle" }] }
```

Response (and `GET /creator/profile`) returns `category` **populated**
(`name`/`slug`/`icon`), not just the raw id.

`POST /creator/link-social` still exists — same upsert logic for a single
platform — but you don't need it anymore; `PATCH /creator/profile` covers
everything in one endpoint now.

</details>

<a id="0e"></a>
<details>
<summary><b>Which "update profile" API do I use?</b> — <code>/user/edit-profile</code> vs <code>/creator/profile</code></summary>

There are two, because a creator account is really two documents: a base
`User` (shared by every role) plus a `Creator` doc (creator-only extras).
Send the right fields to the right endpoint:

| Want to change... | Call | Fields |
|---|---|---|
| Name, phone, address, date of birth, language, profile photo | `PATCH /user/edit-profile` (form-data) | `name`, `phoneNumber`, `address`, `dateOfBirth`, `language`, `profile_image` (file) |
| Bio, niche, follower count, engagement rate, social accounts | `PATCH /creator/profile` (raw JSON) | `bio`, `category`, `followerCount`, `engagementRate`, `socials[]` — see step 0d above |

Both are optional-fields-only — send just what you're changing, no need to
resend the whole profile either time.

⚠️ `PATCH /user/edit-profile` currently has no field whitelist server-side —
technically anything on the `User` schema can be set through it, not just
the 5 fields above. Stick to those 5; anything else is undocumented,
unintended behavior, not a supported part of this flow.

</details>

---

<a id="step-1"></a>
<details open>
<summary><b>Step 1 · POST /campaign/create</b> — merchant creates the campaign</summary>

```
Auth: merchant
Body: raw JSON (no file upload)
```

| Field | Required | Values / notes |
|---|---|---|
| `business` | **yes** | your approved business id |
| `name` | **yes** | |
| `about` | no | free text — Figma: "Description" |
| `goal` | no | free text — Figma: "Campaign Goal", a separate field from `about`/Description |
| `objective` | no | `awareness` · `traffic` · `offer` · `lead_generation` |
| `contentType` | no | `video_ad` · `product_review` · `reel` · `story` |
| `influencerCategory` | no | a creator-type Category id (validated) |
| `targetCreators` | no | default `1` |
| `videoLengthSec` | no | `20` ($5) · `30` ($7, default) · `45` ($10) · `60` ($15) per creator |
| `startDate` / `endDate` | no | ISO date |
| `contentRequirements` | no | free text |
| `invitedCreator` | no | a User id — just a note of who the merchant has in mind; does **not** assign them |
| `offer` | no | link to an existing Offer id |

**Not accepted from the client** (always system-controlled): `pricePerClaim`
(derived from `videoLengthSec`), `status` (always starts `pending_review`),
`merchant` (from the auth token), `approvedCount`.

Response: the created campaign, status `pending_review`.

</details>

<a id="step-2"></a>
<details open>
<summary><b>Step 2 · GET /creator/admin/list</b> + <b>GET /creator/admin/get</b> — admin browses creators</summary>

```
GET /creator/admin/list
Auth: admin
```

| Query param | Required | Notes |
|---|---|---|
| `category` | no | a creator-type Category id |
| `searchTerm` | no | matches the creator's name (`User.name`) |
| `page`, `limit`, `sort`, `fields` | no | standard pagination |

Each result: `user` (name, profile_image, email), `category` (populated:
name/slug/icon), self-reported `followerCount`/`engagementRate`, and:

- `activeCount` — tasks on a currently-`live` campaign
- `pendingCount` — tasks on a still-`pending_review` campaign
- `doneCount` — published tasks

(computed from the *linked campaign's* status, not the task's own status)

```
GET /creator/admin/get
Auth: admin
Query: userId — required, the creator's User._id
```

Same stats for one creator, plus `bio`/`socials` — the profile-preview
modal.

</details>

<a id="step-3"></a>
<details open>
<summary><b>Step 3 · POST /campaign/admin/assign-creator</b> — assign (repeat until fully staffed)</summary>

```
Auth: admin
Body (JSON)
```

| Field | Required | Notes |
|---|---|---|
| `campaignId` | yes | |
| `creatorUserId` | yes | the creator's **User._id** (from step 2) — not their Auth id |
| `pitch` | no | |

Rejected with `400` if: the campaign isn't `pending_review`, all
`targetCreators` slots are already filled, or the id isn't a real
CREATOR-role account. Rejected with `409` if already assigned. **Repeat once
per creator** until `assignedCount >= targetCreators`.

</details>

<a id="step-4"></a>
<details open>
<summary><b>Step 4 · PATCH /campaign/admin/review</b> — approve or reject the campaign</summary>

```
Auth: admin
Body (JSON)
```

| Field | Required | Notes |
|---|---|---|
| `campaignId` | yes | |
| `action` | yes | `approve` or `reject` |
| `rejectionReason` | no | only used with `action: reject`; defaults to `"Not specified"` |

Approving fails with `400 Assign all N required creators before approving`
if understaffed. On success: `live` (or `rejected`).

</details>

<a id="step-5"></a>
<details open>
<summary><b>Step 5 · Creator does the work</b> — tasks, submit-draft, submit-post</summary>

```
GET /creator/tasks
Auth: creator
Query (optional): stage (active | pending | completed | published | rejected), status (approved | draft_submitted | verifying | published | rejected), page, limit
```

Use `stage`, not `status`, to match the 4 tabs on the "My Tasks" screen
(Active / Pending / Completed / Published) — the raw `status` alone doesn't
map 1:1 onto them: both **Active** (not yet submitted) and **Completed**
(draft approved, ready to post or already posted awaiting verification)
share the same raw `status: "approved"`, distinguished only by
`draftApproved`. `stage` is derived at read time (same pattern as the
campaign `displayStatus`) so you never need to reason about that yourself:

| `stage` | Raw status(es) it covers | Meaning |
|---|---|---|
| `active` | `approved` (with `draftApproved: false`) | Assigned, needs to submit content |
| `pending` | `draft_submitted` | Content submitted, awaiting merchant review |
| `completed` | `approved` (with `draftApproved: true`), `verifying` | Draft approved — ready to post live, or already posted and awaiting merchant verification |
| `published` | `published` | Live and verified |
| `rejected` | `rejected` | Draft or publication rejected by the merchant — no resubmission path exists today |

If `stage` is omitted, all tasks are returned with a `summary: { active,
pending, completed, published }` count (rejected isn't in the 4-tab summary,
but still appears in `result` and is filterable via `?stage=rejected`).
`status` still works as a raw-status filter if you need it, but prefer
`stage` for anything UI-facing.

```
GET /creator/task
Auth: creator
Query: applicationId — required
```

Both populate `campaign` (name, about, **endDate**, videoLengthSec,
pricePerClaim), `campaign.business` one level deeper (name, logo), and
`campaign.merchant` one level deeper (name) — so the deadline ("Deadline:
May 30") and who to contact ("Sent to Hodan Abdi for review") are available
without extra calls. Both responses also include the derived `stage` field
described above.

```
PATCH /creator/submit-draft
Auth: creator
Body (JSON): { "applicationId": "<id>", "draftVideoUrl": "https://...", "draftMediaType": "video", "caption": "Best Pizza in Mogadishu! 🔥 #SomSpot", "platform": "tiktok" }
```

| Field | Required | Notes |
|---|---|---|
| `applicationId` | yes | |
| `draftVideoUrl` | yes | **not a file upload**, a plain string. Host the file elsewhere (image or video) and paste the link — the field name predates image support, it now holds either. |
| `draftMediaType` | no | `video` or `image` — backs the Figma "Upload Video" / "Upload Image" choice on Submit Content. Defaults to `video` if omitted. |
| `caption` | no | the social caption shown alongside the content on the merchant's Content tab |
| `platform` | no | `tiktok`, `instagram`, `facebook`, `youtube`, or `x` — backs the "TikTok Video" badge on the Content tab card and the "Select platform" step on Social Media Post. Nothing else on the record can tell you this reliably. |

Only works while the task is `approved` and no draft has been approved yet.

```
PATCH /creator/submit-post
Auth: creator
Body (JSON): { "applicationId": "<id>", "postUrl": "https://tiktok.com/...", "caption": "Optional — updates the caption too" }
```

| Field | Required | Notes |
|---|---|---|
| `applicationId` | yes | |
| `postUrl` | yes | |
| `caption` | no | overwrites the draft's caption if you want to tweak wording for the live post |

Only works once the merchant has approved the draft (step 6).

</details>

<a id="step-6"></a>
<details open>
<summary><b>Step 6 · PATCH /campaign/review-draft</b> — merchant reviews the draft</summary>

```
Auth: merchant
Body (JSON): { "applicationId": "<id>", "action": "approve", "merchantNote": "Looks great!" }
```

| Field | Required | Notes |
|---|---|---|
| `applicationId` | yes | |
| `action` | yes | `approve` or `reject` |
| `merchantNote` | no | |

Only works while the task is `draft_submitted`. Approving sets
`draftApproved: true` and flips the task back to `approved` — ready for the
creator's `submit-post` (step 5).

</details>

<a id="step-7"></a>
<details open>
<summary><b>Step 7 · PATCH /campaign/verify-publication</b> — verify the live post, pay the creator</summary>

```
Auth: merchant or admin
Body (JSON): { "applicationId": "<id>", "action": "approve" }
```

| Field | Required | Notes |
|---|---|---|
| `applicationId` | yes | |
| `action` | yes | `approve` or `reject` |

Only works while the task is `verifying`. Approving → `published` + creates
an `Earning` record (pays `commissionAmount` into the creator's wallet).
Rejecting → `rejected`.

Check it landed: `GET /creator/wallet` (auth: creator) —
`totalEarnings` / `availableBalance` / `paidOut` / `pendingPayout` +
`recentCommissions`. See [Creator wallet & home dashboard](#ref-wallet)
below for the full shape.

</details>

---

## Reference — reading & managing campaigns

<a id="ref-my"></a>
<details>
<summary><b>GET /campaign/my</b> — merchant's own list</summary>

Auth: merchant.

| Query param | Notes |
|---|---|
| `status` | raw stored value only: `pending_review` · `live` · `rejected` · `paused` · `completed`. There is **no** literal `"approved"` — an "Approved" tab should send `status=live`. |
| `searchTerm` | matches campaign `name` |
| `page`, `limit`, `sort`, `fields` | standard |

Response: `{ meta, summary: {active, inReview}, result }`. Each item in
`result` also carries computed (not stored) fields: `assignedCount`,
`neededCreators`, `totalBudget`, `spentBudget`, `submittedContentCount`,
`daysLeft`, `displayStatus`, `timeline`.

</details>

<a id="ref-get"></a>
<details>
<summary><b>GET /campaign/get</b> — single campaign, full detail</summary>

Auth: merchant (owner only) or admin. Query: `campaignId` (required).

Same computed fields as `/campaign/my`, plus populated `business` (name,
logo, address, phone, and **`business.category`** populated one level
deeper — name/slug/icon), `merchant` (name, email, phoneNumber), `offer`,
`invitedCreator`, `influencerCategory`. This is the admin Campaign Info tab
— Merchant Information + Category all come from this one call.

</details>

<a id="ref-update"></a>
<details>
<summary><b>PATCH /campaign/update</b> — edit a campaign (every updatable field)</summary>

Auth: merchant (owner) or admin. Body requires `campaignId`; every other
field is optional — only fields present in the body get changed.

**Every updatable field:**

`name` · `about` · `goal` · `objective` · `contentType` · `influencerCategory` ·
`startDate` · `endDate` · `contentRequirements` · `invitedCreator` ·
`videoLengthSec` (also recalculates `pricePerClaim`) · `targetCreators` ·
`offer` · `status`

**`status` rules:**
- **Merchant**: may only set `paused` or `completed`, and only while the
  campaign is currently `live`. Anything else (including trying to set
  `live`/`rejected` directly) → `403`, pointing at `/campaign/admin/review`.
- **Admin**: no restriction on this endpoint — in practice, use
  `/campaign/admin/review` instead so the staffing check still applies.

</details>

<a id="ref-delete"></a>
<details>
<summary><b>DELETE /campaign/delete</b></summary>

Auth: merchant (owner) or admin. Query: `campaignId` (required).

</details>

<a id="ref-apps"></a>
<details>
<summary><b>GET /campaign/applications</b> — Influencers tab AND Content tab (same endpoint, one query param apart)</summary>

Auth: merchant (owner) or admin. Query: `campaignId` (required), `page`,
`limit`.

| Screen | Call |
|---|---|
| **Influencers tab** — every assigned creator | `GET /campaign/applications?campaignId=<id>` |
| **Content tab** — only creators who've submitted content | `GET /campaign/applications?campaignId=<id>&hasContent=true` |

Both return the exact same item shape — `hasContent=true` just adds a filter
on top. Each result's `creator` includes `name`, `profile_image`, and
`category` (populated `name`/`slug`/`icon`) — the "Ahmed Hassan • Food
Creator" line. `category` is looked up from the separate Creator profile and
merged in, since `CampaignApplication.creator` refs `User`, not `Creator`.

**Don't filter the Content tab by `status=draft_submitted`** — it looks
right but silently drops content you've already reviewed. Once you approve
a draft, `status` reverts to `"approved"` — the exact same value a
never-submitted creator has — even though `draftVideoUrl`/`caption` are
still sitting right there on the record. `hasContent=true` checks whether
`draftVideoUrl` actually exists instead, so already-reviewed content stays
visible.

Can't be used to change assignments — that's admin-only, via
`/campaign/admin/assign-creator`.

</details>

<a id="ref-app"></a>
<details>
<summary><b>GET /campaign/application</b> — one submission's full detail (Content tab → tap a card)</summary>

Auth: merchant (owner) or admin. Query: `applicationId` (required).

Same shape and enrichment as one item from `/campaign/applications` (creator
name/photo/category populated), fetched directly by id instead of paging
through the list — for deep links or refreshing a single detail screen
without re-fetching everything.

</details>

<a id="ref-merchant-view"></a>
<details>
<summary><b>GET /creator/merchant/get</b> — merchant's "View Profile" on the Influencers tab</summary>

Auth: merchant. Query: `userId` — required, the creator's `User._id`.

Same response shape as the admin picker's profile (`bio`, `category`,
self-reported `followerCount`/`engagementRate`, `activeCount`/`pendingCount`/
`doneCount`) — but scoped: `403` unless that creator is actually assigned to
one of *your* campaigns. Not open browsing like `/creator/admin/get`.

</details>

<a id="ref-admin-list"></a>
<details>
<summary><b>GET /campaign/admin/list</b> — every campaign, all merchants</summary>

Auth: admin.

| Query param | Notes |
|---|---|
| `status` | **derived**, not raw — see mapping below |
| `business` | filter to one business's campaigns |
| `searchTerm` | matches campaign `name` |
| `page`, `limit` | standard |

Response: `{ meta, summary, result }`. `summary` = `{total, pendingApproval,
influencersAssigned, approved, active, rejected, completed}` — counts across
every matching campaign, for tab badges. Each row's `business` includes
nested-populated `business.category` (name/slug/icon), and `merchant`
includes name/email/phoneNumber.

**Derived `status` mapping** — nothing here is stored, computed per request:

| Raw stored status | Condition | Derived `displayStatus` |
|---|---|---|
| `pending_review` | `assignedCount < targetCreators` | `pending_approval` |
| `pending_review` | `assignedCount >= targetCreators` | `influencers_assigned` |
| `live` | today outside `startDate`–`endDate` | `approved` |
| `live` | today within `startDate`–`endDate` (or no dates set) | `active` |
| `rejected` / `paused` / `completed` | — | passes through unchanged |

</details>

<a id="ref-wallet"></a>
<details>
<summary><b>Creator wallet & home dashboard</b> — GET /creator/wallet, /creator/wallet/analytics, /creator/dashboard</summary>

**A note on what's real vs. not included:** the Wallet Analytics and Home
screens in Figma also show "Total Views," "Total Clicks," and "Top
Performing Content" — those are TikTok/Instagram metrics and there's no
social API integration wired up to source them (same situation as
`followerCount`/`engagementRate` on the creator profile, which are
self-reported for the same reason). Per your call, these are **left out**
rather than faked or guessed at — everything below is either read straight
from the ledger or computed from real, linked records.

```
GET /creator/wallet
Auth: creator
```
Wallet screen 1 (balance + recent commissions):

| Field | Source |
|---|---|
| `availableBalance` | sum of `Earning` where `status: "available"` |
| `totalEarnings` | sum of all `Earning` (available + paid) |
| `paidOut` | sum of `Earning` where `status: "paid"` |
| `pendingPayout` | sum of `Payout` where `status: "pending"` (an outstanding withdrawal request) |
| `recentCommissions` | last 10 `Earning` entries, each with the campaign's **business** name/logo, amount, date |

```
GET /creator/wallet/analytics
Auth: creator
Query (optional): period (7d | 30d | all, default 30d)
```
Wallet screen 2 ("Earnings this period"):

| Field | Source |
|---|---|
| `period` | echoes back the resolved period |
| `earningsThisPeriod` | sum of `Earning` created within the period |
| `claims` | count of `Claim` docs against the offer(s) linked to campaigns you've been assigned to, within the period — see note below |
| `earningsTrend` | always the last 6 calendar months (independent of `period` — Figma labels the chart "$ Monthly"), `[{ month: "2026-03", label: "Mar", total }]`, zero-filled for months with no earnings |

**Claims attribution note:** a `Claim` is recorded against an `Offer`, and a
`Campaign` links to one `Offer` — but a campaign can have several assigned
creators all promoting the *same* offer. There's no referral/coupon-code
system to say which specific creator's post drove which claim, so `claims`
counts every claim on offers linked to your campaigns, not claims
demonstrably caused by your content specifically.

```
GET /creator/dashboard
Auth: creator
```
Home screen — greeting, earnings summary, and open tasks, in one call:

| Field | Source |
|---|---|
| `name`, `profileImage` | `User.name` / `User.profile_image` |
| `location` | `User.address` |
| `unreadNotifications` | unread `Notification` count |
| `totalEarnings` | same as wallet's `totalEarnings` |
| `pendingPayout` | same as wallet's `pendingPayout` |
| `claims` | same as analytics' `claims`, lifetime (no period) |
| `activeTasks` | up to 5 tasks in stage `active` or `pending` (Completed/Published are excluded — this list is "things to do," not the full task history) |

Each `activeTasks` entry:
```json
{
  "_id": "...",
  "businessName": "Mogadishu Pizza",
  "campaignName": "Buy 1 Get 1 Free Promo",
  "stage": "pending",
  "statusLabel": "Pending merchant review",
  "platform": null,
  "contentType": "reel"
}
```
`statusLabel` is `"Pending merchant review"` (stage `pending`) or `"Ready
for content"` (stage `active`), matching the two badges on the Home screen.
`platform` is only non-null once the creator has actually submitted a draft
(it's part of what `submit-draft` records) — for an `active` task nothing
has been submitted yet, so there's no reliable source for a "TikTok Video"
style label; `contentType` (from the campaign, e.g. `reel`/`story`) is the
closest real field available. If you want a platform shown before
submission, that would need to be captured at assign-time — flag it if you
want that added.

</details>

---

## Enum cheat sheet

| Enum | Values |
|---|---|
| Campaign `status` (raw, stored) | `pending_review` · `live` · `rejected` · `paused` · `completed` |
| Campaign `objective` | `awareness` · `traffic` · `offer` · `lead_generation` |
| Campaign `contentType` | `video_ad` · `product_review` · `reel` · `story` |
| Task (`CampaignApplication`) `status` (raw, stored) | `approved` · `draft_submitted` · `verifying` · `published` · `rejected` |
| Task `stage` (derived, `GET /creator/tasks` and `/creator/task` only) | `active` · `pending` · `completed` · `published` · `rejected` |
| Category `type` | `merchant` · `creator` |
| Social / content `platform` | `tiktok` · `instagram` · `facebook` · `youtube` · `x` |
| Content `draftMediaType` | `video` · `image` |
