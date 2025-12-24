import User from "../models/userModel.js"
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { verifyEmail } from "../emailVerify/verifyEmail.js";
import { Session } from "../models/sessionModel.js";
import { sendOTPMail } from "../emailVerify/sendOTPMail.js";
export const register = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            })
        };
        const user = await User.findOne({ email })
        if (user) {
            return res.status(400).json({
                success: false,
                message: 'user already exists'
            })
        }

        const hashedpassword = await bcrypt.hash(password, 10)
        const newUser = await User.create({
            firstName,
            lastName,
            email,
            password: hashedpassword
        })
        const token = jwt.sign({ id: newUser._id }, process.env.SECRET_KEY, { expiresIn: "10m" })
        verifyEmail(token, email)
        newUser.token = token
        await newUser.save()
        return res.status(201).json({
            success: true,
            message: "User registerd successfully",
            user: newUser
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const verify = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(400).json({
                success: false,
                message: "Authorization token missing or invalid",
            });
        }

        const token = authHeader.split(" ")[1];

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.SECRET_KEY);
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res.status(401).json({
                    success: false,
                    message: "Verification token has expired",
                });
            }

            return res.status(400).json({
                success: false,
                message: "Token verification failed",
            });
        }

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        user.isVerified = true;
        user.token = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Email verified successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const reVerify = async (req, res) => {
    try {
        const { email } = req.body
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User Not Found"
            })
        }
        const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: "10m" })
        verifyEmail(token, email)
        user.token = token
        await user.save()
        return res.status(200).json({
            success: true,
            message: "Verivication email sent again successfully",
            token: user.token
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const login = async (req, res) => {

    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            })
        }
        const existingUser = await User.findOne({ email })
        if (!existingUser) {
            return res.status(400).json({
                success: false,
                message: "User not exist"
            })
        }
        const isPasswordValid = await bcrypt.compare(password, existingUser.password)
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: "invalid Credentials"
            })
        }
        if (existingUser.isVerified == false) {
            return res.status(400).json({
                success: false,
                message: "Verify your account than login"
            })
        }

        const accessToken = jwt.sign({ id: existingUser._id }, process.env.SECRET_KEY, { expiresIn: '1m' })
        const refreshToken = jwt.sign({ id: existingUser._id }, process.env.SECRET_KEY, { expiresIn: '3m' })
        existingUser.isLoggedIn = true
        await existingUser.save()
        // check existing session delete
        const existingSession = await Session.findOne({ userId: existingUser._id })
        if (existingSession) {
            await Session.deleteOne({ userId: existingUser._id })
        }
        // create new session 
        await Session.create({ userId: existingUser._id })
        return res.status(200).json({
            success: true,
            message: `Welcome back ${existingUser.firstName}`,
            user: existingUser,
            accessToken,
            refreshToken
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const logout = async (req, res) => {
    try {
        const userId = req.id
        if (userId) {
            res.json({
                id: userId
            })
        }
        await Session.deleteMany({ userId: userId })
        await User.findByIdAndUpdate(userId, { isLoggedIn: false })
        return res.status(200).json({
            success: true,
            message: 'user logged out successfully'
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            })
        }
        const otp = Math.floor(100000 + Math.random() * 900000)
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        user.otp = otp
        user.otpExpiry = otpExpiry
        await user.save()
        await sendOTPMail(otp, email)
        return res.status(200).json({
            success: true,
            message: 'Otp sent to email successfully '
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const verifyOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        const email = req.params.email
        if (!otp) {
            return res.status(400).json({
                success: false,
                message: 'Otp is requred'
            })
        }
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'user not found'
            })
        }
        if (!user.otp || !user.otpExpiry) {
            return res.status(400).json({
                success: false,
                message: 'Otp is not generated or already verified'
            })
        }
        if (user.otpExpiry < new Date()) {
            return res.status(400).json({
                success: false,
                message: "Otp has expired please request a new one"
            })
        }
        if (otp !== user.otp) {
            return res.status(400).json({
                success: false,
                message: 'Otp is invalid'
            })
        }
        user.otp = null
        user.otpExpiry = null
        await user.save()
        return res.status(200).json({
            success: true,
            message: 'Otp verified successfully'
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const changePassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body
        const { email } = req.params
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "user not found"
            })
        }
        if (!newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            })
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "password  do not matched"
            })
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        user.password = hashedPassword
        await user.save()
        return res.status(200).json({
            success: true,
            message: "Password changed successfully"
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
}

// Dout Check Again

// export const allUser = async ({ }, res) => {
//     try {
//         const users = await User.find()
//         return res.status(200).json({
//             success: true,
//             users
//         })
//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }

// export const getUserById = async (req, res) => {
//     try {
//         const { userId } = req.params; //extract userId from req
//         const user = await User.findById(userId).select("-password -otp -otpExpiry -token")
//         if (!user) {
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found"
//             })
//         }
//         res.status(200).json({
//             success: true,
//             user,
//         })
//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }
