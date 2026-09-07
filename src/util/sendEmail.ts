import nodemailer from "nodemailer";
import config from "../config";
import { logger } from "./logger";

const currentDate = new Date();

const formattedDate = currentDate.toLocaleDateString("en-US", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const sendEmail = async (options: {
  email: string;
  subject: string;
  html: string;
}) => {
  if (!config.smtp.smtp_mail || !config.smtp.smtp_host) {
    logger.warn(`SMTP credentials missing or host not set. Skipping email dispatch to ${options.email}`);
    return;
  }

  const port = config.smtp.smtp_port ? parseInt(config.smtp.smtp_port, 10) : 587;

  const transporter = nodemailer.createTransport({
    host: config.smtp.smtp_host,
    service: config.smtp.smtp_service || undefined,
    port: Number.isNaN(port) ? 587 : port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user: config.smtp.smtp_mail,
      pass: config.smtp.smtp_password,
    },
  });

  const { email, subject, html } = options;

  const mailOptions = {
    from: `${config.smtp.NAME || "SomSpot"} <${config.smtp.smtp_mail}>`,
    to: email,
    date: formattedDate,
    signed_by: "SomSpot",
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    logger.error(`Error sending email to ${email}:`, err);
  }
};

export { sendEmail };
