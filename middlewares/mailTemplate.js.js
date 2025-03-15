import sendEmail from "./emailService.js";

const logourl = "https://i.ibb.co/HtNmMC5/Group-625936.png";
const twUrl = ""; // Add Twitter URL
const fbUrl = ""; // Add Facebook URL
const igUrl = ""; // Add Instagram URL

const twImg = 'https://i.ibb.co/TrkW705/Vector.png'; //
const fbImg = 'https://i.ibb.co/Qd51cS7/Vector.png'; //
const igImg = 'https://i.ibb.co/BwXQBCr/Social-icon.png'; //

const currentYear = new Date().getFullYear();

export async function sendWelcomeEmail({
  email,
  name = "",
  buttonLink = "#",
  buttonText = "Get Started",
  title = "Happy to have you on RideFuze!",
}) {
  if (!email) {
    throw new Error("Email is required to send a welcome email.");
  }

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="display: flex; align-items: left; margin-bottom: 20px;">
            <img src="${logourl}" alt="Logo" style="width: 100px; height: auto; margin-right: 20px;">
        </div>
        <br />
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">Hi ${name},</p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Welcome to the RideFuze family! We're excited to have you on board and can’t wait to help you get to where you need to go—smoothly, safely, and conveniently.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Now that you're all set up, here's a quick overview of what you can expect from our app:
        </p>
        <ul style="color: #344054; font-size: 16px; font-weight: 400; padding-left: 20px;">
            <li>Effortless Booking: Book a ride with just a few taps.</li>
            <li>Ride Tracking: See the exact location of your driver in real-time.</li>
            <li>Safe & Reliable Drivers: All drivers are thoroughly vetted for your safety and comfort.</li>
            <li>Flexible Payments: Pay seamlessly via card, wallet, or other options.</li>
        </ul>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">What's Next?</p>
        <ul style="color: #344054; font-size: 16px; font-weight: 400; padding-left: 20px;">
            <li>Open the app and set your pickup location.</li>
            <li>Choose your preferred ride type (we’ve got options to fit your needs!).</li>
            <li>Sit back, relax, and enjoy the ride!</li>
        </ul>
        <br />
        <br />
        <div style="text-align: center; margin: 20px 0; background: #007BFF; padding: 10px 20px; border-radius: 8px;">
            <a href="${buttonLink}" style="display: inline-block; background-color: #007BFF; color: white; text-decoration: none;">${buttonText}</a>
        </div>
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Need Help? Our support team is available 24/7 to assist you with any questions or issues. Just reply to this email or visit our Help Center within the app.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Thank you for choosing <b>RideFuze</b>. We are committed to providing you with a seamless and secure experience.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;"><b>Best regards</b>,<br />Team RideFuze</p>
        <footer style="margin-top: 20px; font-size: 12px; color: #475467;">
            <p>This email was sent to <span style="color: #007BFF;">${email}</span>. If you prefer not to receive similar notifications, you can <a href="#" style="color: #007BFF;">unsubscribe</a> or <a href="#" style="color: #007BFF;">manage your email preferences</a>.</p>
            <p style="text-align: center;">© ${currentYear} RideFuze</p>
            <br />
            <div style="display: flex; gap: 40px; align-items: center; justify-content: space-between;">
              <img src="${logourl}" alt="Logo" style="width: 80px; height: auto; margin-right: 20px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <a href="${twUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${twImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${fbUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${fbImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${igUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${igImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
              </div>
            </div>
        </footer>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject: title,
      html: emailContent,
    });
    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error.message);
    throw error;
  }
}

//account created go for checkr verification
export async function sendCheckrInvitationEmail({
  email,
  name = "",
  buttonLink = "#",
  buttonText = "Start Verification",
  title = "RideFuze | Complete Driver verification",
}) {
  if (!email) {
    throw new Error("Email is required to send a welcome email.");
  }

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="display: flex; align-items: left; margin-bottom: 20px;">
            <img src="${logourl}" alt="Logo" style="width: 100px; height: auto; margin-right: 20px;">
        </div>
        <br />
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">Hi ${name},</p>
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Welcome onboard the RideFuze driver app. complete your verification steps with the link below to get started with us link below: 
        </p>
        <br />
        <div style="text-align: center; margin: 20px 0; background: #007BFF; padding: 10px 20px; border-radius: 8px;">
            <a href="${buttonLink}" style="display: inline-block; background-color: #007BFF; color: white; text-decoration: none;">${buttonText}</a>
        </div>
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            If you are unable to use the button above, you can start the verification process using the following link <br />
            <a href="${buttonLink}" style="display: inline-block; color: #007BFF; text-decoration: none;">${buttonLink}</a>
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Thank you for choosing <b>RideFuze</b>. We are committed to providing you with a seamless and secure experience.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">Best regards,<br /><b>Team RideFuze</b></p>
        <footer style="margin-top: 20px; font-size: 12px; color: #475467;">
            <p>This email was sent to <span style="color: #007BFF;">${email}</span>. If you prefer not to receive similar notifications, you can <a href="#" style="color: #007BFF;">unsubscribe</a> or <a href="#" style="color: #007BFF;">manage your email preferences</a>.</p>
            <p style="text-align: center;">© ${currentYear} RideFuze</p>
            <br />
            <div style="display: flex; gap: 40px; align-items: center; justify-content: space-between;">
              <img src="${logourl}" alt="Logo" style="width: 80px; height: auto; margin-right: 20px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <a href="${twUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${twImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${fbUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${fbImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${igUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${igImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
              </div>
            </div>
        </footer>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject: title,
      html: emailContent,
    });
    console.log(`checkr verification email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error.message);
    throw error;
  }
}

export async function sendOtpEmail({
  email,
  name = "",
  code = [],
  buttonLink = "#",
  buttonText = "Verify Email",
  title = "Verification OTP code",
}) {
  if (!email) {
    throw new Error("Email is required to send a welcome email.");
  }

  const otpCodeHtml = code
  .map(
    (i) =>
      `<div style="height: 64px; weight: 64px; display: flex; align-items: center; justify-content: center; border: 2px solid #0062CC; border-radius: 8px; padding: 2px 8px; font-weight: 500px; font-size: 48px; color: #0062CC; text-align: center; margin-left: 4px; margin-right: 4px;">
      ${i}
      </div>`
  )
  .join("");

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="display: flex; align-items: left; margin-bottom: 20px;">
            <img src="${logourl}" alt="Logo" style="width: 100px; height: auto; margin-right: 20px;">
        </div>
        <br />
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">Hi ${name},</p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
           This your verification code:
        </p>

        <div style="display: flex; align-items: center; justify-content: center; gap: 8px;" >
        ${otpCodeHtml}
        </div>

        <div style="text-align: center; margin: 20px 0; background: #007BFF; padding: 10px 20px; border-radius: 8px;">
            <a href="${buttonLink}" style="display: inline-block; background-color: #007BFF; color: white; text-decoration: none;">${buttonText}</a>
        </div>

        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            This code will only be valid for the next 1 hour. If the code does not work, you can use this login verification link:
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Thank you for choosing <b>RideFuze</b>. We are committed to providing you with a seamless and secure experience.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;"><b>Best regards</b>,<br />Team RideFuze</p>
        <footer style="margin-top: 20px; font-size: 12px; color: #475467;">
            <p>This email was sent to <span style="color: #007BFF;">${email}</span>. If you prefer not to receive similar notifications, you can <a href="#" style="color: #007BFF;">unsubscribe</a> or <a href="#" style="color: #007BFF;">manage your email preferences</a>.</p>
            <p style="text-align: center;">© ${currentYear} RideFuze</p>
            <br />
            <div style="display: flex; gap: 40px; align-items: center; justify-content: space-between;">
              <img src="${logourl}" alt="Logo" style="width: 80px; height: auto; margin-right: 20px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <a href="${twUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${twImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${fbUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${fbImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${igUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${igImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
              </div>
            </div>
        </footer>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject: title,
      html: emailContent,
    });
    console.log(`OTP email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send OTP email to ${email}:`, error.message);
    throw error;
  }
}

export async function sendNewLoginEmail({
  email,
  name = "",
  time = Date.now(),
  device = {},
  title = "Successful Login Attempt on Your RideFuze Account`",
}) {
  if (!email) {
    throw new Error("Email is required to send a welcome email.");
  }

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="display: flex; align-items: left; margin-bottom: 20px;">
            <img src="${logourl}" alt="Logo" style="width: 100px; height: auto; margin-right: 20px;">
        </div>
        <br />
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">Hi ${name},</p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            We detected a successful login attempt on your account.
        </p>
        <br />
        <strong>Details:</strong>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            <strong>- Time</strong>: ${time}
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            <strong>- Device</strong>: ${device?.device} <br> ${device?.location}
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            <strong>- Operating System</strong>: ${device?.deviceType} <br> ${device?.location}
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            <strong>- Location</strong>: ${device?.location}
        </p>

        <br />
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            If this login was not initiated by you, please contact our Admin Support Team immediately for assistance.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">Best regards,<br /> <b>Team RideFuze</b></p>
        <footer style="margin-top: 20px; font-size: 12px; color: #475467;">
            <p>This email was sent to <span style="color: #007BFF;">${email}</span>. If you prefer not to receive similar notifications, you can <a href="#" style="color: #007BFF;">unsubscribe</a> or <a href="#" style="color: #007BFF;">manage your email preferences</a>.</p>
            <p style="text-align: center;">© ${currentYear} RideFuze</p>
            <br />
            <div style="display: flex; gap: 40px; align-items: center; justify-content: space-between;">
              <img src="${logourl}" alt="Logo" style="width: 80px; height: auto; margin-right: 20px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <a href="${twUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${twImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${fbUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${fbImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${igUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${igImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
              </div>
            </div>
        </footer>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject: title,
      html: emailContent,
    });
    console.log(`Login attempt email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error.message);
    throw error;
  }
}

export async function sendAccountSuspendedEmail({
  email,
  name = "",
  time = Date.now(),
  device = "",
  title = "Account Suspended",
}) {
  if (!email) {
    throw new Error("Email is required to send a welcome email.");
  }

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="display: flex; align-items: left; margin-bottom: 20px;">
            <img src="${logourl}" alt="Logo" style="width: 100px; height: auto; margin-right: 20px;">
        </div>
        <br />
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">Hi ${name},</p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Your account has been suspended after failed multiple login
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Account has been suspended for: <strong><b>${time}</b></strong>
        </p>

        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            If this was not you. Quickly contact the admin support team.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;"><b>Best regards</b>,<br />Team RideFuze</p>
        <footer style="margin-top: 20px; font-size: 12px; color: #475467;">
            <p>This email was sent to <span style="color: #007BFF;">${email}</span>. If you prefer not to receive similar notifications, you can <a href="#" style="color: #007BFF;">unsubscribe</a> or <a href="#" style="color: #007BFF;">manage your email preferences</a>.</p>
            <p style="text-align: center;">© ${currentYear} RideFuze</p>
            <br />
            <div style="display: flex; gap: 40px; align-items: center; justify-content: space-between;">
              <img src="${logourl}" alt="Logo" style="width: 80px; height: auto; margin-right: 20px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <a href="${twUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${twImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${fbUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${fbImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${igUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${igImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
              </div>
            </div>
        </footer>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject: title,
      html: emailContent,
    });
    console.log(`Account suspended email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error.message);
    throw error;
  }
}

export async function sendForgotPasswordEmail({
  email,
  name = "",
  buttonLink = "#",
  buttonText = "Reset Password",
  title = "Password Reset Request",
}) {
  if (!email) {
    throw new Error("Email is required to send a welcome email.");
  }

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="display: flex; align-items: left; margin-bottom: 20px;">
            <img src="${logourl}" alt="Logo" style="width: 100px; height: auto; margin-right: 20px;">
        </div>
        <br />
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">Hi ${name},</p>
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            We received a request to reset your password. To proceed, please click the button below:  
        </p>
        <br />
        <div style="text-align: center; margin: 20px 0; background: #007BFF; padding: 10px 20px; border-radius: 8px;">
            <a href="${buttonLink}" style="display: inline-block; background-color: #007BFF; color: white; text-decoration: none;">${buttonText}</a>
        </div>
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            If you are unable to use the button above, you can reset your password using the following link <br />
            <a href="${buttonLink}" style="display: inline-block; color: #007BFF; text-decoration: none;">${buttonLink}</a>
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Thank you for choosing <b>RideFuze</b>. We are committed to providing you with a seamless and secure experience.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">Best regards,<br /><b>Team RideFuze</b></p>
        <footer style="margin-top: 20px; font-size: 12px; color: #475467;">
            <p>This email was sent to <span style="color: #007BFF;">${email}</span>. If you prefer not to receive similar notifications, you can <a href="#" style="color: #007BFF;">unsubscribe</a> or <a href="#" style="color: #007BFF;">manage your email preferences</a>.</p>
            <p style="text-align: center;">© ${currentYear} RideFuze</p>
            <br />
            <div style="display: flex; gap: 40px; align-items: center; justify-content: space-between;">
              <img src="${logourl}" alt="Logo" style="width: 80px; height: auto; margin-right: 20px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <a href="${twUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${twImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${fbUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${fbImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${igUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${igImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
              </div>
            </div>
        </footer>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject: title,
      html: emailContent,
    });
    console.log(`reset email email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error.message);
    throw error;
  }
}

export async function sendUserAccountBlockedEmail({
  email,
  name = "",
  reason = '',
  title = "Account blocked",
}) {
  if (!email) {
    throw new Error("Email is required to send a welcome email.");
  }

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="display: flex; align-items: left; margin-bottom: 20px;">
            <img src="${logourl}" alt="Logo" style="width: 100px; height: auto; margin-right: 20px;">
        </div>
        <br />
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">Hi ${name},</p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Your account has been blocked and deactivated by support team
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Account has been suspended for: <br> <strong><b>${reason}</b></strong>
        </p>

        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            If you believe this is a mistake, Quickly contact the admin support team.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;"><b>Best regards</b>,<br />Team RideFuze</p>
        <footer style="margin-top: 20px; font-size: 12px; color: #475467;">
            <p>This email was sent to <span style="color: #007BFF;">${email}</span>. If you prefer not to receive similar notifications, you can <a href="#" style="color: #007BFF;">unsubscribe</a> or <a href="#" style="color: #007BFF;">manage your email preferences</a>.</p>
            <p style="text-align: center;">© ${currentYear} RideFuze</p>
            <br />
            <div style="display: flex; gap: 40px; align-items: center; justify-content: space-between;">
              <img src="${logourl}" alt="Logo" style="width: 80px; height: auto; margin-right: 20px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <a href="${twUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${twImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${fbUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${fbImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${igUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${igImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
              </div>
            </div>
        </footer>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject: title,
      html: emailContent,
    });
    console.log(`Account Blocked email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error.message);
    throw error;
  }
}

export async function sendStaffSackEmail({
  email,
  name = "",
  title = "Account Deactivate - Sacked",
}) {
  if (!email) {
    throw new Error("Email is required to send a welcome email.");
  }

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="display: flex; align-items: left; margin-bottom: 20px;">
            <img src="${logourl}" alt="Logo" style="width: 100px; height: auto; margin-right: 20px;">
        </div>
        <br />
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">Hi ${name},</p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            We regrest to inform you, that your account has been blocked and deactivated by ridefuze support team
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Account has been suspended as you n no longer have access to the ridefuze administrative application
        </p>

        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            If you believe this is a mistake, Quickly contact the admin support team.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;"><b>Best regards</b>,<br />Team RideFuze</p>
        <footer style="margin-top: 20px; font-size: 12px; color: #475467;">
            <p>This email was sent to <span style="color: #007BFF;">${email}</span>. If you prefer not to receive similar notifications, you can <a href="#" style="color: #007BFF;">unsubscribe</a> or <a href="#" style="color: #007BFF;">manage your email preferences</a>.</p>
            <p style="text-align: center;">© ${currentYear} RideFuze</p>
            <br />
            <div style="display: flex; gap: 40px; align-items: center; justify-content: space-between;">
              <img src="${logourl}" alt="Logo" style="width: 80px; height: auto; margin-right: 20px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <a href="${twUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${twImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${fbUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${fbImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${igUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${igImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
              </div>
            </div>
        </footer>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject: title,
      html: emailContent,
    });
    console.log(`Staff Account Blocked email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error.message);
    throw error;
  }
}

export async function sendStaffActivationEmail({
  email,
  name = "",
  title = "Account Activated",
}) {
  if (!email) {
    throw new Error("Email is required to send a welcome email.");
  }

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="display: flex; align-items: left; margin-bottom: 20px;">
            <img src="${logourl}" alt="Logo" style="width: 100px; height: auto; margin-right: 20px;">
        </div>
        <br />
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">Hi ${name},</p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            We are please to inform you, that your account has been activated and ready for you to begin using by ridefuze support team
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Welcome onboard to the ridefuze team.
        </p>

        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            If you believe this is a mistake, Quickly contact the admin support team.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;"><b>Best regards</b>,<br />Team RideFuze</p>
        <footer style="margin-top: 20px; font-size: 12px; color: #475467;">
            <p>This email was sent to <span style="color: #007BFF;">${email}</span>. If you prefer not to receive similar notifications, you can <a href="#" style="color: #007BFF;">unsubscribe</a> or <a href="#" style="color: #007BFF;">manage your email preferences</a>.</p>
            <p style="text-align: center;">© ${currentYear} RideFuze</p>
            <br />
            <div style="display: flex; gap: 40px; align-items: center; justify-content: space-between;">
              <img src="${logourl}" alt="Logo" style="width: 80px; height: auto; margin-right: 20px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <a href="${twUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${twImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${fbUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${fbImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${igUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${igImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
              </div>
            </div>
        </footer>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject: title,
      html: emailContent,
    });
    console.log(`Account activated email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error.message);
    throw error;
  }
}

export async function sendCMSEmail({
  email,
  name = "",
  content = "",
  image = "",
  title = "RideFuze",
}) {
  if (!email) {
    throw new Error("Email is required to send a welcome email.");
  }

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="display: flex; align-items: left; margin-bottom: 20px;">
            <img src="${logourl}" alt="Logo" style="width: 100px; height: auto; margin-right: 20px;">
        </div>
        <br />
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">Hi ${name},</p>
        
        <div style="color: #344054; font-size: 16px; font-weight: 400;">
            ${content}
        </div>
        
        ${image && (
          `
            <img src="${image}" alt="${title}" style="width: 80%; height: auto;">
          `  
        )}

        <br />
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Need Help? Our support team is available 24/7 to assist you with any questions or issues. Just reply to this email or visit our Help Center within the app.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Thank you for choosing <b>RideFuze</b>. We are committed to providing you with a seamless and secure experience.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;"><b>Best regards</b>,<br />Team RideFuze</p>
        <footer style="margin-top: 20px; font-size: 12px; color: #475467;">
            <p>This email was sent to <span style="color: #007BFF;">${email}</span>. If you prefer not to receive similar notifications, you can <a href="#" style="color: #007BFF;">unsubscribe</a> or <a href="#" style="color: #007BFF;">manage your email preferences</a>.</p>
            <p style="text-align: center;">© ${currentYear} RideFuze</p>
            <br />
            <div style="display: flex; gap: 40px; align-items: center; justify-content: space-between;">
              <img src="${logourl}" alt="Logo" style="width: 80px; height: auto; margin-right: 20px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <a href="${twUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${twImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${fbUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${fbImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${igUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${igImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
              </div>
            </div>
        </footer>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject: title,
      html: emailContent,
    });
    console.log(`CMS email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error.message);
    throw error;
  }
}

export async function sendPayoutrequestSubmittedEmail({
  email,
  name = "",
  amount = "",
  bankName = "",
  accountName = "",
  accountNumber = "",
  title = "Payout Request Submitted Successful",
}) {
  if (!email) {
    throw new Error("Email is required to send payout request.");
  }

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="display: flex; align-items: left; margin-bottom: 20px;">
            <img src="${logourl}" alt="Logo" style="width: 100px; height: auto; margin-right: 20px;">
        </div>
        <br />
        <br />

        <p style="color: #344054; font-size: 16px; font-weight: 400;">Hi ${name},</p>
       
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            You have succesful submitted a payout request. you request is beem recieved and awaiting further processing by support team.
        </p>

        <p style="color: #344054; font-size: 17px; font-weight: 600;">
           Payout Details
        </p>

        <ul style="color: #344054; font-size: 16px; font-weight: 400; padding-left: 20px;">
            <li><strong>Amount:</strong> ${amount}</li>
            <li><strong>Bank Name:</strong> ${bankName}</li>
            <li><strong>Account Name:</strong> ${accountName}</li>
            <li><strong>Account Number:</strong> ${accountNumber}</li>
            <li><strong>Status:</strong> <span style="color: #000000;">Pending</span></li>
        </ul>

        <br />
        <br />

        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Need Help? Our support team is available 24/7 to assist you with any questions or issues. Just reply to this email or visit our Help Center within the app.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Thank you for choosing <b>RideFuze</b>. We are committed to providing you with a seamless and secure experience.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;"><b>Best regards</b>,<br />Team RideFuze</p>
        <footer style="margin-top: 20px; font-size: 12px; color: #475467;">
            <p>This email was sent to <span style="color: #007BFF;">${email}</span>. If you prefer not to receive similar notifications, you can <a href="#" style="color: #007BFF;">unsubscribe</a> or <a href="#" style="color: #007BFF;">manage your email preferences</a>.</p>
            <p style="text-align: center;">© ${currentYear} RideFuze</p>
            <br />
            <div style="display: flex; gap: 40px; align-items: center; justify-content: space-between;">
              <img src="${logourl}" alt="Logo" style="width: 80px; height: auto; margin-right: 20px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <a href="${twUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${twImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${fbUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${fbImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${igUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${igImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
              </div>
            </div>
        </footer>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject: title,
      html: emailContent,
    });
    console.log(`payout request email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error.message);
    throw error;
  }
}

export async function sendPayoutRequestApprovedEmail({
  email,
  name = "",
  amount = "",
  bankName = "",
  accountName = "",
  accountNumber = "",
  title = "Payout Request Approved",
}) {
  if (!email) {
    throw new Error("Email is required to send payout approved.");
  }

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="display: flex; align-items: left; margin-bottom: 20px;">
            <img src="${logourl}" alt="Logo" style="width: 100px; height: auto; margin-right: 20px;">
        </div>
        <br />
        <br />

        <p style="color: #344054; font-size: 16px; font-weight: 400;">Hi ${name},</p>
       
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
           Hurray! You payout request has been approved. by the support team
        </p>

        <p style="color: #344054; font-size: 17px; font-weight: 600;">
           Payout Details
        </p>

        <ul style="color: #344054; font-size: 16px; font-weight: 400; padding-left: 20px;">
            <li><strong>Amount:</strong> ${amount}</li>
            <li><strong>Bank Name:</strong> ${bankName}</li>
            <li><strong>Account Name:</strong> ${accountName}</li>
            <li><strong>Account Number:</strong> ${accountNumber}</li>
            <li><strong>Status:</strong> <span style="color: #007BFF;">Succesful</span></li>
        </ul>

        <br />
        <br />

        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Need Help? Our support team is available 24/7 to assist you with any questions or issues. Just reply to this email or visit our Help Center within the app.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Thank you for choosing <b>RideFuze</b>. We are committed to providing you with a seamless and secure experience.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;"><b>Best regards</b>,<br />Team RideFuze</p>
        <footer style="margin-top: 20px; font-size: 12px; color: #475467;">
            <p>This email was sent to <span style="color: #007BFF;">${email}</span>. If you prefer not to receive similar notifications, you can <a href="#" style="color: #007BFF;">unsubscribe</a> or <a href="#" style="color: #007BFF;">manage your email preferences</a>.</p>
            <p style="text-align: center;">© ${currentYear} RideFuze</p>
            <br />
            <div style="display: flex; gap: 40px; align-items: center; justify-content: space-between;">
              <img src="${logourl}" alt="Logo" style="width: 80px; height: auto; margin-right: 20px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <a href="${twUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${twImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${fbUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${fbImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${igUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${igImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
              </div>
            </div>
        </footer>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject: title,
      html: emailContent,
    });
    console.log(`payout approved email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error.message);
    throw error;
  }
}

export async function sendPayoutRequestRejectedEmail({
  email,
  name = "",
  amount = "",
  bankName = "",
  accountName = "",
  accountNumber = "",
  reason = "", 
  title = "Payout Request Approved",
}) {
  if (!email) {
    throw new Error("Email is required to send payout approved.");
  }

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="display: flex; align-items: left; margin-bottom: 20px;">
            <img src="${logourl}" alt="Logo" style="width: 100px; height: auto; margin-right: 20px;">
        </div>
        <br />
        <br />

        <p style="color: #344054; font-size: 16px; font-weight: 400;">Hi ${name},</p>
       
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
           Hurray! You payout request has been approved. by the support team
        </p>

        <p style="color: #344054; font-size: 17px; font-weight: 600;">
           Payout Details
        </p>

        <ul style="color: #344054; font-size: 16px; font-weight: 400; padding-left: 20px;">
            <li><strong>Amount:</strong> ${amount}</li>
            <li><strong>Bank Name:</strong> ${bankName}</li>
            <li><strong>Account Name:</strong> ${accountName}</li>
            <li><strong>Account Number:</strong> ${accountNumber}</li>
            <li><strong>Status:</strong> <span style="color:rgb(255, 0, 0);">Rejected</span></li>
        </ul>

        <p style="color: #344054; font-size: 17px; font-weight: 600;">
           Reason: <br>
           ${reason}
        </p>

        <br />
        <br />

        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Need Help? Our support team is available 24/7 to assist you with any questions or issues. Just reply to this email or visit our Help Center within the app.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Thank you for choosing <b>RideFuze</b>. We are committed to providing you with a seamless and secure experience.
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;"><b>Best regards</b>,<br />Team RideFuze</p>
        <footer style="margin-top: 20px; font-size: 12px; color: #475467;">
            <p>This email was sent to <span style="color: #007BFF;">${email}</span>. If you prefer not to receive similar notifications, you can <a href="#" style="color: #007BFF;">unsubscribe</a> or <a href="#" style="color: #007BFF;">manage your email preferences</a>.</p>
            <p style="text-align: center;">© ${currentYear} RideFuze</p>
            <br />
            <div style="display: flex; gap: 40px; align-items: center; justify-content: space-between;">
              <img src="${logourl}" alt="Logo" style="width: 80px; height: auto; margin-right: 20px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <a href="${twUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${twImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${fbUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${fbImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${igUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${igImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
              </div>
            </div>
        </footer>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject: title,
      html: emailContent,
    });
    console.log(`payout rejected email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error.message);
    throw error;
  }
}

export async function sendNewUserEmail({
  email,
  name = "",
  password = "",
  buttonLink = "#",
  buttonText = "Go to Dashboard",
  title = "Subject: Welcome to RideFuze – Your Staff Account is Ready",
}) {
  if (!email) {
    throw new Error("Email is required to send a new user email.");
  }

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <div style="display: flex; align-items: left; margin-bottom: 20px;">
            <img src="${logourl}" alt="Logo" style="width: 100px; height: auto; margin-right: 20px;">
        </div>
        <br />
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">Hi ${name},</p>

        <p style="color: #344054; font-size: 16px; font-weight: 400;">
          We are excited to welcome you to the RideFuze team! Your staff account has been successfully created, granting you access to the RideFuze dashboard application.
        </p>

        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Your Login Credentials
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            <strong>Email:</strong> ${email}
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            <strong>Password:</strong> ${password}
        </p>
        <br />

        <p style="color: #344054; font-size: 16px; font-weight: 400;">            
          For security purposes, please update your password immediately after logging in.
        </p>
        <br />
        <div style="text-align: center; margin: 20px 0; background: #007BFF; padding: 10px 20px; border-radius: 8px;">
            <a href="${buttonLink}" style="display: inline-block; background-color: #007BFF; color: white; text-decoration: none;">${buttonText}</a>
        </div>
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            If you're unable to access the dashboard using the button above, you can use the following link: <br />
            <a href="${buttonLink}" style="display: inline-block; color: #007BFF; text-decoration: none;">${buttonLink}</a>
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            We look forward to growing together and achieving great things!
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;"><b>Best regards</b>,<br />Team RideFuze</p>
        <footer style="margin-top: 20px; font-size: 12px; color: #475467;">
            <p>This email was sent to <span style="color: #007BFF;">${email}</span>. If you prefer not to receive similar notifications, you can <a href="#" style="color: #007BFF;">unsubscribe</a> or <a href="#" style="color: #007BFF;">manage your email preferences</a>.</p>
            <p style="text-align: center;">© ${currentYear} RideFuze</p>
            <br />
            <div style="display: flex; gap: 40px; align-items: center; justify-content: space-between;">
              <img src="${logourl}" alt="Logo" style="width: 80px; height: auto; margin-right: 20px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <a href="${twUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${twImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${fbUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${fbImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
                <a href="${igUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${igImg} style="width: 20px; height: auto; margin-left: 5px; margin-right: 5px;" />
                </a>
              </div>
            </div>
        </footer>
    </div>
  `;

  try {
    await sendEmail({
      to: email,
      subject: title,
      html: emailContent,
    });
    console.log(`new user email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error.message);
    throw error;
  }
}