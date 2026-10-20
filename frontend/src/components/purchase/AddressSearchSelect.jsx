import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import './AddressSearchSelect.css';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();

export default function AddressSearchSelect({ label, options = [], value = '', onChange, disabled = false, loading = false, failed = false, placeholder }) {
  const id = useId();
  const input = useRef(null);
  const list = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const selected = options.find(option => String(option.code) === String(value));
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const filtered = options.filter(option => words.every(word => normalize(option.name).includes(word)));
  const expanded = open && !disabled;
  const active = expanded && activeIndex >= 0 && activeIndex < filtered.length ? activeIndex : -1;

  useEffect(() => {
    if (active >= 0) list.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);
  useEffect(() => {
    input.current?.setCustomValidity(selected ? '' : 'Vui lòng chọn một địa chỉ trong danh sách.');
  }, [selected]);

  const close = () => { setOpen(false); setQuery(null); setActiveIndex(-1); };
  const choose = option => {
    onChange(option);
    close();
    input.current?.focus({ preventScroll: true });
  };
  const keyDown = event => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setOpen(true);
      setActiveIndex(previous => !filtered.length ? -1 : event.key === 'ArrowDown' ? Math.min(previous + 1, filtered.length - 1) : previous < 0 ? filtered.length - 1 : Math.max(0, previous - 1));
    } else if (event.key === 'Enter' && expanded) {
      event.preventDefault();
      if (active >= 0) choose(filtered[active]);
      else if (filtered.length === 1) choose(filtered[0]);
    } else if (event.key === 'Escape' && expanded) {
      event.preventDefault(); event.stopPropagation(); close();
    }
  };

  return <div className="purchase-field address-search" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }}>
    <label htmlFor={id}>{label}</label>
    <div className="address-search-control"><input ref={input} id={id} role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? id + '-list' : undefined} aria-activedescendant={active >= 0 ? id + '-option-' + active : undefined} aria-describedby={expanded ? id + '-hint' : undefined} required disabled={disabled} autoComplete="off" spellCheck={false} value={expanded ? query ?? selected?.name ?? '' : selected?.name || ''} placeholder={loading ? 'Đang tải danh sách…' : placeholder} onClick={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); setActiveIndex(-1); if (value) onChange(null); }} onKeyDown={keyDown} />
      <span aria-hidden="true">{expanded ? <Search size={15} /> : <ChevronDown size={15} />}</span>
    </div>
    {expanded && <div className="address-search-popup"><p id={id + '-hint'} className="address-search-hint" role="status">{loading ? 'Đang tải danh sách…' : failed ? 'Không tải được danh sách. Bạn có thể nhập địa chỉ thủ công.' : filtered.length ? filtered.length + ' kết quả · chọn một địa chỉ bên dưới' : 'Không tìm thấy. Thử tên khác hoặc nhập không dấu.'}</p><ul ref={list} id={id + '-list'} role="listbox" aria-label={label} aria-busy={loading}>{!loading && !failed && filtered.map((option, index) => <li key={option.code} role="presentation"><button type="button" role="option" id={id + '-option-' + index} aria-selected={String(option.code) === String(value)} tabIndex={-1} className={active === index ? 'address-search-active' : ''} onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}>{option.name}{String(option.code) === String(value) && <Check size={14} aria-hidden="true" />}</button></li>)}</ul></div>}
  </div>;
}
