import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createToken = (userId) =>
    jwt.sign(
        { userId: userId.toString() },
        process.env.JWT_SECRET,
        { expiresIn: "1d", algorithm: "HS256" }
    );

const isDuplicateEmailError = (error) =>
    error?.code === 11000 && (error?.keyPattern?.email || error?.keyValue?.email);

const isValidationError = (error) => error?.name === "ValidationError";

export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body ?? {};

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                message: "Name, email, and password are required."
            });
        }

        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedName || !emailPattern.test(normalizedEmail)) {
            return res.status(400).json({
                message: "Please enter a name and a valid email address."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long."
            });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                message: "An account with this email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword
        });

        return res.status(201).json({
            message: "Registration successful.",
            token: createToken(user._id),
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        if (isDuplicateEmailError(error)) {
            return res.status(409).json({
                message: "An account with this email already exists."
            });
        }

        if (isValidationError(error)) {
            return res.status(400).json({ message: error.message });
        }

        console.error("Registration failed:", error.message);
        return res.status(500).json({
            message: "Registration failed. Please try again."
        });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body ?? {};

        if (typeof email !== "string" || typeof password !== "string" || !password) {
            return res.status(400).json({
                message: "A valid email and password are required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (!emailPattern.test(normalizedEmail)) {
            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        return res.status(200).json({
            message: "Login successful.",
            token: createToken(user._id),
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Login failed:", error.message);
        return res.status(500).json({
            message: "Login failed. Please try again."
        });
    }
};
