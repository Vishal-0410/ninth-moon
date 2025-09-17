export interface CreateUserInput {
  uid: string;
  name: string;
  email: string;
  profileImage?: string;
  dob: string;
  country: string;
  timezone:string;
  otp?:string;
  fcmToken?:string;
  status:"active" | "suspended" | "pending_deletion";
  refreshToken?:string;
  privacy_policy_accepted: true, 
  lmpHistory?: string[];
  role: "user" | "super_admin" | "content_manager" | "support_agent" | "junior_admin" | "ad_manager";
  roles:string[];
  journey: "pregnant" | "caregiver" | "miscarriage" | "abortion" | "fertility";
  first_day_of_last_menstrual_cycle?: string;
  current_trimester?: "first" | "second" | "third";
  current_week?: number;
  due_date?:Date | string;
  medications_taking?: string[];
  diet_preference?: string[];
  kind_of_support_needed?: "emotional_support" | "partner_bonding" | "medical_FAQs" | "stressManagement" | "daily_reminders";
  miscarriage_occur?: string;
  medical_support_for_recovery?: "yes" | "no" | "prefer_no_to_say";
  is_first_miscarriage?: "yes" | "no";
  physical_symptoms?: string[];
  abortion_occur?: string;
  is_elective_or_medical?: "elective" | "medical" | "prefer_no_to_say";
  currently_trying_to_conceive?: "yes" | "no";
  avg_cycle_length?: number;
  luteal_length?: number;
  currently_undergoing_fertility_treatment?: "yes" | "no" | "considering" | "prefer_no_to_say";
  health_conditions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  profileImage: string | null;
  name: string;
  dob: string;
  country: string;
  timezone: string;
}
