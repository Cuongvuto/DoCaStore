import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0); // Tự động cuộn lên đầu trang mỗi khi đổi link
  }, [pathname]);

  return null;
};

export default ScrollToTop;