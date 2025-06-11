const nodemailer = require('nodemailer');
const config = require('../config/env');

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: config.email.service,
    host: config.email.host,
    port: config.email.port,
    secure: false,
    auth: {
      user: config.email.user,
      pass: config.email.password
    }
  });
};


 // Send email utility function

const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: config.email.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

 // Send payment retry notification email

const sendPaymentRetryEmail = async (customerEmail, customerName, retryUrl, amount, currency = 'USD') => {
  const formattedAmount = (amount / 100).toFixed(2);
  
  const subject = 'Payment Failed - Please Update Your Payment Method';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Failed</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .button { 
          display: inline-block; 
          padding: 12px 24px; 
          background-color: #007bff; 
          color: white; 
          text-decoration: none; 
          border-radius: 4px; 
          margin: 20px 0; 
        }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Failed</h1>
        </div>
        <div class="content">
          <p>Hello ${customerName || 'Customer'},</p>
          
          <p>We were unable to process your subscription payment of <strong>${currency.toUpperCase()} $${formattedAmount}</strong>.</p>
          
          <p>This could be due to:</p>
          <ul>
            <li>Insufficient funds</li>
            <li>Expired card</li>
            <li>Bank security restrictions</li>
            <li>Incorrect billing information</li>
          </ul>
          
          <p>To continue your subscription, please update your payment method by clicking the button below:</p>
          
          <div style="text-align: center;">
            <a href="${retryUrl}" class="button">Update Payment Method</a>
          </div>
          
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
          
          <p>Thank you for your understanding.</p>
          
          <p>Best regards,<br>Your Subscription Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Payment Failed
    
    Hello ${customerName || 'Customer'},
    
    We were unable to process your subscription payment of ${currency.toUpperCase()} $${formattedAmount}.
    
    This could be due to insufficient funds, expired card, bank security restrictions, or incorrect billing information.
    
    To continue your subscription, please update your payment method by visiting: ${retryUrl}
    
    If you have any questions, please contact our support team.
    
    Thank you for your understanding.
    
    Best regards,
    Your Subscription Team
  `;

  return sendEmail({
    to: customerEmail,
    subject,
    html,
    text
  });
};


 // Send subscription confirmation email
 
const sendSubscriptionConfirmationEmail = async (customerEmail, customerName, subscriptionDetails) => {
  const { planId, nextBillingDate } = subscriptionDetails;
  console.log('Sending subscription confirmation email:', {
    customerEmail,
    planId,
    nextBillingDate
  });

  const subject = 'Subscription Confirmed - Welcome!';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Subscription Confirmed</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .details { background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Your Subscription!</h1>
        </div>
        <div class="content">
          <p>Hello ${customerName || 'Customer'},</p>
          
          <p>Thank you for subscribing! Your payment has been processed successfully.</p>
          
          <div class="details">
            <h3>Subscription Details:</h3>
            <p><strong>Next Billing Date:</strong> ${new Date(nextBillingDate).toLocaleDateString()}</p>
          </div>
          
          <p>You now have full access to all features of your subscription.</p>
          
          <p>If you have any questions or need support, please don't hesitate to contact us.</p>
          
          <p>Thank you for choosing us!</p>
          
          <p>Best regards,<br>Your Subscription Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Subscription Confirmed
    
    Hello ${customerName || 'Customer'},
    
    Thank you for subscribing! Your payment has been processed successfully.
    
    Subscription Details:
    - Next Billing Date: ${new Date(nextBillingDate).toLocaleDateString()}
    
    You now have full access to all features of your subscription.
    
    If you have any questions or need support, please contact us.
    
    Thank you for choosing us!
    
    Best regards,
    Your Subscription Team
  `;

  return sendEmail({
    to: customerEmail,
    subject,
    html,
    text
  });
};

module.exports = {
  sendEmail,
  sendPaymentRetryEmail,
  sendSubscriptionConfirmationEmail
}; 