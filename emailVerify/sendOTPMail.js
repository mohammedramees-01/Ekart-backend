import nodeMailer from 'nodemailer'
import 'dotenv/config'


export const sendOTPMail = async (otp, email) => {
    const transporter = nodeMailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });

    const mailConfigurations = {

        // It should be a string of sender/server email
        from: process.env.MAIL_USER,
        to: email,
        // Subject of Email
        subject: 'Password Reset OTP',
        html: `<p>your OTP for password reset is:<b>${otp}</b></p>`
    };
    transporter.sendMail(mailConfigurations, function (error, info) {
        if (error) throw Error(error);
        console.log('OTP Sent Successfully');
        console.log(info);
    });
}





