import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { FaQuoteLeft, FaRegCalendarAlt } from 'react-icons/fa';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Reviews Real-time
  useEffect(() => {
    // Ensure your 'reviews' collection has a 'createdAt' field
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReviews(reviewsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching reviews:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper to format Date & Time
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-IN', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: true 
    });
  };

  return (
    <div className="space-y-6">
      {/* Styles for hiding scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header */}
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Customer Reviews</h2>
          <p className="mt-1 text-gray-400">Feedback from your passengers.</p>
        </div>
        <div className="px-4 py-2 text-sm text-gray-300 border rounded-lg bg-taxi-dark border-taxi-gray">
          Total Reviews: <span className="ml-1 text-lg font-bold text-taxi-yellow">{reviews.length}</span>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="overflow-hidden border shadow-2xl bg-taxi-dark rounded-xl border-taxi-gray">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left">
            <thead className="text-xs tracking-wider text-gray-400 uppercase bg-black/80">
              <tr>
                <th className="w-16 px-6 py-4">S.No</th>
                <th className="w-1/4 px-6 py-4">Customer</th>
                <th className="w-1/2 px-6 py-4">Review</th>
                <th className="w-1/4 px-6 py-4">Date & Time</th>
              </tr>
            </thead>
            <tbody className="text-gray-300 divide-y divide-taxi-gray/50">
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center">
                    <div className="w-8 h-8 mx-auto border-4 rounded-full animate-spin border-taxi-yellow border-t-transparent"></div>
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-gray-500">
                    <p>No reviews found yet.</p>
                  </td>
                </tr>
              ) : (
                reviews.map((review, index) => (
                  <tr key={review.id} className="align-top transition-colors hover:bg-white/5 group">
                    {/* S.No */}
                    <td className="px-6 py-6 font-mono text-gray-500">
                      {(index + 1).toString().padStart(2, '0')}
                    </td>

                    {/* Customer Name */}
                    <td className="px-6 py-6">
                      <div className="mb-1 text-lg font-bold text-white">
                        {review.userName || review.name || 'Anonymous'}
                      </div>
                    </td>

                    {/* Review Content */}
                    <td className="px-6 py-6">
                      <div className="relative pl-6">
                        <FaQuoteLeft className="absolute top-0 left-0 text-gray-600 opacity-30" size={14} />
                        <p className="italic leading-relaxed text-gray-300">
                          "{review.comment || review.message || review.review || 'No written comment provided.'}"
                        </p>
                      </div>
                    </td>

                    {/* Date & Time */}
                    <td className="px-6 py-6">
                      <div className="flex items-center text-sm text-gray-400">
                        <FaRegCalendarAlt className="mr-2 text-taxi-yellow" />
                        {formatDate(review.createdAt)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex justify-between px-6 py-4 text-xs text-gray-500 border-t border-taxi-gray bg-black/40">
          <span>Pranav Drop Taxi Admin Panel</span>
          <span>Verified Feedback</span>
        </div>
      </div>
    </div>
  );
};

export default Reviews;