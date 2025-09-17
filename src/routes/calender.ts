import { Router, type Router as ExpressRouter } from "express";
import { AuthMiddleware } from "@middlewares/auth";

import { ValidationMiddleware } from "../middlewares/schemaValidator";
import { addNoteSchema, updateNoteSchema } from "@validationSchema/calender";
import { AddNotes, GetUserNotes, UpdateNotesNotes, DeleteNotes, GetUserNotesById } from "@controllers/calender";

const router: ExpressRouter = Router();

router.get("/notes", AuthMiddleware,GetUserNotes);
router.get("/notes/:noteId", AuthMiddleware, GetUserNotesById);
router.post("/notes", AuthMiddleware, ValidationMiddleware(addNoteSchema), AddNotes);
router.put("/notes/:noteId", AuthMiddleware, ValidationMiddleware(updateNoteSchema), UpdateNotesNotes);
router.delete("/notes/:noteId", AuthMiddleware, DeleteNotes);

export default router;