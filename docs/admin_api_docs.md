# Complete Admin Dashboard API Documentation — SomSpot

> **Route Prefix Note**: In this backend (`src/app.ts`), routes are mounted directly at the root `app.use("/", routes)`. 
> Do **NOT** include `/api/v1`. Access endpoints using `http://localhost:8000/admin/analytics` or using Postman variable `{{baseUrl}}/admin/analytics`.
> 
> 🔒 **Authentication Note**: All admin endpoints require `Authorization: Bearer <ADMIN_JWT_TOKEN>` obtained via admin login (`POST {{baseUrl}}/auth/login`).

---

## 1. Dashboard & Analytics

### 1.1 Get Platform Analytics
- **Route**: `GET {{baseUrl}}/admin/analytics`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: None
- **Description**: Returns all high-level metric counts, financial totals, category breakdown, monthly growth trends, and recent platform activities.
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Platform analytics retrieved",
  "data": {
    "users": {
      "consumers": 1420,
      "merchants": 85,
      "creators": 42
    },
    "businesses": {
      "total": 98,
      "pending": 6,
      "approved": 92
    },
    "offers": {
      "active": 45
    },
    "claims": {
      "total": 310,
      "redeemed": 198
    },
    "campaigns": {
      "live": 12
    },
    "reviews": {
      "total": 520
    },
    "payouts": {
      "pending": 3
    },
    "estRevenue": 15400.00,
    "pendingVerifications": [
      {
        "_id": "6a7965d5f792519d4eada806",
        "name": "Banaadir Coffee House",
        "status": "pending",
        "createdAt": "2026-08-18T10:15:30.000Z"
      }
    ],
    "categoryDistribution": [
      { "category": "Restaurants", "count": 34 },
      { "category": "Grocery", "count": 22 },
      { "category": "Fashion", "count": 18 }
    ],
    "influencer": {
      "creators": 42,
      "publishedTasks": 28,
      "totalCommissions": 4200.00
    },
    "merchantActivity": [
      { "date": "2026-08-15", "count": 3 },
      { "date": "2026-08-16", "count": 5 },
      { "date": "2026-08-17", "count": 2 }
    ],
    "usersTrend": [
      { "month": "2026-03", "count": 120 },
      { "month": "2026-04", "count": 250 },
      { "month": "2026-05", "count": 410 }
    ],
    "revenueTrend": [
      { "month": "2026-03", "total": 1200.00 },
      { "month": "2026-04", "total": 2800.00 },
      { "month": "2026-05", "total": 4500.00 }
    ],
    "activeSubscriptions": 78,
    "recentActivity": [
      {
        "_id": "6a7965d5f792519d4eada808",
        "offer": { "title": "20% Off Family Platter" },
        "user": { "name": "Abdul Karim" },
        "status": "redeemed",
        "createdAt": "2026-08-18T14:20:00.000Z"
      }
    ]
  }
}
```

---

### 1.2 Get Admin Profile
- **Route**: `GET {{baseUrl}}/admin/profile`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Admin retrieved successfully",
  "data": {
    "_id": "6a7965d4f792519d4eada900",
    "authId": {
      "_id": "6a7965d4f792519d4eada8ff",
      "name": "Super Admin",
      "email": "admin@somspot.so",
      "role": "ADMIN"
    },
    "name": "Super Admin",
    "email": "admin@somspot.so",
    "phoneNumber": "+252610000000",
    "profile_image": "uploads/admin_avatar.png",
    "address": "Mogadishu HQ"
  }
}
```

---

