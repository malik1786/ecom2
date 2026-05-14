const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.enabled = this._checkConfig();
        this.transporter = null;

        if (this.enabled) {
            this.transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: parseInt(process.env.EMAIL_PORT || '587'),
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
            console.log('✅ [EMAIL] SMTP Transporter initialized.');
        } else {
            console.warn('⚠️  [EMAIL] SMTP credentials missing. Running in MOCK MODE (OTPs will be logged to console).');
        }
    }

    _checkConfig() {
        return !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
    }

    isEnabled() {
        return this.enabled;
    }

    /**
     * Send Secure OTP Email
     */
    async sendOTP(email, otp) {
        if (!this.enabled) {
            console.log('\n═══════════════════════════════════════════');
            console.log('  [MOCK EMAIL] To:', email);
            console.log('  [MOCK EMAIL] OTP:', otp);
            console.log('═══════════════════════════════════════════\n');
            return true;
        }

        const mailOptions = {
            from: `"Sufi Auth" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Secure Login Code',
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2>Verify Your Identity</h2>
                    <p>Use the following 6-digit code to complete your login. This code is valid for 5 minutes.</p>
                    <h1 style="color: #4A90E2; letter-spacing: 5px;">${otp}</h1>
                    <p>If you did not request this, please ignore this email.</p>
                    <hr />
                    <small>Sufi Perfume Enterprise Security</small>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (err) {
            console.error('Email Delivery Error:', err);
            throw new Error('EMAIL_DELIVERY_FAILED');
        }
    }
}

module.exports = new EmailService();
