import Email from "../models/Email.js";
import User from "../models/User.js";
import mongoose from "mongoose";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emailDetailsPopulation = [
    { path: "sender", select: "name email" },
    { path: "receiver", select: "name email" }
];

export const sendEmail = async (req, res) => {
    try {
        const { receiverEmail, subject, message } = req.body ?? {};

        if (
            typeof receiverEmail !== "string" ||
            typeof subject !== "string" ||
            typeof message !== "string" ||
            !receiverEmail.trim() ||
            !subject.trim() ||
            !message.trim()
        ) {
            return res.status(400).json({
                message: "Receiver email, subject, and message are required."
            });
        }

        const normalizedReceiverEmail = receiverEmail.trim().toLowerCase();
        if (!emailPattern.test(normalizedReceiverEmail)) {
            return res.status(400).json({
                message: "Please enter a valid recipient email address."
            });
        }

        const receiver = await User.findOne({ email: normalizedReceiverEmail });

        if (!receiver) {
            return res.status(404).json({
                message: "Recipient account was not found."
            });
        }

        const email = await Email.create({
            sender: req.user.userId,
            receiver: receiver._id,
            subject: subject.trim(),
            message: message.trim()
        });

        await email.populate(emailDetailsPopulation);

        const unreadCount = await Email.countDocuments({
            receiver: receiver._id,
            isRead: false
        });

        req.app.get("io")
            .to(`user:${receiver._id.toString()}`)
            .emit("email:new", { email, unreadCount });

        return res.status(201).json({
            message: "Email sent successfully.",
            email
        });
    } catch (error) {
        console.error("Sending email failed:", error.message);
        return res.status(500).json({
            message: "Failed to send email. Please try again."
        });
    }
};

export const getInbox = async (req, res) => {
    try {
        const emails = await Email.find({ receiver: req.user.userId })
            .populate(emailDetailsPopulation)
            .sort({ createdAt: -1 });

        const unreadCount = emails.filter((email) => !email.isRead).length;

        return res.status(200).json({ emails, unreadCount });
    } catch (error) {
        console.error("Loading inbox failed:", error.message);
        return res.status(500).json({ message: "Failed to load inbox." });
    }
};

export const getSentEmails = async (req, res) => {
    try {
        const emails = await Email.find({ sender: req.user.userId })
            .populate(emailDetailsPopulation)
            .sort({ createdAt: -1 });

        return res.status(200).json({ emails });
    } catch (error) {
        console.error("Loading sent emails failed:", error.message);
        return res.status(500).json({ message: "Failed to load sent emails." });
    }
};

export const getUnreadCount = async (req, res) => {
    try {
        const unreadCount = await Email.countDocuments({
            receiver: req.user.userId,
            isRead: false
        });

        return res.status(200).json({ unreadCount });
    } catch (error) {
        console.error("Loading unread count failed:", error.message);
        return res.status(500).json({ message: "Failed to load unread count." });
    }
};

export const getEmailById = async (req, res) => {
    try {
        const { emailId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(emailId)) {
            return res.status(400).json({ message: "Invalid email ID." });
        }

        const email = await Email.findOne({
            _id: emailId,
            $or: [
                { sender: req.user.userId },
                { receiver: req.user.userId }
            ]
        }).populate(emailDetailsPopulation);

        if (!email) {
            return res.status(404).json({ message: "Email not found." });
        }

        return res.status(200).json({ email });
    } catch (error) {
        console.error("Loading email failed:", error.message);
        return res.status(500).json({ message: "Failed to load email." });
    }
};

const updateReadStatus = async (req, res, isRead) => {
    try {
        const { emailId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(emailId)) {
            return res.status(400).json({ message: "Invalid email ID." });
        }

        const email = await Email.findOneAndUpdate(
            { _id: emailId, receiver: req.user.userId },
            { isRead },
            { new: true, runValidators: true }
        ).populate(emailDetailsPopulation);

        if (!email) {
            return res.status(404).json({ message: "Inbox email not found." });
        }

        return res.status(200).json({
            message: isRead ? "Email marked as read." : "Email marked as unread.",
            email
        });
    } catch (error) {
        console.error("Updating email read status failed:", error.message);
        return res.status(500).json({
            message: "Failed to update email read status."
        });
    }
};

export const markEmailAsRead = (req, res) => updateReadStatus(req, res, true);

export const markEmailAsUnread = (req, res) => updateReadStatus(req, res, false);