### 1.3 Edit Admin Profile
- **Route**: `PATCH {{baseUrl}}/admin/edit-profile`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Body Format**: 📸 **`multipart/form-data`**
- **Form Data Fields**:
  - `profile_image` *(File, optional)*: Image file (`.jpg`, `.png`)
  - `name` *(Text, optional)*: `"Super Admin"`
  - `phoneNumber` *(Text, optional)*: `"+252610000000"`
  - `address` *(Text, optional)*: `"Mogadishu HQ, Maka Al Mukarama"`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "6a7965d4f792519d4eada900",
    "name": "Super Admin",
    "email": "admin@somspot.so",
    "phoneNumber": "+252610000000",
    "profile_image": "uploads/profile_image-171829381.jpg",
    "address": "Mogadishu HQ, Maka Al Mukarama"
  }
}
```

---

## 2. User Management

### 2.1 Get Paginated Users List
- **Route**: `GET {{baseUrl}}/user/admin/list`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `page=1`, `limit=10`, `searchTerm=ahmed`, `status=active` *(optional: active | blocked)*, `role=USER` *(optional)*
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Users retrieved",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d4f792519d4eada800",
        "authId": {
          "_id": "6a7965d4f792519d4eada7ff",
          "email": "abdul.karim@example.com",
          "role": "USER",
          "isBlocked": false,
          "isActive": true,
          "phoneNumber": "+252612345678"
        },
        "name": "Abdul Karim",
        "email": "abdul.karim@example.com",
        "phoneNumber": "+252612345678",
        "profile_image": "https://cdn.somspot.so/profiles/abdul_karim.png",
        "saved": 12,
        "claimed": 5,
        "savedCount": 12,
        "claimedCount": 5,
        "status": "active",
        "createdAt": "2026-08-10T05:47:01.436Z"
      }
    ]
  }
}
```

---

### 2.2 Get User Details (3 Tabs: Profile Info, Saved Businesses, Claimed Offers)
- **Route**: `GET {{baseUrl}}/user/admin/details`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `userId=6a7965d4f792519d4eada800`
- **Description**: Returns complete user profile info along with tab 2 (`savedBusinesses`) and tab 3 (`claimedOffers`) arrays matching the Figma User Details screen tabs.
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User retrieved",
  "data": {
    "user": {
      "_id": "6a7965d4f792519d4eada800",
      "name": "Ahmed Hassan",
      "email": "ahmed@example.com",
      "phoneNumber": "+252 61 123 4567",
      "profile_image": "https://cdn.somspot.so/profiles/ahmed_hassan.png",
      "address": "Mogadishu, Somalia",
      "status": "active",
      "createdAt": "2024-01-15T00:00:00.000Z",
      "authId": {
        "_id": "6a7965d4f792519d4eada7ff",
        "email": "ahmed@example.com",
        "role": "USER",
        "isBlocked": false,
        "isActive": true
      }
    },
    "savedBusinesses": [
      {
        "_id": "6a7965d5f792519d4eada80e",
        "businessName": "Mogadishu Restaurant",
        "category": "Restaurant",
        "savedDate": "2024-05-01T00:00:00.000Z",
        "business": {
          "_id": "6a7965d5f792519d4eada806",
          "name": "Mogadishu Restaurant",
          "logo": "https://cdn.somspot.so/businesses/hilib_logo.png",
          "category": {
            "name": "Restaurant",
            "slug": "restaurant"
          }
        },
        "createdAt": "2024-05-01T00:00:00.000Z"
      }
    ],
    "claimedOffers": [
      {
        "_id": "6a7965d5f792519d4eada808",
        "offerTitle": "20% Off Pizza",
        "businessName": "Mogadishu Restaurant",
        "claimedDate": "2024-05-18T00:00:00.000Z",
        "status": "redeemed",
        "code": "SOM-84291",
        "offer": {
          "_id": "6a7965d5f792519d4eada809",
          "title": "20% Off Pizza"
        },
        "business": {
          "_id": "6a7965d5f792519d4eada806",
          "name": "Mogadishu Restaurant"
        },
        "createdAt": "2024-05-18T00:00:00.000Z"
      }
    ],
    "activity": {
      "savedCount": 3,
      "claimsCount": 3,
      "reviewsCount": 2
    }
  }
}
```

---

### 2.3 Block / Unblock User Account
- **Route**: `PATCH {{baseUrl}}/user/admin/block`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "userId": "6a7965d4f792519d4eada800",
  "isBlocked": true
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User status updated",
  "data": {
    "userId": "6a7965d4f792519d4eada800",
    "isBlocked": true
  }
}
```

---

