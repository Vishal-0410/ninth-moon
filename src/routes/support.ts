import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { AuthMiddleware } from "@middlewares/auth";
import { ContactUsForm } from "@controllers/support";
import { ValidationMiddleware } from "@middlewares/schemaValidator";
import { contactFormSchema } from "@validationSchema/support";

const router: ExpressRouter = Router();

router.post(
  "/contact-us",
  AuthMiddleware,
  ValidationMiddleware(contactFormSchema),
  ContactUsForm
);

export default router;
