import { db } from "@config/firebase";
import { COLLECTIONS } from "@constant/collection";
import { SupportTicket } from "@models/support";
import { ContactUsForm } from "@validationSchema/support";

export const ContactUsFormService = async (uid: string, payload: ContactUsForm): Promise<SupportTicket> => {
  const { name, email, location, subject, message } = payload;

  const dataToStore = {
    uid,
    name,
    email,
    location,
    subject,
    message,
    status: "Open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as SupportTicket;

  const docRef = await db.collection(COLLECTIONS.SUPPORT).add(dataToStore);

  return {id:docRef.id, ...dataToStore};
};
