/**
 * Express Backend Server for OTP Email Verification
 * Uses Nodemailer with Gmail SMTP and Firebase Admin for Firestore
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure Multer for file uploads (memory storage for Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
console.log('✅ Cloudinary configured');

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Initialize Firebase Admin SDK using environment variables
let db;
try {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey
    })
  });
  db = admin.firestore();
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization error:', error.message);
}

// Configure Nodemailer with Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify email configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email configuration error:', error.message);
  } else {
    console.log('✅ Email server ready');
  }
});

/**
 * Generate a random 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP Email with Logo
 */
async function sendOTPEmail(email, fullName, otp) {
  // Path to logo in frontend assets
  const logoPath = path.join(__dirname, '..', 'frontend', 'src', 'assets', 'logo.jpg');

  const mailOptions = {
    from: `"SRE LAKSHME Electronicss & Furnituress" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Email - SRE LAKSHME Electronicss & Furnituress',
    // Attachments array removed since we are using a remote URL now
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);">

              <tr>
                <td style="padding: 30px 40px; text-align: center; background: linear-gradient(135deg, #374151 0%, #111827 100%); border-radius: 16px 16px 0 0;">
                  <img src="https://i.pinimg.com/1200x/0c/89/cb/0c89cb3c1fdb66f6833fc6e0dfb04ba4.jpg" alt="SRE LAKSHME" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; border: 3px solid #e5e7eb;">
                  <h1 style="margin: 0; color: #f9fafb; font-size: 22px; font-weight: 700;">SRE LAKSHME</h1>
                  <p style="margin: 5px 0 0; color: #d1d5db; font-size: 12px;">Electronicss & Furnituress</p>
                </td>
              </tr>

              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px; font-weight: 600; text-align: center;">
                    Verify Your Email
                  </h2>

                  <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 24px; text-align: center;">
                    Hello ${fullName || 'there'}! Use the verification code below to complete your registration.
                  </p>

                  <div style="background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 0 0 30px; border: 2px solid #d1d5db;">
                    <p style="margin: 0 0 10px; color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                      Your Verification Code
                    </p>
                    <div style="font-size: 36px; font-weight: 700; color: #111827; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                      ${otp}
                    </div>
                  </div>

                  <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                    This code will expire in <strong style="color: #374151;">10 minutes</strong>.
                  </p>

                  <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                    If you didn't request this code, please ignore this email.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding: 20px 40px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #374151; font-size: 12px; font-weight: 600;">
                    © 2026 SRE LAKSHME Electronics & Furnitures. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
  };

  return transporter.sendMail(mailOptions);
}

// ==================== API ENDPOINTS ====================

/**
 * POST /api/send-otp
 * Generates and sends OTP to user's email
 */
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email, fullName, uid } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    if (!db) {
      return res.status(500).json({ success: false, message: 'Firebase not initialized' });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in Firestore (also store fullName and uid for user creation after verification)
    await db.collection('otpVerifications').doc(email).set({
      otp: otp,
      email: email,
      fullName: fullName || '',
      uid: uid || null,
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      attempts: 0
    });

    // Send email
    await sendOTPEmail(email, fullName, otp);

    console.log(`✅ OTP sent to ${email} (UID: ${uid || 'not provided'})`);
    res.json({ success: true, message: 'OTP sent successfully' });

  } catch (error) {
    console.error('❌ Error sending OTP:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ success: false, message: 'Failed to send OTP: ' + error.message });
  }
});

/**
 * POST /api/verify-otp
 * Verifies the OTP code
 */
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp, uid: requestUid } = req.body;

    console.log(`\n🔍 Verifying OTP for email: ${email}`);
    console.log(`📨 Request UID: ${requestUid || 'not provided'}`);

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    if (!db) {
      return res.status(500).json({ success: false, message: 'Firebase not initialized' });
    }

    // Get OTP record from Firestore
    const otpDocRef = db.collection('otpVerifications').doc(email);
    const otpDoc = await otpDocRef.get();

    if (!otpDoc.exists) {
      console.log(`❌ No OTP record found for ${email}`);
      return res.status(404).json({ success: false, message: 'No verification code found. Please request a new one.' });
    }

    const otpData = otpDoc.data();
    // Use UID from request if OTP record doesn't have it
    const targetUid = otpData.uid || requestUid || null;
    console.log(`📋 OTP record found - OTP UID: ${otpData.uid || 'null'}, Request UID: ${requestUid || 'null'}, Using: ${targetUid || 'null'}`);

    // Check if OTP has expired
    const expiresAt = otpData.expiresAt.toDate();
    if (new Date() > expiresAt) {
      await otpDocRef.delete();
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    }

    // Check attempts limit (max 5 attempts)
    if (otpData.attempts >= 5) {
      await otpDocRef.delete();
      return res.status(400).json({ success: false, message: 'Too many failed attempts. Please request a new code.' });
    }

    // Increment attempts
    await otpDocRef.update({ attempts: otpData.attempts + 1 });

    // Verify OTP
    if (otpData.otp !== otp) {
      const remainingAttempts = 5 - (otpData.attempts + 1);
      return res.status(400).json({ success: false, message: `Invalid code. ${remainingAttempts} attempts remaining.` });
    }

    console.log(`✅ OTP code is correct for ${email}`);

    // OTP is valid - Update user's customEmailVerified status
    const usersRef = db.collection('users');
    let userUpdated = false;

    // First, try to find user by UID (primary method - users are stored with UID as doc ID)
    if (targetUid) {
      console.log(`🔎 Looking for user document with UID: ${targetUid}`);
      const userDocRef = usersRef.doc(targetUid);
      const userDoc = await userDocRef.get();

      if (userDoc.exists) {
        console.log(`📄 Found existing user document, updating customEmailVerified...`);
        await userDocRef.update({
          customEmailVerified: true,
          emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        userUpdated = true;
        console.log(`✅ Updated user by UID: ${targetUid}`);
      } else {
        console.log(`⚠️ No user document found with UID: ${targetUid}`);
      }
    }

    // Fallback: try to find user by email query
    if (!userUpdated) {
      console.log(`🔎 Searching for user by email: ${email}`);
      const userQuery = await usersRef.where('email', '==', email).get();

      if (!userQuery.empty) {
        console.log(`📄 Found ${userQuery.size} user document(s) by email query`);

        // Update all matching documents
        for (const doc of userQuery.docs) {
          console.log(`   Updating document ID: ${doc.id}`);
          await doc.ref.update({
            customEmailVerified: true,
            emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // If document ID doesn't match the Firebase Auth UID, also create/update the correct UID document
          if (targetUid && doc.id !== targetUid) {
            console.log(`   ⚠️ Document ID (${doc.id}) doesn't match Auth UID (${targetUid})`);
            console.log(`   📋 Copying data to correct UID document...`);
            const correctDocRef = usersRef.doc(targetUid);
            const existingData = doc.data();
            await correctDocRef.set({
              ...existingData,
              uid: targetUid,
              customEmailVerified: true,
              emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log(`   ✅ Created/updated document with correct UID: ${targetUid}`);
          }
        }

        userUpdated = true;
        console.log(`✅ Updated user by email query: ${email}`);
      } else {
        console.log(`⚠️ No user document found by email query`);
      }
    }

    // If still no user found, create new user document with the UID from Firebase Auth
    if (!userUpdated) {
      const docId = targetUid || db.collection('users').doc().id;
      console.log(`📝 Creating new user document with ID: ${docId}`);
      const newUserRef = db.collection('users').doc(docId);
      await newUserRef.set({
        uid: docId,
        email: email,
        fullName: otpData.fullName || 'User',
        displayName: otpData.fullName || 'User',
        provider: 'email',
        role: 'user',
        customEmailVerified: true,
        emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Created new user document: ${docId}`);
    }

    // Delete OTP record after successful verification
    await otpDocRef.delete();

    console.log(`🎉 Email verification complete for ${email}\n`);
    res.json({ success: true, message: 'Email verified successfully' });

  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
});

/**
 * POST /api/newsletter/subscribe
 * Subscribe to newsletter and send confirmation email
 */
app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    console.log(`📧 Newsletter subscription request: ${email}`);

    // Check if already subscribed
    if (db) {
      const existingSubscriber = await db.collection('newsletterSubscribers').doc(email).get();
      if (existingSubscriber.exists) {
        console.log(`⚠️ Email already subscribed: ${email}`);
        return res.json({ success: true, message: 'You are already subscribed to our newsletter!' });
      }

      // Store subscriber in Firestore
      await db.collection('newsletterSubscribers').doc(email).set({
        email: email,
        subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
        active: true
      });
    }

    // Send confirmation email
    const mailOptions = {
      from: `"SRE LAKSHME Electronicss & Furnituress" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to SRE LAKSHME Newsletter! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="padding: 30px 40px; text-align: center; background: linear-gradient(135deg, #374151 0%, #111827 100%); border-radius: 16px 16px 0 0;">
                      <img src="https://i.pinimg.com/1200x/0c/89/cb/0c89cb3c1fdb66f6833fc6e0dfb04ba4.jpg" alt="SRE LAKSHME" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 10px; border: 3px solid #e5e7eb;">
                      <h1 style="margin: 0; color: #f9fafb; font-size: 22px; font-weight: 700;">SRE LAKSHME</h1>
                      <p style="margin: 5px 0 0; color: #d1d5db; font-size: 12px;">Electronicss & Furnituress</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px; color: #111827; font-size: 24px; font-weight: 600; text-align: center;">
                        🎉 Welcome to Our Newsletter!
                      </h2>
                      
                      <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 24px; text-align: center;">
                        Thank you for subscribing to the SRE LAKSHME newsletter! You're now part of our community.
                      </p>
                      
                      <div style="background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%); border-radius: 12px; padding: 25px; margin: 20px 0; border: 1px solid #d1d5db;">
                        <h3 style="margin: 0 0 15px; color: #374151; font-size: 18px; font-weight: 600;">What to expect:</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 24px;">
                          <li>🆕 Latest product launches & arrivals</li>
                          <li>💰 Exclusive discounts & special offers</li>
                          <li>🏷️ Early access to sales & promotions</li>
                          <li>💡 Tips & guides for home improvement</li>
                        </ul>
                      </div>
                      
                      <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; text-align: center;">
                        Stay tuned for amazing deals on electronics and furniture!
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 10px; color: #374151; font-size: 12px; font-weight: 600;">
                        © 2026 SRE LAKSHME Electronicss & Furnituress
                      </p>
                      <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                        You can unsubscribe at any time by clicking the unsubscribe link in our emails.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Newsletter confirmation sent to ${email}`);

    res.json({ success: true, message: 'Successfully subscribed! Check your email for confirmation.' });

  } catch (error) {
    console.error('❌ Error subscribing to newsletter:', error.message);
    res.status(500).json({ success: false, message: 'Failed to subscribe. Please try again.' });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    firebase: db ? 'connected' : 'not connected',
    email: process.env.EMAIL_USER ? 'configured' : 'not configured',
    cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'not configured'
  });
});

/**
 * Upload Profile Image to Cloudinary
 * POST /api/upload/profile-image
 */
app.post('/api/upload/profile-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const userId = req.body.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Upload to Cloudinary using a Promise wrapper
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `profile_photos/${userId}`,
          public_id: `profile_${Date.now()}`,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    console.log(`✅ Profile image uploaded for user ${userId}:`, uploadResult.secure_url);

    // Update user document in Firestore with the new photoURL
    if (db) {
      await db.collection('users').doc(userId).update({
        photoURL: uploadResult.secure_url,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ User ${userId} profile updated with new photo URL`);
    }

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      photoURL: uploadResult.secure_url,
      publicId: uploadResult.public_id
    });

  } catch (error) {
    console.error('❌ Error uploading profile image:', error.message);
    res.status(500).json({ success: false, message: 'Failed to upload image. Please try again.' });
  }
});

