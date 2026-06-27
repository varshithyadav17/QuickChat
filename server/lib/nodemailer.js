import nodemailer from "nodemailer";

console.log("SMTP LOGIN:", process.env.BREVO_SMTP_LOGIN);
console.log("SMTP HOST:", process.env.BREVO_SMTP_HOST);
console.log("SMTP PORT:", process.env.BREVO_SMTP_PORT);
console.log("SMTP SENDER:", process.env.BREVO_SENDER);

export const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST,
    port: Number(process.env.BREVO_SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.BREVO_SMTP_LOGIN,
        pass: process.env.BREVO_SMTP_PASSWORD,
    },
});

transporter.verify((err) => {
    if (err) {
        console.error("SMTP ERROR:", err);
    } else {
        console.log("Brevo SMTP Connected");
    }
});