### 2.4 Delete User Account (Newly Added)
- **Route**: `DELETE {{baseUrl}}/user/admin/delete?userId=6a7965d4f792519d4eada800` OR `DELETE {{baseUrl}}/user/admin/delete`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Query Filter / Body Payload**: `userId=6a7965d4f792519d4eada800` OR `{ "userId": "6a7965d4f792519d4eada800" }`
- **Description**: Permanently deletes a user account, auth credentials, and cleans up associated claims, saved entries, and reviews.
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User account deleted successfully",
  "data": {
    "userId": "6a7965d4f792519d4eada800",
    "deleted": true
  }
}
```

---

## 3. Merchant Management

### 3.1 Get Paginated Merchants List
- **Route**: `GET {{baseUrl}}/merchant/admin/list`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `page=1`, `limit=10`, `searchTerm=restaurant`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Merchants retrieved",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d4f792519d4eada810",
        "user": {
          "_id": "6a7965d4f792519d4eada809",
          "name": "Hassan Ali",
          "email": "hassan.merchant@example.com"
        },
        "authId": {
          "_id": "6a7965d4f792519d4eada808",
          "isBlocked": false,
          "isActive": true
        },
        "businessName": "Hilib Macaan Restaurant",
        "business": {
          "_id": "6a7965d5f792519d4eada806",
          "status": "approved",
          "logo": "https://cdn.somspot.so/businesses/hilib_logo.png"
        },
        "subscription": {
          "plan": "premium",
          "status": "active",
          "endDate": "2026-12-31T23:59:59.000Z"
        }
      }
    ]
  }
}
```

---

### 3.2 Get Merchant Details & Businesses
- **Route**: `GET {{baseUrl}}/merchant/admin/details`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `merchantId=6a7965d4f792519d4eada810`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Merchant retrieved",
  "data": {
    "merchant": {
      "_id": "6a7965d4f792519d4eada810",
      "user": {
        "name": "Hassan Ali",
        "email": "hassan.merchant@example.com",
        "phoneNumber": "+252615554433"
      }
    },
    "businesses": [
      {
        "_id": "6a7965d5f792519d4eada806",
        "name": "Hilib Macaan Restaurant",
        "status": "approved",
        "address": "Maka Al Mukarama Road, Mogadishu"
      }
    ],
    "offersCount": 8,
    "activeSubscription": {
      "plan": "premium",
      "status": "active"
    }
  }
}
```

---

### 3.3 Block / Unblock Merchant Account
- **Route**: `PATCH {{baseUrl}}/merchant/admin/block`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "merchantId": "6a7965d4f792519d4eada810",
  "isBlocked": true
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Merchant status updated",
  "data": {
    "merchantId": "6a7965d4f792519d4eada810",
    "isBlocked": true
  }
}
```

---

## 4. Creator / Influencer Management

### 4.1 Get Paginated Creators List
- **Route**: `GET {{baseUrl}}/creator/admin/list`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `page=1`, `limit=10`, `searchTerm=ahmed`, `category=6a7965d4f792519d4eada7fe` *(optional)*
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Creators retrieved",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada805",
        "user": {
          "_id": "6a7965d5f792519d4eada804",
          "name": "Ahmed Hassan",
          "profile_image": "https://cdn.somspot.so/profiles/ahmed_hassan.png",
          "email": "ahmed.creator@example.com"
        },
        "category": {
          "_id": "6a7965d4f792519d4eada7fe",
          "name": "Food Creator",
          "slug": "food-creator"
        },
        "bio": "Mogadishu's top food reviewer & creator",
        "followerCount": 50000,
        "engagementRate": 8.5,
        "socials": [
          { "platform": "tiktok", "handle": "@ahmedeats", "followers": 35000 }
        ],
        "activeCount": 2,
        "pendingCount": 1,
        "doneCount": 5
      }
    ]
  }
}
```

---

### 4.2 Get Creator Profile Details & Activity
- **Route**: `GET {{baseUrl}}/creator/admin/get`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `userId=6a7965d5f792519d4eada804`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Creator profile retrieved",
  "data": {
    "_id": "6a7965d5f792519d4eada805",
    "user": {
      "_id": "6a7965d5f792519d4eada804",
      "name": "Ahmed Hassan",
      "email": "ahmed.creator@example.com",
      "profile_image": "https://cdn.somspot.so/profiles/ahmed_hassan.png"
    },
    "category": {
      "name": "Food Creator",
      "slug": "food-creator"
    },
    "bio": "Mogadishu's top food reviewer & creator",
    "followerCount": 50000,
    "engagementRate": 8.5,
    "activeCount": 2,
    "pendingCount": 1,
    "doneCount": 5
  }
}
```

---

## 5. Business Management

