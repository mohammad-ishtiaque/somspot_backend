# Complete Customer (User) API Reference Guide — SomSpot

> **Route Prefix Note**: In this backend (`src/app.ts`), routes are mounted directly at the root `app.use("/", routes)`. 
> Do **NOT** include `/api/v1`. Access endpoints using `http://localhost:8000/user/profile` or using Postman variable `{{baseUrl}}/user/profile`.

---

## 1. Authentication & Account Onboarding

### 1.1 Register via Email
- **Route**: `POST {{baseUrl}}/auth/register`
- **Auth**: Public
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "role": "USER",
  "name": "Abdul Karim",
  "email": "abdul.karim@example.com",
  "password": "Passw0rd!",
  "confirmPassword": "Passw0rd!",
  "language": "en"
}
```
- **Success Response (`201 Created`)**:
```json
{
  "statusCode": 201,
  "success": true,
  "message": "User registered successfully. Please check your email for the activation code.",
  "data": {
    "_id": "6a7965d4f792519d4eada800",
    "name": "Abdul Karim",
    "email": "abdul.karim@example.com",
    "role": "USER",
    "isVerified": false
  }
}
```

---

### 1.2 Activate Account (Email OTP Verification)
- **Route**: `POST {{baseUrl}}/auth/activate-account`
- **Auth**: Public
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "email": "abdul.karim@example.com",
  "activationCode": "123456"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Account activated successfully",
  "data": {
    "isVerified": true
  }
}
```

---

### 1.3 Login via Email
- **Route**: `POST {{baseUrl}}/auth/login`
- **Auth**: Public
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "email": "abdul.karim@example.com",
  "password": "Passw0rd!"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "6a7965d4f792519d4eada800",
      "name": "Abdul Karim",
      "email": "abdul.karim@example.com",
      "role": "USER"
    }
  }
}
```

---

### 1.4 Phone OTP Login — Request OTP
- **Route**: `POST {{baseUrl}}/auth/phone/request-otp`
- **Auth**: Public
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "phoneNumber": "+252612345678"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "OTP sent successfully to phone number",
  "data": {
    "phoneNumber": "+252612345678"
  }
}
```

---

### 1.5 Phone OTP Login — Verify OTP
- **Route**: `POST {{baseUrl}}/auth/phone/verify-otp`
- **Auth**: Public
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "phoneNumber": "+252612345678",
  "verificationCode": "123456"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Phone login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "6a7965d4f792519d4eada800",
      "name": "Abdul Karim",
      "phoneNumber": "+252612345678",
      "role": "USER"
    }
  }
}
```

---

### 1.6 Change Password
- **Route**: `POST {{baseUrl}}/auth/change-password`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "oldPassword": "Passw0rd!",
  "newPassword": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Password changed successfully"
}
```

---

### 1.7 Logout Account (Newly Added)
- **Route**: `POST {{baseUrl}}/auth/logout`
- **Auth**: Public / Optional
- **Headers**: `Content-Type: application/json`
- **Description**: Clears the `refreshToken` HTTP-only cookie and instructs the client to clear stored JWT tokens.
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 1.8 Get Current Auth User Info (`/auth/me`)
- **Route**: `GET {{baseUrl}}/auth/me`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Current user",
  "data": {
    "authId": "6a7965d4f792519d4eada7ff",
    "userId": "6a7965d4f792519d4eada800",
    "email": "abdul.karim@example.com",
    "role": "USER",
    "isActive": true,
    "isProfileCompleted": true
  }
}
```

---

### 1.9 Resend Email Activation Code
- **Route**: `POST {{baseUrl}}/auth/activation-code-resend`
- **Auth**: Public
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "email": "abdul.karim@example.com"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Resent successfully"
}
```

---

### 1.10 Forgot Password — Request OTP
- **Route**: `POST {{baseUrl}}/auth/forgot-password`
- **Auth**: Public
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "email": "abdul.karim@example.com"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Check your email!"
}
```

---

### 1.11 Forgot Password — Verify OTP
- **Route**: `POST {{baseUrl}}/auth/forget-pass-otp-verify`
- **Auth**: Public
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "email": "abdul.karim@example.com",
  "code": "123456"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Code verified successfully"
}
```

---

