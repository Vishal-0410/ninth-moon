import {
  CreateMoodLogInput,
  CreateSymptomsLogInput,
  FertilityDetails,
} from "@models/home";
import { db, auth } from "../config/firebase";
import { COLLECTIONS } from "@constant/collection";
import { ApiError } from "@utils/apiError";
import quickChatData from "@constant/homePage/quickChatTopics.json";
import dailyAffirmationData from "@constant/homePage/dailyAffirmation.json";
import pregnancyStatusData from "@constant/homePage/pregnancyStatus.json";
import recoveryStatusData from "@constant/homePage/recoveryStatus.json";
import { normalizeMidnightToUTC, utcToLocalDate } from "@utils/normalizeDate";
import { HOME_PAGE_ERRORS } from "@constant/errorMessages/home";

function CalculateCurrentWeekAndDay(lastMenstrualPeriod: Date): {
  week: number;
} {
  const today = new Date();
  const lmpDate = new Date(lastMenstrualPeriod);
  const differenceInMilliseconds = today.getTime() - lmpDate.getTime();
  const daysPregnant = Math.floor(
    differenceInMilliseconds / (1000 * 60 * 60 * 24)
  );
  const currentWeek = Math.floor(daysPregnant / 7);

  return { week: currentWeek };
}

function GetAffirmations(cat: string) {
  if (dailyAffirmationData.hasOwnProperty(cat)) {
    const affirmationsForjourney =
      dailyAffirmationData[cat as keyof typeof dailyAffirmationData];
    const randomIndex = Math.floor(
      Math.random() * affirmationsForjourney.length
    );
    return affirmationsForjourney[randomIndex];
  }
  return "No affirmation found for this journey.";
}

function GetQuickChatTopics(cat: string) {
  if (quickChatData.hasOwnProperty(cat)) {
    return quickChatData[cat as keyof typeof quickChatData];
  } else {
    return [];
  }
}

function PregnancyStatus(week: number) {
  const pregnanacyObject = pregnancyStatusData.pregnancy_status.find(
    (item) => item.week === week
  );
  if (!pregnanacyObject) {
    return "no pregnancy data";
  }
  return pregnanacyObject;
}

function RecoveryStatus(cat: string, week: number) {
  if (recoveryStatusData.hasOwnProperty(cat)) {
    const recoveryForjourney =
      recoveryStatusData[cat as keyof typeof recoveryStatusData];
    const recoveryObject = recoveryForjourney.find(
      (item) => item.week === week
    );
    if (recoveryObject) {
      return { week:recoveryObject.week, overview:recoveryObject.overview };
    }else {
      return "No recovery data found for this week.";
    }
  } else {
    return "Invalid journey";
  }
}

async function GetLastMoodLog(uid: string) {
  const moodLogsSnapshot = await db
    .collection(COLLECTIONS.MOOD_LOGS)
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  return moodLogsSnapshot.empty ? null : moodLogsSnapshot.docs[0].data();
}

async function GetLastSymptomsLog(uid: string) {
  const symptomsLogsSnapshot = await db
    .collection(COLLECTIONS.SYMPTOMS_LOGS)
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  return symptomsLogsSnapshot.empty
    ? null
    : symptomsLogsSnapshot.docs[0].data();
}

export function CalculateFertilityDates(
  lastMenstrualPeriod: string,
  timezone: string,
  avgCycleLength: number,
  lutealLength: number
) {
  const now = new Date();
  const normalizedLMP = normalizeMidnightToUTC(lastMenstrualPeriod, timezone);
  const lmpDate = new Date(normalizedLMP);
  const nowDate = new Date(normalizeMidnightToUTC(now, timezone));

  const daysBetween = Math.floor(
    (nowDate.getTime() - lmpDate.getTime()) / 86400000
  );
  let k = Math.ceil(daysBetween / avgCycleLength);
  if (k < 1) k = 1;

  let nextMenstrualDate = new Date(lmpDate);
  nextMenstrualDate.setUTCDate(
    nextMenstrualDate.getUTCDate() + k * avgCycleLength
  );

  let nextOvulationDate = new Date(nextMenstrualDate);
  nextOvulationDate.setUTCDate(nextOvulationDate.getUTCDate() - lutealLength);

  if (nextOvulationDate < nowDate) {
    const diffCycles = Math.ceil(
      (nowDate.getTime() - nextOvulationDate.getTime()) /
        (avgCycleLength * 86400000)
    );
    nextMenstrualDate.setUTCDate(
      nextMenstrualDate.getUTCDate() + diffCycles * avgCycleLength
    );
    nextOvulationDate.setUTCDate(
      nextOvulationDate.getUTCDate() + diffCycles * avgCycleLength
    );
  }

  return {
    lastMenstrualPeriod: utcToLocalDate(normalizedLMP, timezone),
    nextOvulation: utcToLocalDate(nextOvulationDate.toISOString(), timezone),
    nextMenstrualPeriod: utcToLocalDate(
      nextMenstrualDate.toISOString(),
      timezone
    ),
  };
}

