import Pagination from '../components/Pagination';
import React, { useState, useEffect } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { ChevronRight, Search, Filter } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import ProductCard from '../components/ProductCard';
import OceanHero from '../components/OceanHero';
import useDebouncedValue from '../hooks/useDebouncedValue';
import './StoreInfo.css';
import './ProductPage.css';

const ProductPage = () => {
  const { openAssistant } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('search') || '';
  const requestedSort = searchParams.get('sort');
  const sortOrder = ['price_asc', 'price_desc'].includes(requestedSort) ? requestedSort : 'default';
  const requestedPage = Number(searchParams.get('page'));
  const currentPage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const productsPerPage = 15;

  const debouncedSearch = useDebouncedValue(searchTerm, 350);
  const isSearching = searchTerm !== debouncedSearch;

  const updateFilters = (changes, replace = false) => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      Object.entries(changes).forEach(([key, value]) => {
        if (value) next.set(key, String(value));
        else next.delete(key);
      });
      return next;
    }, { replace, preventScrollReset: true });
  };

  // Lấy dữ liệu từ API
  useEffect(() => {
    if (searchTerm !== debouncedSearch) return;
    const controller = new AbortController();
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await axiosClient.get('/product', {
          params: {
            page: currentPage,
            limit: productsPerPage,
            search: debouncedSearch || undefined,
            sort: sortOrder === 'default' ? undefined : sortOrder
          },
          signal: controller.signal
        });
        setProducts(response.data.data || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalCount(response.data.totalCount || 0);
      } catch (error) {
        if (error.code !== 'ERR_CANCELED' && !controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void fetchProducts();
    return () => controller.abort();
  }, [currentPage, debouncedSearch, searchTerm, sortOrder, retry]);

  const handlePageChange = (pageNumber) => {
    updateFilters({ page: pageNumber > 1 ? pageNumber : null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="product-catalog-page min-h-screen bg-gray-50 pb-20">
      
      <OceanHero className="product-catalog-hero">
        <div className="store-info-container">
          <nav className="store-info-breadcrumb" aria-label="Đường dẫn">
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span aria-current="page">Sản phẩm</span>
          </nav>
          <p className="store-info-eyebrow">KHÁM PHÁ ĐỒ CÂU DOCASTORE</p>
          <h1>Tất cả sản phẩm<br /><span>Cho mỗi chuyến đi câu.</span></h1>
          <p className="store-info-lead">Tìm cần câu, máy câu và phụ kiện phù hợp với cách câu của bạn.</p>
        </div>
      </OceanHero>

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-8 lg:px-8">
        
        {/* --- THANH TÌM KIẾM VÀ SẮP XẾP --- */}
        <div className="mb-4 flex flex-col items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:mb-8 sm:gap-4 sm:p-4 md:flex-row">
          
          {/* Ô Tìm Kiếm */}
          <div className="w-full md:w-96">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="products-search" className="text-sm font-semibold text-brand-700">Tìm sản phẩm</label>
              <button type="button" onClick={openAssistant} className="text-xs font-semibold text-brand-700 underline underline-offset-2 lg:hidden">Hỏi trợ lý</button>
            </div>
            <div className="relative">
            <input 
              id="products-search"
              name="product-search"
              type="search"
              placeholder="Ví dụ: cần câu, máy câu…"
              value={searchTerm}
              onChange={(e) => {
                updateFilters({ search: e.target.value, page: null }, true);
              }}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm font-medium focus:border-brand-700"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} aria-hidden="true" />
            </div>
          </div>

          {/* Ô Sắp Xếp */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter size={20} className="mt-6 hidden text-gray-400 md:block" aria-hidden="true" />
            <div className="w-full md:w-auto"><label htmlFor="products-sort" className="mb-2 block text-sm font-semibold text-brand-700">Sắp xếp</label>
            <select 
              id="products-sort"
              name="product-sort"
              value={sortOrder}
              onChange={(e) => {
                updateFilters({ sort: e.target.value === 'default' ? null : e.target.value, page: null });
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

        {/* --- HIỂN THỊ DANH SÁCH SẢN PHẨM --- */}
        {!loading && !isSearching && !error && totalCount > 0 ? (
          <p className="text-gray-500 mb-4 text-sm font-medium">
            Tìm thấy <strong className="text-brand-700">{totalCount}</strong> sản phẩm phù hợp
          </p>
        ) : null}

        <div className="grid min-h-60 grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4" aria-busy={loading || isSearching}>
          {loading || isSearching ? <><span className="sr-only" role="status">Đang tải sản phẩm…</span>{Array.from({ length: 10 }, (_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-xl bg-brand-100" aria-hidden="true" />)}</> : error ? (
            <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-brand-200 bg-white p-8 text-center text-brand-700" role="alert"><p>Chưa tải được danh sách sản phẩm.</p><button type="button" onClick={() => setRetry(value => value + 1)} className="rounded-lg bg-brand-700 px-5 py-3 font-semibold text-white hover:bg-brand-800">Thử lại</button></div>
          ) : products.length > 0 ? (
            products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">
              <Search size={48} className="text-gray-200 mb-4" />
              <p className="text-lg font-medium">Không tìm thấy sản phẩm phù hợp.</p>
              {searchTerm && <button
                onClick={() => updateFilters({ search: null, page: null })}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Xóa tìm kiếm
              </button>}
            </div>
          )}
        </div>

        {/* --- THANH PHÂN TRANG --- */}
        {!loading && !isSearching && !error && <Pagination currentPage={currentPage} totalPages={totalPages} onChange={handlePageChange} label="Phân trang sản phẩm" />}
      </div>
    </div>
  );
};

export default ProductPage;
