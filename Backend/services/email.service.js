let nodemailer;
try {
    nodemailer = require('nodemailer');
} catch (err) {
    nodemailer = null;
}

function isEmailConfigured() {
    if (!nodemailer) return false;
    return Boolean(
        process.env.SMTP_HOST &&
        process.env.SMTP_PORT &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS
    );
}

function getTransporter() {
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = port === 465;

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        }
    });
}

async function sendDeliveryRequestEmail({ to, subject, html }) {
    if (!nodemailer) {
        return { sent: false, reason: 'NODEMAILER_NOT_INSTALLED' };
    }
    if (!isEmailConfigured()) {
        return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
    }

    const transporter = getTransporter();

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
        from,
        to,
        subject,
        html,
    });

    return { sent: true };
}

module.exports = {
    isEmailConfigured,
    sendDeliveryRequestEmail,
};
