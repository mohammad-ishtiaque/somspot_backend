# API Improvements & Bug Fixes Walkthrough

Here is a summary of all the missing APIs, tweaks, and bug fixes I just implemented based on our plan!

## 1. Push Notifications
I have wired up notifications that automatically trigger to keep users in the loop:
- **Campaign Application**: The creator now receives a push notification when a merchant either Approves or Rejects their submitted draft video.
- **Review Moderation**: The user now receives a push notification when an admin Approves, Hides, or Deletes their business review.
- **Claim Redeemed**: A user now receives a push notification confirming their offer claim was successfully redeemed when the merchant scans their claim code.
- **Business Approval**: The merchant now receives a push notification when an admin Approves or Rejects their new business listing.

## 2. Profile Screen Counts (`/user/get-profile`)
The Profile API now checks the database directly and returns these counts in the response exactly as they appear in the Figma design:
- `savedCount`: Total saved businesses/offers.
- `claimsCount`: Total claimed offers.
- `reviewsCount`: Total reviews written.

## 3. Top Deals API (`/offer/top-deals`)
The Customer Home Screen can now call `GET /offer/top-deals`. This API automatically returns up to 10 live offers sorted from highest estimated value to lowest!

## 4. Trending Influencers (`/creator/trending`)
As a reminder, this API was already fully functional! It's available at `GET /creator/trending` and returns creators ranked by their follower count and engagement rating.

## 5. Creator Content (`/creator/content`)
As a reminder, this API is working perfectly. The reason you saw "no data" is because this route only returns content for creator tasks that have fully completed the campaign process and are set to `PUBLISHED` status.

## 6. Saved List Fix (`/saved/get-all`)
I updated the backend logic so that if the frontend calls `GET /saved/get-all` without a `type` query (or passes `?type=all`), it will now combine **both** saved businesses and saved offers together in one single list instead of defaulting to only businesses.

## 7. Language Change API (`/user/change-language`)
I added an explicit `PATCH /user/change-language` endpoint for updating the user's language preference. It accepts the payload:
```json
{
  "language": "so" // "en" | "so" | "ar"
}
```

## 8. Logout API (`/auth/logout`)
I added an explicit `POST /auth/logout` endpoint. If you decide to store tokens in cookies, it will automatically clear them. Otherwise, it simply responds with a success message instructing the client to clear their local storage.
