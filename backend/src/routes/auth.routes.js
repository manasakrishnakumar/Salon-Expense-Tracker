import express from 'express';
import { proxyLogin, proxyLogout } from '../controllers/authProxy.controller.js';

export const authRouter = express.Router();

// No requireAuth on these — they're the entry points for authentication
authRouter.post('/login',  proxyLogin);
authRouter.post('/logout', proxyLogout);
