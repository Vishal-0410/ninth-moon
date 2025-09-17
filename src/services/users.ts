import { bucket, db } from "@config/firebase";
import type { UserInput } from "@validationSchema/user";
import { CreateUserInput, UserProfile } from "@models/user";
import { ApiError } from "@utils/apiError";
import { USER_ERRORS } from "@constant/errorMessages/users";
import { normalizeMidnightToUTC } from "@utils/normalizeDate";
import { COLLECTIONS } from "@constant/collection";
import fs from 'fs';
import logger from "@utils/logger";

export const SaveFcmTokenService = async (uid: string, token: string) => {
  if (!token) throw new ApiError(USER_ERRORS.NO_TOKEN_FOUND.statusCode, USER_ERRORS.NO_TOKEN_FOUND.message);

  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) throw new ApiError(USER_ERRORS.USER_NOT_FOUND.statusCode, USER_ERRORS.USER_NOT_FOUND.message);

  await userRef.set({ fcmToken: token }, { merge: true });

  return token;
};

export const CreateUserService = async (
  userData: UserInput,
  decodedUser: { uid: string; email: string }
): Promise<CreateUserInput> => {
  const userId: string = decodedUser.uid;
  const email: string | undefined = decodedUser.email;

  if (!userId || !email) {
    throw new ApiError(
      USER_ERRORS.INVALID_CREDENTIALS.statusCode,
      USER_ERRORS.INVALID_CREDENTIALS.message
    );
  }

  const userDocRef = await db.collection(COLLECTIONS.USERS).doc(userId);
  let dataToStore: Partial<CreateUserInput>;

  await db.runTransaction(async (transaction) => {
  const userDoc = await transaction.get(userDocRef);
    if (userDoc.exists && userDoc.data()?.journey) {
      throw new ApiError(
        USER_ERRORS.USER_PROFILE_EXISTS.statusCode,
        USER_ERRORS.USER_PROFILE_EXISTS.message
      );
    }

  const timezone = userData.timezone;
  const normalizeDob = normalizeMidnightToUTC(userData.dob, timezone);

   dataToStore= {
    email,
    name: userData.name,
    dob: normalizeDob,
    country: userData.country,
    timezone,
    role: "user",
    roles: ["user"],
    status:"active",
    privacy_policy_accepted: true, 
    journey: userData.journey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (userData.journey === "pregnant" || userData.journey === "caregiver") {
    Object.assign(dataToStore, {
      first_day_of_last_menstrual_cycle:
        userData.first_day_of_last_menstrual_cycle
          ? normalizeMidnightToUTC(userData.first_day_of_last_menstrual_cycle, timezone)
          : undefined,
      current_trimester: userData.current_trimester,
      current_week: userData.current_week,
      due_date: userData.due_date
        ? normalizeMidnightToUTC(userData.due_date, timezone)
        : undefined,
      medications_taking: userData.medications_taking,
      diet_preference: userData.diet_preference,
      kind_of_support_needed: userData.kind_of_support_needed,
      health_conditions: userData.health_conditions,
    });
  } else if (userData.journey === "miscarriage") {
    Object.assign(dataToStore, {
      miscarriage_occur: userData.miscarriage_occur
        ? normalizeMidnightToUTC(userData.miscarriage_occur, timezone)
        : undefined,
      medical_support_for_recovery: userData.medical_support_for_recovery,
      is_first_miscarriage: userData.is_first_miscarriage,
      physical_symptoms: userData.physical_symptoms,
      medications_taking: userData.medications_taking,
      diet_preference: userData.diet_preference,
      kind_of_support_needed: userData.kind_of_support_needed,
    });
  } else if (userData.journey === "abortion") {
    Object.assign(dataToStore, {
      abortion_occur: userData.abortion_occur
        ? normalizeMidnightToUTC(userData.abortion_occur, timezone)
        : undefined,
      is_elective_or_medical: userData.is_elective_or_medical,
      is_first_miscarriage: userData.is_first_miscarriage,
      medications_taking: userData.medications_taking,
      diet_preference: userData.diet_preference,
      kind_of_support_needed: userData.kind_of_support_needed,
    });
  } else if (userData.journey === "fertility") {
    Object.assign(dataToStore, {
      first_day_of_last_menstrual_cycle:
        userData.first_day_of_last_menstrual_cycle
          ? normalizeMidnightToUTC(userData.first_day_of_last_menstrual_cycle, timezone)
          : undefined,
      currently_trying_to_conceive: userData.currently_trying_to_conceive,
      avg_cycle_length: userData.avg_cycle_length || 28,
      luteal_length: userData.luteal_length || 14,
      currently_undergoing_fertility_treatment:
        userData.currently_undergoing_fertility_treatment,
      health_conditions: userData.health_conditions,
      medications_taking: userData.medications_taking,
      diet_preference: userData.diet_preference,
      kind_of_support_needed: userData.kind_of_support_needed,
    });
  }
   transaction.set(userDocRef, dataToStore, { merge: true });
  });
  const outputData: CreateUserInput = {
    uid: userId,
    ...dataToStore!,
  } as CreateUserInput;
  return outputData;
};

export const GetUserProfileService = async (uid: string): Promise<UserProfile> => {
  const userDocRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const userDoc = await userDocRef.get();
  if (!userDoc.exists) throw new ApiError(USER_ERRORS.USER_NOT_FOUND.statusCode, USER_ERRORS.USER_NOT_FOUND.message);
  const userData = userDoc.data() as CreateUserInput;
  if (!userData) throw new ApiError(USER_ERRORS.USER_NOT_FOUND.statusCode, USER_ERRORS.USER_NOT_FOUND.message);

  const profileData = {
    uid,
    email: userData.email,
    profileImage: userData.profileImage ? userData.profileImage : null,
    name: userData.name,
    dob: userData.dob,
    country: userData.country,
    timezone: userData.timezone,
  }
  
  return profileData;
};

export const UploadProfileImageService = async (
  uid: string,
  filename: string,
  localFilePath: string
): Promise<string> => {
  const userDocRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const userDoc = await userDocRef.get();

  if (!userDoc.exists) {
    throw new ApiError(USER_ERRORS.USER_NOT_FOUND.statusCode, USER_ERRORS.USER_NOT_FOUND.message);
  }

  const userData = userDoc.data() as CreateUserInput;
  if (!userData) {
    throw new ApiError(USER_ERRORS.USER_NOT_FOUND.statusCode, USER_ERRORS.USER_NOT_FOUND.message);
  }
  if (userData.profileImage) {
    const oldFile = bucket.file(userData.profileImage);
    try {
      await oldFile.delete();
    } catch (err:any) {
      logger.warn("Failed to delete old image. Might not exist.", err.message);
    }
  }
  const destination = `uploads/images/${uid}/${filename}`;
  await bucket.upload(localFilePath, { destination });
  const file = bucket.file(destination);
  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
  await userDocRef.set({ profileImage: publicUrl }, { merge: true });
  fs.unlinkSync(localFilePath);
  return publicUrl;
};

export const UpdateProfileDetailsService = async (
  uid: string,
  name?: string,
  dob?: string,
  country?: string,
  timezone?: string
): Promise<{ uid: string; updates: Partial<CreateUserInput> }> => {
  const userDocRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const userDoc = await userDocRef.get();

  if (!userDoc.exists) {
    throw new ApiError(
      USER_ERRORS.USER_NOT_FOUND.statusCode,
      USER_ERRORS.USER_NOT_FOUND.message
    );
  }

  const updates: Partial<CreateUserInput> = {
    updatedAt: new Date().toISOString(),
  };

  if (name) updates.name = name;
  if (dob) updates.dob = dob;
  if (country) updates.country = country;
  if (timezone) updates.timezone = timezone;

  await userDocRef.set(updates, { merge: true });
  return {uid,updates}
};

