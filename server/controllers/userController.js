import nodemailer from "nodemailer"
import dotenv from "dotenv"
import { redisClient } from "../utils/redisClient.js"
import { userModel } from "../models/userSchema.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

dotenv.config({ path: "./config.env" })

// to send a email we need a transporter 

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',   // Gmail SMTP
    port: 465,                // 465 for SSL, 587 for STARTTLS
    secure: true,             // true for 465, false for 587
    auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.USER_EMAIL_PASSWORD,
    }
});

function genrateRandomNumber() {
    return Math.floor((Math.random() * 9000) + 1000).toString()
}

async function sendOTP(email) {
    try {

        let otp = genrateRandomNumber()

        // HTML TEMPLATE
        const htmlTemplate = `
        <div style="font-family:Arial, Helvetica, sans-serif; background:#f7f7f7; padding:30px;">
          <div style="max-width:500px; margin:auto; background:#ffffff; border-radius:10px; padding:25px; box-shadow:0 3px 12px rgba(0,0,0,0.1);">
            
            <h2 style="text-align:center; color:#222; border-bottom:1px solid #eee; padding-bottom:10px;">
              Email Verification OTP
            </h2>

            <p style="color:#333; font-size:15px;">
              Dear User,
              <br><br>
              Use the OTP below to verify your email. This OTP is valid for <b>5 minutes</b>.
            </p>

            <div style="text-align:center; background:#e8f3ff; border:1px dashed #0077ff; padding:15px; margin:25px 0; border-radius:8px;">
              <h1 style="color:#0077ff; font-size:42px; margin:0;">${otp}</h1>
            </div>

            <p style="color:#444; font-size:14px;">
              If you did not request this OTP, please ignore this email.
            </p>

            <p style="text-align:center; color:#777; font-size:13px; margin-top:25px;">
              Regards,<br>
              <b><h3>JobStack@coryrightcompany</h3></b>
            </p>

          </div>
        </div>
        `;

        let emailOptions = {
            from: process.env.USER_EMAIL,
            to: email,
            subject: "Verify Your Email Address | OTP Valid for 5 Minutes",
            html: htmlTemplate   // ✅ Send HTML instead of plain text
        }

        await transporter.sendMail(emailOptions)

        redisClient.setEx(`email:${email}`, 300, otp)

        return { message: "OTP sent successfully!", status: true }

    } catch (err) {
        console.log("error sending otp : ", err)
        return { message: "Unable to send OTP!", status: false }
    }
}



async function sendOTPForPasswordReset(email) {
    try {

        let otp = genrateRandomNumber()

        // HTML TEMPLATE FOR PASSWORD RESET
        const htmlTemplate = `
        <div style="font-family:Arial, Helvetica, sans-serif; background:#f7f7f7; padding:30px;">
          <div style="max-width:500px; margin:auto; background:#ffffff; border-radius:10px; padding:25px; box-shadow:0 3px 12px rgba(0,0,0,0.1);">

            <h2 style="text-align:center; color:#222; border-bottom:1px solid #eee; padding-bottom:10px;">
              Password Reset OTP
            </h2>

            <p style="color:#333; font-size:15px;">
              Dear User,
              <br><br>
              We received a request to reset your password.
              <br>
              Use the OTP below to proceed. This OTP is valid for <b>5 minutes</b>.
            </p>

            <div style="text-align:center; background:#fff4e6; border:1px dashed #ff8c00; padding:15px; margin:25px 0; border-radius:8px;">
              <h1 style="color:#ff8c00; font-size:42px; margin:0;">${otp}</h1>
            </div>

            <p style="color:#444; font-size:14px;">
              If you did not request a password reset, you can safely ignore this email.
            </p>

            <p style="text-align:center; color:#777; font-size:13px; margin-top:25px;">
              Regards,<br>
              <b><h3>JobStack@coryrightcompany</h3></b>
            </p>

          </div>
        </div>
        `;

        let emailOptions = {
            from: process.env.USER_EMAIL,
            to: email,
            subject: "Password Reset Request | OTP Valid for 5 Minutes",
            html: htmlTemplate  // ✅ Sending HTML now
        }

        await transporter.sendMail(emailOptions)

        redisClient.setEx(`emailPasswordReset:${email}`, 300, otp)

        return { message: "OTP sent successfully!", status: true }

    } catch (err) {
        console.log("error sending otp : ", err)
        return { message: "Unable to send OTP!", status: false }
    }
}


let test = (req, res) => {
    res.status(200).json({ message: "welcome to user test route !" })
}

let handleUserRegister = async (req, res) => {
    try {
        let { name, phone, email, address, dob, qualifications, password } = req.body

        if (!name || !phone || !email || !address || !dob || !qualifications || !password) throw ("invalid/missing data !")

        // check if user exits
        let checkIfUserExits = await userModel.findOne({ $or: [{ "email.userEmail": email }, { "phone": phone }] })

        // if found then error
        if (checkIfUserExits) throw ("uanble to register user please change email/phone and try again !")

        let emailObejct = {
            userEmail: email, verified: false
        }

        // to send otp
        let result = await sendOTP(email)

        if (!result.status) throw (`unable to send otp at ${email} | ${result.message}`)

        // create user object
        let newUser = new userModel({ name, phone, email: emailObejct, address, dob, qualifications, password })

        await newUser.save();

        res.status(202).json({ message: `user registered successfully please verify the email using otp that is sent on email ${email}` })

    } catch (err) {
        console.log("error while registering user : ", err)
        res.status(400).json({ message: "unable to register user !", err })
    }
}