export const HomePageService = async (uid: string): Promise<any> => {
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!userDoc.exists)
    throw new ApiError(
      HOME_PAGE_ERRORS.USER_NOT_FOUND.statusCode,
      HOME_PAGE_ERRORS.USER_NOT_FOUND.message
    );

  const userData = userDoc.data();
  if (!userData)
    throw new ApiError(
      HOME_PAGE_ERRORS.USER_NOT_FOUND.statusCode,
      HOME_PAGE_ERRORS.USER_NOT_FOUND.message
    );

  const journey: string | undefined = userData.journey;
  if (!journey)
    throw new ApiError(
      HOME_PAGE_ERRORS.USER_JOURNEY_NOT_FOUND.statusCode,
      HOME_PAGE_ERRORS.USER_JOURNEY_NOT_FOUND.message
    );

  const timezone = userData.timezone;
  const lastMoodLog = await GetLastMoodLog(uid);
  const lastSymptomsLog = await GetLastSymptomsLog(uid);

  if (["pregnant", "caregiver", "fertility"].includes(journey)) {
    const dateField = "first_day_of_last_menstrual_cycle";
    const fromDateUTC = userData[dateField];
    if (!fromDateUTC) {
      throw new ApiError(
        HOME_PAGE_ERRORS.USER_JOURNEY_NOT_FOUND.statusCode,
        HOME_PAGE_ERRORS.USER_JOURNEY_NOT_FOUND.message
      );
    }
    const fromDateLocal = new Date(utcToLocalDate(fromDateUTC, timezone));
    const data = CalculateCurrentWeekAndDay(fromDateLocal);
    const affirmation = GetAffirmations(journey);
    const quickChatTopics = GetQuickChatTopics(journey);

    if (journey === "fertility") {
      const avgCycleLength: number = userData.avgCycleLength || 28;
      const lutealLength: number = userData.lutealLength || 14;
      return {
        affirmation,
        lastMoodLog: lastMoodLog,
        lastSymptomsLog,
        quickChatTopics,
        fertilityDetails: CalculateFertilityDates(
        fromDateUTC,
        timezone,
        avgCycleLength,
        lutealLength
        ),
      };
    } else {
      const pregnancyData = PregnancyStatus(data.week);
      return {
        affirmation,
        lastMoodLog,
        lastSymptomsLog,
        quickChatTopics,
        currentWeek: data.week,
        pregnancyStatus: pregnancyData,
      };
    }
  } else if (["miscarriage", "abortion"].includes(journey)) {
    const dateField =
      journey === "miscarriage" ? "miscarriage_occur" : "abortion_occur";
    const fromDateUTC = userData[dateField];
    if (!fromDateUTC)
      throw new ApiError(
        HOME_PAGE_ERRORS.USER_NOT_FOUND.statusCode,
        HOME_PAGE_ERRORS.USER_NOT_FOUND.message
      );

    const fromDateLocal = new Date(utcToLocalDate(fromDateUTC, timezone));
    const data = CalculateCurrentWeekAndDay(fromDateLocal);
    const affirmation = GetAffirmations(journey);
    const quickChatTopics = GetQuickChatTopics(journey);
    const recoveryStatus = RecoveryStatus(journey, data.week);
    return {
      affirmation,
      lastMoodLog,
      quickChatTopics,
      currentWeek: data.week,
      recoveryStatus,
    };
  } else {
    throw new ApiError(
      HOME_PAGE_ERRORS.USER_JOURNEY_NOT_FOUND.statusCode,
      HOME_PAGE_ERRORS.USER_JOURNEY_NOT_FOUND.message
    );
  }
};

