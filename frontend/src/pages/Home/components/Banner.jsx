import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import axiosClient from '../../../api/axiosClient';

const Banner = () => {
  const [banners, setBanners] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const defaultBanner = [
    {
      _id: 'default-1',
      imageUrl: 'https://images.unsplash.com/photo-1544321285-b91c06d0937a?q=80&w=1920&auto=format&fit=crop',
      title: 'Chinh Phục Mọi Thủy Vực',
      description: 'Cung cấp thiết bị câu cá chính hãng, chất lượng cao dành cho các cần thủ chuyên nghiệp và đam mê dã ngoại.',
      link: '/products'
    }
  ];

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await axiosClient.get('/banners');
        const fetchedBanners = res.data?.data || res.data || [];
        
        if (fetchedBanners.length > 0) {
          setBanners(fetchedBanners);
        } else {
          setBanners(defaultBanner);
        }
      } catch (error) {
        console.error('Lỗi lấy banner:', error);
        setBanners(defaultBanner);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
    }, 5000);
    
    return () => clearInterval(timer);
  }, [banners.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  if (isLoading) {
    return <div className="h-[500px] w-full bg-slate-200 animate-pulse flex items-center justify-center text-slate-500">Đang tải banner...</div>;
  }

  return (
    <section className="relative w-full h-[500px] overflow-hidden group bg-gray-900">
      
      {/* 🟢 KHUNG TRƯỢT (SLIDER TRACK): Chứa tất cả banner nằm ngang */}
      <div 
        className="flex w-full h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {banners.map((banner, index) => (
          <div
            key={banner._id || index}
            className="min-w-full relative h-full flex items-center"
            style={{ 
              backgroundImage: `url('${banner.imageUrl || banner.image}')`, 
              backgroundSize: 'cover', 
              backgroundPosition: 'center' 
            }}
          >
            {/* Lớp phủ đen */}
            <div className="absolute inset-0 bg-black/50"></div>
            
            {/* Nội dung chữ - 🟢 CÓ HIỆU ỨNG BAY VÀO DỰA THEO currentSlide */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <h1 
                className={`text-4xl md:text-6xl font-bold mb-4 uppercase tracking-wide drop-shadow-lg text-white transition-all duration-700 ease-out transform ${
                  index === currentSlide ? 'translate-y-0 opacity-100 delay-300' : 'translate-y-10 opacity-0'
                }`}
              >
                {banner.title || 'Chinh Phục Thủy Vực'}
              </h1>
              
              <p 
                className={`text-lg md:text-xl mb-8 max-w-2xl drop-shadow-md text-gray-200 transition-all duration-700 ease-out transform ${
                  index === currentSlide ? 'translate-y-0 opacity-100 delay-500' : 'translate-y-10 opacity-0'
                }`}
              >
                {banner.description || 'Thiết bị câu cá chính hãng dành cho cần thủ chuyên nghiệp.'}
              </p>
              
              <div 
                className={`transition-all duration-700 ease-out transform ${
                  index === currentSlide ? 'translate-y-0 opacity-100 delay-700' : 'translate-y-10 opacity-0'
                }`}
              >
                <Link 
                  to={banner.linkUrl || banner.link || '/products'} 
                  className="inline-block bg-[#5a8c76] hover:bg-[#4a7562] text-white font-bold py-3 px-8 rounded-md transition-all duration-300 hover:scale-105 shadow-lg text-lg"
                >
                  MUA SẮM NGAY
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nút điều hướng */}
      {banners.length > 1 && (
        <>
          <button 
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
          >
            <ChevronLeft size={28} />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
          >
            <ChevronRight size={28} />
          </button>
          
          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'bg-[#5a8c76] w-8' : 'bg-white/50 w-2.5 hover:bg-white'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              ></button>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default Banner;