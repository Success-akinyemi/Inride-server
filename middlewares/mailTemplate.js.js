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
            Thank you for choosing RideFuze. We look forward to helping you get around with ease and convenience. Safe travels!
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">Thanks,<br />Team RideFuze</p>
        <footer style="margin-top: 20px; font-size: 12px; color: #475467;">
            <p>This email was sent to <span style="color: #007BFF;">${email}</span>. If you'd rather not receive this kind of email, you can <a href="#" style="color: #007BFF;">unsubscribe</a> or <a href="#" style="color: #007BFF;">manage your email preferences</a>.</p>
            <p style="text-align: center;">© ${currentYear} RideFuze</p>
            <br />
            <div style="display: flex; gap: 40px; align-items: center; justify-content: center;">
              <img src="${logourl}" alt="Logo" style="width: 80px; height: auto; margin-right: 20px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <a href="${twUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${twImg} style="width: 50px; height: auto;" />
                </a>
                <a href="${fbUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${fbImg} style="width: 50px; height: auto;" />
                </a>
                <a href="${igUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${igImg} style="width: 50px; height: auto;" />
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

export async function sendOtpEmail({
  email,
  name = "",
  buttonLink = "#",
  buttonText = "Get Started",
  title = "Login OTP code",
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
            Thank you for choosing RideFuze. We look forward to helping you get around with ease and convenience. Safe travels!
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">Thanks,<br />Team RideFuze</p>
        <footer style="margin-top: 20px; font-size: 12px; color: #475467;">
            <p>This email was sent to <span style="color: #007BFF;">${email}</span>. If you'd rather not receive this kind of email, you can <a href="#" style="color: #007BFF;">unsubscribe</a> or <a href="#" style="color: #007BFF;">manage your email preferences</a>.</p>
            <p style="text-align: center;">© ${currentYear} RideFuze</p>
            <br />
            <div style="display: flex; gap: 40px; align-items: center; justify-content: center;">
              <img src="${logourl}" alt="Logo" style="width: 80px; height: auto; margin-right: 20px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <a href="${twUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${twImg} style="width: 50px; height: auto;" />
                </a>
                <a href="${fbUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${fbImg} style="width: 50px; height: auto;" />
                </a>
                <a href="${igUrl}" style="text-decoration: none; color: inherit;">
                  <img src=${igImg} style="width: 50px; height: auto;" />
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