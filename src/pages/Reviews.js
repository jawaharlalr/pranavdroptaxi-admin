import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { FaQuoteLeft, FaRegCalendarAlt, FaSearch, FaTrash, FaEye, FaTimes,} from 'react-icons/fa';
import toast from 'react-hot-toast';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Mobile Modal State
  const [selectedReview, setSelectedReview] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch Reviews Real-time
  useEffect(() => {
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
      toast.error("Failed to load reviews");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle Delete
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this review?")) {
      try {
        await deleteDoc(doc(db, "reviews", id));
        toast.success("Review deleted");
        if (selectedReview?.id === id) closeModal();
      } catch (error) {
        toast.error("Failed to delete review");
      }
    }
  };

  const openModal = (review) => {
    setSelectedReview(review);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReview(null);
  };

  // Helper to format Date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-IN', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: true 
    });
  };

  // Filter Logic
  const filteredReviews = reviews.filter(r => 
    (r.userName || r.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.comment || r.message || r.review || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Customer Reviews</h2>
          <p className="mt-1 text-sm text-gray-400">Feedback from your passengers.</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80 group">
          <FaSearch className="absolute text-gray-500 transition-colors transform -translate-y-1/2 left-3 top-1/2 group-focus-within:text-taxi-yellow" />
          <input
            type="text"
            placeholder="Search reviews..."
            className="w-full py-2.5 pl-10 pr-4 text-white transition-all border rounded-lg shadow-lg bg-taxi-dark border-taxi-gray focus:outline-none focus:border-taxi-yellow focus:ring-1 focus:ring-taxi-yellow"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Reviews Table */}
      <div className="overflow-hidden border shadow-2xl bg-taxi-dark rounded-xl border-taxi-gray">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left">
            <thead className="text-xs tracking-wider text-gray-400 uppercase bg-black/80">
              <tr>
                <th className="w-16 px-4 py-4 md:px-6">S.No</th>
                <th className="w-1/4 px-4 py-4 md:px-6">Customer</th>
                <th className="w-1/2 px-4 py-4 md:px-6">Review</th>
                <th className="hidden w-1/4 px-6 py-4 md:table-cell">Date</th>
                <th className="px-4 py-4 text-center md:px-6">Action</th>
              </tr>
            </thead>
            <tbody className="text-gray-300 divide-y divide-taxi-gray/50">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center">
                    <div className="w-8 h-8 mx-auto border-4 rounded-full animate-spin border-taxi-yellow border-t-transparent"></div>
                  </td>
                </tr>
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-500">
                    <p>No reviews found.</p>
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review, index) => (
                  <tr key={review.id} className="align-top transition-colors hover:bg-white/5 group">
                    {/* S.No */}
                    <td className="px-4 py-6 font-mono text-xs text-gray-500 md:px-6">
                      {(index + 1).toString().padStart(2, '0')}
                    </td>

                    {/* Customer Name */}
                    <td className="px-4 py-6 md:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 font-bold text-black rounded-full bg-taxi-yellow">
                           {(review.userName || review.name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white md:text-base">
                                {review.userName || review.name || 'Anonymous'}
                            </div>
                            {/* Mobile Only Date */}
                            <div className="block text-[10px] text-gray-500 md:hidden mt-1">
                                {formatDate(review.createdAt)}
                            </div>
                        </div>
                      </div>
                    </td>

                    {/* Review Content */}
                    <td className="px-4 py-6 md:px-6">
                      <div className="relative pl-4 md:pl-6">
                        <FaQuoteLeft className="absolute top-0 left-0 text-gray-600 opacity-30" size={12} />
                        <p className="text-xs italic leading-relaxed text-gray-300 line-clamp-2 md:text-sm md:line-clamp-none">
                          "{review.comment || review.message || review.review || 'No written comment provided.'}"
                        </p>
                      </div>
                    </td>

                    {/* Date & Time (Desktop) */}
                    <td className="hidden px-6 py-6 md:table-cell">
                      <div className="flex items-center text-sm text-gray-400">
                        <FaRegCalendarAlt className="mr-2 text-taxi-yellow" />
                        {formatDate(review.createdAt)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-6 text-center md:px-6">
                        <div className="flex justify-center gap-3">
                            {/* View Button (Mobile Only) */}
                            <button 
                                onClick={() => openModal(review)}
                                className="p-2 text-blue-400 rounded-full bg-blue-500/10 hover:bg-blue-500/20 md:hidden"
                            >
                                <FaEye />
                            </button>
                            
                            {/* Delete Button */}
                            <button 
                                onClick={() => handleDelete(review.id)}
                                className="p-2 text-red-500 transition-colors rounded-full bg-red-500/10 hover:bg-red-500/20"
                                title="Delete Review"
                            >
                                <FaTrash size={14} />
                            </button>
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
          <span>Showing {filteredReviews.length} reviews</span>
          <span>Pranav Drop Taxi Admin</span>
        </div>
      </div>

      {/* --- MOBILE MODAL --- */}
      {isModalOpen && selectedReview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm md:hidden">
          <div className="flex flex-col w-full max-h-[80vh] bg-[#121212] border border-taxi-yellow/20 rounded-2xl shadow-2xl overflow-hidden relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#1a1a1a]">
              <h3 className="text-lg font-bold text-white">Full Review</h3>
              <button onClick={closeModal} className="p-2 text-gray-400 bg-gray-800 rounded-full hover:text-white">
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center justify-center w-12 h-12 text-xl font-bold text-black rounded-full bg-taxi-yellow">
                        {(selectedReview.userName || selectedReview.name || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-white">{selectedReview.userName || selectedReview.name || 'Anonymous'}</h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <FaRegCalendarAlt className="text-taxi-yellow"/>
                            {formatDate(selectedReview.createdAt)}
                        </div>
                    </div>
                </div>

                <div className="p-4 border border-gray-700 rounded-xl bg-gray-800/50">
                    <FaQuoteLeft className="mb-2 text-gray-500 opacity-50"/>
                    <p className="text-sm italic leading-relaxed text-gray-200">
                        {selectedReview.comment || selectedReview.message || selectedReview.review}
                    </p>
                </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-800 bg-[#1a1a1a]">
                <button 
                    onClick={() => handleDelete(selectedReview.id)}
                    className="flex items-center justify-center w-full gap-2 py-3 text-sm font-bold text-red-500 transition-colors bg-red-500/10 rounded-xl hover:bg-red-500/20"
                >
                    <FaTrash /> Delete Review
                </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Reviews;