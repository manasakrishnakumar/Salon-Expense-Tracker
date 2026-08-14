import express from 'express';
import { proxyLogin, proxyMe, proxyChangePassword } from '../controllers/authProxy.controller.js';

export const authRouter = express.Router();

authRouter.post('/login',           proxyLogin);
authRouter.get('/me',               proxyMe);
authRouter.post('/change-password', proxyChangePassword);
