import { Router } from "express";
import type { Router as ExpressRouter } from "express";

import { AuthMiddleware } from "@middlewares/auth";
import { ValidationMiddleware } from "@middlewares/schemaValidator";
import { updateUserSchema, userInputSchema } from "@validationSchema/user";
import { CreateUser, GetUserProfile, SaveFcmToken, UpdateProfileDetails, UploadProfileImage } from "@controllers/users";
import { uploadLocal } from "@middlewares/multer";

const router: ExpressRouter = Router();

router.post('/save-fcm-token', AuthMiddleware, SaveFcmToken);
router.post("/create-user",AuthMiddleware,ValidationMiddleware(userInputSchema), CreateUser);
router.get("/profile", AuthMiddleware, GetUserProfile);
router.post("/upload-profile-image", AuthMiddleware, uploadLocal.single("profileImage"), UploadProfileImage);
router.put("/update-profile-details", AuthMiddleware, ValidationMiddleware(updateUserSchema), UpdateProfileDetails);

export default router;