### 1.12 Reset Password
- **Route**: `POST {{baseUrl}}/auth/reset-password`
- **Auth**: Public
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "email": "abdul.karim@example.com",
  "newPassword": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Password has been reset successfully."
}
```

---

## 2. User Profile & Account Settings

### 2.1 Get User Profile & Location (Updated with Figma Counts)
- **Route**: `GET {{baseUrl}}/user/profile`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Query Filters**: None
- **Body**: None
- **Description**: Returns full customer profile along with `lat`/`lng` coordinates and total count of saved items, claimed vouchers, and posted reviews.
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "_id": "6a7965d4f792519d4eada800",
    "authId": {
      "_id": "6a7965d4f792519d4eada7ff",
      "name": "Abdul Karim",
      "email": "abdul.karim@example.com",
      "role": "USER",
      "language": "en"
    },
    "name": "Abdul Karim",
    "email": "abdul.karim@example.com",
    "profile_image": "https://cdn.somspot.so/profiles/abdul_karim.png",
    "phoneNumber": "+252612345678",
    "language": "en",
    "address": "Maka Al Mukarama, Mogadishu",
    "isOnline": false,
    "locationCoordinates": {
      "type": "Point",
      "coordinates": [
        45.318161,
        2.046934
      ]
    },
    "lat": 2.046934,
    "lng": 45.318161,
    "savedCount": 5,
    "claimsCount": 3,
    "reviewsCount": 2,
    "createdAt": "2026-08-10T05:47:01.436Z",
    "updatedAt": "2026-08-10T05:47:01.436Z"
  }
}
```

---

### 2.2 Edit Profile & Upload Profile Picture / Update Coordinates
- **Route**: `PATCH {{baseUrl}}/user/edit-profile`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Body Format**: 📸 **`multipart/form-data`**
- **Form Data Fields**:
  - `profile_image` *(File, optional)*: Avatar file (`.png`, `.jpg`)
  - `name` *(Text, optional)*: `"Abdul Karim"`
  - `phoneNumber` *(Text, optional)*: `"+252612345678"`
  - `address` *(Text, optional)*: `"Maka Al Mukarama Road, Mogadishu"`
  - `lat` / `latitude` *(Text/Number, optional)*: `2.046934`
  - `lng` / `longitude` *(Text/Number, optional)*: `45.318161`
  - `language` *(Text, optional)*: `"en"` | `"so"` | `"ar"`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "6a7965d4f792519d4eada800",
    "name": "Abdul Karim",
    "profile_image": "uploads/profile_image-171829381.jpg",
    "phoneNumber": "+252612345678",
    "address": "Maka Al Mukarama Road, Mogadishu",
    "language": "en",
    "locationCoordinates": {
      "type": "Point",
      "coordinates": [
        45.318161,
        2.046934
      ]
    },
    "lat": 2.046934,
    "lng": 45.318161
  }
}
```

---

### 2.3 Rate App Modal (5-Star App Store Popup)
- **Route**: `POST {{baseUrl}}/user/rate-app`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "rating": 5,
  "comment": "Love using SomSpot to find local deals in Mogadishu!"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Thanks for rating SomSpot",
  "data": {
    "_id": "6a7965d5f792519d4eada901",
    "user": "6a7965d4f792519d4eada800",
    "rating": 5,
    "comment": "Love using SomSpot to find local deals in Mogadishu!"
  }
}
```

---

### 2.4 Delete My Account
- **Route**: `DELETE {{baseUrl}}/user/delete-account`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "email": "abdul.karim@example.com",
  "password": "Passw0rd!"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Account deleted!"
}
```

---

### 2.5 Change Language Preference (Newly Added)
- **Route**: `PATCH {{baseUrl}}/user/change-language`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "language": "so"
}
```
- **Description**: Updates user's language setting. Supported values: `"en"` (English), `"so"` (Somali), `"ar"` (Arabic).
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Language updated",
  "data": {
    "_id": "6a7965d4f792519d4eada800",
    "name": "Abdul Karim",
    "language": "so"
  }
}
```

---

## 3. Home Feed, Categories & Discovery

### 3.1 Get All Categories
- **Route**: `GET {{baseUrl}}/category/get-all?type=merchant`
- **Auth**: Public
- **Query Filters**: `type=merchant`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Categories retrieved successfully",
  "data": [
    {
      "_id": "6a7965d4f792519d4eada7fb",
      "name": "Restaurants",
      "slug": "restaurants",
      "icon": "https://cdn.somspot.so/icons/restaurant.png",
      "type": "merchant",
      "order": 1,
      "isActive": true
    },
    {
      "_id": "6a7965d4f792519d4eada7fc",
      "name": "Grocery",
      "slug": "grocery",
      "icon": "https://cdn.somspot.so/icons/grocery.png",
      "type": "merchant",
      "order": 2,
      "isActive": true
    }
  ]
}
```

---

