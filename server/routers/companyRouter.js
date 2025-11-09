import express from  "express"

import {handleCompanyRegister, handleOTPVerification,handleCompanyLogin,handleResetPasswordRequest,handleOTPForPasswordReset,handleCompanyFileUpload} from "../controllers/companyController.js"

import { upload } from "../config/multerConfig.js"

import {AuthCompany} from "../middlewares/AuthCompany.js"


let companyRouter = express.Router()

// companyRouter.get("/test",test)

companyRouter.post("/register",handleCompanyRegister)

companyRouter.post("/verify-otp",handleOTPVerification)

companyRouter.post("/company-login", handleCompanyLogin)

companyRouter.post("/password-reset-request", handleResetPasswordRequest)

companyRouter.post("/verify-reset-password-request", handleOTPForPasswordReset)

// to upload resume/profie/docs we need to verfiy the user

companyRouter.post("/upload-file/:file_type", AuthCompany,upload.single("file"),handleCompanyFileUpload)



export {companyRouter}