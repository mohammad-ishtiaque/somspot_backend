import type { Types } from "mongoose";

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export interface IOpeningHour {
  day: Weekday; // explicit weekday key — no ambiguous 0..6 numbering
  open: string; // local wall-clock "HH:mm" (NOT UTC — store hours are local)
  close: string; // "HH:mm"; may be < open for overnight (e.g. 20:00–02:00)
  closed?: boolean;
}

export interface IBusiness {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  category: Types.ObjectId;
  description?: string;
  logo?: string;
  coverImage?: string;
  gallery: string[];
  phone?: string;
  whatsapp?: string; // WhatsApp (Optional) — Figma contact step
  address?: string;
  location?: { type: "Point"; coordinates: [number, number] };
  openingHours: IOpeningHour[];
  timezone: string; // IANA tz for open/closed calc; default Africa/Mogadishu
  status: string;
  rejectionReason?: string;
  ratingAvg: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}