### 5.1 Get All Business Listings (Approved / Pending / Rejected)
- **Route**: `GET {{baseUrl}}/business/admin/list`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `page=1`, `limit=10`, `status=pending` *(optional: pending | approved | rejected)*
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Businesses retrieved",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada806",
        "name": "Banaadir Coffee House",
        "owner": {
          "name": "Omar Jama",
          "email": "omar@banaadir.so"
        },
        "category": {
          "name": "Cafes & Coffee"
        },
        "address": "Liido Beach Road, Mogadishu",
        "status": "pending",
        "logo": "https://cdn.somspot.so/businesses/banaadir_logo.png",
        "createdAt": "2026-08-18T10:15:30.000Z"
      }
    ]
  }
}
```

---

### 5.2 Approve or Reject Business Submission
- **Route**: `PATCH {{baseUrl}}/business/verify`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload (Approve)**:
```json
{
  "businessId": "6a7965d5f792519d4eada806",
  "action": "approve"
}
```
- **Body Payload (Reject)**:
```json
{
  "businessId": "6a7965d5f792519d4eada806",
  "action": "reject",
  "rejectionReason": "Invalid business license documentation provided."
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Business approved successfully",
  "data": {
    "_id": "6a7965d5f792519d4eada806",
    "name": "Banaadir Coffee House",
    "status": "approved"
  }
}
```

---

## 6. Campaign (Influencer) Management

### 6.1 Get All Campaigns
- **Route**: `GET {{baseUrl}}/campaign/admin/list`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `page=1`, `limit=10`, `status=pending_review` *(optional: pending_review | live | completed | rejected)*
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Campaigns retrieved",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada80b",
        "name": "Summer Food Promo",
        "business": {
          "name": "Hilib Macaan Restaurant",
          "logo": "https://cdn.somspot.so/businesses/hilib_logo.png"
        },
        "influencerCategory": {
          "name": "Food Creator"
        },
        "influencerCount": 2,
        "videoLengthSec": 30,
        "price": 100.00,
        "status": "pending_review",
        "assignedCreators": [
          {
            "_id": "6a7965d5f792519d4eada804",
            "name": "Ahmed Hassan"
          }
        ],
        "createdAt": "2026-08-15T08:00:00.000Z"
      }
    ]
  }
}
```

---

### 6.2 Assign Creator to Pending Campaign
- **Route**: `POST {{baseUrl}}/campaign/admin/assign-creator`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "campaignId": "6a7965d5f792519d4eada80b",
  "creatorId": "6a7965d5f792519d4eada804"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Creator assigned to campaign successfully",
  "data": {
    "_id": "6a7965d5f792519d4eada80b",
    "name": "Summer Food Promo",
    "influencerCount": 2,
    "assignedCreatorsCount": 2
  }
}
```

---

### 6.3 Approve or Reject Staffed Campaign
- **Route**: `PATCH {{baseUrl}}/campaign/admin/review`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "campaignId": "6a7965d5f792519d4eada80b",
  "action": "approve"
}
```
- **Description**: Note that all required creator slots (`influencerCount`) must be filled before approving a campaign.
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Campaign approved and is now live",
  "data": {
    "_id": "6a7965d5f792519d4eada80b",
    "status": "live"
  }
}
```

---

### 6.4 Verify Creator Published Post & Release Earnings
- **Route**: `PATCH {{baseUrl}}/campaign/verify-publication`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>` (or Merchant)
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "applicationId": "6a7965d5f792519d4eada80c",
  "action": "approve"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Publication verified and creator earnings released",
  "data": {
    "_id": "6a7965d5f792519d4eada80c",
    "status": "published"
  }
}
```

---

## 7. Offers & Promotions

### 7.1 Get All Platform Offers
- **Route**: `GET {{baseUrl}}/offer/admin/list`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `page=1`, `limit=10`, `status=active`, `searchTerm=family`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Offers retrieved",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada809",
        "title": "20% Off Family Platter",
        "discountLabel": "20% OFF",
        "business": {
          "_id": "6a7965d5f792519d4eada806",
          "name": "Hilib Macaan Restaurant",
          "logo": "https://cdn.somspot.so/businesses/hilib_logo.png"
        },
        "startAt": "2026-08-01T00:00:00.000Z",
        "endAt": "2026-08-30T23:59:59.000Z",
        "status": "active"
      }
    ]
  }
}
```

---

## 8. Review Moderation

