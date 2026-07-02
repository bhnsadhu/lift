export type Profile = {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string | null;
  timezone: string;
  onboarded: boolean;
  created_at: string;
};

export type Gym = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  radius_m: number;
  verified: boolean;
};

export type ScheduleDay = {
  user_id: string;
  day_of_week: number; // 0 = Sunday .. 6 = Saturday
  is_gym_day: boolean;
  routine: string;
};

export type GymSession = {
  id: number;
  user_id: string;
  gym_id: number;
  check_in_at: string;
  check_out_at: string | null;
  check_in_lat: number;
  check_in_lng: number;
  check_out_lat: number | null;
  check_out_lng: number | null;
  local_date: string | null;
  qualifies: boolean;
};

export type Streak = {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_qualified_date: string | null;
  streak_start_date: string | null;
};

export type FriendshipStatus = "pending" | "accepted" | "declined";

export type Friendship = {
  id: number;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
