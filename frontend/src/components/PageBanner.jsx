import React from 'react';
import { Link } from 'react-router-dom';

const PageBanner = ({ title, breadcrumbs }) => {
  return (
  <div 
  className="mt-[0px] relative w-full h-[160px] md:h-[240px] flex items-center justify-center bg-contain bg-center bg-no-repeat overflow-hidden" 
  style={{ backgroundImage: "url('/banner2.jpg')" }}
>
      {/* Lớp phủ mờ (overlay) */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Nội dung Banner */}
      <div className="relative z-10 flex flex-col items-center justify-center text-white px-4 text-center w-full max-w-5xl">
        
        {/* Tiêu đề */}
        <h1 className="text-2xl md:text-4xl font-black mb-3 md:mb-4 tracking-wide uppercase banner-title-animate text-shadow-md">
          {title}
        </h1>

        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center justify-center gap-2 text-xs md:text-sm font-medium banner-breadcrumb-animate">
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              {item.link ? (
                <Link to={item.link} className="hover:text-[#699a82] transition-colors drop-shadow">
                  {item.name}
                </Link>
              ) : (
                <span className="text-gray-200 drop-shadow">{item.name}</span>
              )}
              
              {index < breadcrumbs.length - 1 && (
                <span className="text-white text-[10px] md:text-xs mx-1">❯</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes slideDownFading {
          0% { opacity: 0; transform: translateY(-30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideUpFading {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .banner-title-animate {
          animation: slideDownFading 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        .banner-breadcrumb-animate {
          animation: slideUpFading 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          animation-delay: 0.2s;
          opacity: 0; 
        }
        
        .text-shadow-md {
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
};

export default PageBanner;