### 3.2 Trending Influencers / Creators Carousel (with Meta & Pagination)
- **Route**: `GET {{baseUrl}}/creator/trending?page=1&limit=10` OR `GET {{baseUrl}}/user/trending-influencers?page=1&limit=10`
- **Auth**: Public
- **Query Filters**: `page=1`, `limit=10`, `sort=-followerCount` *(optional)*
- **Description**: Returns top influencers/creators ranked by follower count and engagement rate for the Customer Home Screen carousel.
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Trending creators retrieved",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada805",
        "user": {
          "_id": "6a7965d5f792519d4eada804",
          "name": "Ahmed Hassan",
          "profile_image": "https://cdn.somspot.so/profiles/ahmed_hassan.png"
        },
        "bio": "Mogadishu's top food reviewer & creator",
        "category": {
          "_id": "6a7965d4f792519d4eada7fe",
          "name": "Food Creator",
          "slug": "food-creator",
          "icon": "https://cdn.somspot.so/icons/food-creator.png"
        },
        "followerCount": 50000,
        "followerBadge": "50K",
        "activeOfferTag": "Buy 1 Get 1 Free",
        "engagementRate": 8.5
      }
    ]
  }
}
```

---

### 3.3 Recommended Content (Short Videos / Reels Feed)
- **Route**: `GET {{baseUrl}}/creator/content?page=1&limit=10`
- **Auth**: Public
- **Query Filters**: `page=1`, `limit=10`, `businessId` *(optional)*, `status` *(optional)*
- **Description**: Returns video/reel content across all businesses (or filtered by business/status) with paginated `meta` & `result` format.
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Creator content retrieved",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada80c",
        "campaign": {
          "_id": "6a7965d5f792519d4eada80b",
          "business": {
            "_id": "6a7965d5f792519d4eada806",
            "name": "Hilib Macaan Restaurant",
            "logo": "https://cdn.somspot.so/businesses/hilib_logo.png"
          },
          "name": "Summer Food Campaign"
        },
        "creator": {
          "_id": "6a7965d5f792519d4eada804",
          "name": "Ahmed Hassan",
          "profile_image": "https://cdn.somspot.so/profiles/ahmed_hassan.png"
        },
        "platform": "tiktok",
        "platformLabel": "TikTok Reel",
        "views": 24500,
        "viewsBadge": "24.5K",
        "draftVideoUrl": "https://cdn.somspot.so/videos/pizza_short.mp4",
        "thumbnail": "https://cdn.somspot.so/thumbnails/pizza_short.jpg",
        "caption": "Best Pizza in Mogadishu! 🍕 Buy 1 Get 1 Free through SomSpot",
        "postUrl": "https://www.tiktok.com/@ahmedeats/video/7192837491",
        "status": "published",
        "publishedAt": "2026-08-10T05:47:01.450Z"
      }
    ]
  }
}
```

---

### 3.4 Nearby Businesses
- **Route**: `GET {{baseUrl}}/business/get-all`
- **Auth**: Public
- **Query Filters**:
  - `lat` / `latitude` *(required for geo)*: `2.046934`
  - `lng` / `longitude` *(required for geo)*: `45.318161`
  - `radiusKm` / `radius` *(optional, default 10)*: `10`
  - `category` *(optional)*: `6a7965d4f792519d4eada7fb`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Businesses retrieved successfully",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 2, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada806",
        "name": "Hilib Macaan Restaurant",
        "category": {
          "_id": "6a7965d4f792519d4eada7fb",
          "name": "Restaurants",
          "slug": "restaurants"
        },
        "logo": "https://cdn.somspot.so/businesses/hilib_logo.png",
        "coverImage": "https://cdn.somspot.so/businesses/hilib_cover.jpg",
        "address": "Maka Al Mukarama Road, Mogadishu",
        "location": { "type": "Point", "coordinates": [45.318161, 2.046934] },
        "ratingAvg": 4.8,
        "ratingCount": 124,
        "isOpen": true,
        "closesAt": "22:00",
        "opensAt": null
      }
    ]
  }
}
```

---

### 3.5 Business Details Screen (Header & About Tab)
- **Route**: `GET {{baseUrl}}/business/get`
- **Auth**: Optional
- **Query Filters**: `businessId=6a7965d5f792519d4eada806`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Business details retrieved successfully",
  "data": {
    "_id": "6a7965d5f792519d4eada806",
    "name": "Hilib Macaan Restaurant",
    "category": {
      "_id": "6a7965d4f792519d4eada7fb",
      "name": "Restaurants"
    },
    "description": "Authentic Somali cuisine featuring camel meat and fresh bariis.",
    "logo": "https://cdn.somspot.so/businesses/hilib_logo.png",
    "coverImage": "https://cdn.somspot.so/businesses/hilib_cover.jpg",
    "gallery": [
      "https://cdn.somspot.so/gallery/dish1.jpg",
      "https://cdn.somspot.so/gallery/dish2.jpg"
    ],
    "phone": "+252612345678",
    "whatsapp": "+252612345678",
    "address": "Maka Al Mukarama Road, Mogadishu",
    "location": { "type": "Point", "coordinates": [45.318161, 2.046934] },
    "openingHours": [
      { "day": "mon", "open": "08:00", "close": "22:00", "closed": false }
    ],
    "ratingAvg": 4.8,
    "ratingCount": 124,
    "isOpen": true,
    "closesAt": "22:00"
  }
}
```

