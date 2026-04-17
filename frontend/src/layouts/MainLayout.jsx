import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const MainLayout = () => {
  return (
    // min-h-screen giúp toàn bộ web luôn cao ít nhất bằng 100% màn hình
    // flex-col để xếp dọc Header -> Main -> Footer
    <div className="flex flex-col min-h-screen">
      
      {/* 1. HEADER CHUẨN */}
      <Header />

      {/* 2. NỘI DUNG ĐỘNG (Nơi các trang khác hiển thị vào) */}
      {/* flex-grow sẽ đẩy Footer xuống đáy nếu nội dung main quá ngắn */}
      <main className="flex-grow bg-gray-50">
        <Outlet /> 
      </main>

      {/* 3. FOOTER CHUẨN */}
      <Footer />
      
    </div>
  );
};

export default MainLayout;