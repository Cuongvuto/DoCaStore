export const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

export const queryText = (value, max = 100) => {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || value.length > max) throw badRequest('Bộ lọc không hợp lệ.');
  return value.trim();
};

export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const pagination = (query) => {
  const read = (value, fallback, max) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^\d+$/.test(value)) throw badRequest('Phân trang không hợp lệ.');
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1) throw badRequest('Phân trang không hợp lệ.');
    return Math.min(number, max);
  };
  const page = read(query.page, 1, 100000);
  const limit = read(query.limit, 10, 50);
  return { page, limit, skip: (page - 1) * limit };
};

export const enumFilter = (value, allowed) => {
  const text = queryText(value);
  if (text && !allowed.includes(text)) throw badRequest('Giá trị bộ lọc không hợp lệ.');
  return text;
};

export const dateRange = (from, to) => {
  const parse = (value) => {
    const text = queryText(value, 10);
    if (!text) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw badRequest('Ngày phải có định dạng YYYY-MM-DD.');
    const utc = new Date(text + 'T00:00:00Z');
    if (!Number.isFinite(utc.getTime()) || utc.toISOString().slice(0, 10) !== text) throw badRequest('Ngày không hợp lệ.');
    return new Date(utc.getTime() - 7 * 3600000);
  };
  const start = parse(from);
  const end = parse(to);
  if (start && end && start > end) throw badRequest('Ngày kết thúc phải từ ngày bắt đầu trở đi.');
  return { ...(start ? { $gte: start } : {}), ...(end ? { $lt: new Date(end.getTime() + 86400000) } : {}) };
};

// Fixed UTC+7 business calendar; weeks start on Monday and retain their year.
export const chartWindow = (period, now = new Date()) => {
  if (!['daily', 'weekly', 'monthly'].includes(period)) throw badRequest('Kỳ thống kê không hợp lệ.');
  const local = new Date(now.getTime() + 7 * 3600000);
  local.setUTCHours(0, 0, 0, 0);
  const count = period === 'daily' ? 7 : period === 'weekly' ? 8 : 12;
  if (period === 'weekly') local.setUTCDate(local.getUTCDate() - (local.getUTCDay() + 6) % 7);
  if (period === 'monthly') local.setUTCDate(1);
  const buckets = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(local);
    if (period === 'monthly') date.setUTCMonth(date.getUTCMonth() - i);
    else date.setUTCDate(date.getUTCDate() - i * (period === 'weekly' ? 7 : 1));
    const key = date.toISOString().slice(0, 10);
    buckets.push({ key, name: period === 'monthly' ? key.slice(5, 7) + '/' + key.slice(0, 4) : key.slice(8) + '/' + key.slice(5, 7), value: 0 });
  }
  return { buckets, start: new Date(buckets[0].key + 'T00:00:00+07:00'), unit: period === 'monthly' ? 'month' : period === 'weekly' ? 'week' : 'day' };
};

export const productInput = (body, partial = false) => {
  const data = {};
  for (const field of ['name', 'description', 'specs', 'brand', 'category_id']) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'string') throw badRequest('Thông tin sản phẩm không hợp lệ.');
      data[field] = body[field].trim();
    }
  }
  if ((!partial || data.name !== undefined) && !data.name) throw badRequest('Vui lòng nhập tên sản phẩm.');
  if ((!partial || data.category_id !== undefined) && !/^[a-f\d]{24}$/i.test(data.category_id || '')) throw badRequest('Danh mục không hợp lệ.');
  for (const field of ['price', 'stock']) {
    if (partial && body[field] === undefined) continue;
    const value = field === 'stock' && body[field] === undefined ? 0 : body[field];
    const number = Number(value);
    if (!['string', 'number'].includes(typeof value) || String(value).trim() === '' || !Number.isSafeInteger(number) || number < (field === 'price' ? 1 : 0)) {
      throw badRequest(field === 'price' ? 'Giá phải là số nguyên dương (VND).' : 'Tồn kho phải là số nguyên không âm.');
    }
    data[field] = number;
  }
  if (body.isTrending !== undefined) {
    if (![true, false, 'true', 'false'].includes(body.isTrending)) throw badRequest('Trạng thái nổi bật không hợp lệ.');
    data.isTrending = body.isTrending === true || body.isTrending === 'true';
  }
  return data;
};