---

### 3.6 Top Deals Carousel (Newly Added)
- **Route**: `GET {{baseUrl}}/offer/top-deals`
- **Auth**: Optional (Pass `Authorization: Bearer <USER_JWT_TOKEN>` for personalized claim and saved statuses)
- **Query Filters**: `limit=10` *(optional)*
- **Description**: Returns top 10 active promotional offers automatically sorted by highest estimated deal value.
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Offers retrieved",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 5, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada809",
        "title": "50% Off Mega Family Feast",
        "discountLabel": "50% OFF",
        "offerImage": "https://cdn.somspot.so/offers/mega_feast.jpg",
        "business": {
          "_id": "6a7965d5f792519d4eada806",
          "name": "Hilib Macaan Restaurant",
          "logo": "https://cdn.somspot.so/businesses/hilib_logo.png"
        },
        "isClaimed": false,
        "isSaved": true
      }
    ]
  }
}
```

---

### 3.7 Trending Businesses Carousel
- **Route**: `GET {{baseUrl}}/business/trending`
- **Auth**: Public
- **Query Filters**: `limit=10` *(optional)*
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Trending businesses retrieved successfully",
  "data": [
    {
      "_id": "6a7965d5f792519d4eada806",
      "name": "Hilib Macaan Restaurant",
      "logo": "https://cdn.somspot.so/businesses/hilib_logo.png",
      "ratingAvg": 4.9,
      "ratingCount": 210
    }
  ]
}
```

---

## 4. Search & History

### 4.1 Search Business or Deal
- **Route**: `GET {{baseUrl}}/search`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Query Filters**: `term=restaurant` OR `searchTerm=restaurant` OR `q=restaurant`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Search completed successfully",
  "data": {
    "term": "restaurant",
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada806",
        "name": "Hilib Macaan Restaurant",
        "category": { "name": "Restaurants", "slug": "restaurants" },
        "logo": "https://cdn.somspot.so/businesses/hilib_logo.png",
        "address": "Maka Al Mukarama Road, Mogadishu",
        "ratingAvg": 4.8,
        "ratingCount": 124
      }
    ]
  }
}
```

---

### 4.2 Get Recent Search History Chips
- **Route**: `GET {{baseUrl}}/search/recent`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Recent searches retrieved",
  "data": [
    { "_id": "6a7965d5f792519d4eada910", "term": "Hilib Macaan" },
    { "_id": "6a7965d5f792519d4eada911", "term": "Pharmacy near me" }
  ]
}
```

---

### 4.3 Clear Recent Search Chips
- **Route**: `DELETE {{baseUrl}}/search/recent/clear`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Search history cleared",
  "data": { "cleared": 2 }
}
```

---

### 4.4 Get Trending Search Keywords
- **Route**: `GET {{baseUrl}}/search/trending`
- **Auth**: Public
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Trending searches retrieved",
  "data": [
    { "term": "liido beach cafe", "count": 48 },
    { "term": "banadir pharmacy", "count": 32 }
  ]
}
```

---

## 5. Top Deals, Offers & Claim Wallet

