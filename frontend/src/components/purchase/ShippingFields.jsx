import { useEffect, useState } from 'react';
import axios from 'axios';
import AddressSearchSelect from './AddressSearchSelect';

function useLocations(path, property) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    axios.get('https://provinces.open-api.vn/api/' + path, { signal: controller.signal, timeout: 12000 })
      .then(response => { if (!controller.signal.aborted) setResult({ path, options: property ? response.data[property] : response.data }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ path, failed: true }); });
    return () => controller.abort();
  }, [path, property]);
  return result?.path === path ? result : { options: [], loading: Boolean(path) };
}

export default function ShippingFields({ value, onChange, initialManual = false, description = 'Địa chỉ này được dùng cho đơn hàng hiện tại.' }) {
  const [manual, setManual] = useState(initialManual);
  const [provinceCode, setProvinceCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const provinces = useLocations(manual ? null : 'p/');
  const districts = useLocations(provinceCode ? 'p/' + provinceCode + '?depth=2' : null, 'districts');
  const wards = useLocations(districtCode ? 'd/' + districtCode + '?depth=2' : null, 'wards');
  const failed = provinces.failed || districts.failed || wards.failed;
  const edit = (key, next) => onChange(previous => ({ ...previous, [key]: next }));
  return <div className="purchase-stack">
    <div className="purchase-fields"><label className="purchase-field">Họ tên người nhận<input required autoComplete="shipping name" maxLength={100} value={value.receiverName} onChange={event => edit('receiverName', event.target.value)} placeholder="Nhập họ và tên" /></label><label className="purchase-field">Số điện thoại<input required type="tel" autoComplete="shipping tel" maxLength={20} value={value.phone} onChange={event => edit('phone', event.target.value)} placeholder="Số điện thoại nhận hàng" /></label></div>
    {failed && !manual && <p className="purchase-muted">Chưa tải được danh sách địa chỉ. Bạn có thể chuyển sang nhập thủ công.</p>}
    <div className="purchase-fields purchase-fields-three">
      {manual ? <>{[['city', 'Tỉnh / Thành phố'], ['district', 'Quận / Huyện'], ['ward', 'Phường / Xã']].map(([key, label]) => <label className="purchase-field" key={key}>{label}<input required maxLength={100} value={value[key]} onChange={event => edit(key, event.target.value)} /></label>)}</> : <>
        <AddressSearchSelect label="Tỉnh / Thành phố" placeholder="Gõ tên tỉnh / thành phố" options={provinces.options} loading={provinces.loading} failed={provinces.failed} value={provinceCode} onChange={option => { setProvinceCode(option ? String(option.code) : ''); setDistrictCode(''); onChange(previous => ({ ...previous, city: option?.name || '', district: '', ward: '' })); }} />
        <AddressSearchSelect key={'district-' + provinceCode} label="Quận / Huyện" placeholder={provinceCode ? 'Gõ tên quận / huyện' : 'Chọn tỉnh / thành phố trước'} disabled={!provinceCode} options={districts.options} loading={districts.loading} failed={districts.failed} value={districtCode} onChange={option => { setDistrictCode(option ? String(option.code) : ''); onChange(previous => ({ ...previous, district: option?.name || '', ward: '' })); }} />
        <AddressSearchSelect key={'ward-' + provinceCode + '-' + districtCode} label="Phường / Xã" placeholder={districtCode ? 'Gõ tên phường / xã' : 'Chọn quận / huyện trước'} disabled={!districtCode} options={wards.options} loading={wards.loading} failed={wards.failed} value={wards.options?.find(option => option.name === value.ward)?.code || ''} onChange={option => edit('ward', option?.name || '')} />
      </>}
    </div>
    <button className="purchase-text-button" type="button" onClick={() => { setManual(previous => !previous); if (manual) { setProvinceCode(''); setDistrictCode(''); onChange(previous => ({ ...previous, city: '', district: '', ward: '' })); } }}>{manual ? 'Chọn từ danh sách địa chỉ' : 'Nhập địa chỉ thủ công'}</button>
    <label className="purchase-field">Số nhà, tên đường<input required autoComplete="shipping street-address" maxLength={250} value={value.street} onChange={event => edit('street', event.target.value)} placeholder="Ví dụ: 12 Nguyễn Văn A" /></label>
    {description && <p className="purchase-muted">{description}</p>}
  </div>;
}
