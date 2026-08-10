const fs = require("fs");
const path = require("path");

const collectionPath = path.join(__dirname, "../SomSpot.postman_collection.json");
const postmanDir = path.join(__dirname, "../postman");

if (!fs.existsSync(postmanDir)) {
  fs.mkdirSync(postmanDir, { recursive: true });
}

const rawData = JSON.parse(fs.readFileSync(collectionPath, "utf8"));
const existingFolders = rawData.item;

// Helper to find folder by name in raw items
function getFolder(name) {
  return existingFolders.find((f) => f.name.toLowerCase() === name.toLowerCase());
}

// Add/Enhance endpoints for form-data and example responses
function enhanceCustomerRequests() {
  const userProfileFolder = getFolder("User Profile");
  if (userProfileFolder && userProfileFolder.item) {
    const editReq = userProfileFolder.item.find((r) => r.name.toLowerCase().includes("edit profile"));
    if (editReq) {
      editReq.name = "Edit Profile (form-data profile_image upload)";
      editReq.request.body = {
        mode: "formdata",
        formdata: [
          {
            key: "profile_image",
            type: "file",
            src: [],
            description: "Profile picture image file (jpg/png)",
          },
          {
            key: "name",
            value: "Abdul Karim",
            type: "text",
            description: "User full name",
          },
          {
            key: "phoneNumber",
            value: "+252612345678",
            type: "text",
            description: "Phone number",
          },
          {
            key: "address",
            value: "Maka Al Mukarama, Mogadishu",
            type: "text",
            description: "Default address/location text",
          },
          {
            key: "language",
            value: "en",
            type: "text",
            description: "Preferred language: en | so | ar",
          },
        ],
      };
      editReq.response = [
        {
          name: "200 OK - Profile Updated",
          originalRequest: editReq.request,
          status: "OK",
          code: 200,
          _postman_previewlanguage: "json",
          body: JSON.stringify(
            {
              statusCode: 200,
              success: true,
              message: "Profile updated successfully",
              data: {
                _id: "6a7965d4f792519d4eada800",
                authId: "6a7965d4f792519d4eada7ff",
                name: "Abdul Karim",
                email: "abdul.karim@example.com",
                profile_image: "uploads/profile_image-171829381.jpg",
                phoneNumber: "+252612345678",
                language: "en",
                address: "Maka Al Mukarama, Mogadishu",
              },
            },
            null,
            2,
          ),
        },
      ];
    }
  }

  // Saved folder enhancements (Saved Businesses vs Saved Offers)
  const savedFolder = getFolder("Saved");
  if (savedFolder && savedFolder.item) {
    const hasToggleOffer = savedFolder.item.some((r) => r.name.includes("offer"));
    if (!hasToggleOffer) {
      savedFolder.item.push(
        {
          name: "Toggle save offer (user)",
          request: {
            method: "POST",
            header: [
              { key: "Content-Type", value: "application/json" },
              { key: "Authorization", value: "Bearer {{userToken}}" },
            ],
            url: {
              raw: "{{baseUrl}}/saved/toggle",
              host: ["{{baseUrl}}"],
              path: ["saved", "toggle"],
            },
            body: {
              mode: "raw",
              raw: JSON.stringify({ offerId: "{{offerId}}" }, null, 2),
            },
            description: "Toggles save/bookmark for a specific deal/offer",
          },
          response: [
            {
              name: "200 OK - Offer Bookmarked",
              status: "OK",
              code: 200,
              _postman_previewlanguage: "json",
              body: JSON.stringify(
                {
                  statusCode: 200,
                  success: true,
                  message: "Offer saved",
                  data: {
                    saved: true,
                    type: "offer",
                    doc: {
                      _id: "6a7965d5f792519d4eada80e",
                      user: "6a7965d4f792519d4eada800",
                      offer: "6a7965d5f792519d4eada809",
                    },
                  },
                },
                null,
                2,
              ),
            },
          ],
        },
        {
          name: "Get saved offers (user)",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{userToken}}" }],
            url: {
              raw: "{{baseUrl}}/saved/get-all?type=offer",
              host: ["{{baseUrl}}"],
              path: ["saved", "get-all"],
              query: [{ key: "type", value: "offer" }],
            },
            description: "Fetches user's saved/bookmarked offers list (Saved > Offers Tab)",
          },
          response: [
            {
              name: "200 OK - Saved Offers",
              status: "OK",
              code: 200,
              _postman_previewlanguage: "json",
              body: JSON.stringify(
                {
                  statusCode: 200,
                  success: true,
                  message: "Saved list retrieved successfully",
                  data: {
                    meta: { page: 1, limit: 10, total: 1, totalPage: 1 },
                    result: [
                      {
                        _id: "6a7965d5f792519d4eada80e",
                        user: "6a7965d4f792519d4eada800",
                        offer: {
                          _id: "6a7965d5f792519d4eada809",
                          title: "20% Off Family Platter",
                          discountLabel: "20% OFF",
                          offerImage: "https://cdn.somspot.so/offers/family_platter.jpg",
                          terms: "Valid for dine-in only.",
                          endAt: "2026-08-12T05:47:01.442Z",
                          business: {
                            _id: "6a7965d5f792519d4eada806",
                            name: "Hilib Macaan Restaurant",
                            logo: "https://cdn.somspot.so/businesses/hilib_logo.png",
                            address: "Maka Al Mukarama Road, Mogadishu",
                          },
                        },
                      },
                    ],
                  },
                },
                null,
                2,
              ),
            },
          ],
        },
      );
    }
  }

  // Creator Trending endpoint
  const creatorFolder = getFolder("Creator");
  if (creatorFolder && creatorFolder.item) {
    const hasTrending = creatorFolder.item.some((r) => r.name.includes("Trending"));
    if (!hasTrending) {
      creatorFolder.item.push({
        name: "Trending Influencers (public)",
        request: {
          method: "GET",
          header: [],
          url: {
            raw: "{{baseUrl}}/creator/trending?limit=10",
            host: ["{{baseUrl}}"],
            path: ["creator", "trending"],
            query: [{ key: "limit", value: "10" }],
          },
          description: "Returns top trending creators for consumer home page carousel",
        },
        response: [
          {
            name: "200 OK - Trending Creators",
            status: "OK",
            code: 200,
            _postman_previewlanguage: "json",
            body: JSON.stringify(
              {
                statusCode: 200,
                success: true,
                message: "Trending creators retrieved",
                data: [
                  {
                    _id: "6a7965d5f792519d4eada805",
                    user: {
                      _id: "6a7965d5f792519d4eada804",
                      name: "Ahmed Hassan",
                      profile_image: "https://cdn.somspot.so/profiles/ahmed_hassan.png",
                    },
                    bio: "Mogadishu's top food reviewer",
                    category: {
                      _id: "6a7965d4f792519d4eada7fe",
                      name: "Food Creator",
                      slug: "food-creator",
                    },
                    followerCount: 50000,
                    engagementRate: 8.5,
                  },
                ],
              },
              null,
              2,
            ),
          },
        ],
      });
    }
  }
}

