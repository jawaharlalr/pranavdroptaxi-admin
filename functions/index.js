const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
admin.initializeApp();

exports.sendNewBookingNotification = functions.firestore
  .document("bookings/{bookingId}")
  .onCreate(async (snap, context) => {
    const booking = snap.data();

    const source = booking.source?.displayName || "Unknown";
    const dest = booking.destination?.displayName || "Unknown";
    const customerName = booking.name || "Customer";

    let dateInfo = "";
    if (booking.date) {
      const d = booking.date.toDate ? booking.date.toDate() : new Date(booking.date);
      dateInfo = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }

    if (booking.returnDate) {
      const rd = booking.returnDate.toDate ? booking.returnDate.toDate() : new Date(booking.returnDate);
      dateInfo += ` to ${rd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
    }

    const tokensSnapshot = await admin.firestore().collection("admin_tokens").get();

    if (tokensSnapshot.empty) return null;

    const tokens = tokensSnapshot.docs
      .map((doc) => doc.data().token)
      .filter((token) => token);

    if (tokens.length === 0) return null;

    const message = {
      tokens: tokens,
      notification: {
        title: "🚖 New Booking Received!",
        body: `${customerName} • ${dateInfo}\n${source} ➝ ${dest}`,
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

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error.code === 'messaging/registration-token-not-registered') {
            failedTokens.push(tokens[idx]);
          }
        });

        if (failedTokens.length > 0) {
          const snapshot = await admin.firestore().collection("admin_tokens").where("token", "in", failedTokens).get();
          const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
          await Promise.all(deletePromises);
        }
      }
    } catch (error) {
      console.error("Error sending notifications:", error);
    }

    return null;
  });