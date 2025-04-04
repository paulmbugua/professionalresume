import express from 'express';
import authUser from '../middleware/authUser.js';
import {
  loginUser,
  registerUser,
  getUser,
  updateUserRole,
  googleLogin,
  requestPasswordReset,
  verifyOTPAndResetPassword,
} from '../controllers/userController.js';

const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
userRouter.post('/google-login', googleLogin);
userRouter.post('/reset-password', requestPasswordReset);
userRouter.post('/verify-otp', verifyOTPAndResetPassword);
userRouter.get('/me', authUser, getUser);
userRouter.put('/update-role', authUser, updateUserRole);

export default userRouter;
