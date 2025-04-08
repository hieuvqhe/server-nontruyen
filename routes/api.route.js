const express = require("express");
const db = require("../models");
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const verifyToken = require("../middlewares/verifyToken");
const UserVerification = require("../models/userVerification");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const validator = require("validator");
const crypto = require("crypto");
const ApiRouter = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create temp directory if it doesn't exist
    if (!fs.existsSync("./temp")) {
      fs.mkdirSync("./temp");
    }
    cb(null, "./temp");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 0.5 * 1024 * 1024 }, // Limit to 5MB
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});


const uploadToCloudinary = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: "auto", // Tự động phát hiện image/video
      folder: "non-truyen" // Thư mục lưu trữ trên Cloudinary
    });
    
    // Xóa file tạm sau khi upload
    fs.unlinkSync(file.path);
    
    return {
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type
    };
  } catch (error) {
    // Đảm bảo xóa file tạm dù upload thất bại
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw new Error(`Lỗi upload lên Cloudinary: ${error.message}`);
  }
};

//nodemailer config
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
});

//send verification email
const sendVerificationEmail = async (email, _id) => {
  try {
    // Kiểm tra biến môi trường
    if (
      !process.env.AUTH_EMAIL ||
      !process.env.AUTH_PASS ||
      !process.env.BASE_URL
    ) {
      throw new Error("Missing environment variables for email configuration");
    }

    const uniqueString = uuidv4() + "-" + _id; // Add separator between UUID and userId

    // Hash chuỗi và lưu vào database TRƯỚC khi gửi email
    const saltRound = 10;
    const hash = await bcryptjs.hash(uniqueString, saltRound);

    const userVerification = new UserVerification({
      userId: _id,
      uniqueString: hash,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000, // 1 hour
    });

    await userVerification.save(); // Đảm bảo lưu thành công trước khi gửi email

    // Cấu hình email
    // Cập nhật phần html trong sendVerificationEmail
    const mailOptions = {
      from: `Non Truyện <${process.env.AUTH_EMAIL}>`,
      to: email,
      subject: "Xác thực email cho tài khoản Non Truyện",
      html: `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: #ff6b6b; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .logo { max-width: 150px; height: auto; }
            .content { padding: 30px; text-align: center; }
            h1 { color: #2d3436; margin-bottom: 25px; }
            .verify-btn { 
                display: inline-block; 
                background: #ff6b6b; 
                color: white !important; 
                padding: 12px 30px; 
                border-radius: 25px; 
                text-decoration: none; 
                font-weight: bold; 
                margin: 20px 0;
                transition: 0.3s;
            }
            .verify-btn:hover { background: #ff5252; }
            .footer { 
                background: #2d3436; 
                color: white; 
                padding: 20px; 
                text-align: center; 
                border-radius: 0 0 10px 10px;
                font-size: 12px;
            }
            .comic-icon { 
                width: 100px; 
                margin-bottom: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://i.imgur.com/YXoWUxq.png" class="logo" alt="Non Truyện Logo">
            </div>
            
            <div class="content">
                <img src="https://i.imgur.com/YXoWUxq.png" class="comic-icon" alt="Comic Icon">
                <h1>Chào mừng đến với Non Truyện!</h1>
                
                <p style="font-size: 16px; color: #555; line-height: 1.6;">
                    Cảm ơn bạn đã đăng ký tài khoản. Hãy click nút bên dưới để hoàn tất xác thực email:
                </p>

                <a href="${process.env.BASE_URL}/api/verify/${uniqueString}" class="verify-btn">
                    XÁC THỰC NGAY
                </a>

                <p style="color: #888; font-size: 14px;">
                    Liên kết sẽ hết hạn sau <strong>1 giờ</strong>. 
                    <br>Nếu bạn không yêu cầu email này, vui lòng bỏ qua.
                </p>
            </div>

            <div class="footer">
                <p>© 2024 Non Truyện - Thế giới truyện tranh không giới hạn</p>
                <p>
                    Theo dõi chúng tôi:
                    <a href="[FB_URL]" style="color: #fff; text-decoration: none;">Facebook</a> | 
                    <a href="[TWITTER_URL]" style="color: #fff; text-decoration: none;">Twitter</a>
                </p>
                <p>Email hỗ trợ: support@non-truyen.com</p>
            </div>
        </div>
    </body>
    </html>
    `,
    };

    // Gửi email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return true;
  } catch (error) {
    // Phân loại lỗi chi tiết
    console.error("Error in sendVerificationEmail:", error);

    if (error.code === "EAUTH") {
      console.error("Authentication error: Check email credentials");
    } else if (error.code === "EENVELOPE") {
      console.error("Invalid recipient address:", email);
    } else if (error.name === "MongoError") {
      console.error("Database save error:", error.message);
    }

    throw error; // Ném lỗi để xử lý tiếp
  }
};

