import express from "express";
import {
    getEmailById,
    getInbox,
    getSentEmails,
    getUnreadCount,
    markEmailAsRead,
    markEmailAsUnread,
    sendEmail
} from "../controllers/emailController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/send", sendEmail);
router.get("/inbox", getInbox);
router.get("/sent", getSentEmails);
router.get("/unread-count", getUnreadCount);
router.get("/:emailId", getEmailById);
router.patch("/:emailId/read", markEmailAsRead);
router.patch("/:emailId/unread", markEmailAsUnread);

export default router;