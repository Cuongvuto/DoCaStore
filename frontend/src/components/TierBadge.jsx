import React from 'react';
import { Sprout, Star, Medal, Trophy, Crown } from 'lucide-react';

const TierBadge = ({ tier = 'newbie' }) => {
  const tierConfigs = {
    newbie: {
      label: 'Thành viên mới',
      icon: <Sprout size={16} />,
      bgClass: 'bg-green-100',
      textClass: 'text-green-700',
      borderClass: 'border-green-200'
    },
    normal: {
      label: 'Thành viên chuẩn',
      icon: <Star size={16} />,
      bgClass: 'bg-blue-100',
      textClass: 'text-blue-700',
      borderClass: 'border-blue-200'
    },
    silver: {
      label: 'Thành viên Bạc',
      icon: <Medal size={16} />,
      bgClass: 'bg-gray-200',
      textClass: 'text-gray-700',
      borderClass: 'border-gray-300'
    },
    gold: {
      label: 'Thành viên Vàng',
      icon: <Trophy size={16} />,
      bgClass: 'bg-yellow-100',
      textClass: 'text-yellow-700',
      borderClass: 'border-yellow-300'
    },
    vip: {
      label: 'Khách hàng VIP',
      icon: <Crown size={16} />,
      bgClass: 'bg-purple-100',
      textClass: 'text-purple-700',
      borderClass: 'border-purple-300'
    }
  };

  const currentTier = tierConfigs[tier?.toLowerCase()] || tierConfigs.newbie;

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${currentTier.bgClass} ${currentTier.textClass} ${currentTier.borderClass} shadow-sm w-max transition-all hover:scale-105 cursor-default`}>
      {currentTier.icon}
      <span className="font-bold text-xs">{currentTier.label}</span>
    </div>
  );
};

export default TierBadge;