ApiRouter.get("/verify/:uniqueString", async (req, res) => {
  try {
    const { uniqueString } = req.params;

    // Extract userId from uniqueString (first part is UUID, second part is userId)
    const splitIndex = uniqueString.lastIndexOf("-");
    if (splitIndex === -1) {
      return res
        .status(400)
        .send({ message: "Invalid verification link format" });
    }

    const userId = uniqueString.substring(splitIndex + 1);

    // Find the verification record for this specific user
    const verificationRecord = await UserVerification.findOne({ userId });

    if (!verificationRecord) {
      return res.status(404).send({ message: "Verification record not found" });
    }

    // Check if the link has expired
    if (verificationRecord.expiresAt < Date.now()) {
      await UserVerification.deleteOne({ _id: verificationRecord._id });
      return res.status(400).send({ message: "Verification link has expired" });
    }

    // Compare the uniqueString with the stored hash
    const isValid = await bcryptjs.compare(
      uniqueString,
      verificationRecord.uniqueString
    );

    if (!isValid) {
      return res.status(400).send({ message: "Invalid verification link" });
    }

    // Update user verification status
    const user = await db.User.findById(userId);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    user.verified = true;
    await user.save();

    // Delete the verification record
    await UserVerification.deleteOne({ _id: verificationRecord._id });

    res.status(200).send({
      message: "Email verified successfully! You can now login.",
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).send({
      message: error.message || "Verification failed",
    });
  }
});
//verify email
ApiRouter.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Kiểm tra email hợp lệ
    if (!validator.isEmail(email)) {
      return res.status(400).send({ message: "Invalid email format" });
    }

    // Check user tồn tại
    const existingUser = await db.User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({
        message: existingUser.verified
          ? "User already exists"
          : "Please verify your email first",
      });
    }

    // Tạo user mới
    const hashedPassword = await bcryptjs.hash(password, 10);
    const newUser = new db.User({
      email,
      password: hashedPassword,
      name,
    });

    await newUser.save();

    // Gửi email xác thực
    try {
      await sendVerificationEmail(newUser.email, newUser._id);
    } catch (emailError) {
      // Rollback nếu gửi email thất bại
      await db.User.deleteOne({ _id: newUser._id });
      throw new Error("Failed to send verification email");
    }

    // Response (không trả về password)
    res.status(201).send({
      message:
        "Registration successful! Please check your email to verify your account.",
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    res.status(500).send({
      message: error.message || "Registration failed",
    });
  }
});

ApiRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db.User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // Check if the user has verified their email
    if (!user.verified) {
      return res.status(401).send({
        message: "Please verify your email before logging in",
        verified: false,
      });
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).send({ message: "Invalid password" });
    }

    // Generate access token (short-lived)
    const access_token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d", 
      }
    );

    // Generate refresh token (long-lived)
    const refresh_token = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      {
        expiresIn: "7d", // 7 days
      }
    );

    res.status(200).send({
      access_token,
      refresh_token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).send({ message: error.message });
  }
});

// Function to generate random password
const generateRandomPassword = (length = 10) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+";
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }

  return password;
};

// Forgot password function
ApiRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!validator.isEmail(email)) {
      return res.status(400).send({ message: "Invalid email format" });
    }

    // Find user by email
    const user = await db.User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // Generate new random password
    const newPassword = generateRandomPassword();
    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    // Update user password in database
    user.password = hashedPassword;
    await user.save();

    // Send email with new password
    const mailOptions = {
      from: `Non Truyện <${process.env.AUTH_EMAIL}>`,
      to: email,
      subject: "Đặt lại mật khẩu cho tài khoản Non Truyện",
      html: `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: #ff6b6b; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .logo { max-width: 150px; height: auto; }
            .content { padding: 30px; text-align: center; }
            h1 { color: #2d3436; margin-bottom: 25px; }
            .password-box { 
                background: #f1f1f1;
                padding: 15px;
                border-radius: 10px;
                font-size: 22px;
                font-weight: bold;
                color: #2d3436;
                margin: 20px 0;
                border: 1px dashed #ff6b6b;
            }
            .login-btn { 
                display: inline-block; 
                background: #ff6b6b; 
                color: white !important; 
                padding: 12px 30px; 
                border-radius: 25px; 
                text-decoration: none; 
                font-weight: bold; 
                margin: 20px 0;
                transition: 0.3s;
            }
            .login-btn:hover { background: #ff5252; }
            .footer { 
                background: #2d3436; 
                color: white; 
                padding: 20px; 
                text-align: center; 
                border-radius: 0 0 10px 10px;
                font-size: 12px;
            }
            .comic-icon { 
                width: 100px; 
                margin-bottom: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://i.imgur.com/YXoWUxq.png" class="logo" alt="Non Truyện Logo">
            </div>
            
            <div class="content">
                <img src="https://i.imgur.com/YXoWUxq.png" class="comic-icon" alt="Comic Icon">
                <h1>Đặt lại mật khẩu tài khoản</h1>
                
                <p style="font-size: 16px; color: #555; line-height: 1.6;">
                    Chúng tôi đã đặt lại mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mật khẩu tạm thời bên dưới để đăng nhập:
                </p>

                <div class="password-box">
                    ${newPassword}
                </div>

                <p style="color: #888; font-size: 14px;">
                    Chúng tôi khuyến nghị bạn nên đổi mật khẩu sau khi đăng nhập.
                    <br>Nếu bạn không yêu cầu đặt lại mật khẩu này, vui lòng liên hệ hỗ trợ ngay lập tức.
                </p>
                
                <a href="${process.env.BASE_URL}/login" class="login-btn">
                    ĐĂNG NHẬP NGAY
                </a>
            </div>

            <div class="footer">
                <p>© 2024 Non Truyện - Thế giới truyện tranh không giới hạn</p>
                <p>
                    Theo dõi chúng tôi:
                    <a href="[FB_URL]" style="color: #fff; text-decoration: none;">Facebook</a> | 
                    <a href="[TWITTER_URL]" style="color: #fff; text-decoration: none;">Twitter</a>
                </p>
                <p>Email hỗ trợ: support@non-truyen.com</p>
            </div>
        </div>
    </body>
    </html>
    `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).send({
      message: "A new password has been sent to your email",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).send({
      message: error.message || "Failed to reset password",
    });
  }
});

