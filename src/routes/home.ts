import { Router } from "express";
import type { Router as ExpressRouter } from "express";

import { AuthMiddleware } from "@middlewares/auth";
import { FertilityDetailsCreate, HomePage, MoodLogs, SymptompLogs } from "@controllers/home";
import { ValidationMiddleware } from "@middlewares/schemaValidator";
import { fertilityHomeLatestLMPSchema, moodInputSchema, symptomInputSchema } from "@validationSchema/home";


const router: ExpressRouter = Router();

router.get("/", AuthMiddleware,HomePage)
router.post("/mood-logs",AuthMiddleware,ValidationMiddleware(moodInputSchema), MoodLogs); 
router.post("/symptoms-logs", AuthMiddleware,ValidationMiddleware(symptomInputSchema), SymptompLogs);
router.post("/fertility-home-latest-lmp", AuthMiddleware,ValidationMiddleware(fertilityHomeLatestLMPSchema), FertilityDetailsCreate);

export default router;
