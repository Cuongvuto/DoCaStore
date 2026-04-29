import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AIChatBot from '../components/AIChatBot';

const MainLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow bg-gray-50">
        <Outlet /> 
      </main>
      <Footer />
      <AIChatBot />
    </div>
  );
};

export default MainLayout;