### 5.1 Get Top Deals List (Includes `isClaimed`, `claimCode`, `claimStatus`, `claimId` for each item)
- **Route**: `GET {{baseUrl}}/offer/get-all`
- **Auth**: Optional (Pass `Authorization: Bearer <USER_JWT_TOKEN>` to get user's claim status for each offer)
- **Query Filters**: `page=1`, `limit=10`, `business` *(optional)*, `category` *(optional)*
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
        "business": {
          "_id": "6a7965d5f792519d4eada806",
          "name": "Hilib Macaan Restaurant",
          "logo": "https://cdn.somspot.so/businesses/hilib_logo.png",
          "address": "Maka Al Mukarama Road, Mogadishu",
          "ratingAvg": 4.8
        },
        "title": "20% Off Family Platter",
        "description": "Get 20% discount on our special family platter.",
        "discountLabel": "20% OFF",
        "offerImage": "https://cdn.somspot.so/offers/family_platter.jpg",
        "terms": "Valid for dine-in only.",
        "startAt": "2026-08-01T00:00:00.000Z",
        "endAt": "2026-08-12T05:47:01.442Z",
        "status": "active",
        "isClaimed": true,
        "claimCode": "SOM-84291",
        "claimStatus": "claimed",
        "claimId": "6a7965d5f792519d4eada808"
      }
    ]
  }
}
```

---

### 5.2 Single Offer Details Screen (Includes `endAt`, `isClaimed`, `claimCode`, `claimStatus`, `claimId`)
- **Route**: `GET {{baseUrl}}/offer/get`
- **Auth**: Optional (Pass `Authorization: Bearer <USER_JWT_TOKEN>` to check if the user claimed this offer)
- **Query Filters**: `offerId=6a7965d5f792519d4eada809`
- **Success Response (`200 OK` - User has claimed this offer)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Offer retrieved",
  "data": {
    "_id": "6a7965d5f792519d4eada809",
    "business": {
      "_id": "6a7965d5f792519d4eada806",
      "name": "Hilib Macaan Restaurant",
      "logo": "https://cdn.somspot.so/businesses/hilib_logo.png",
      "address": "Maka Al Mukarama Road, Mogadishu",
      "phone": "+252612345678",
      "ratingAvg": 4.8
    },
    "title": "20% Off Family Platter",
    "description": "Get 20% off our signature family platter featuring roasted goat, rice, and fresh salad.",
    "discountLabel": "20% OFF",
    "offerImage": "https://cdn.somspot.so/offers/family_platter.jpg",
    "terms": "Valid for dine-in only. Cannot be combined with other offers.",
    "startAt": "2026-08-01T00:00:00.000Z",
    "endAt": "2026-08-12T05:47:01.442Z",
    "status": "active",
    "isClaimed": true,
    "claimCode": "SOM-84291",
    "claimStatus": "claimed",
    "claimId": "6a7965d5f792519d4eada808"
  }
}
```

- **Success Response (`200 OK` - User has NOT claimed this offer yet)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Offer retrieved",
  "data": {
    "_id": "6a7965d5f792519d4eada809",
    "business": {
      "_id": "6a7965d5f792519d4eada806",
      "name": "Hilib Macaan Restaurant",
      "logo": "https://cdn.somspot.so/businesses/hilib_logo.png",
      "address": "Maka Al Mukarama Road, Mogadishu"
    },
    "title": "20% Off Family Platter",
    "description": "Get 20% off our signature family platter.",
    "discountLabel": "20% OFF",
    "endAt": "2026-08-12T05:47:01.442Z",
    "status": "active",
    "isClaimed": false,
    "claimCode": null,
    "claimStatus": null,
    "claimId": null
  }
}
```

---

### 5.3 Claim Offer Action (Claim Button)
- **Route**: `POST {{baseUrl}}/claim/claim-offer`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "offerId": "6a7965d5f792519d4eada809"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Offer claimed successfully",
  "data": {
    "_id": "6a7965d5f792519d4eada808",
    "user": "6a7965d4f792519d4eada800",
    "offer": "6a7965d5f792519d4eada809",
    "business": "6a7965d5f792519d4eada806",
    "code": "SOM-84291",
    "status": "claimed",
    "claimedAt": "2026-08-10T05:47:01.446Z",
    "expiresAt": "2026-08-12T05:47:01.442Z"
  }
}
```

---

### 5.4 User Claimed Vouchers Wallet
- **Route**: `GET {{baseUrl}}/claim/wallet`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Query Filters**: `status` *(optional: claimed | redeemed | expired)*
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Claim wallet retrieved successfully",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada808",
        "code": "SOM-84291",
        "status": "claimed",
        "offer": {
          "_id": "6a7965d5f792519d4eada809",
          "title": "20% Off Family Platter",
          "discountLabel": "20% OFF",
          "offerImage": "https://cdn.somspot.so/offers/family_platter.jpg"
        },
        "business": {
          "_id": "6a7965d5f792519d4eada806",
          "name": "Hilib Macaan Restaurant",
          "logo": "https://cdn.somspot.so/businesses/hilib_logo.png"
        },
        "expiresAt": "2026-08-12T05:47:01.442Z"
      }
    ]
  }
}
```

---

### 5.5 Single Claim QR Code Screen
- **Route**: `GET {{baseUrl}}/claim/get`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Query Filters**: `claimId=6a7965d5f792519d4eada808`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Claim retrieved successfully",
  "data": {
    "_id": "6a7965d5f792519d4eada808",
    "code": "SOM-84291",
    "status": "claimed",
    "expiresAt": "2026-08-12T05:47:01.442Z",
    "offer": {
      "title": "20% Off Family Platter",
      "discountLabel": "20% OFF"
    },
    "business": {
      "name": "Hilib Macaan Restaurant"
    }
  }
}
```

---

## 6. Reviews & Customer Ratings

