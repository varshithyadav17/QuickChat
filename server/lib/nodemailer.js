import nodemailer from "nodemailer";

console.log("SMTP LOGIN:", process.env.BREVO_USER);
console.log("SMTP HOST:", process.env.BREVO_HOST);
console.log("SMTP PORT:", process.env.BREVO_PORT);
console.log("SMTP SENDER:", process.env.BREVO_SENDER);

export const transporter = nodemailer.createTransport({
    host: process.env.BREVO_HOST,
    port: Number(process.env.BREVO_PORT),
    secure: false,
    requireTLS: true,
    auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS,
    },

    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,

    logger: true,
    debug: true,
});

transporter.verify((err) => {
    if (err) {
        console.error("SMTP ERROR:", err);
    } else {
        console.log("Brevo SMTP Connected");
    }
});