### 8.1 Moderate Customer Review (Approve / Hide / Delete)
- **Route**: `PATCH {{baseUrl}}/review/admin/moderate`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload (Approve / Make Visible)**:
```json
{
  "reviewId": "6a7965d5f792519d4eada80d",
  "action": "approve"
}
```
- **Body Payload (Hide Review)**:
```json
{
  "reviewId": "6a7965d5f792519d4eada80d",
  "action": "hide"
}
```
- **Body Payload (Delete Review)**:
```json
{
  "reviewId": "6a7965d5f792519d4eada80d",
  "action": "delete"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Review moderated",
  "data": {
    "_id": "6a7965d5f792519d4eada80d",
    "moderationStatus": "visible"
  }
}
```

---

## 9. Subscriptions, Payments & Payouts

### 9.1 Get Merchant Subscriptions List
- **Route**: `GET {{baseUrl}}/subscription/admin/list`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `page=1`, `limit=10`, `status=active`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Subscriptions retrieved",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada910",
        "merchant": {
          "name": "Hassan Ali",
          "email": "hassan.merchant@example.com"
        },
        "plan": "premium",
        "price": 49.99,
        "status": "active",
        "startDate": "2026-08-01T00:00:00.000Z",
        "endDate": "2026-09-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### 9.2 Get All Payments List
- **Route**: `GET {{baseUrl}}/payment/admin/list`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `page=1`, `limit=10`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Payments retrieved",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada915",
        "merchant": {
          "name": "Hassan Ali",
          "email": "hassan.merchant@example.com"
        },
        "amount": 49.99,
        "currency": "USD",
        "paymentMethod": "card",
        "transactionId": "txn_8492019482",
        "status": "succeeded",
        "createdAt": "2026-08-01T00:05:00.000Z"
      }
    ]
  }
}
```

---

### 9.3 Get Payment Details
- **Route**: `GET {{baseUrl}}/payment/admin/details`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `paymentId=6a7965d5f792519d4eada915`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Payment retrieved",
  "data": {
    "_id": "6a7965d5f792519d4eada915",
    "amount": 49.99,
    "currency": "USD",
    "paymentMethod": "card",
    "transactionId": "txn_8492019482",
    "status": "succeeded",
    "merchant": {
      "name": "Hassan Ali",
      "email": "hassan.merchant@example.com"
    },
    "createdAt": "2026-08-01T00:05:00.000Z"
  }
}
```

---

### 9.4 Get Creator Payout Requests
- **Route**: `GET {{baseUrl}}/creator/payout/list`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `page=1`, `limit=10`, `status=pending`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Payouts retrieved",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada925",
        "creator": {
          "_id": "6a7965d5f792519d4eada804",
          "name": "Ahmed Hassan",
          "email": "ahmed.creator@example.com"
        },
        "amount": 150.00,
        "method": "mobile_money",
        "note": "Zaad number +252612345678",
        "status": "pending",
        "createdAt": "2026-08-18T09:00:00.000Z"
      }
    ]
  }
}
```

---

### 9.5 Process Creator Payout (Approve / Reject)
- **Route**: `PATCH {{baseUrl}}/creator/payout/process`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload (Approve / Mark Paid)**:
```json
{
  "payoutId": "6a7965d5f792519d4eada925",
  "action": "approve"
}
```
- **Body Payload (Reject Payout)**:
```json
{
  "payoutId": "6a7965d5f792519d4eada925",
  "action": "reject"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Payout processed",
  "data": {
    "_id": "6a7965d5f792519d4eada925",
    "amount": 150.00,
    "status": "paid",
    "processedAt": "2026-08-18T10:00:00.000Z"
  }
}
```

---

## 10. Categories Management (Global)

### 10.1 Get All Categories
- **Route**: `GET {{baseUrl}}/category/get-all`
- **Auth**: Public / Admin
- **Query Filters**: `type=merchant` OR `type=creator`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Categories retrieved successfully",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 2, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d4f792519d4eada7fb",
        "name": "Restaurants",
        "slug": "restaurants",
        "icon": "uploads/icons/restaurant.png",
        "type": "merchant",
        "order": 1,
        "isActive": true
      }
    ]
  }
}
```

---

### 10.2 Create New Category
- **Route**: `POST {{baseUrl}}/category/create`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Body Format**: 📸 **`multipart/form-data`**
- **Form Data Fields**:
  - `name` *(Text, required)*: `"Bakeries & Desserts"`
  - `type` *(Text, required)*: `"merchant"` | `"creator"`
  - `icon` *(File, optional)*: Icon file (`.png`, `.svg`)
  - `order` *(Text/Number, optional)*: `3`