### 6.1 Get Business Reviews (Reviews Tab)
- **Route**: `GET {{baseUrl}}/review/get-business-reviews`
- **Auth**: Public / Optional
- **Query Filters**: `businessId=6a7965d5f792519d4eada806`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Business reviews retrieved successfully",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada80d",
        "user": {
          "_id": "6a7965d4f792519d4eada800",
          "name": "Abdul Karim",
          "profile_image": "https://cdn.somspot.so/profiles/abdul_karim.png"
        },
        "rating": 5,
        "review": "The hilib suqaar here is incredible! Best Somali food in Mogadishu.",
        "helpfulCount": 12,
        "isHelpful": false,
        "createdAt": "2026-08-10T05:47:01.451Z"
      }
    ]
  }
}
```

---

### 6.2 Submit Customer Review Modal
- **Route**: `POST {{baseUrl}}/review/post-review`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "business": "6a7965d5f792519d4eada806",
  "rating": 5,
  "review": "The hilib suqaar here is incredible! Best Somali food in Mogadishu."
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Review posted successfully",
  "data": {
    "_id": "6a7965d5f792519d4eada80d",
    "user": "6a7965d4f792519d4eada800",
    "business": "6a7965d5f792519d4eada806",
    "rating": 5,
    "review": "The hilib suqaar here is incredible! Best Somali food in Mogadishu.",
    "helpfulCount": 0,
    "moderationStatus": "visible"
  }
}
```

---

### 6.3 Get Customer's Own Posted Reviews List
- **Route**: `GET {{baseUrl}}/review/get-all-reviews`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Reviews retrieved successfully",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada80d",
        "business": {
          "_id": "6a7965d5f792519d4eada806",
          "name": "Hilib Macaan Restaurant",
          "logo": "https://cdn.somspot.so/businesses/hilib_logo.png"
        },
        "rating": 5,
        "review": "The hilib suqaar here is incredible!",
        "helpfulCount": 12,
        "isHelpful": true,
        "createdAt": "2026-08-10T05:47:01.451Z"
      }
    ]
  }
}
```

---

### 6.4 Toggle Review Helpful Status ("Was this helpful?") (Newly Added)
- **Route**: `POST {{baseUrl}}/review/toggle-helpful`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "reviewId": "6a7965d5f792519d4eada80d"
}
```
- **Description**: Toggles user's helpful vote on a review.
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Marked as helpful",
  "data": {
    "isHelpful": true,
    "helpfulCount": 13
  }
}
```

---

### 6.5 Get Single Review Details (Newly Added)
- **Route**: `GET {{baseUrl}}/review/get-review`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Query Filters**: `reviewId=6a7965d5f792519d4eada80d`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Review retrieved",
  "data": {
    "_id": "6a7965d5f792519d4eada80d",
    "rating": 5,
    "review": "The hilib suqaar here is incredible!",
    "helpfulCount": 13,
    "user": {
      "name": "Abdul Karim",
      "profile_image": "https://cdn.somspot.so/profiles/abdul_karim.png"
    }
  }
}
```

---

### 6.6 Update User Review (Newly Added)
- **Route**: `PATCH {{baseUrl}}/review/update-review`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "reviewId": "6a7965d5f792519d4eada80d",
  "rating": 4,
  "review": "Updated review text: Great food, slightly busy atmosphere."
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Review updated",
  "data": {
    "_id": "6a7965d5f792519d4eada80d",
    "rating": 4,
    "review": "Updated review text: Great food, slightly busy atmosphere."
  }
}
```

---

### 6.7 Delete User Review (Newly Added)
- **Route**: `DELETE {{baseUrl}}/review/delete-review`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Query Filters**: `reviewId=6a7965d5f792519d4eada80d`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Review deleted",
  "data": {
    "deleted": true
  }
}
```

---

## 7. Saved & Bookmarks

### 7.1 Toggle Bookmark for Business or Offer
- **Route**: `POST {{baseUrl}}/saved/toggle`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload (Save Business)**:
```json
{
  "businessId": "6a7965d5f792519d4eada806"
}
```
- **Body Payload (Save Offer/Deal)**:
```json
{
  "offerId": "6a7965d5f792519d4eada809"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Business saved",
  "data": {
    "saved": true,
    "type": "business",
    "doc": {
      "_id": "6a7965d5f792519d4eada80e",
      "user": "6a7965d4f792519d4eada800",
      "business": "6a7965d5f792519d4eada806"
    }
  }
}
```

---