/**
 * POST /api/notify-price-drop
 * Sends email notifications to users who have the product in their wishlist when price is reduced
 */
app.post('/api/notify-price-drop', async (req, res) => {
  try {
    const { productId, productName, productImage, oldPrice, newPrice } = req.body;

    if (!productId || !productName || !oldPrice || !newPrice) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, name, old price, and new price are required'
      });
    }

    // Only send notifications if price was reduced
    if (newPrice >= oldPrice) {
      return res.json({
        success: true,
        message: 'Price was not reduced, no notifications sent',
        notifiedCount: 0
      });
    }

    if (!db) {
      return res.status(500).json({ success: false, message: 'Firebase not initialized' });
    }

    console.log(`\n📉 Price drop detected for product: ${productName}`);
    console.log(`   Old price: ₹${oldPrice} → New price: ₹${newPrice}`);

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const usersToNotify = [];

    // Check each user's wishlist for this product
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userEmail = userData.email;
      const userName = userData.fullName || userData.displayName || 'Valued Customer';

      if (!userEmail) continue;

      // Check user's wishlist subcollection
      const wishlistRef = db.collection('users').doc(userDoc.id).collection('wishlist');
      const wishlistQuery = await wishlistRef.where('productId', '==', productId).get();

      if (!wishlistQuery.empty) {
        usersToNotify.push({ email: userEmail, name: userName });
      }
    }

    console.log(`📧 Found ${usersToNotify.length} users with this product in wishlist`);

    if (usersToNotify.length === 0) {
      return res.json({
        success: true,
        message: 'No users have this product in their wishlist',
        notifiedCount: 0
      });
    }

    // Calculate savings
    const savings = oldPrice - newPrice;
    const savingsPercent = Math.round((savings / oldPrice) * 100);

    // Send emails to all affected users
    let successCount = 0;
    for (const user of usersToNotify) {
      try {
        const mailOptions = {
          from: `"SRE LAKSHME Electronicss & Furnituress" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: `🎉 Price Drop Alert! ${productName} is now ₹${newPrice.toLocaleString('en-IN')}`,
          html: `
         <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body style="margin:0; padding:0; background:#f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="padding:32px 24px; background:linear-gradient(135deg,#1f2933,#111827); text-align:center;">
              <img src="https://i.pinimg.com/1200x/0c/89/cb/0c89cb3c1fdb66f6833fc6e0dfb04ba4.jpg"
                width="72" height="72"
                style="border-radius:50%; border:3px solid #e5e7eb; object-fit:cover;">
              <h1 style="margin:12px 0 4px; color:#ffffff; font-size:22px; letter-spacing:0.5px;">
                SRE LAKSHME
              </h1>
              <p style="margin:0; color:#d1d5db; font-size:12px;">
                Electronicss & Furnituress
              </p>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
         <td style="padding:20px; background:linear-gradient(135deg,#1f2933,#111827); text-align:center;">
              <div style="font-size:36px;">🎉</div>
              <h2 style="margin:8px 0; color:#ffffff; font-size:24px;">
                Price Drop Alert!
              </h2>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 28px;">
              <p style="font-size:16px; color:#374151; margin-bottom:20px;">
                Hello <strong>${user.name}</strong>,  
                we’ve got exciting news for you 🎊
              </p>

              <!-- Product Card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f9fafb; border-radius:14px; padding:20px; border:1px solid #e5e7eb;">
                <tr>
                  <td width="100" valign="top">
                    ${productImage ?
              `<img src="${productImage}" style="width:100px;height:100px;border-radius:10px;object-fit:cover;">`
              :
              `<div style="width:100px;height:100px;border-radius:10px;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:36px;">📦</div>`
            }
                  </td>

                  <td style="padding-left:20px;">
                    <h3 style="margin:0 0 8px; font-size:18px; color:#111827;">
                      ${productName}
                    </h3>

                    <div style="font-size:15px; color:#9ca3af; text-decoration:line-through;">
                      ₹${oldPrice.toLocaleString('en-IN')}
                    </div>

                    <div style="font-size:24px; font-weight:700; color:#16a34a; margin:6px 0;">
                      ₹${newPrice.toLocaleString('en-IN')}
                    </div>

                    <span style="display:inline-block; margin-top:6px; background:#dcfce7; color:#166534;
                      padding:6px 14px; border-radius:999px; font-size:13px; font-weight:600;">
                      Save ₹${savings.toLocaleString('en-IN')} (${savingsPercent}% OFF)
                    </span>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <div style="text-align:center; margin:32px 0;">
                <a href="http://localhost:5173/products"
                  style="background:linear-gradient(135deg,#1f2933,#111827);
                  color:#ffffff; padding:14px 36px; font-size:16px;
                  font-weight:600; border-radius:10px; text-decoration:none;
                  display:inline-block;">
                  🛒 Shop Now
                </a>
              </div>

              <p style="text-align:center; font-size:14px; color:#6b7280;">
                Hurry! Limited-time price drop ⏰
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px; border-top:1px solid #e5e7eb; text-align:center;">
              <p style="margin:0; font-size:12px; color:#374151; font-weight:600;">
                © 2026 SRE LAKSHME Electronicss & Furnituress
              </p>
              <p style="margin:6px 0 0; font-size:11px; color:#9ca3af;">
                You’re receiving this because the product is in your wishlist.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>

        `
        };

        await transporter.sendMail(mailOptions);
        successCount++;
        console.log(`   ✅ Email sent to ${user.email}`);
      } catch (emailError) {
        console.error(`   ❌ Failed to send email to ${user.email}:`, emailError.message);
      }
    }

    console.log(`📧 Price drop notifications sent: ${successCount}/${usersToNotify.length}\n`);

    res.json({
      success: true,
      message: `Price drop notifications sent to ${successCount} users`,
      notifiedCount: successCount,
      totalWishlistUsers: usersToNotify.length
    });

  } catch (error) {
    console.error('❌ Error sending price drop notifications:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send notifications' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
