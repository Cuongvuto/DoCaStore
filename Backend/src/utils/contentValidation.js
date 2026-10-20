import { failure, audienceQuery } from '../services/commercePolicy.js';
export function textField(value, name, max, required = true) {
  if (!required && (value === undefined || value === '')) return '';
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw failure(400, `${name} phải có từ 1 đến ${max} ký tự.`);
  return value.trim();
}
export function safeLink(value = '') {
  if (value === '') return '';
  const link = textField(value, 'Liên kết', 1000);
  if (/[\s\\\u0000-\u001f]/.test(link)) throw failure(400, 'Liên kết không hợp lệ.');
  if (link.startsWith('/') && !link.startsWith('//')) return link;
  try { const url = new URL(link); if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return link; } catch { /* Return the same validation error. */ }
  throw failure(400, 'Chỉ chấp nhận đường dẫn nội bộ hoặc liên kết HTTP(S).');
}
export function booleanField(value) {
  if (![true, false, 'true', 'false'].includes(value)) throw failure(400, 'Trạng thái không hợp lệ.');
  return value === true || value === 'true';
}
export function integerField(value, name, min, max) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '' || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) throw failure(400, `${name} phải là số nguyên từ ${min} đến ${max}.`);
  return Number(value);
}
export function targetFields(body, specific = false) {
  const targetAudience = body.targetAudience ?? 'all';
  if (!(specific ? ['all', 'group', 'specific'] : ['all', 'group']).includes(targetAudience)) throw failure(400, 'Đối tượng nhận không hợp lệ.');
  if (targetAudience === 'group') audienceQuery(body.groupType);
  return { targetAudience, groupType: targetAudience === 'group' ? body.groupType : null };
}
export function couponInput(body, now = new Date()) {
  const code = textField(body.code, 'Mã giảm giá', 40).toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(code)) throw failure(400, 'Mã chỉ gồm chữ, số, dấu gạch ngang và gạch dưới.');
  // A date-only input expires at the end of the chosen day in Vietnam.
  const raw = textField(body.expiryDate, 'Ngày hết hạn', 40);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const day = new Date(raw + 'T00:00:00Z');
    if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== raw) throw failure(400, 'Ngày hết hạn không tồn tại.');
  }
  const expiryDate = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw + 'T23:59:59.999+07:00' : raw);
  if (!Number.isFinite(expiryDate.getTime()) || expiryDate <= now) throw failure(400, 'Ngày hết hạn phải ở tương lai.');
  return { code, discountPercent: integerField(body.discountPercent, 'Phần trăm giảm', 1, 100), usageLimit: integerField(body.usageLimit ?? 100, 'Lượt sử dụng', 1, 1000000), expiryDate, ...targetFields(body) };
}
export const contentError = (res, error) => res.status(error.status || (error.code === 11000 ? 409 : ['ValidationError', 'CastError'].includes(error.name) ? 400 : 500)).json({ success: false, message: error.status ? error.message : error.code === 11000 ? 'Dữ liệu đã tồn tại.' : ['ValidationError', 'CastError'].includes(error.name) ? 'Dữ liệu không hợp lệ.' : 'Không thể thực hiện thao tác. Vui lòng thử lại.' });
