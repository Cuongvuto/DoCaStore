import React from 'react';
import { Star } from 'lucide-react';

const CustomerFeedback = ({ feedbacks }) => {
  return (
    <div className="bg-[#202028] rounded-xl p-5 h-[350px] xl:h-[450px] flex flex-col">
      <h2 className="text-xl font-bold text-white mb-6 shrink-0">Đánh giá của khách hàng</h2>
      <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
        <div className="space-y-6">
          {feedbacks && feedbacks.length > 0 ? feedbacks.map((item, index) => (
            <div key={item._id} className={index !== feedbacks.length - 1 ? "border-b border-gray-800 pb-6" : ""}>
              <div className="flex items-center gap-3 mb-3">
                <img src={item.userId?.avatar || `https://ui-avatars.com/api/?name=${item.userId?.name || 'User'}&background=random`} alt={item.userId?.name || 'User'} className="w-10 h-10 rounded-full object-cover" />
                <span className="font-semibold text-gray-200">{item.userId?.name || 'Khách hàng'}</span>
              </div>
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${i < item.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-gray-600'}`} 
                  />
                ))}
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                {item.comment}
              </p>
            </div>
          )) : (
            <p className="text-center py-6 text-gray-500">Chưa có đánh giá nào gần đây.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerFeedback;
