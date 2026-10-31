import Pagination from '../components/Pagination';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import ProductCard from '../components/ProductCard';
import useDebouncedValue from '../hooks/useDebouncedValue';

const CategoryPage = () => {
  const { slug } = useParams(); // Nhận slug (hoặc ID) từ URL
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryName, setCategoryName] = useState('Danh Mục Sản Phẩm');
  const productsPerPage = 15;

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('default');
  const debouncedSearch = useDebouncedValue(searchTerm, 350);

  // --- GỌI API THEO HÀM MỚI ---
  useEffect(() => {
    const controller = new AbortController();
    const fetchCategoryProducts = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await axiosClient.get(`/product/category/${slug}`, {
          params: {
            page: currentPage,
            limit: productsPerPage,
            search: debouncedSearch || undefined,
            sort: sortOrder === 'default' ? undefined : sortOrder
          },
          signal: controller.signal
        });
        setProducts(response.data?.data || []);
        setTotalPages(response.data?.totalPages || 1);
        setTotalCount(response.data?.totalCount || 0);
        setCategoryName(response.data?.category?.name || 'Danh Mục Sản Phẩm');
      } catch (error) {
        if (error.code !== 'ERR_CANCELED' && !controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    
    if (slug) {
      void fetchCategoryProducts();
    }
    return () => controller.abort();
  }, [slug, currentPage, debouncedSearch, sortOrder, retry]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      
      {/* --- BANNER --- */}
      <div 
        className="relative bg-brand-700 py-16 mb-8 shadow-inner bg-cover bg-center"
        style={{ backgroundImage: "url('/banner-bg.jpg')" }} 
      >
        <div className="absolute inset-0 bg-black/50"></div> 
        <div className="relative max-w-7xl mx-auto px-4 text-center z-10">
          <h1 className="text-4xl font-black text-white uppercase tracking-[0.2em] drop-shadow-lg">
            {categoryName}
          </h1>
          <div className="h-1.5 w-24 bg-sand-400 mx-auto mt-5 rounded-full shadow-md"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* --- THANH TÌM KIẾM & SẮP XẾP --- */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <div className="w-full md:w-96">
            <label htmlFor="category-search" className="mb-2 block text-sm font-semibold text-brand-700">Tìm trong danh mục</label>
            <div className="relative">
            <input 
              id="category-search"
              name="category-search"
              type="search"
              placeholder="Ví dụ: cần câu, máy câu…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm font-medium focus:border-brand-700"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} aria-hidden="true" />
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter size={20} className="mt-6 hidden text-gray-400 md:block" aria-hidden="true" />
            <div className="w-full md:w-auto"><label htmlFor="category-sort" className="mb-2 block text-sm font-semibold text-brand-700">Sắp xếp</label>
            <select 
              id="category-sort"
              name="category-sort"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 focus:border-brand-700 md:w-auto"
            >
              <option value="default">Mới nhất / Mặc định</option>
              <option value="price_asc">Giá: Thấp đến Cao</option>
              <option value="price_desc">Giá: Cao đến Thấp</option>
            </select>
            </div>
          </div>
        </div>

        {/* --- KẾT QUẢ SẢN PHẨM --- */}
        {!loading && !error && totalCount > 0 ? (
          <p className="text-gray-500 mb-4 text-sm font-medium">
            Tìm thấy <strong className="text-brand-700">{totalCount}</strong> sản phẩm
          </p>
        ) : null}

        <div className="grid min-h-60 grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5" aria-busy={loading}>
          {loading ? <><span className="sr-only" role="status">Đang tải sản phẩm…</span>{Array.from({ length: 10 }, (_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-xl bg-brand-100" aria-hidden="true" />)}</> : error ? (
            <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-brand-200 bg-white p-8 text-center text-brand-700" role="alert"><p>Chưa tải được sản phẩm trong danh mục này.</p><button type="button" onClick={() => setRetry(value => value + 1)} className="rounded-lg bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800">Thử lại</button></div>
          ) : products.length > 0 ? (
            products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">
              <Search size={48} className="text-gray-200 mb-4" />
              <p className="text-lg font-medium">Chưa có sản phẩm phù hợp trong danh mục này.</p>
              {searchTerm && <button type="button" onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="mt-4 rounded-lg bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800">Xóa tìm kiếm</button>}
            </div>
          )}
        </div>

        {/* --- PHÂN TRANG --- */}
        {!loading && !error && <Pagination currentPage={currentPage} totalPages={totalPages} onChange={handlePageChange} label="Phân trang danh mục" />}
      </div>
    </div>
  );
};

export default CategoryPage;
