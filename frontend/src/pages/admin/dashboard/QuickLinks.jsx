import React, { useState } from 'react';
import { Target, Trophy, Package, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BestSellingModal from './BestSellingModal';

const QuickLinks = ({ bestSellingProducts }) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const links = [
    {
      id: 1,
      title: 'Mục tiêu',
      icon: Target,
      iconColor: 'text-[#e06287]',
      iconBg: 'bg-[#e06287]/20',
      action: () => {} 
    },
    {
      id: 2,
      title: 'Sản phẩm bán chạy',
      icon: Trophy,
      iconColor: 'text-[#4c74f9]',
      iconBg: 'bg-[#4c74f9]/20',
      action: () => setIsModalOpen(true)
    },
    {
      id: 3,
      title: 'Quản lý sản phẩm',
      icon: Package,
      iconColor: 'text-[#00c9a7]',
      iconBg: 'bg-[#00c9a7]/20',
      action: () => navigate('/admin/products')
    }
  ];

  return (
    <>
      <div className="bg-[#202028] rounded-xl p-5 h-full flex flex-col">
        <h2 className="text-xl font-bold text-white mb-6 shrink-0">Liên kết nhanh</h2>
        <div className="flex-1 flex flex-col justify-around">
          {links.map((link) => (
            <div 
              key={link.id} 
              onClick={link.action}
              className="flex items-center justify-between group cursor-pointer p-3 -mx-3 rounded-xl hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${link.iconBg}`}>
                  <link.icon className={`w-6 h-6 ${link.iconColor}`} />
                </div>
                <span className="font-medium text-gray-200 group-hover:text-white transition-colors text-lg">
                  {link.title}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center text-gray-400 group-hover:bg-gray-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <BestSellingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        products={bestSellingProducts} 
      />
    </>
  );
};

export default QuickLinks;
