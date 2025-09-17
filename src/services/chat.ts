import { db } from "@config/firebase";
import { COLLECTIONS } from "@constant/collection";
import { ApiError } from "@utils/apiError";
import { utcToLocalDate } from "../utils/normalizeDate";
import { ModerationSettings } from "@models/chat";

function CalculateCurrentWeekAndDay(lastMenstrualPeriod: string): {
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

const logBlockedQuery = async (uid: string, query: string, reason: string) => {
  await db.collection(COLLECTIONS.BLOCKED_QUERIES).add({
    uid: uid,
    query: query,
    reason: reason,
    timestamp: new Date(),
  });
};
const isQuerySafe = async (query: string): Promise<boolean> => {
  // In a real app, you would make an API call here.
  // const moderationResponse = await openai.moderations.create({ input: query });
  // return !moderationResponse.results[0].flagged;
  return true;
};

const isQueryAllowed = async (
  query: string,
  allowedTopics?: string[]
): Promise<boolean> => {
  // In a real app, you would use a model to classify the query's topic.
  // Example: return classifier.predict(query).isOneOf(allowedTopics);
  return true; // DUMMY: Always return true for now.
};

export const ChatService = async (message: string, uid: string) => {
  const [userDetails, lastMoodLogSnapshot, lastSymptomsLogSnapshot, moderationSettingsSnapshot] =
    await Promise.all([
      db.collection(COLLECTIONS.USERS).doc(uid).get(),
      db
        .collection(COLLECTIONS.MOOD_LOGS)
        .where("uid", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get(),
      db
        .collection(COLLECTIONS.SYMPTOMS_LOGS)
        .where("uid", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get(),
      db.collection(COLLECTIONS.MODERATIONS_SETTINGS).doc("rules").get(),
    ]);
  if (!userDetails.exists) {
    throw new ApiError(404, "User not found");
  }

  const moderationSettings: ModerationSettings =
    (moderationSettingsSnapshot.data() as ModerationSettings) || {
      restricted_keywords: [],
      exceptions: [],
      off_topic_response:
        "I'm here to support your pregnancy journey. Please ask me something related to that!",
    };

  // --- Multi-Layered Moderation Checks ---
  const offTopicResponse = moderationSettings.off_topic_response;
  const queryLower = message.toLowerCase();

  // 1. OpenAI's Moderation Endpoint (Conceptual)
  const isSafe = await isQuerySafe(message);
  if (!isSafe) {
    await logBlockedQuery(uid, message, "OpenAI Moderation Flag");
    throw new ApiError(200, offTopicResponse);
  }

  // 2. Rule-based Keyword Filters and Exceptions
  const restrictedKeywords = moderationSettings.restricted_keywords || [];
  const exceptions = moderationSettings.exceptions || [];

  const hasException = exceptions.some((exception) =>
    queryLower.includes(exception.toLowerCase())
  );
  if (!hasException) {
    const hasRestrictedKeyword = restrictedKeywords.some((keyword) =>
      queryLower.includes(keyword.toLowerCase())
    );
    if (hasRestrictedKeyword) {
      await logBlockedQuery(uid, message, "Restricted Keyword");
      throw new ApiError(200, offTopicResponse);
    }
  }

  // 3. Topic Classifier Model (Conceptual)
  const isAllowedTopic = await isQueryAllowed(
    message,
    moderationSettings.allowed_topics
  );
  if (!isAllowedTopic) {
    await logBlockedQuery(uid, message, "Off-topic Classification");
    throw new ApiError(200, offTopicResponse);
  }

  const lastMoodLog = lastMoodLogSnapshot.empty
    ? null
    : lastMoodLogSnapshot.docs[0].data();
  const lastSymptomsLog = lastSymptomsLogSnapshot.empty
    ? null
    : lastSymptomsLogSnapshot.docs[0].data();

  const recentContext = await db
    .collection(COLLECTIONS.CHAT_MESSAGE)
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  let recentContextData: { message: string; response: string }[] = [];
  if (recentContext.empty) {
    recentContextData = [];
  } else {
    recentContextData = recentContext.docs.map((doc) => {
      const data = doc.data();
      return {
        message: data.message,
        response: data.response,
      };
    });
  }

  const chatDocRef = await db.collection(COLLECTIONS.CHAT).doc(uid).get();
  let longTermSummary;
  if (chatDocRef.exists) {
    const chatData = chatDocRef.data();
    longTermSummary = chatData?.longTermSummary;
  } else {
    longTermSummary = "N/A";
  }

  const user = userDetails.data() || {};
  const { journey, timezone, name, dob, country } = user;
  const latestMoodLogsData = lastMoodLog;
  const latestSymptomsLogsData = lastSymptomsLog;

  const commonDetails = {
    name: name,
    dob: utcToLocalDate(dob, timezone),
    country: country,
    moodLogs: latestMoodLogsData?.mood,
    symptomsLogs: latestSymptomsLogsData?.symptoms,
  };

  let prompt;

  if (journey === "pregnant" || journey === "caregiver") {
    const {
      first_day_of_last_menstrual_cycle,
      medications_taking,
      due_date,
      diet_preference,
      kind_of_support_needed,
    } = user;
    const currentWeek = CalculateCurrentWeekAndDay(
      first_day_of_last_menstrual_cycle
    ).week;
    let currentTrimester;
    if (currentWeek >= 1 && currentWeek <= 13) {
      currentTrimester = "first";
    } else if (currentWeek >= 14 && currentWeek <= 27) {
      currentTrimester = "second";
    } else if (currentWeek >= 28) {
      currentTrimester = "third";
    }

    prompt = `You are a health assistant specializing in pregnancy and related topics. You provide accurate and empathetic responses to queries about pregnancy, childbirth, and related health issues.
      Patient Details:
      - Name: ${commonDetails.name}
      - Date of Birth: ${commonDetails.dob}
      - Country: ${commonDetails.country}
      - First day of last menstrual period: ${utcToLocalDate(
        first_day_of_last_menstrual_cycle,
        timezone
      )}
      - Current Trimester: ${currentTrimester}
      - Pregnancy Week: ${currentWeek}
      - Medication Taking: ${medications_taking?.join(", ") || "N/A"}
      - Due Date: ${due_date || "N/A"}
      - Diet Preference: ${diet_preference?.join(", ") || "N/A"}
      - Kind of support needed: ${kind_of_support_needed || "N/A"}
      - Last Mood Logs: ${JSON.stringify(commonDetails.moodLogs)}
      - Last Symptoms Logs: ${JSON.stringify(commonDetails.symptomsLogs)}
      - Recent context:${JSON.stringify(recentContextData)}
      - long-summary / session-summary: ${longTermSummary}
    `;
  }

  if (journey === "miscarriage") {
    const {
      miscarriage_occur,
      is_first_miscarriage,
      medical_support_for_recovery,
      physical_symptoms,
      medications_taking,
      diet_preference,
      kind_of_support_needed,
    } = user;
    prompt = `You are a empathetic health assistant specializing in providing support and information for miscarriage. You offer guidance on physical recovery, emotional well-being, and future health considerations.
      Patient Details:
      - Name: ${commonDetails.name}
      - Date of Birth: ${commonDetails.dob}
      - Country: ${commonDetails.country}
      - Miscarriage Occurred On: ${utcToLocalDate(miscarriage_occur, timezone)}
      - Is this the first miscarriage?: ${is_first_miscarriage || "N/A"}
      - Medical Support for Recovery: ${medical_support_for_recovery || "N/A"}
      - Physical Symptoms/Emotional Distress: ${
        physical_symptoms?.join(", ") || "N/A"
      }
      - Medications/Supplements: ${medications_taking?.join(", ") || "N/A"}
      - Diet Preference: ${diet_preference?.join(", ") || "N/A"}
      - Kind of support needed: ${kind_of_support_needed || "N/A"}
      - Last Mood Logs: ${JSON.stringify(commonDetails.moodLogs)}
      - Last Symptoms Logs: ${JSON.stringify(commonDetails.symptomsLogs)}
      - Recent context:${JSON.stringify(recentContextData)}
      - long-summary / session-summary: ${longTermSummary}
    `;
  }

  if (journey === "abortion") {
    const {
      abortion_occur,
      is_elective_or_medical,
      physical_symptoms,
      medications_taking,
      diet_preference,
      kind_of_support_needed,
    } = user;
    prompt = `You are a helpful and non-judgmental health assistant specializing in abortion-related queries. You provide accurate information on post-abortion care, emotional recovery, and future health planning.
      User Details:
      - Name: ${commonDetails.name}
      - Date of Birth: ${commonDetails.dob}
      - Country: ${commonDetails.country}
      - Abortion Occurred On: ${utcToLocalDate(abortion_occur, timezone)}
      - Was this an elective or medical abortion?: ${
        is_elective_or_medical || "N/A"
      }
      - Physical Symptoms/Emotional Distress: ${
        physical_symptoms?.join(", ") || "N/A"
      }
      - Medications/Supplements: ${medications_taking?.join(", ") || "N/A"}
      - Diet Preference: ${diet_preference?.join(", ") || "N/A"}
      - Kind of support needed: ${kind_of_support_needed || "N/A"}
      - Last Mood Logs: ${JSON.stringify(commonDetails.moodLogs)}
      - Last Symptoms Logs: ${JSON.stringify(commonDetails.symptomsLogs)}
      - Recent context:${JSON.stringify(recentContextData)}
      - long-summary / session-summary: ${longTermSummary}
      `;
  }

  if (journey === "fertility") {
    const {
      first_day_of_last_menstrual_cycle,
      currently_trying_to_conceive,
      avg_cycle_length,
      currently_undergoing_fertility_treatment,
      health_conditions,
      medications_taking,
      diet_preference,
      kind_of_support_needed,
    } = user;
    prompt = `You are a knowledgeable and supportive health assistant specializing in fertility. You provide evidence-based information and compassionate support for individuals and couples navigating fertility challenges.
      User Details:
      - Name: ${commonDetails.name}
      - Date of Birth: ${commonDetails.dob}
      - Country: ${commonDetails.country}
      - First day of last menstrual period: ${utcToLocalDate(
        first_day_of_last_menstrual_cycle,
        timezone
      )}
      - Currently Trying to Conceive: ${currently_trying_to_conceive || "N/A"}
      - Average Cycle Length: ${avg_cycle_length || 28} days
      - Currently Undergoing Fertility Treatment: ${
        currently_undergoing_fertility_treatment || "N/A"
      }
      - Health Conditions Affecting Fertility: ${
        health_conditions?.join(", ") || "N/A"
      }
      - Medication Taking for Fertility: ${
        medications_taking?.join(", ") || "N/A"
      }
      - Diet Preference: ${diet_preference?.join(", ") || "N/A"}
      - Kind of support needed: ${kind_of_support_needed || "N/A"}
      - Last Mood Logs: ${JSON.stringify(commonDetails.moodLogs)}
      - Last Symptoms Logs: ${JSON.stringify(commonDetails.symptomsLogs)}
      - Recent context:${JSON.stringify(recentContextData)}
      - long-summary / session-summary: ${longTermSummary}
      `;
  }
  const fullPrompt = `${prompt} User query: ${message}`;
  console.log(fullPrompt);
};
