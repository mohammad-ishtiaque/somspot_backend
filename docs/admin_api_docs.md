# Admin Dashboard API Documentation

This document maintains all the API endpoints used by the Admin Dashboard. It includes response filter options, keys, payloads, and the current status of each feature (Created vs. Left to Build). 

*Note: All APIs below require the `Authorization` header with a valid Admin token.*

---

## ✅ APIs Already Created

### 1. Dashboard & Analytics
| Method | Endpoint | Description | Query / Payload |
|--------|----------|-------------|-----------------|
| `GET` | `/admin/analytics` | Returns all platform stats for the dashboard (users, claims, revenue, recent activity). | - |
| `GET` | `/admin/profile` | Get admin's own profile. | - |
| `PATCH` | `/admin/edit-profile` | Update admin profile. | `multipart/form-data`: `name`, `profile_image` |

### 2. User Management
| Method | Endpoint | Description | Query / Payload |
|--------|----------|-------------|-----------------|
| `GET` | `/user/admin/list` | Get paginated list of regular users. | Query: `?searchTerm=...&page=1&limit=10` |
| `GET` | `/user/admin/details` | Get full details of a specific user. | Query: `?userId=...` |
| `PATCH` | `/user/admin/block` | Block or unblock a user. | Body: `{ "userId": "...", "action": "block" \| "unblock" }` |

### 3. Merchant Management
| Method | Endpoint | Description | Query / Payload |
|--------|----------|-------------|-----------------|
| `GET` | `/merchant/admin/list` | Get paginated list of merchants. | Query: `?searchTerm=...&page=1&limit=10` |
| `GET` | `/merchant/admin/details`| Get full details of a merchant. | Query: `?merchantId=...` |
| `PATCH`| `/merchant/admin/block` | Block or unblock a merchant. | Body: `{ "merchantId": "...", "action": "block" \| "unblock" }` |

### 4. Creator / Influencer Management
| Method | Endpoint | Description | Query / Payload |
|--------|----------|-------------|-----------------|
| `GET` | `/creator/admin/list` | Get paginated list of creators. | Query: `?searchTerm=...&category=...` |
| `GET` | `/creator/admin/get` | Get specific creator profile. | Query: `?creatorId=...` |

### 5. Business Management
| Method | Endpoint | Description | Query / Payload |
|--------|----------|-------------|-----------------|
| `GET` | `/business/admin/list` | List all businesses (approved/pending/rejected). | Query: `?status=...&category=...&page=1&limit=10` |
| `PATCH`| `/business/verify` | Approve or reject a business submission. | Body: `{ "businessId": "...", "action": "approve" \| "reject", "rejectionReason": "..." }` |

### 6. Campaign (Influencer) Management
| Method | Endpoint | Description | Query / Payload |
|--------|----------|-------------|-----------------|
| `GET` | `/campaign/admin/list` | List all campaigns. | Query: `?status=pending_approval&searchTerm=...` |
| `POST` | `/campaign/admin/assign-creator` | Assign a creator to a pending campaign. | Body: `{ "campaignId": "...", "creatorUserId": "...", "pitch": "..." }` |
| `PATCH`| `/campaign/admin/review` | Approve/reject a campaign (after staffing). | Body: `{ "campaignId": "...", "action": "approve" \| "reject" }` |

### 7. Offers & Promotions
| Method | Endpoint | Description | Query / Payload |
|--------|----------|-------------|-----------------|
| `GET` | `/offer/admin/list` | List all offers across the platform. | Query: `?status=...&searchTerm=...` |

### 8. Review Moderation
| Method | Endpoint | Description | Query / Payload |
|--------|----------|-------------|-----------------|
| `PATCH`| `/review/admin/moderate` | Approve, hide, or delete a review. | Body: `{ "reviewId": "...", "action": "approve" \| "hide" \| "delete" }` |

### 9. Subscriptions & Payments
| Method | Endpoint | Description | Query / Payload |
|--------|----------|-------------|-----------------|
| `GET` | `/subscription/admin/list`| List all merchant subscriptions. | Query: `?status=...&page=1` |
| `GET` | `/payment/admin/list` | List all payments made on platform. | Query: `?page=1&limit=10` |
| `GET` | `/payment/admin/details` | Details of a specific payment. | Query: `?paymentId=...` |

### 10. Categories (Global)
| Method | Endpoint | Description | Query / Payload |
|--------|----------|-------------|-----------------|
| `GET` | `/category/get-all` | List all categories. | Query: `?type=business \| creator` |
| `POST` | `/category/create` | Create a new category. | `multipart/form-data`: `name`, `type`, `icon` |
| `PATCH`| `/category/update` | Update a category. | `multipart/form-data`: `categoryId`, `name`, `icon` |
| `DELETE`|`/category/delete` | Delete a category. | Body: `{ "categoryId": "..." }` |

### 11. Notifications
| Method | Endpoint | Description | Query / Payload |
|--------|----------|-------------|-----------------|
| `POST` | `/notification/admin/broadcast`| Send a push notification to users. | Body: `{ "title": "...", "body": "...", "role": "USER" \| "MERCHANT" }` |

---

## 🚧 APIs Left To Build (Pending)

### 1. Delivery Driver Reporting System
- **`POST /report/create` (Driver App)**: Drivers submit an issue (title, description, photo, deliveryId).
- **`GET /report/admin/list`**: Admin fetches the list of all submitted reports (Filter options: `status=pending|resolved`).
- **`GET /report/admin/details`**: Admin fetches full details and photos of a specific report.
- **`PATCH /report/admin/resolve`**: Admin updates a report's status from `pending` to `resolved`.

### 2. Modified Dashboard Charts (Orders)
- **`GET /admin/order-analytics` (or update existing analytics)**: The existing `/admin/analytics` returns some month-to-month trends, but needs to be updated to specifically return the **completed vs. cancelled orders** filtered by **months** (not days) as per the Figma dashboard design.