enhanceCustomerRequests();

// Define Feature Grouping Map
const featureGroups = [
  {
    featureName: "1. Customer App (Consumer)",
    description: "APIs for Customer Mobile App (Home Feed, Discovery, Details, Claims, Wallet & Interactions)",
    subfolders: [
      {
        name: "Auth & Onboarding",
        sources: ["Auth"],
      },
      {
        name: "User Profile & Header",
        sources: ["User Profile"],
      },
      {
        name: "Categories",
        sources: ["Category"],
      },
      {
        name: "Home Feed & Influencers",
        requests: [
          { folder: "Creator", requestName: "Trending Influencers (public)" },
          { folder: "Creator", requestName: "Business creator content (public)" },
        ],
      },
      {
        name: "Businesses & Nearby Discovery",
        sources: ["Business"],
      },
      {
        name: "Search & Recent Terms",
        sources: ["Search"],
      },
      {
        name: "Top Deals & Offers",
        sources: ["Offer"],
      },
      {
        name: "Claims & Vouchers Wallet",
        sources: ["Claim (Wallet)"],
      },
      {
        name: "Saved & Bookmarks",
        sources: ["Saved"],
      },
      {
        name: "Reviews & Ratings",
        sources: ["Review"],
      },
      {
        name: "Notifications",
        sources: ["Notifications (user)"],
      },
      {
        name: "Chat & Customer Support",
        sources: ["Chat", "Feedback (user)"],
      },
    ],
  },
  {
    featureName: "2. Merchant Portal",
    description: "APIs for Merchant Dashboard (Business Setup, Offers, Campaigns, Claim Redemption & Subscriptions)",
    subfolders: [
      {
        name: "Merchant Onboarding & Dashboard",
        sources: ["Merchant"],
      },
      {
        name: "Business Management",
        requests: [
          { folder: "Business", requestName: "Create (merchant)" },
          { folder: "Business", requestName: "My businesses (merchant)" },
          { folder: "Business", requestName: "Update (merchant)" },
          { folder: "Business", requestName: "Delete (merchant)" },
        ],
      },
      {
        name: "Offer & Deal Management",
        requests: [
          { folder: "Offer", requestName: "Create (merchant)" },
          { folder: "Offer", requestName: "My offers (merchant)" },
          { folder: "Offer", requestName: "Update (merchant)" },
          { folder: "Offer", requestName: "Delete (merchant)" },
          { folder: "Claim (Wallet)", requestName: "Redeem by code (merchant)" },
        ],
      },
      {
        name: "Campaigns & Creator Applications",
        requests: [
          { folder: "Campaign (Merchant)", requestName: "Create (merchant)" },
          { folder: "Campaign (Merchant)", requestName: "My campaigns (merchant)" },
          { folder: "Campaign (Merchant)", requestName: "Get one (merchant)" },
          { folder: "Campaign (Merchant)", requestName: "Update / pause / complete (merchant)" },
          { folder: "Campaign (Merchant)", requestName: "Applications (merchant)" },
          { folder: "Campaign (Merchant)", requestName: "Review draft (merchant)" },
          { folder: "Campaign (Merchant)", requestName: "Verify publication (merchant)" },
          { folder: "Campaign (Merchant)", requestName: "Delete (merchant)" },
        ],
      },
      {
        name: "Subscriptions & Plans",
        sources: ["Subscription"],
      },
    ],
  },
  {
    featureName: "3. Creator / Influencer Portal",
    description: "APIs for Influencers & Content Creators (Tasks, Draft Uploads, Live URLs, Earnings & Payouts)",
    subfolders: [
      {
        name: "Creator Profile & Socials",
        requests: [
          { folder: "Creator", requestName: "Get profile" },
          { folder: "Creator", requestName: "Update profile" },
          { folder: "Creator", requestName: "Link social" },
        ],
      },
      {
        name: "Campaign Tasks & Draft Submissions",
        requests: [
          { folder: "Creator", requestName: "My tasks" },
          { folder: "Creator", requestName: "Get task" },
          { folder: "Creator", requestName: "Submit draft" },
          { folder: "Creator", requestName: "Submit post URL" },
        ],
      },
      {
        name: "Earnings Wallet & Payout Requests",
        requests: [
          { folder: "Creator", requestName: "Wallet" },
          { folder: "Creator", requestName: "Request payout" },
          { folder: "Creator", requestName: "List payouts" },
        ],
      },
    ],
  },
  {
    featureName: "4. Admin & Platform Operations",
    description: "APIs for Admin Control Panel (Approvals, Campaign Assignment, Moderation, System Settings)",
    subfolders: [
      {
        name: "Admin Profile",
        sources: ["Admin Profile"],
      },
      {
        name: "Platform Management & Approvals",
        sources: ["Admin Panel"],
      },
      {
        name: "Legal & Static Content",
        sources: ["Manage / Legal"],
      },
    ],
  },
];

