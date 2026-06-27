import nodemailer from "nodemailer"

console.log("i entered the nodemailer")

export const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: false,
    requireTLS: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
});

console.log("i middle the nodemailer")

transporter.verify((error, success) => {
    if (error) {
        console.error("SMTP ERROR:", error);
    } else {
        console.log("SMTP Server is ready");
    }
});

console.log("i complete the nodemailer")