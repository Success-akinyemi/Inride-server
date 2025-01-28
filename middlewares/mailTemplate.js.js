
const logourl = 'https://i.ibb.co/HtNmMC5/Group-625936.png'
const twUrl= ``
const fbUrl = ``
const igUrl = ``
const currentYear = new Date().getFullYear();

const welcomeEmailContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
    <div style="display: flex; align-items: left; margin-bottom: 20px;">
        <img src="${logourl}" alt="Logo" style="width: 100px; height: auto; margin-right: 20px;">
    </div>
    <br />
    <br />
    <p style="color: #344054; font-size: 16px; font-weight: 400;">Hi ${recipient.name || ''},</p>
    <br />
    
    <div style="">
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Welcome to the RideFuze family! We're excited to have you on board and can’t wait to help you get to where you need to go—smoothly, safely, and conveniently.
        </p>
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Now that you're all set up, here's a quick overview of what you can expect from our app:
        </p>
        <br />

        <ol style="padding-left: 10px;">
            <li style="color: #344054; font-size: 16px; font-weight: 400;">
                Effortless Booking: Book a ride with just a few taps.
            </li>
            <li style="color: #344054; font-size: 16px; font-weight: 400;">
                Ride Tracking: See the exact location of your driver in real-time.
            </li>
            <li style="color: #344054; font-size: 16px; font-weight: 400;">
                Safe & Reliable Drivers: All drivers are thoroughly vetted for your safety and comfort.
            </li>
            <li style="color: #344054; font-size: 16px; font-weight: 400;">
                Flexible Payments: Pay seamlessly via card, wallet, or other options
            </li>
        </ol>

        <br />
        
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            What's Next?
        </p>
        <br />

        <ol style="padding-left: 10px;">
            <li style="color: #344054; font-size: 16px; font-weight: 400;">
                Open the app and set your pickup location.
            </li>
            <li style="color: #344054; font-size: 16px; font-weight: 400;">
                Choose your preferred ride type (we’ve got options to fit your needs!)
            </li>
            <li style="color: #344054; font-size: 16px; font-weight: 400;">
                Sit back, relax, and enjoy the ride!
            </li>

        </ol>

        <br />
        <br />

        <button sty></button>

        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Need Help? Our support team is available 24/7 to assist you with any questions or issues. Just reply to this email or visit our Help Center within the app.
        </p>
        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Thank you for choosing Ridefuze. We look forward to helping you get around with ease and convenience. Safe travels!
        </p>

        <br />
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Thanks,
        </p>
        <p style="color: #344054; font-size: 16px; font-weight: 400;">
            Team
        </p>

    </div>


    <footer style="margin-top: 20px; font-size: 12px; color: #475467;">
        <p style="text-decoration: none; color: #475467;">This email was sent to <span style="color: #007BFF;">${recipient.email}</span>. If you'd rather not receive this kind of email, you can <span style="color: #007BFF;" >unsubscribe</span> or <span style="color: #007BFF;">manage your email preferences.</span></p>
        <br />
        <p style="text-decoration: none; color: #475467;>© ${currentYear} RIDEFUZE</p>
        <br />
        <br />
        <div style="width: 100%; display: flex; align-items: center; justify-content: space-between; margin-top: 20px;">
            <img src="${logourl}" alt="Logo" style="width: 100px; height: auto;">
            <div style="display: flex; align-items: center; flex-direction: row; gap: 8px;>
                <a style="text-decoration: none;" href="">
                    <img src="${twUrl}" alt="Social Media Icons" style="width: 20px; height: auto;">
                </a>
                <a style="text-decoration: none;" href="">
                    <img src="${fbUrl}" alt="Social Media Icons" style="width: 20px; height: auto;">
                </a>
                <a style="text-decoration: none;" href="">
                    <img src="${igUrl}" alt="Social Media Icons" style="width: 20px; height: auto;">
                </a>
            </div>
        </div>
    </footer>
</div>
`;

// Send email
sendEmail({
to: recipient.email,
subject: title,
text: emailContent,
});