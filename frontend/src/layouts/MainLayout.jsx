import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import RouteErrorBoundary from '../components/RouteErrorBoundary';

const AIChatBot = lazy(() => import('../components/AIChatBot'));

const MainLayout = () => {
  const [showAssistant, setShowAssistant] = useState(false);

  useEffect(() => {
    const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 1200));
    const cancel = window.cancelIdleCallback || window.clearTimeout;
    const id = schedule(() => setShowAssistant(true));
    return () => cancel(id);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow bg-gray-50">
        <RouteErrorBoundary><Outlet /></RouteErrorBoundary>
      </main>
      <Footer />
      {showAssistant && (
        <Suspense fallback={null}>
          <AIChatBot />
        </Suspense>
      )}
    </div>
  );
};

export default MainLayout;
