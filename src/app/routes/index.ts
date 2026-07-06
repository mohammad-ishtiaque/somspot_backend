import express from "express";
import AuthRoutes from "../module/auth/auth.routes";
import AdminRoutes from "../module/admin/admin.routes";
import UserRoutes from "../module/user/user.routes";
import ManageRoutes from "../module/manage/manage.routes";
import NotificationRoutes from "../module/notification/notification.routes";
import FeedbackRoutes from "../module/feedback/feedback.routes";
import ReviewRoutes from "../module/review/review.routes";
import ChatRoutes from "../module/chat/chat.routes";
import CategoryRoutes from "../module/category/category.routes";
import BusinessRoutes from "../module/business/business.routes";
import OfferRoutes from "../module/offer/offer.routes";
import ClaimRoutes from "../module/claim/claim.routes";
import SavedRoutes from "../module/saved/saved.routes";
import SearchRoutes from "../module/search/search.routes";
import MerchantRoutes from "../module/merchant/merchant.routes";
import SubscriptionRoutes from "../module/subscription/subscription.routes";
import CampaignRoutes from "../module/campaign/campaign.routes";
import CreatorRoutes from "../module/creator/creator.routes";

const router = express.Router();

const moduleRoutes = [
  { path: "/auth", route: AuthRoutes },
  { path: "/user", route: UserRoutes },
  { path: "/admin", route: AdminRoutes },
  { path: "/manage", route: ManageRoutes },
  { path: "/notification", route: NotificationRoutes },
  { path: "/feedback", route: FeedbackRoutes },
  { path: "/review", route: ReviewRoutes },
  { path: "/chat", route: ChatRoutes },
  // ---- SomSpot: consumer ----
  { path: "/category", route: CategoryRoutes },
  { path: "/business", route: BusinessRoutes },
  { path: "/offer", route: OfferRoutes },
  { path: "/claim", route: ClaimRoutes },
  { path: "/saved", route: SavedRoutes },
  { path: "/search", route: SearchRoutes },
  // ---- SomSpot: merchant ----
  { path: "/merchant", route: MerchantRoutes },
  { path: "/subscription", route: SubscriptionRoutes },
  { path: "/campaign", route: CampaignRoutes },
  // ---- SomSpot: creator ----
  { path: "/creator", route: CreatorRoutes },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export = router;
