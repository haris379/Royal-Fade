import { useEffect, useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import { Alert, Field, Img } from '../../components/ui.jsx';
import { useBusiness } from '../../context/BusinessContext.jsx';
import { api, errorMessage, fieldErrors } from '../../lib/api.js';
import { Panel } from './shared.jsx';

const MAX_BYTES = 4 * 1024 * 1024; // matches the server limit (Vercel request bodies are capped at 4.5 MB)
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ServiceForm({ service, onDone, onCancel }) {
  const { categories } = useBusiness();
  const isNew = !service;
  const [f, setF] = useState({
    name: service?.name || '', description: service?.description || '', category: service?.category || 'haircuts',
    price: service?.price ?? '', durationMinutes: service?.durationMinutes ?? 30, isStartingPrice: Boolean(service?.isStartingPrice),
    active: service?.active ?? true, image: service?.image || '',
  });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ busy: false, error: '' });
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  function pick(e) {
    const picked = e.target.files?.[0];
    setErrors((x) => ({ ...x, imageFile: undefined }));
    if (!picked) return setFile(null);
    if (!TYPES.includes(picked.type)) { setFile(null); e.target.value = ''; return setErrors((x) => ({ ...x, imageFile: 'Choose a JPG, PNG or WebP image' })); }
    if (picked.size > MAX_BYTES) { setFile(null); e.target.value = ''; return setErrors((x) => ({ ...x, imageFile: 'Image must be 4 MB or smaller' })); }
    setFile(picked);
  }

  async function submit(e) {
    e.preventDefault();
    setErrors({});
    setState({ busy: true, error: '' });
    const body = new FormData();
    for (const k of ['name', 'description', 'category', 'price', 'durationMinutes']) body.append(k, String(f[k]).trim());
    body.append('isStartingPrice', String(f.isStartingPrice));
    body.append('active', String(f.active));
    if (file) body.append('imageFile', file);
    else if (isNew || f.image !== (service.image || '')) body.append('image', f.image.trim()); // untouched path = keep the current image
    try {
      if (isNew) await api.post('/admin/services', body);
      else await api.put(`/admin/services/${service._id}`, body);
      onDone(`"${f.name}" ${isNew ? 'added' : 'updated'}.`);
    } catch (err) {
      setErrors(fieldErrors(err));
      setState({ busy: false, error: errorMessage(err) });
    }
  }

  const shown = preview || f.image;
  return (
    <Panel title={isNew ? 'Add service' : `Edit ${service.name}`}>
      <form onSubmit={submit} className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          {state.error && <div className="sm:col-span-2"><Alert>{state.error}</Alert></div>}
          <Field id="s-name" label="Name" error={errors.name} className="sm:col-span-2"><input id="s-name" className="field" value={f.name} onChange={set('name')} required /></Field>
          <Field id="s-desc" label="Description" error={errors.description} className="sm:col-span-2"><textarea id="s-desc" rows={3} className="field resize-y" value={f.description} onChange={set('description')} maxLength={400} required /></Field>
          <Field id="s-cat" label="Category" error={errors.category}><select id="s-cat" className="field" value={f.category} onChange={set('category')}>{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
          <Field id="s-dur" label="Duration (minutes)" error={errors.durationMinutes} hint="15 to 480. Bookings use whole 15-minute blocks."><input id="s-dur" type="number" min="15" max="480" step="5" className="field" value={f.durationMinutes} onChange={set('durationMinutes')} required /></Field>
          <Field id="s-price" label="Price (£)" error={errors.price}><input id="s-price" type="number" min="0" step="0.01" className="field" value={f.price} onChange={set('price')} required /></Field>
          <div className="flex flex-col justify-end gap-3 pb-2 text-sm text-cream-200">
            <label className="flex items-center gap-3"><input type="checkbox" checked={f.isStartingPrice} onChange={set('isStartingPrice')} className="h-4 w-4 accent-[#c4a052]" />Show as a &ldquo;From&rdquo; price</label>
            <label className="flex items-center gap-3"><input type="checkbox" checked={f.active} onChange={set('active')} className="h-4 w-4 accent-[#c4a052]" />Visible on the website and bookable</label>
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <button className="btn-gold" disabled={state.busy}>{state.busy ? 'Saving...' : isNew ? 'Add service' : 'Save changes'}</button>
            <button type="button" className="btn-quiet" onClick={onCancel} disabled={state.busy}>Cancel</button>
          </div>
        </div>
        <fieldset className="h-fit border border-char-700 p-4">
          <legend className="px-2 text-sm font-semibold text-cream-200">Service image</legend>
          <div className="aspect-[4/3] overflow-hidden bg-char-800"><Img src={shown} alt="Service image preview" className="h-full w-full object-cover" /></div>
          <label htmlFor="s-file" className="btn-line btn-sm mt-4 w-full cursor-pointer"><Upload className="h-4 w-4" aria-hidden />{file ? 'Choose a different image' : 'Upload from device'}</label>
          <input id="s-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} className="sr-only" aria-describedby="s-file-help" />
          <p id="s-file-help" className="mt-2 text-xs text-smoke-400">JPG, PNG or WebP, up to 4 MB. {file && <span className="text-gold-300">Selected: {file.name}</span>}</p>
          {errors.imageFile && <p className="mt-1 text-xs text-red-300" role="alert">{errors.imageFile}</p>}
          <Field id="s-path" label="Or an image path" className="mt-4" hint="For example /images/services/skin-fade.svg" error={errors.image}><input id="s-path" className="field text-sm" value={f.image} onChange={set('image')} disabled={Boolean(file)} /></Field>
        </fieldset>
      </form>
    </Panel>
  );
}
