import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, ImagePlus, X, Package } from 'lucide-react';
import { toast } from 'sonner';
import axiosClient from '../../api/axiosClient';
import useAdminList, { useAdminFilters } from './hooks/useAdminList';
import { PageHeading, SearchField, Field, StatusBadge, EmptyState, ErrorState, LoadingState, Pagination, AdminModal, ConfirmDialog } from './components/AdminUI';
import { money } from './adminConfig';

const ProductEditor = ({ product, categories, onClose, onSaved }) => {
  const [form, setForm] = useState({ name: product?.name || '', brand: product?.brand || '', price: product?.price ?? '', stock: product?.stock ?? 0, category_id: product?.category_id?._id || product?.category_id || '', description: product?.description || '', specs: product?.specs || '', isTrending: product?.isTrending || false });
  const [retained, setRetained] = useState(product?.images?.length ? product.images : product?.imageUrl ? [product.imageUrl] : []);
  const [uploads, setUploads] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const blobs = useRef(new Set());
  useEffect(() => { const urls = blobs.current; return () => { urls.forEach(url => URL.revokeObjectURL(url)); }; }, []);
  const change = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  const addFiles = event => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (retained.length + uploads.length + files.length > 5) return toast.error('Mỗi sản phẩm có tối đa 5 ảnh.');
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) return toast.error('Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB mỗi ảnh.');
    setUploads(previous => [...previous, ...files.map(file => { const url = URL.createObjectURL(file); blobs.current.add(url); return { file, url }; })]);
  };
  const submit = async event => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setSaving(true); setError('');
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      // Metadata edits must not write the stock snapshot from an older screen.
      if (product && key === 'stock' && Number(value) === product.stock) return;
      body.append(key, value);
    });
    if (product && Number(form.stock) !== product.stock) body.append('expectedStock', product.stock);
    if (product) body.append('existingImages', JSON.stringify(retained));
    uploads.forEach(item => body.append('images', item.file));
    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (product) await axiosClient.put('/product/' + product._id, body, config);
      else await axiosClient.post('/product', body, config);
      toast.success(product ? 'Đã cập nhật sản phẩm.' : 'Đã thêm sản phẩm.');
      onSaved();
    } catch (error) { setError(error.response?.data?.message || 'Không thể lưu sản phẩm.'); }
    finally { pending.current = false; setSaving(false); }
  };
  return <AdminModal wide title={product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'} onClose={onClose} busy={saving}>
    <form onSubmit={submit} className="space-y-5">
      {error && <ErrorState message={error} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Tên sản phẩm *"><input autoFocus required maxLength={200} value={form.name} onChange={e => change('name', e.target.value)} /></Field>
        <Field label="Thương hiệu"><input value={form.brand} maxLength={100} onChange={e => change('brand', e.target.value)} placeholder="Ví dụ: Shimano" /></Field>
        <Field label="Giá bán (VND) *"><input type="number" min="1" step="1" required value={form.price} onChange={e => change('price', e.target.value)} /></Field>
        <Field label="Tồn kho *"><input type="number" min="0" step="1" required value={form.stock} onChange={e => change('stock', e.target.value)} /></Field>
        <Field label="Danh mục *"><select required value={form.category_id} onChange={e => change('category_id', e.target.value)}><option value="">Chọn danh mục</option>{categories.map(category => <option key={category._id} value={category._id}>{category.parentId ? '↳ ' : ''}{category.name}</option>)}</select></Field>
        <label className="flex items-center gap-3 self-end min-h-11"><input type="checkbox" checked={form.isTrending} onChange={e => change('isTrending', e.target.checked)} />Hiển thị trong sản phẩm nổi bật</label>
      </div>
      <Field label="Thông số kỹ thuật"><textarea rows={3} value={form.specs} onChange={e => change('specs', e.target.value)} placeholder="Chiều dài, độ cứng, tải mồi…" /></Field>
      <Field label="Mô tả"><textarea rows={4} value={form.description} onChange={e => change('description', e.target.value)} /></Field>
      <div><p className="text-sm mb-2">Hình ảnh ({retained.length + uploads.length}/5)</p><p className="admin-muted text-xs mb-3">Ảnh đầu tiên là ảnh đại diện. JPG, PNG, WebP · Tối đa 5 MB/ảnh.</p>
        <div className="flex flex-wrap gap-3">
          {retained.map(url => <div className="relative" key={url}><img className="w-20 h-20 object-contain rounded-lg bg-white" src={url} alt="Ảnh sản phẩm hiện tại" /><button type="button" className="absolute -right-2 -top-2 admin-button !p-1 !min-h-0" aria-label="Bỏ ảnh hiện tại" onClick={() => setRetained(previous => previous.filter(item => item !== url))}><X size={14} /></button></div>)}
          {uploads.map(item => <div className="relative" key={item.url}><img className="w-20 h-20 object-contain rounded-lg bg-white" src={item.url} alt={item.file.name} /><button type="button" className="absolute -right-2 -top-2 admin-button !p-1 !min-h-0" aria-label={'Bỏ ảnh ' + item.file.name} onClick={() => { URL.revokeObjectURL(item.url); blobs.current.delete(item.url); setUploads(previous => previous.filter(upload => upload.url !== item.url)); }}><X size={14} /></button></div>)}
          {retained.length + uploads.length < 5 && <label className="admin-button cursor-pointer w-20 h-20"><ImagePlus size={24} /><span className="sr-only">Thêm ảnh sản phẩm</span><input className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={addFiles} /></label>}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-emerald-900/50"><button type="button" className="admin-button" disabled={saving} onClick={onClose}>Hủy</button><button className="admin-button admin-button-primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu sản phẩm'}</button></div>
    </form>
  </AdminModal>;
};

export default function ProductManager() {
  const { filters, setFilter, clearFilters } = useAdminFilters();
  const list = useAdminList('/product', filters);
  const categories = useAdminList('/category', {});
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const mutation = useRef(false);
  const remove = async () => {
    if (mutation.current) return;
    mutation.current = true; setBusy(true);
    try {
      await axiosClient.delete('/product/' + deleting._id);
      toast.success('Đã xóa sản phẩm.'); setDeleting(null);
      if (list.data.length === 1 && list.currentPage > 1) setFilter('page', list.currentPage - 1); else list.reload();
    } catch (error) { toast.error(error.response?.data?.message || 'Không thể xóa sản phẩm.'); }
    finally { mutation.current = false; setBusy(false); }
  };
  return <div>
    <PageHeading title="Sản phẩm" description="Quản lý thông tin, hình ảnh và tồn kho của cửa hàng.">
      <button className="admin-button" onClick={list.reload} disabled={list.loading}><RefreshCw size={16} />Làm mới</button>
      <button className="admin-button admin-button-primary" disabled={categories.loading || !!categories.error} onClick={() => setEditor({})}><Plus size={17} />Thêm sản phẩm</button>
    </PageHeading>
    {categories.error && <ErrorState message="Không thể tải danh mục để chỉnh sửa sản phẩm." onRetry={categories.reload} />}
    <div className="admin-toolbar">
      <SearchField value={filters.search || ''} onChange={value => setFilter('search', value)} placeholder="Tìm tên sản phẩm…" />
      <Field label="Danh mục"><select value={filters.categoryId || ''} onChange={e => setFilter('categoryId', e.target.value)}><option value="">Tất cả danh mục</option>{(categories.flatData || []).map(category => <option key={category._id} value={category._id}>{category.name}</option>)}</select></Field>
      <Field label="Tồn kho"><select value={filters.stock || ''} onChange={e => setFilter('stock', e.target.value)}><option value="">Tất cả</option><option value="in">Còn hàng</option><option value="low">Sắp hết (1–5)</option><option value="out">Hết hàng</option></select></Field>
      <Field label="Sắp xếp"><select value={filters.sort || ''} onChange={e => setFilter('sort', e.target.value)}><option value="">Mới nhất</option><option value="price_asc">Giá tăng dần</option><option value="price_desc">Giá giảm dần</option><option value="name_asc">Tên A–Z</option></select></Field>
      {Object.keys(filters).length > 0 && <button className="admin-button" onClick={clearFilters}>Xóa bộ lọc</button>}
    </div>
    <section className="admin-panel">
      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.loading ? <LoadingState /> : !list.data.length ? <EmptyState title="Không có sản phẩm phù hợp" message="Thử thay đổi bộ lọc hoặc thêm sản phẩm mới." /> :
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá bán</th><th>Tồn kho</th><th className="text-right">Thao tác</th></tr></thead><tbody>{list.data.map(product => <tr key={product._id}>
        <td><div className="flex items-center gap-3">{product.imageUrl ? <img className="admin-photo" src={product.imageUrl} alt="" loading="lazy" /> : <Package size={30} className="admin-muted" />}<div className="admin-cell-title">{product.name}<p className="admin-muted text-xs mt-1">{product.brand || 'Chưa có thương hiệu'}{product.isTrending && ' · Nổi bật'}</p></div></div></td>
        <td className="admin-muted">{product.category_id?.name || 'Chưa phân loại'}</td><td>{money(product.price)}</td>
        <td><StatusBadge status={product.stock <= 0 ? 'out' : product.stock <= 5 ? 'low' : 'in'}>{product.stock <= 0 ? 'Hết hàng' : product.stock + ' sản phẩm'}</StatusBadge></td>
        <td><div className="flex justify-end gap-2"><button className="admin-button" disabled={categories.loading || !!categories.error} aria-label={'Sửa ' + product.name} onClick={() => setEditor({ product })}><Pencil size={16} /></button><button className="admin-button" aria-label={'Xóa ' + product.name} onClick={() => setDeleting(product)}><Trash2 size={16} /></button></div></td>
      </tr>)}</tbody></table></div>}
      {!list.error && <Pagination page={list.currentPage} pages={list.totalPages} total={list.totalCount} onChange={page => setFilter('page', page)} loading={list.loading} />}
    </section>
    {editor && <ProductEditor product={editor.product} categories={categories.flatData || []} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); list.reload(); }} />}
    {deleting && <ConfirmDialog title="Xóa sản phẩm?" message={'Sản phẩm “' + deleting.name + '” sẽ bị xóa khỏi danh mục bán hàng. Thao tác này không thể hoàn tác.'} label="Xóa sản phẩm" danger busy={busy} onClose={() => setDeleting(null)} onConfirm={remove} />}
  </div>;
}
