import Banner from '../models/bannerModel.js';
import { failure } from '../services/commercePolicy.js';
import { textField, safeLink, integerField, booleanField, contentError } from '../utils/contentValidation.js';
import { pagination, queryText, escapeRegex, enumFilter } from '../utils/adminQuery.js';

export const getActiveBanners = async (_req, res) => {
  try { return res.json({ success: true, data: await Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }) }); }
  catch (error) { return contentError(res, error); }
};
export const getAllBanners = async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const filter = {};
    const search = queryText(req.query.search);
    if (search) filter.title = { $regex: escapeRegex(search), $options: 'i' };
    const active = enumFilter(req.query.active, ['true', 'false']);
    if (active) filter.isActive = active === 'true';
    const [data, totalCount] = await Promise.all([Banner.find(filter).sort({ sortOrder: 1, createdAt: -1, _id: -1 }).skip(skip).limit(limit), Banner.countDocuments(filter)]);
    return res.json({ success: true, data, totalCount, currentPage: page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) });
  } catch (error) { return contentError(res, error); }
};
function input(body) {
  const data = {};
  if (body.title !== undefined) data.title = textField(body.title, 'Tiêu đề', 150, false);
  if (body.linkUrl !== undefined) data.linkUrl = safeLink(body.linkUrl);
  if (body.sortOrder !== undefined) data.sortOrder = integerField(body.sortOrder, 'Thứ tự', 0, 10000);
  if (body.isActive !== undefined) data.isActive = booleanField(body.isActive);
  if (body.position !== undefined) {
    if (!['home_main', 'home_sidebar', 'category_top'].includes(body.position)) throw failure(400, 'Vị trí banner không hợp lệ.');
    data.position = body.position;
  }
  return data;
}
export const createBanner = async (req, res) => {
  try {
    const data = input(req.body);
    if (!req.file) throw failure(400, 'Vui lòng chọn ảnh banner.');
    return res.status(201).json({ success: true, data: await Banner.create({ ...data, imageUrl: req.file.path }) });
  } catch (error) { return contentError(res, error); }
};
export const updateBanner = async (req, res) => {
  try {
    const data = input(req.body);
    if (req.file) data.imageUrl = req.file.path;
    const banner = await Banner.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
    if (!banner) throw failure(404, 'Banner không còn tồn tại.');
    return res.json({ success: true, data: banner });
  } catch (error) { return contentError(res, error); }
};
export const deleteBanner = async (req, res) => {
  try {
    if (!await Banner.findByIdAndDelete(req.params.id)) throw failure(404, 'Banner không còn tồn tại.');
    return res.json({ success: true, message: 'Đã xóa banner.' });
  } catch (error) { return contentError(res, error); }
};
