import React from 'react';
import { X, Trophy } from 'lucide-react';

const BestSellingModal = ({ isOpen, onClose, products }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#202028] rounded-2xl w-full max-w-lg shadow-2xl border border-gray-700/50 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-bold">Sản phẩm bán chạy nhất</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
          {products && products.length > 0 ? (
            <div className="space-y-4">
              {products.map((product, index) => (
                <div key={product._id} className="flex items-center gap-4 bg-[#151419] p-3 rounded-xl border border-gray-800/50">
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center font-bold text-gray-300 shrink-0">
                    #{index + 1}
                  </div>
                  <img 
                    src={product.imageUrl || 'https://via.placeholder.com/150'} 
                    alt={product.name} 
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{product.name}</h3>
                    <p className="text-[#00c9a7] text-sm font-semibold">{product.price.toLocaleString('vi-VN')} ₫</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">Đã bán</p>
                    <p className="text-white font-bold">{product.sold}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              Chưa có dữ liệu sản phẩm bán chạy.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BestSellingModal;