// Change password function
ApiRouter.post("/change-password", async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    // Basic validation
    if (!email || !oldPassword || !newPassword) {
      return res.status(400).send({
        message: "Email, old password, and new password are required",
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).send({ message: "Invalid email format" });
    }

    // Check minimum password length
    if (newPassword.length < 6) {
      return res.status(400).send({
        message: "New password must be at least 6 characters long",
      });
    }

    // Find user
    const user = await db.User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // Verify old password
    const isPasswordValid = await bcryptjs.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).send({ message: "Current password is incorrect" });
    }

    // Update with new password
    const hashedNewPassword = await bcryptjs.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    res.status(200).send({
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).send({
      message: error.message || "Failed to change password",
    });
  }
});

// Add route to resend verification email if needed
ApiRouter.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    if (!validator.isEmail(email)) {
      return res.status(400).send({ message: "Invalid email format" });
    }

    const user = await db.User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    if (user.verified) {
      return res.status(400).send({
        message: "This account is already verified",
      });
    }

    // Delete any existing verification records for this user
    await UserVerification.deleteMany({ userId: user._id });

    // Send new verification email
    await sendVerificationEmail(user.email, user._id);

    res.status(200).send({
      message: "Verification email has been resent",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).send({
      message: error.message || "Failed to resend verification email",
    });
  }
});

ApiRouter.get("/protected", verifyToken, (req, res) => {
  res.json({
    message: "This is a protected route",
    userId: req.userId,
    role: req.role,
  });
});


// Get user profile endpoint
ApiRouter.get("/profile", verifyToken, async (req, res) => {
  try {
    // Find user by ID from token
    const user = await db.User.findById(req.userId).select("-password");
    
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    
    res.status(200).send({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).send({
      message: error.message || "Failed to get user profile",
    });
  }
});


// Update user profile endpoint
ApiRouter.put("/profile", verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    // Find user by ID from token
    const user = await db.User.findById(req.userId);
    
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    
    // Fields that can be updated
    const { name, phone, address } = req.body;
    
    // Update text fields if provided
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    
    // Handle avatar upload if file is provided
    if (req.file) {
      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(req.file);
      
      // If user already has a custom avatar (not the default), delete the old one
      if (user.avatar && !user.avatar.includes('default-avatar') && 
          user.avatar.includes('cloudinary.com')) {
        try {
          // Extract public_id from the URL
          const publicId = user.avatar.split('/').slice(-1)[0].split('.')[0];
          // Delete old image from Cloudinary
          await cloudinary.uploader.destroy(`non-truyen/${publicId}`);
        } catch (deleteError) {
          console.error("Failed to delete old avatar:", deleteError);
          // Continue with update even if delete fails
        }
      }
      
      // Update user avatar with new Cloudinary URL
      user.avatar = uploadResult.url;
    }
    
    // Save updated user
    await user.save();
    
    // Return updated user without password
    const updatedUser = await db.User.findById(req.userId).select("-password");
    
    res.status(200).send({
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Update profile error:", error);
    
    // If error is from Multer file size limit
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).send({
        message: "File size should not exceed 500KB"
      });
    }
    
    res.status(500).send({
      message: error.message || "Failed to update user profile",
    });
  } finally {
    // Clean up any temporary files if they exist
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

module.exports = ApiRouter;
