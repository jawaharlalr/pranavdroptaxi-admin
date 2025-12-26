const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
admin.initializeApp();

// Trigger when a new document is created in 'bookings'
exports.sendNewBookingNotification = functions.firestore
  .document("bookings/{bookingId}")
  .onCreate(async (snap, context) => {
    const booking = snap.data();

    const source = booking.source?.displayName || "Unknown";
    const dest = booking.destination?.displayName || "Unknown";
    const customerName = booking.name || "Customer";

    // 1. Get all Admin Tokens from Firestore
    const tokensSnapshot = await admin.firestore().collection("admin_tokens").get();

    if (tokensSnapshot.empty) {
      console.log("No admin tokens found.");
      return null;
    }

    // Extract just the token strings
    // Filter out any undefined/null tokens to prevent errors
    const tokens = tokensSnapshot.docs
      .map((doc) => doc.data().token)
      .filter((token) => token);

    if (tokens.length === 0) {
      console.log("No valid tokens found.");
      return null;
    }

    // 2. Prepare the Message for the New API (Multicast)
    const message = {
      tokens: tokens, // The array of device tokens
      notification: {
        title: "🚖 New Booking Received!",
        body: `${customerName} booked a trip from ${source} to ${dest}.`,
      },
      webpush: {
        notification: {
          icon: "https://pranavdroptaxiadmin.vercel.app/logo.png",
          click_action: "https://pranavdroptaxiadmin.vercel.app/bookings"
        },
        fcm_options: {
          link: "https://pranavdroptaxiadmin.vercel.app/bookings"
        }
      }
    };

    // 3. Send Notification using the modern API
    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log("Notifications sent. Success:", response.successCount, "Failure:", response.failureCount);

      // Optional: Log errors for invalid tokens
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`Failed to send to token: ${tokens[idx]}`, resp.error);
          }
        });
      }
    } catch (error) {
      console.error("Error sending notifications:", error);
    }

    return null;
  });