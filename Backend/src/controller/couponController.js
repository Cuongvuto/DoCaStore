import Coupon from '../models/couponModel.js';
import User from '../models/userModel.js';
import { assertCoupon, failure } from '../services/commercePolicy.js';
import { couponInput, booleanField, contentError, textField } from '../utils/contentValidation.js';
import { pagination, queryText, escapeRegex, enumFilter } from '../utils/adminQuery.js';
import { deliverNotification } from '../services/notificationService.js';

export const createCoupon = async (req, res) => {
  try {
    const input = couponInput(req.body);
    const data = await Coupon.create(input);
    // Persisting a coupon must not appear to fail when notification delivery fails.
    try { await deliverNotification({ title: 'Mã giảm giá mới: ' + data.code, message: 'Giảm ' + data.discountPercent + '% với mã ' + data.code, type: 'promotion', linkUrl: '/cart', targetAudience: data.targetAudience, groupType: data.groupType }); }
    catch (error) { console.error('Coupon notification:', error.message); }
    return res.status(201).json({ success: true, data });
  } catch (error) { return contentError(res, error); }
};
export const getAllCoupons = async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const filter = {};
    const search = queryText(req.query.search);
    if (search) filter.code = { $regex: escapeRegex(search), $options: 'i' };
    const active = enumFilter(req.query.active, ['true', 'false']);
    if (active) filter.isActive = active === 'true';
    const [data, totalCount] = await Promise.all([Coupon.find(filter).select('-usedBy').sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit), Coupon.countDocuments(filter)]);
    return res.json({ success: true, data, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) });
  } catch (error) { return contentError(res, error); }
};
export const toggleCouponStatus = async (req, res) => {
  try {
    // An explicit target state makes retrying the request safe.
    const isActive = booleanField(req.body.isActive);
    const data = await Coupon.findByIdAndUpdate(req.params.id, { $set: { isActive } }, { new: true, runValidators: true });
    if (!data) throw failure(404, 'Mã giảm giá không còn tồn tại.');
    return res.json({ success: true, data, message: isActive ? 'Đã kích hoạt mã.' : 'Đã khóa mã.' });
  } catch (error) { return contentError(res, error); }
};
export const validateCoupon = async (req, res) => {
  try {
    const code = textField(req.body.code, 'Mã giảm giá', 40).toUpperCase();
    const coupon = await Coupon.findOne({ code });
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) throw failure(404, 'Tài khoản không còn tồn tại.');
    assertCoupon(coupon, user);
    return res.json({ success: true, data: { code: coupon.code, discountPercent: coupon.discountPercent } });
  } catch (error) { return contentError(res, error); }
};
