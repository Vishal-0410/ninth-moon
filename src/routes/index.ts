import { Router } from "express";
import type { Router as ExpressRouter } from 'express';
import userRoutes from '@routes/users'
import authRoutes from '@routes/auth';
import homeRoutes from '@routes/home';
import chatRoutes from '@routes/chat';
import calenderRoutes from '@routes/calender';
import journalRoutes from '@routes/journal';
import notificationsRoutes from '@routes/notification';
import contactUsRoutes from '@routes/support';

const router: ExpressRouter = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/home', homeRoutes);
router.use('/chat', chatRoutes);
router.use('/calender', calenderRoutes);
router.use('/journal', journalRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/support', contactUsRoutes);

export default router;