const handleOTPVerification = async (req, res) => {
    try {

        let { email, userOtp } = req.body;

        // check if email exits
        let emailExits = await userModel.findOne({ "email.userEmail": email })

        if (!emailExits) throw (`email ${email} is not registred !`)

        let storedOtp = await redisClient.get(`email:${email}`)

        if (!storedOtp) throw ("otp is expried/not found !")

        if (storedOtp != userOtp) throw ("invalid otp !")

        console.log('otp matched successfully !')

        // change verification status to true
        let updateUserObject = await userModel.updateOne({ "email.userEmail": email }, { $set: { "email.verified": true } })

        console.log(updateUserObject)

        // remove the temp otp
        redisClient.del(`email:${email}`)

        res.status(202).json({ message: "otp verified successfully please head to login !" })

    } catch (err) {
        console.log("error while verifying the otp : ", err)
        res.status(500).json({ message: "failed to verify user otp please try again later !", err })
    }
}


const handleUserLogin = async (req, res) => {
    try {

        let { email, password } = req.body

        let userExists = await userModel.findOne({ "email.userEmail": email })

        if (!userExists) throw ("unable to find the email please register the user first !")

        if (!userExists.email.verified) {

            // to send otp
            let result = await sendOTP(email)

            if (!result.status) throw (`unable to send otp at ${email} | ${result.message}`)

            // redirect user to email verification route

            throw (`user email is not verfied we have sent an otp at ${email} !`)
        }

        // compare password

        let result = await bcrypt.compare(password, userExists.password)

        if (!result) throw ("invalid email/password !")

        // create jwt and send to user 

        let token = await jwt.sign({ email }, process.env.JWT_SECRET_KEY, { expiresIn: "24hr" })

        res.status(202).json({ message: `welcome user ${userExists.name} ! login was successfull.`, token })

    } catch (err) {
        console.log("error while login : ", err)
        res.status(400).json({ message: "unable to login", err })
    }
}

const handleResetPasswordRequest = async (req, res) => {
    try {

        let { email } = req.body;

        if (!email) throw ("invalid/incomplete data !")

        let userExists = await userModel.findOne({ "email.userEmail": email })

        if (!userExists) throw ("invalid email address/Please register first !")

        let result = await sendOTPForPasswordReset(email)

        if (!result.status) throw (`unable to send otp at ${email} | ${result.message}`)

        res.status(201).json({ messag: `an otp sent to your email ${email} | valid for 5 mins to reset your password !` })

    } catch (err) {
        console.log("password reset request failed !", err)
        res.status(400).json({ messag: "password reset request failed !", err })
    }
}


const handleOTPForPasswordReset = async (req, res) => {
    try {

        let { email, userOtp, newPassword } = req.body;

        // check if email exits
        let emailExits = await userModel.findOne({ "email.userEmail": email })

        if (!emailExits) throw (`email ${email} is not registred !`)

        let storedOtp = await redisClient.get(`emailPasswordReset:${email}`)

        if (!storedOtp) throw ("otp is expried/not found !")

        if (storedOtp != userOtp) throw ("invalid otp !")

        console.log('otp matched successfully for password reset !')

        // encrypt

        let hash = await bcrypt.hash(newPassword, 10)

        // change verification status to true
        let updateUserObject = await userModel.updateOne({ "email.userEmail": email }, { $set: { "password": hash } })

        console.log(updateUserObject)

        // remove the temp otp
        redisClient.del(`emailPasswordReset:${email}`)

        res.status(202).json({ message: "otp verified successfully and password has been changed please head to login !" })

    } catch (err) {
        console.log("error while verifying the otp : ", err)
        res.status(500).json({ message: "failed to verify user otp please try again later !", err })
    }
}

let handleUserFileUpload = async (req, res) => {
  try {
    if (!req.file) throw new Error("Failed to upload a file!");

    let fileName = req.file.filename;
    let fileType = req.params.file_type; // 'resume' or 'profile_picture' or 'logo'

    // Declare updateField before using it
    let updateField;

    if (fileType === "resume") {
      updateField = { $push: { document: fileName } };
    } else if (fileType === "profile_picture") {
      updateField = { $set: { profile_picture: fileName } };
    } 
    else {
      throw new Error("Invalid file type. Only 'resume', 'profile_picture', or 'logo' are allowed.");
    }

    // Update the user document
    const result = await userModel.updateOne(
      { "email.userEmail": req.user?.email?.userEmail },
      updateField
    );

    if (result.modifiedCount === 0) {
      throw new Error("User not found or file not saved.");
    }

    const uploadDest = `upload/${fileType}/${fileName}`;

    res.status(202).json({
      message: `${fileType === "resume" ? "Resume" : "Profile picture"} uploaded successfully!`,
      fileName,
      uploadDest,
    });

  } catch (err) {
    console.error("Error in handleUserFileUpload:", err);
    res.status(500).json({
      message: "Failed to upload the file.",
      error: err.message || err,
    });
  }
};


export { test, handleUserRegister, handleOTPVerification, handleUserLogin, handleResetPasswordRequest, handleOTPForPasswordReset, handleUserFileUpload }