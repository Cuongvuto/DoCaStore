import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import RouteErrorBoundary from '../components/RouteErrorBoundary';

const AIChatBot = lazy(() => import('../components/AIChatBot'));

const MainLayout = () => {
  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantOpenRequest, setAssistantOpenRequest] = useState(0);

  const openAssistant = () => {
    setShowAssistant(true);
    setAssistantOpenRequest(value => value + 1);
  };

  useEffect(() => {
    const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 1200));
    const cancel = window.cancelIdleCallback || window.clearTimeout;
    const id = schedule(() => setShowAssistant(true));
    return () => cancel(id);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-700 focus:px-4 focus:py-3 focus:font-semibold focus:text-white">Bỏ qua điều hướng đến nội dung</a>
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-grow bg-gray-50">
        <RouteErrorBoundary><Outlet context={{ openAssistant }} /></RouteErrorBoundary>
      </main>
      <Footer />
      {showAssistant && (
        <Suspense fallback={null}>
          <AIChatBot openRequest={assistantOpenRequest} />
        </Suspense>
      )}
    </div>
  );
};

export default MainLayout;