- **Success Response (`201 Created`)**:
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Category created successfully",
  "data": {
    "_id": "6a7965d4f792519d4eada7fd",
    "name": "Bakeries & Desserts",
    "slug": "bakeries-desserts",
    "type": "merchant",
    "icon": "uploads/icons/bakery.png",
    "order": 3,
    "isActive": true
  }
}
```

---

### 10.3 Update Category
- **Route**: `PATCH {{baseUrl}}/category/update`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Body Format**: 📸 **`multipart/form-data`**
- **Form Data Fields**:
  - `categoryId` *(Text, required)*: `"6a7965d4f792519d4eada7fd"`
  - `name` *(Text, optional)*: `"Fine Dining & Bakeries"`
  - `icon` *(File, optional)*: Updated icon file
  - `isActive` *(Boolean/Text, optional)*: `true`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "_id": "6a7965d4f792519d4eada7fd",
    "name": "Fine Dining & Bakeries",
    "slug": "fine-dining-bakeries",
    "icon": "uploads/icons/fine_dining.png"
  }
}
```

---

### 10.4 Delete Category
- **Route**: `DELETE {{baseUrl}}/category/delete`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "categoryId": "6a7965d4f792519d4eada7fd"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Category deleted successfully",
  "data": {
    "deletedCount": 1
  }
}
```

---

## 11. Customer Support & Ticket Resolution

### 11.1 Get Support Tickets List
- **Route**: `GET {{baseUrl}}/feedback/admin/list`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `page=1`, `limit=10`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Feedbacks retrieved successfully",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "feedback": [
      {
        "_id": "6a7965d5f792519d4eada920",
        "user": "6a7965d4f792519d4eada800",
        "name": "Abdul Karim",
        "email": "abdul.karim@example.com",
        "subject": "App Issue",
        "feedback": "I need help with my claimed voucher at Hilib Macaan Restaurant.",
        "reply": null,
        "status": "pending",
        "createdAt": "2026-08-18T12:00:00.000Z"
      }
    ]
  }
}
```

---

### 11.2 Get Ticket Details
- **Route**: `GET {{baseUrl}}/feedback/admin/details`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `feedbackId=6a7965d5f792519d4eada920`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Feedback retrieved",
  "data": {
    "_id": "6a7965d5f792519d4eada920",
    "name": "Abdul Karim",
    "email": "abdul.karim@example.com",
    "subject": "App Issue",
    "feedback": "I need help with my claimed voucher at Hilib Macaan Restaurant.",
    "reply": null,
    "status": "pending"
  }
}
```

---

### 11.3 Reply to Support Ticket
- **Route**: `PATCH {{baseUrl}}/feedback/update-feedback-with-reply`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "feedbackId": "6a7965d5f792519d4eada920",
  "reply": "Hi Abdul, our team has verified your voucher code. You can now present it to the store."
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Feedback updated with reply successfully",
  "data": {
    "_id": "6a7965d5f792519d4eada920",
    "reply": "Hi Abdul, our team has verified your voucher code. You can now present it to the store.",
    "status": "replied"
  }
}
```

---

## 12. CMS (Terms, Privacy, FAQ, About Us & Contact Us)

### 12.1 Upsert Terms & Conditions
- **Route**: `POST {{baseUrl}}/manage/add-terms-conditions`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "title": "Terms and Service",
  "content": "<p>Welcome to SomSpot. By using our application...</p>"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Terms & conditions updated",
  "data": {
    "_id": "6a7965d5f792519d4eada928",
    "title": "Terms and Service",
    "content": "<p>Welcome to SomSpot. By using our application...</p>"
  }
}
```

---

### 12.2 Get Terms & Conditions
- **Route**: `GET {{baseUrl}}/manage/get-terms-conditions`
- **Auth**: Public
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Successful",
  "data": {
    "title": "Terms and Service",
    "content": "<p>Welcome to SomSpot. By using our application...</p>"
  }
}
```

---

### 12.3 Delete Terms & Conditions
- **Route**: `DELETE {{baseUrl}}/manage/delete-terms-conditions`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `id=6a7965d5f792519d4eada928`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Deletion Successful"
}
```

---

### 12.4 Upsert Privacy Policy
- **Route**: `POST {{baseUrl}}/manage/add-privacy-policy`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "title": "Privacy Policy",
  "content": "<p>Your privacy is important to us...</p>"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Privacy policy updated",
  "data": {
    "title": "Privacy Policy",
    "content": "<p>Your privacy is important to us...</p>"
  }
}
```

