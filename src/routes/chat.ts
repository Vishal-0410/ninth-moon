import { Router } from "express";
import type { Router as ExpressRouter } from "express";

import { AuthMiddleware } from "@middlewares/auth";
import { Chat } from "@controllers/chat";



const router: ExpressRouter = Router();

router.post("/",AuthMiddleware,Chat)


export default router;