// Re-organize main collection items
const newMainItems = [];

featureGroups.forEach((group) => {
  const groupFolder = {
    name: group.featureName,
    description: group.description,
    item: [],
  };

  group.subfolders.forEach((sub) => {
    const subFolder = {
      name: sub.name,
      item: [],
    };

    if (sub.sources) {
      sub.sources.forEach((srcName) => {
        const srcFolder = getFolder(srcName);
        if (srcFolder && srcFolder.item) {
          subFolder.item.push(...srcFolder.item);
        }
      });
    }

    if (sub.requests) {
      sub.requests.forEach((reqTarget) => {
        const srcFolder = getFolder(reqTarget.folder);
        if (srcFolder && srcFolder.item) {
          const matchedReq = srcFolder.item.find((r) => r.name.toLowerCase() === reqTarget.requestName.toLowerCase());
          if (matchedReq) {
            subFolder.item.push(matchedReq);
          }
        }
      });
    }

    if (subFolder.item.length > 0) {
      groupFolder.item.push(subFolder);
    }
  });

  if (groupFolder.item.length > 0) {
    newMainItems.push(groupFolder);
  }
});

// Update main collection JSON
rawData.item = newMainItems;
fs.writeFileSync(collectionPath, JSON.stringify(rawData, null, 2), "utf8");
console.log("Updated SomSpot.postman_collection.json with feature-based hierarchy.");

// Also generate individual feature collection files inside postman/ directory
featureGroups.forEach((group, index) => {
  const singleCollection = {
    info: {
      name: `SomSpot API - ${group.featureName}`,
      schema: rawData.info.schema,
      description: group.description,
    },
    variable: rawData.variable,
    item: newMainItems[index]?.item || [],
  };

  const fileName = `SomSpot_${group.featureName.replace(/[^a-zA-Z0-9]/g, "_")}.postman_collection.json`;
  const filePath = path.join(postmanDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(singleCollection, null, 2), "utf8");
  console.log(`Generated feature collection file: postman/${fileName}`);
});

console.log("Postman Feature Organization Completed Successfully!");