---

### 12.5 Get Privacy Policy
- **Route**: `GET {{baseUrl}}/manage/get-privacy-policy`
- **Auth**: Public
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Successful",
  "data": {
    "title": "Privacy Policy",
    "content": "<p>Your privacy is important to us...</p>"
  }
}
```

---

### 12.6 Delete Privacy Policy
- **Route**: `DELETE {{baseUrl}}/manage/delete-privacy-policy`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `id=6a7965d5f792519d4eada929`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Deletion Successful"
}
```

---

### 12.7 Upsert About Us
- **Route**: `POST {{baseUrl}}/manage/add-about-us`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "title": "About SomSpot",
  "content": "<p>SomSpot is Mogadishu's premier discovery platform...</p>"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "About Us updated",
  "data": {
    "title": "About SomSpot",
    "content": "<p>SomSpot is Mogadishu's premier discovery platform...</p>"
  }
}
```

---

### 12.8 Get About Us
- **Route**: `GET {{baseUrl}}/manage/get-about-us`
- **Auth**: Public
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Successful",
  "data": {
    "title": "About SomSpot",
    "content": "<p>SomSpot is Mogadishu's premier discovery platform...</p>"
  }
}
```

---

### 12.9 Delete About Us
- **Route**: `DELETE {{baseUrl}}/manage/delete-about-us`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `id=6a7965d5f792519d4eada92a`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Deletion Successful"
}
```

---

### 12.10 Create / Edit FAQ Entry
- **Route**: `POST {{baseUrl}}/manage/add-faq`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload (Create New FAQ)**:
```json
{
  "question": "How do I claim a discount voucher?",
  "description": "Simply browse to any active offer on SomSpot and tap the 'Claim Offer' button to generate your unique claim code."
}
```
- **Body Payload (Update Existing FAQ)**:
```json
{
  "id": "6a7965d5f792519d4eada930",
  "question": "How do I claim a discount voucher?",
  "description": "Updated FAQ description text."
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "FAQ created",
  "data": {
    "_id": "6a7965d5f792519d4eada930",
    "question": "How do I claim a discount voucher?",
    "description": "Simply browse to any active offer on SomSpot and tap the 'Claim Offer' button to generate your unique claim code."
  }
}
```

---

### 12.11 Get Paginated FAQ List
- **Route**: `GET {{baseUrl}}/manage/get-faq`
- **Auth**: Public
- **Query Filters**: `page=1`, `limit=10`, `searchTerm` *(optional)*
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "FAQ list retrieved successfully",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 2, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada930",
        "question": "How do I claim a discount voucher?",
        "description": "Simply browse to any active offer on SomSpot and tap the 'Claim Offer' button to generate your unique claim code."
      }
    ]
  }
}
```

---

### 12.12 Delete FAQ Entry
- **Route**: `DELETE {{baseUrl}}/manage/delete-faq`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `id=6a7965d5f792519d4eada930`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Deletion Successful"
}
```

---

### 12.13 Upsert Contact Us Info
- **Route**: `POST {{baseUrl}}/manage/add-contact-us`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "email": "support@somspot.so",
  "phone": "+252612345678",
  "address": "Mogadishu, Somalia"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Contact Us updated",
  "data": {
    "email": "support@somspot.so",
    "phone": "+252612345678",
    "address": "Mogadishu, Somalia"
  }
}
```

---

### 12.14 Get Contact Us Info
- **Route**: `GET {{baseUrl}}/manage/get-contact-us`
- **Auth**: Public
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Successful",
  "data": {
    "email": "support@somspot.so",
    "phone": "+252612345678",
    "address": "Mogadishu, Somalia"
  }
}
```

---

### 12.15 Delete Contact Us Info
- **Route**: `DELETE {{baseUrl}}/manage/delete-contact-us`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Query Filters**: `id=6a7965d5f792519d4eada935`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Deletion Successful"
}
```

---

## 13. System Notifications & Push Broadcast

### 13.1 Broadcast Push Notification
- **Route**: `POST {{baseUrl}}/notification/admin/broadcast`
- **Auth**: Bearer `<ADMIN_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "title": "Weekend Mega Offers Ready!",
  "message": "Check out new 50% discount vouchers available across Mogadishu.",
  "role": "USER"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Notification broadcast successfully",
  "data": {
    "sentCount": 1420
  }
}
```
