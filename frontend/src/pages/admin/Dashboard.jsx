import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import StatCards from './dashboard/StatCards';
import NetProfit from './dashboard/NetProfit';
import ActivityChart from './dashboard/ActivityChart';
import QuickLinks from './dashboard/QuickLinks';
import RecentOrders from './dashboard/RecentOrders';
import CustomerFeedback from './dashboard/CustomerFeedback';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axiosClient.get('/dashboard/overview');
        if (response.data && response.data.success) {
          setDashboardData(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading || !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[600px] text-white space-y-4">
        <div className="w-12 h-12 border-4 border-[#7294ff] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-medium">Đang tải dữ liệu Bảng Điều Khiển...</p>
      </div>
    );
  }

  return (
    <div className="w-full text-white pb-10">
      <h1 className="text-2xl font-bold mb-6">Bảng Điều Khiển</h1>
      
      {/* Top Grid: Stats and Net Profit */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2">
          <StatCards stats={dashboardData.stats} />
        </div>
        <div className="xl:col-span-1">
          <NetProfit goal={dashboardData.goal} />
        </div>
      </div>

      {/* Middle Grid: Activity and Quick Links */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2">
          <ActivityChart data={dashboardData.activityData} />
        </div>
        <div className="xl:col-span-1 h-[350px]">
          <QuickLinks bestSellingProducts={dashboardData.bestSellingProducts} />
        </div>
      </div>

      {/* Bottom Grid: Recent Orders and Feedback */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <RecentOrders orders={dashboardData.recentOrders} />
        </div>
        <div className="xl:col-span-1">
          <CustomerFeedback feedbacks={dashboardData.recentReviews} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
