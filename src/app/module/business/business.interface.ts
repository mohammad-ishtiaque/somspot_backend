import type { Types } from "mongoose";

export interface IOpeningHour {
  day: number; // 0=Sun .. 6=Sat
  open: string; // "09:00"
  close: string; // "22:00"
  closed?: boolean;
}

export interface IBusiness {
  _id: Types.ObjectId;
  owner: Types.ObjectId; // User (merchant) who owns it
  name: string;
  category: Types.ObjectId;
  description?: string;
  logo?: string;
  coverImage?: string;
  gallery: string[];
  phone?: string;
  address?: string;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  openingHours: IOpeningHour[];
  documents: string[];
  status: string; // EnumBusinessStatus
  rejectionReason?: string;
  ratingAvg: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}
