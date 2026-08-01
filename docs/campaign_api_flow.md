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
| [0d](#0d) | `PATCH` | `/creator/profile` | creator | Set creator niche/stats |
| [0d](#0d) | `POST` | `/creator/link-social` | creator | Link TikTok/Instagram |
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
| [ref](#ref-admin-list) | `GET` | `/campaign/admin/list` | admin | Every campaign, all merchants |
| [ref](#ref-merchant-view) | `GET` | `/creator/merchant/get` | merchant | "View Profile" — a creator assigned to your own campaign |

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
<summary><b>Step 0d · PATCH /creator/profile</b> + <b>POST /creator/link-social</b> — creator setup</summary>

Register a `CREATOR`-role account first (`POST /auth/register` →
`activate-account` → `login`). Then, optionally but recommended so the
creator shows up properly in the admin picker:

```
PATCH /creator/profile
Auth: creator
Body (JSON, all optional)
```

| Field | Required | Notes |
|---|---|---|
| `bio` | no | free text |
| `category` | no | a **creator**-type Category id (from 0a) — validated; `400 Invalid creator category` if it doesn't exist or is the wrong type |
| `followerCount` | no | self-reported number |
| `engagementRate` | no | self-reported percentage |

Response (and `GET /creator/profile`) returns `category` **populated**
(`name`/`slug`/`icon`), not just the raw id.

```
POST /creator/link-social
Auth: creator
Body (JSON): { "platform": "tiktok", "handle": "@ahmedeats", "url": "https://tiktok.com/@ahmedeats" }
```

| Field | Required | Notes |
|---|---|---|
| `platform` | yes | `tiktok` or `instagram` |
| `handle` | yes | |
| `url` | no | |

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
| `about` | no | free text |
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
Query (optional): status (approved | draft_submitted | verifying | published | rejected), page, limit
```

```
GET /creator/task
Auth: creator
Query: applicationId — required
```

Both populate `campaign` (name, about, videoLengthSec, pricePerClaim), and
`campaign.business` one level deeper (name, logo) — so the business name is
available without a second call.

```
PATCH /creator/submit-draft
Auth: creator
Body (JSON): { "applicationId": "<id>", "draftVideoUrl": "https://...", "caption": "Best Pizza in Mogadishu! 🔥 #SomSpot" }
```

| Field | Required | Notes |
|---|---|---|
| `applicationId` | yes | |
| `draftVideoUrl` | yes | **not a file upload**, a plain string. Host the video elsewhere and paste the link. |
| `caption` | no | the social caption shown alongside the video on the merchant's Content tab |

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
`totalEarnings` / `availableBalance` / `paidOut` + recent earnings.

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

Same computed fields as `/campaign/my`, plus populated `business`, `offer`,
`invitedCreator`, `influencerCategory`.

</details>

<a id="ref-update"></a>
<details>
<summary><b>PATCH /campaign/update</b> — edit a campaign (every updatable field)</summary>

Auth: merchant (owner) or admin. Body requires `campaignId`; every other
field is optional — only fields present in the body get changed.

**Every updatable field:**

`name` · `about` · `objective` · `contentType` · `influencerCategory` ·
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
<summary><b>GET /campaign/applications</b> — view assigned creators (read-only)</summary>

Auth: merchant (owner) or admin. Query: `campaignId` (required), `page`,
`limit`.

Each result's `creator` includes `name`, `profile_image`, and `category`
(populated `name`/`slug`/`icon`) — the "Ahmed Hassan • Food Creator" line.
`category` is looked up from the separate Creator profile and merged in,
since `CampaignApplication.creator` refs `User`, not `Creator`.

Can't be used to change assignments — that's admin-only, via
`/campaign/admin/assign-creator`.

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
every matching campaign, for tab badges.

**Derived `status` mapping** — nothing here is stored, computed per request:

| Raw stored status | Condition | Derived `displayStatus` |
|---|---|---|
| `pending_review` | `assignedCount < targetCreators` | `pending_approval` |
| `pending_review` | `assignedCount >= targetCreators` | `influencers_assigned` |
| `live` | today outside `startDate`–`endDate` | `approved` |
| `live` | today within `startDate`–`endDate` (or no dates set) | `active` |
| `rejected` / `paused` / `completed` | — | passes through unchanged |

</details>

---

## Enum cheat sheet

| Enum | Values |
|---|---|
| Campaign `status` (raw, stored) | `pending_review` · `live` · `rejected` · `paused` · `completed` |
| Campaign `objective` | `awareness` · `traffic` · `offer` · `lead_generation` |
| Campaign `contentType` | `video_ad` · `product_review` · `reel` · `story` |
| Task (`CampaignApplication`) `status` | `approved` · `draft_submitted` · `verifying` · `published` · `rejected` |
| Category `type` | `merchant` · `creator` |
| Social `platform` | `tiktok` · `instagram` |