export const MoodLogsServices = async (
  uid: string,
  mood: string
): Promise<CreateMoodLogInput> => {
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!userDoc.exists) {
    throw new ApiError(
      HOME_PAGE_ERRORS.USER_NOT_FOUND.statusCode,
      HOME_PAGE_ERRORS.USER_NOT_FOUND.message
    );
  }
  const userData = userDoc.data();
  const timezone = userData?.timezone || "UTC";

  const todayLocal = utcToLocalDate(new Date().toISOString(), timezone);
  const todayMidnightUTC = normalizeMidnightToUTC(todayLocal, timezone);

  const tomorrow = new Date(todayMidnightUTC);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const moodLogsRef = db.collection(COLLECTIONS.MOOD_LOGS);
  const todaysLogs = await moodLogsRef
    .where("uid", "==", uid)
    .where("createdAt", ">=", todayMidnightUTC)
    .where("createdAt", "<", tomorrow.toISOString())
    .get();

  const logsCount = todaysLogs.size;

  const newDocRef = moodLogsRef.doc();

  const moodLog = {
    uid: uid,
    mood,
    logsCount: logsCount + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await newDocRef.set(moodLog);

  const moodLogOutput: CreateMoodLogInput = {
    id: newDocRef.id,
    ...moodLog,
  };
  return moodLogOutput;
};

export const SymptomsService = async (
  uid: string,
  symptoms: string[]
): Promise<CreateSymptomsLogInput> => {
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new ApiError(
      HOME_PAGE_ERRORS.USER_NOT_FOUND.statusCode,
      HOME_PAGE_ERRORS.USER_NOT_FOUND.message
    );
  }
  const userData = userDoc.data();
  const timezone = userData?.timezone || "UTC";

  const todayLocal = utcToLocalDate(new Date().toISOString(), timezone);
  const todayMidnightUTC = normalizeMidnightToUTC(todayLocal, timezone);

  const tomorrow = new Date(todayMidnightUTC);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const symptomsDocRef = db.collection(COLLECTIONS.SYMPTOMS_LOGS);

  const todaysLogs = await symptomsDocRef
    .where("uid", "==", uid)
    .where("createdAt", ">=", todayMidnightUTC)
    .where("createdAt", "<", tomorrow.toISOString())
    .get();

  const logsCount = todaysLogs.size;
  const newDocRef = symptomsDocRef.doc();

  const symptomLog = {
    uid: uid,
    symptoms,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    logCount: logsCount + 1,
  };
  await newDocRef.set(symptomLog);

  return { id: newDocRef.id, ...symptomLog };
};

export const FertilityDetailsCreateService = async (
  uid: string,
  lastMenstrualPeriod: string
): Promise<FertilityDetails> => {
  const now = new Date();

  const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!userDoc.exists) {
    throw new ApiError(
      HOME_PAGE_ERRORS.USER_NOT_FOUND.statusCode,
      HOME_PAGE_ERRORS.USER_NOT_FOUND.message
    );
  }

  const userData = userDoc.data();
  if (!userData) {
    throw new ApiError(
      HOME_PAGE_ERRORS.USER_NOT_FOUND.statusCode,
      HOME_PAGE_ERRORS.USER_NOT_FOUND.message
    );
  }

  const timeZone = userData.timezone || "UTC";
  const avgCycleLength: number = userData.avgCycleLength || 28;
  const lutealLength: number = userData.lutealLength || 14;

  const normalizedLMP = normalizeMidnightToUTC(lastMenstrualPeriod, timeZone);

  await db
    .collection(COLLECTIONS.USERS)
    .doc(uid)
    .update({ last_menstrual_period: normalizedLMP,lmpHistory: [...(userData.lmpHistory || []), normalizedLMP] });

  const calculatedDates = CalculateFertilityDates(
    lastMenstrualPeriod,
    timeZone,
    avgCycleLength,
    lutealLength
  );

  const fertilityDetails: FertilityDetails = {
    uid: uid,
    lastMenstrualPeriod: calculatedDates.lastMenstrualPeriod,
    nextOvulation: calculatedDates.nextOvulation,
    nextMenstrualPeriod: calculatedDates.nextMenstrualPeriod,
    avgCycleLength,
    lutealLength,
  };

  return fertilityDetails;
};
