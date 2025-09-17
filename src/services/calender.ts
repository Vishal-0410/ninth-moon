import { db } from "@config/firebase";
import { COLLECTIONS } from "@constant/collection";
import { CALENDER_PAGE_ERRORS } from "@constant/errorMessages/calender";
import { AddNote, ProcessedNote } from "@models/calender";
import { ApiError } from "@utils/apiError";
import { normalizeMidnightToUTC, utcToLocalDate } from "@utils/normalizeDate";

export const GetUserNotesServices = async (
  uid: string,
  page: number,
  limit: number
) => {
  const user = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  const userData = user.data();

  if (!userData || !userData.timezone) {
    throw new ApiError(
      CALENDER_PAGE_ERRORS.USER_NOT_FOUND.statusCode,
      CALENDER_PAGE_ERRORS.USER_NOT_FOUND.message
    );
  }

  const userTimezone = userData.timezone;
  const notesSnapshot = await db
    .collection(COLLECTIONS.USER_NOTES)
    .where("uid", "==", uid)
    .get();

  const processedNotes = notesSnapshot.docs.map((doc) => {
    const noteData = doc.data() as AddNote;
    const noteDate = new Date(noteData.date);

    return {
      id: doc.id,
      ...noteData,
      localDate: noteDate,
    };
  });

  const startOfDayInUTC = new Date(
    normalizeMidnightToUTC(new Date(), userTimezone)
  );
  const upcomingNotes = processedNotes.filter(
    (note) => note.localDate.getTime() >= startOfDayInUTC.getTime()
  );
  upcomingNotes.sort((a, b) => a.localDate.getTime() - b.localDate.getTime());

  const totalNotes = upcomingNotes.length;
  const totalPages = Math.ceil(totalNotes / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedNotes = upcomingNotes.slice(startIndex, endIndex);

  const paginatedResult = paginatedNotes.map((note) => {
    const formattedDate = utcToLocalDate(note.date, userTimezone);
    return {
      ...note,
      date: formattedDate,
    };
  });

  return {
    notes: paginatedResult,
    pagination: {
      totalItems: totalNotes,
      totalPages: totalPages,
      currentPage: page,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

export const GetUserNotesByIdServices = async (
  uid: string,
  noteId: string
): Promise<AddNote> => {
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  const userData = userDoc.data();

  if (!userData || !userData.timezone) {
    throw new ApiError(
      CALENDER_PAGE_ERRORS.USER_NOT_FOUND.statusCode,
      CALENDER_PAGE_ERRORS.USER_NOT_FOUND.message
    );
  }
  const noteDoc = await db.collection(COLLECTIONS.USER_NOTES).doc(noteId).get();
  const noteData = noteDoc.data();

  if (!noteDoc.exists) {
    throw new ApiError(
      CALENDER_PAGE_ERRORS.NOTE_NOT_FOUND.statusCode,
      CALENDER_PAGE_ERRORS.NOTE_NOT_FOUND.message
    );
  }
  if (noteData?.uid !== uid) {
    throw new ApiError(
      CALENDER_PAGE_ERRORS.UNAUTHORIZED.statusCode,
      CALENDER_PAGE_ERRORS.UNAUTHORIZED.message
    );
  }
  const formattedDate = utcToLocalDate(noteData.date, userData.timezone);
  return {
    id: noteDoc.id,
    ...noteData,
    date: formattedDate,
  } as AddNote;
};

export const AddUserNotesServices = async (
  date: Date,
  note: string,
  uid: string
) => {
  const user = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  const userData = user.data();
  if (!userData) {
    throw new ApiError(
      CALENDER_PAGE_ERRORS.USER_NOT_FOUND.statusCode,
      CALENDER_PAGE_ERRORS.USER_NOT_FOUND.message
    );
  }
  const noteData = {
    uid,
    date: normalizeMidnightToUTC(date, userData.timezone),
    note,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as AddNote;
  await db.collection(COLLECTIONS.USER_NOTES).add(noteData);
  return noteData;
};

export const UpdateUserNotesServices = async (
  uid: string,
  noteId: string,
  date?: Date,
  note?: string
): Promise<AddNote | undefined> => {

  const noteDoc = await db.collection(COLLECTIONS.USER_NOTES).doc(noteId).get();
  const noteData = noteDoc.data();

  if (!noteDoc.exists || noteData?.uid !== uid) {
    throw new ApiError(
      CALENDER_PAGE_ERRORS.UNAUTHORIZED.statusCode,
      CALENDER_PAGE_ERRORS.UNAUTHORIZED.message
    );
  }
  const user = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  const userData = user.data();
  if (!userData) {
    throw new ApiError(
      CALENDER_PAGE_ERRORS.USER_NOT_FOUND.statusCode,
      CALENDER_PAGE_ERRORS.USER_NOT_FOUND.message
    );
  }
  const updateData: Partial<AddNote> = {};

  if (date) {
    updateData.date = normalizeMidnightToUTC(date, userData.timezone);
  }

  if (note) {
    updateData.note = note;
  }

  updateData.updatedAt = new Date().toISOString();

  if (Object.keys(updateData).length === 0) {
    return;
  }
  await db
    .collection(COLLECTIONS.USER_NOTES)
    .doc(noteId)
    .update(updateData);
  return (
    await db.collection(COLLECTIONS.USER_NOTES).doc(noteId).get()
  ).data() as AddNote;
};

export const DeleteUserNotesServices = async (uid: string, noteId: string) => {
  const noteDoc = await db.collection(COLLECTIONS.USER_NOTES).doc(noteId).get();
  const noteData = noteDoc.data();

  if (!noteDoc.exists) {
    throw new ApiError(
      CALENDER_PAGE_ERRORS.NOTE_NOT_FOUND.statusCode,
      CALENDER_PAGE_ERRORS.NOTE_NOT_FOUND.message
    );
  }
  if (noteData?.uid !== uid) {
    throw new ApiError(
      CALENDER_PAGE_ERRORS.UNAUTHORIZED.statusCode,
      CALENDER_PAGE_ERRORS.UNAUTHORIZED.message
    );
  }

  try {
    await db.collection(COLLECTIONS.USER_NOTES).doc(noteId).delete();
  } catch (err) {
    throw new ApiError(
      CALENDER_PAGE_ERRORS.INTERNAL_SERVER_ERROR.statusCode,
      CALENDER_PAGE_ERRORS.INTERNAL_SERVER_ERROR.message
    );
  }
  return;
};
