import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { QRCodeCanvas } from "qrcode.react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Container,
  CircularProgress,
  Fade,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";

const PaymentPage = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [isCancelling, setIsCancelling] = useState(false);

  // 1. LẤY DỮ LIỆU TỪ STATE
  const { qrCode, amount, orderCode } = location.state || {};

  // 2. LOGIC SOCKET.IO
  useEffect(() => {
    if (!qrCode) {
      navigate("/");
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";
    const socket = io(socketUrl, {
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("🟢 Connected to Socket:", socket.id);
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const currentUser = JSON.parse(userStr);
          const userId = currentUser?._id || currentUser?.id;
          if (userId) {
            socket.emit("registerUser", userId);
            console.log(`📝 Đã đăng ký User: ${userId}`);
          }
        }
      } catch (e) {
        console.error("Lỗi parse user:", e);
      }
    });

    socket.on("payment_success", (data) => {
      if (String(data.orderId) === String(orderId) || String(data.orderCode) === String(orderCode)) {
        setPaymentStatus("success");
        toast.success("Thanh toán thành công!");
        socket.disconnect();
        setTimeout(() => navigate(`/order-success/${orderId}`), 2000);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId, qrCode, orderCode, navigate]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setOpenSnackbar(true);
  };

  const handleGoHomeAndCancel = async () => {
    if (paymentStatus === "pending") {
      const confirmLeave = window.confirm(
        "Bạn chưa thanh toán. Rời khỏi trang này đơn hàng sẽ bị hủy. Tiếp tục?"
      );
      if (!confirmLeave) return;

      setIsCancelling(true);
      try {
        await axiosClient.put(`/orders/${orderId}/cancel`);
        toast.info("Đơn hàng đã hủy.");
      } catch (error) {
        console.error("Lỗi hủy đơn:", error);
      } finally {
        setIsCancelling(false);
        navigate("/");
      }
    } else {
      navigate("/");
    }
  };

  const InfoRow = ({ label, value, copyable }) => (
    <Stack
      direction="row"
      sx={{
        justifyContent: "space-between",
        alignItems: "center",
        py: 1.8,
        borderBottom: "1px dashed #e0e0e0",
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: "500" }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography variant="subtitle2" color="text.primary" sx={{ fontWeight: "700" }}>
          {value}
        </Typography>
        {copyable && (
          <Tooltip title="Sao chép" placement="top" arrow>
            <IconButton
              size="small"
              onClick={() => handleCopy(value)}
              sx={{
                color: "primary.main",
                bgcolor: "primary.50",
                "&:hover": { bgcolor: "primary.100", transform: "scale(1.1)" },
                transition: "all 0.2s",
              }}
            >
              <ContentCopyIcon sx={{ fontSize: "1.1rem" }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  );

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        py: { xs: 2, md: 5 },
        px: 2,
      }}
    >
      <Container maxWidth="md">
        <Fade in={true} timeout={800}>
          <Paper
            elevation={24}
            sx={{
              p: 0,
              overflow: "hidden",
              borderRadius: "24px",
              boxShadow: "0px 20px 40px rgba(0,0,0,0.1)",
              border: "1px solid rgba(255,255,255,0.7)",
              bgcolor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
            }}
          >
            {/* HEADER */}
            <Box
              sx={{
                background: "linear-gradient(90deg, #1e3c72 0%, #2a5298 100%)",
                color: "#fff",
                py: 3,
                px: { xs: 3, md: 5 },
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <AccountBalanceWalletIcon sx={{ fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: "bold", letterSpacing: 0.5 }}>
                  Cổng Thanh Toán
                </Typography>
              </Stack>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: "600",
                  bgcolor: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(4px)",
                  px: 2,
                  py: 0.8,
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                #{orderId?.slice(-6).toUpperCase()}
              </Typography>
            </Box>

            {/* VÙNG CHIA 2 CỘT BẰNG FLEXBOX (THAY THẾ GRID ĐỂ TRÁNH LỖI) */}
            <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" } }}>
              
              {/* CỘT TRÁI - HIỂN THỊ QR */}
              <Box
                sx={{
                  width: { xs: "100%", sm: "45%", md: "41.66%" },
                  p: { xs: 4, md: 5 },
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRight: { sm: "1px solid #f0f0f0" },
                  bgcolor: "#ffffff",
                }}
              >
                <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ fontWeight: "600" }}>
                  Quét mã để thanh toán
                </Typography>

                <Box
                  sx={{
                    position: "relative",
                    display: "inline-flex",
                    p: 2,
                    borderRadius: 4,
                    mt: 3,
                    mb: 4,
                    background: "#fff",
                    boxShadow: "0 12px 28px rgba(30, 60, 114, 0.15)",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: -2,
                      left: -2,
                      right: -2,
                      bottom: -2,
                      background: "linear-gradient(45deg, #1e3c72, #2a5298, #00d2ff, #3a7bd5)",
                      zIndex: -1,
                      borderRadius: 4.5,
                      animation: paymentStatus === "pending" ? "gradientShift 3s ease infinite" : "none",
                      backgroundSize: "200% 200%",
                    },
                    "@keyframes gradientShift": {
                      "0%": { backgroundPosition: "0% 50%" },
                      "50%": { backgroundPosition: "100% 50%" },
                      "100%": { backgroundPosition: "0% 50%" },
                    },
                  }}
                >
                  {qrCode ? (
                    <Box sx={{ bgcolor: "#fff", p: 1, borderRadius: 2 }}>
                      <QRCodeCanvas value={qrCode} size={220} level={"H"} />
                    </Box>
                  ) : (
                    <Box sx={{ width: 220, height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CircularProgress size={50} thickness={4} />
                    </Box>
                  )}
                </Box>

                <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "primary.main" }}>
                  <QrCodeScannerIcon fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: "600" }}>
                    Hỗ trợ mọi ứng dụng ngân hàng
                  </Typography>
                </Stack>
              </Box>

              {/* CỘT PHẢI - THÔNG TIN & TRẠNG THÁI */}
              <Box
                sx={{
                  width: { xs: "100%", sm: "55%", md: "58.33%" },
                  p: { xs: 4, md: 5 },
                  display: "flex",
                  flexDirection: "column",
                  bgcolor: "#fafbfc",
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 }}>
                  Tổng tiền cần thanh toán
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: "800",
                    mb: 1,
                    mt: 1,
                    background: "linear-gradient(90deg, #d32f2f 0%, #ff512f 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    display: "inline-block",
                  }}
                >
                  {amount?.toLocaleString("vi-VN") || 0}{" "}
                  <Typography component="span" variant="h5" sx={{ fontWeight: "700", WebkitTextFillColor: "#d32f2f" }}>
                    VNĐ
                  </Typography>
                </Typography>

                <Box sx={{ my: 4 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: "700", mb: 1.5, display: "block", letterSpacing: 0.5 }}>
                    THÔNG TIN CHUYỂN KHOẢN (THỦ CÔNG)
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      bgcolor: "#ffffff",
                      px: 3,
                      py: 1,
                      borderRadius: 3,
                      border: "1px solid #e0e6ed",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
                    }}
                  >
                    <InfoRow label="Số tiền" value={`${amount?.toLocaleString("vi-VN")} VNĐ`} copyable={true} />
                    <InfoRow label="Nội dung ghi chú" value={`Thanh toan don ST${orderId?.slice(-4)}`} copyable={true} />
                  </Paper>
                </Box>

                <Box sx={{ mt: "auto" }}>
                  <Button
                    variant="contained"
                    color={paymentStatus === "pending" ? "primary" : "success"}
                    size="large"
                    fullWidth
                    disabled={paymentStatus === "pending"}
                    sx={{
                      py: 2,
                      borderRadius: 3,
                      textTransform: "none",
                      fontWeight: "bold",
                      fontSize: "1.05rem",
                      boxShadow: paymentStatus === "pending" ? "0 8px 20px rgba(25, 118, 210, 0.3)" : "0 8px 20px rgba(46, 125, 50, 0.3)",
                      animation: paymentStatus === "pending" ? "pulse 2s infinite" : "none",
                      "@keyframes pulse": {
                        "0%": { boxShadow: "0 0 0 0 rgba(25, 118, 210, 0.4)" },
                        "70%": { boxShadow: "0 0 0 15px rgba(25, 118, 210, 0)" },
                        "100%": { boxShadow: "0 0 0 0 rgba(25, 118, 210, 0)" },
                      },
                    }}
                  >
                    {paymentStatus === "pending" ? (
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <CircularProgress size={22} color="inherit" thickness={5} />
                        <span>Hệ thống đang chờ nhận tiền...</span>
                      </Stack>
                    ) : (
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <VerifiedUserIcon />
                        <span>Thanh toán thành công! Đang chuyển hướng...</span>
                      </Stack>
                    )}
                  </Button>

                  <Button
                    variant="text"
                    fullWidth
                    sx={{
                      mt: 2,
                      color: "text.secondary",
                      fontWeight: "600",
                      "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
                    }}
                    onClick={handleGoHomeAndCancel}
                    disabled={isCancelling || paymentStatus === "success"}
                  >
                    {isCancelling ? "Đang xử lý hủy..." : "Hủy giao dịch & Trở về trang chủ"}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Container>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={2000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" sx={{ width: "100%", borderRadius: 2, fontWeight: "500" }}>
          Đã sao chép vào khay nhớ tạm!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PaymentPage;