### 7.2 Get Saved Items List (Businesses Tab, Offers Tab, or Combined)
- **Route**: `GET {{baseUrl}}/saved/get-all`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Query Filters**: `type=business` OR `type=offer` OR `type=all` *(omitting type or passing `all` returns combined saved items)*
- **Success Response (`GET {{baseUrl}}/saved/get-all?type=business`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Saved list retrieved successfully",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada80e",
        "user": "6a7965d4f792519d4eada800",
        "business": {
          "_id": "6a7965d5f792519d4eada806",
          "name": "Hilib Macaan Restaurant",
          "logo": "https://cdn.somspot.so/businesses/hilib_logo.png",
          "address": "Maka Al Mukarama Road, Mogadishu",
          "ratingAvg": 4.8,
          "ratingCount": 124
        }
      }
    ]
  }
}
```
- **Success Response (`GET {{baseUrl}}/saved/get-all?type=offer`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Saved list retrieved successfully",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada80f",
        "user": "6a7965d4f792519d4eada800",
        "offer": {
          "_id": "6a7965d5f792519d4eada809",
          "title": "20% Off Family Platter",
          "discountLabel": "20% OFF",
          "offerImage": "https://cdn.somspot.so/offers/family_platter.jpg",
          "endAt": "2026-08-12T05:47:01.442Z",
          "business": {
            "_id": "6a7965d5f792519d4eada806",
            "name": "Hilib Macaan Restaurant",
            "logo": "https://cdn.somspot.so/businesses/hilib_logo.png"
          }
        }
      }
    ]
  }
}
```

---

### 7.3 Remove Saved Item (Newly Added)
- **Route**: `DELETE {{baseUrl}}/saved/remove`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "businessId": "6a7965d5f792519d4eada806"
}
```
*(or `"offerId": "6a7965d5f792519d4eada809"`)*
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Saved item removed",
  "data": {
    "deleted": true
  }
}
```

---

## 8. Notifications

### 8.1 Get All Notifications
- **Route**: `GET {{baseUrl}}/notification/get-all-notifications`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 2, "totalPage": 1 },
    "result": [
      {
        "_id": "6a7965d5f792519d4eada80f",
        "toId": "6a7965d4f792519d4eada800",
        "title": "Claim Code Ready!",
        "message": "Your 20% Off Family Platter claim code SOM-84291 is ready to use!",
        "isRead": false,
        "createdAt": "2026-08-10T05:47:01.452Z"
      }
    ]
  }
}
```

---

### 8.2 Mark Notifications Read ("Mark All Read" Button)
- **Route**: `PATCH {{baseUrl}}/notification/update-as-mark-unread`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "isRead": true
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Notifications updated successfully",
  "data": {
    "acknowledged": true,
    "modifiedCount": 2
  }
}
```

---

### 8.3 Get Single Notification Details (Newly Added)
- **Route**: `GET {{baseUrl}}/notification/get-notification`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Query Filters**: `id=6a7965d5f792519d4eada80f`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Notification retrieved",
  "data": {
    "_id": "6a7965d5f792519d4eada80f",
    "toId": "6a7965d4f792519d4eada800",
    "title": "Claim Code Ready!",
    "message": "Your 20% Off Family Platter claim code SOM-84291 is ready to use!",
    "isRead": true,
    "createdAt": "2026-08-10T05:47:01.452Z"
  }
}
```

---

### 8.4 Delete Notification (Newly Added)
- **Route**: `DELETE {{baseUrl}}/notification/delete-notification`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Query Filters**: `id=6a7965d5f792519d4eada80f`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Notification deleted",
  "data": {
    "deleted": true
  }
}
```

---

## 9. Customer Support & Legal Pages

### 9.1 Submit Support Message / Ticket (Help & Support Screen)
- **Route**: `POST {{baseUrl}}/feedback/post-feedback`
- **Auth**: Bearer `<USER_JWT_TOKEN>` (or Public with `name` and `email` fields)
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "subject": "App Issue",
  "feedback": "I need help with my claimed voucher at Hilib Macaan Restaurant."
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Feedback submitted successfully",
  "data": {
    "_id": "6a7965d5f792519d4eada920",
    "user": "6a7965d4f792519d4eada800",
    "name": "Abdul Karim",
    "email": "abdul.karim@example.com",
    "subject": "App Issue",
    "feedback": "I need help with my claimed voucher at Hilib Macaan Restaurant.",
    "status": "pending"
  }
}
```

---

### 9.2 Get Customer's Support Tickets List (Newly Added)
- **Route**: `GET {{baseUrl}}/feedback/get-all-feedbacks`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
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
        "subject": "App Issue",
        "feedback": "I need help with my claimed voucher at Hilib Macaan Restaurant.",
        "reply": "Hi Abdul, our support team has verified your voucher.",
        "status": "replied"
      }
    ]
  }
}
```

---

### 9.3 Get Single Support Ticket Details (Newly Added)
- **Route**: `GET {{baseUrl}}/feedback/get-feedback`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Query Filters**: `feedbackId=6a7965d5f792519d4eada920`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Feedback retrieved",
  "data": {
    "_id": "6a7965d5f792519d4eada920",
    "subject": "App Issue",
    "feedback": "I need help with my claimed voucher at Hilib Macaan Restaurant.",
    "reply": "Hi Abdul, our support team has verified your voucher.",
    "status": "replied"
  }
}
```

---

### 9.4 Delete Support Ticket (Newly Added)
- **Route**: `DELETE {{baseUrl}}/feedback/delete-feedback`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "feedbackId": "6a7965d5f792519d4eada920"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Feedback deleted successfully"
}
```

---

### 9.5 Get Terms & Conditions
- **Route**: `GET {{baseUrl}}/manage/get-terms-conditions`
- **Auth**: Public
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Terms & Conditions retrieved successfully",
  "data": {
    "title": "Terms and Service",
    "content": "<p>Welcome to SomSpot. By using our application...</p>"
  }
}
```

---

### 9.6 Get Privacy Policy
- **Route**: `GET {{baseUrl}}/manage/get-privacy-policy`
- **Auth**: Public
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Privacy Policy retrieved successfully",
  "data": {
    "title": "Privacy Policy",
    "content": "<p>Your privacy is important to us...</p>"
  }
}
```

---

### 9.7 Get About Us
- **Route**: `GET {{baseUrl}}/manage/get-about-us`
- **Auth**: Public
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "About Us retrieved successfully",
  "data": {
    "title": "About SomSpot",
    "content": "<p>SomSpot is Mogadishu's premier discovery platform...</p>"
  }
}
```

---

### 9.8 Get Frequently Asked Questions (FAQ) (Newly Added)
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
      },
      {
        "_id": "6a7965d5f792519d4eada931",
        "question": "How do I redeem my claimed deal at a store?",
        "description": "Show your claim QR code or claim ID in your wallet to the merchant cashier when checking out."
      }
    ]
  }
}
```

---

### 9.9 Get Contact Us Info (Newly Added)
- **Route**: `GET {{baseUrl}}/manage/get-contact-us`
- **Auth**: Public
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Contact Us retrieved successfully",
  "data": {
    "email": "support@somspot.so",
    "phone": "+252612345678",
    "address": "Mogadishu, Somalia"
  }
}
```

---

## 10. In-App Chat & Customer Messaging

### 10.1 Start Conversation / Send Chat Message
- **Route**: `POST {{baseUrl}}/chat/post-chat`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "receiverId": "6a7965d5f792519d4eada804"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Chat created or retrieved",
  "data": {
    "_id": "6a7965d5f792519d4eada940",
    "participants": [
      "6a7965d4f792519d4eada800",
      "6a7965d5f792519d4eada804"
    ],
    "messages": []
  }
}
```

---

### 10.2 Get Chat Messages for Conversation
- **Route**: `GET {{baseUrl}}/chat/get-chat-messages`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Query Filters**: `chatId=6a7965d5f792519d4eada940`, `page=1`, `limit=10`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Chat messages retrieved",
  "data": {
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPage": 1 },
    "_id": "6a7965d5f792519d4eada940",
    "participants": [
      {
        "_id": "6a7965d5f792519d4eada804",
        "name": "Hilib Macaan Support",
        "phoneNumber": "+252612345678",
        "profile_image": "https://cdn.somspot.so/businesses/hilib_logo.png"
      }
    ],
    "messages": [
      {
        "_id": "6a7965d5f792519d4eada941",
        "sender": "6a7965d5f792519d4eada804",
        "receiver": "6a7965d4f792519d4eada800",
        "message": "Welcome to Hilib Macaan! How can we assist you today?",
        "isRead": true,
        "createdAt": "2026-08-10T05:47:01.455Z"
      }
    ]
  }
}
```

---

### 10.3 Get All Active User Chats
- **Route**: `GET {{baseUrl}}/chat/get-all-chats`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Chats retrieved",
  "data": {
    "chats": [
      {
        "_id": "6a7965d5f792519d4eada940",
        "participants": [
          {
            "_id": "6a7965d5f792519d4eada804",
            "name": "Hilib Macaan Support",
            "profile_image": "https://cdn.somspot.so/businesses/hilib_logo.png"
          }
        ],
        "unRead": 1
      }
    ]
  }
}
```

---

### 10.4 Mark Chat Messages as Seen
- **Route**: `PATCH {{baseUrl}}/chat/update-message-as-seen`
- **Auth**: Bearer `<USER_JWT_TOKEN>`
- **Headers**: `Content-Type: application/json`
- **Body Payload**:
```json
{
  "chatId": "6a7965d5f792519d4eada940"
}
```
- **Success Response (`200 OK`)**:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Messages marked as seen",
  "data": {
    "acknowledged": true,
    "modifiedCount": 1
  }
}
```
