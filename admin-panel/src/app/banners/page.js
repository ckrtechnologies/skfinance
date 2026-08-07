'use client';

import { useGetBannersQuery, useCreateBannerMutation, useUpdateBannerMutation, useDeleteBannerMutation, useUploadBannerImageMutation } from '@/store/api/adminApi';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import { StatusBadge } from '@/components/ui/Primitives';

export default function BannersPage() {
  const dispatch = useDispatch();
  
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'Dealer Banners', breadcrumbs: ['System', 'Banners'] }));
  }, [dispatch]);

  const { data: response, isLoading } = useGetBannersQuery();
  const [createBanner] = useCreateBannerMutation();
  const [updateBanner] = useUpdateBannerMutation();
  const [deleteBanner] = useDeleteBannerMutation();
  const [uploadBannerImage, { isLoading: uploading }] = useUploadBannerImageMutation();

  const banners = response?.data || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState({
    image_url: '',
    action_link: '',
    is_active: true,
    sort_order: 0,
  });

  const handleOpenModal = (banner = null) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        image_url: banner.image_url,
        action_link: banner.action_link || '',
        is_active: banner.is_active,
        sort_order: banner.sort_order || 0,
      });
    } else {
      setEditingBanner(null);
      setFormData({
        image_url: '',
        action_link: '',
        is_active: true,
        sort_order: banners.length,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBanner(null);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadBannerImage(fd).unwrap();
      setFormData(prev => ({ ...prev, image_url: res.data.cdn_url }));
    } catch (err) {
      alert(`Failed to upload image: ${err.data?.error || err.message}`);
    }
  };

  const handleSave = async () => {
    if (!formData.image_url) return alert('Image is required');
    try {
      if (editingBanner) {
        await updateBanner({ id: editingBanner.id, ...formData }).unwrap();
      } else {
        await createBanner(formData).unwrap();
      }
      handleCloseModal();
    } catch (err) {
      alert(`Failed to save banner: ${err.data?.error?.message || err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this banner?')) {
      try {
        await deleteBanner(id).unwrap();
      } catch (err) {
        alert(`Failed to delete banner: ${err.data?.error?.message || err.message}`);
      }
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      await updateBanner({ id: banner.id, is_active: !banner.is_active }).unwrap();
    } catch (err) {
      alert(`Failed to update status: ${err.data?.error?.message || err.message}`);
    }
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Dealer App Banners</h2>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>+ Add New Banner</button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Order</th>
              <th>Action Link</th>
              <th>Status</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }, (_, i) => (
                <tr key={i}>{[100, 60, 200, 80, 40, 100].map((w, j) => (
                  <td key={j}><div className="skeleton" style={{ height: 12, width: w }} /></td>
                ))}</tr>
              ))
            ) : banners.map(banner => (
              <tr key={banner.id}>
                <td>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={banner.image_url} alt="Banner" style={{ height: '60px', width: 'auto', borderRadius: '4px', objectFit: 'cover' }} />
                </td>
                <td><span className="font-mono">{banner.sort_order}</span></td>
                <td>
                  <a href={banner.action_link} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
                    {banner.action_link || 'None'}
                  </a>
                </td>
                <td>
                  <StatusBadge status={banner.is_active ? 'Active' : 'Inactive'} color={banner.is_active ? 'green' : 'gray'} />
                </td>
                <td>
                  <label className="switch">
                    <input type="checkbox" checked={banner.is_active} onChange={() => handleToggleActive(banner)} />
                    <span className="slider round"></span>
                  </label>
                </td>
                <td>
                  <button className="btn" style={{ marginRight: '0.5rem' }} onClick={() => handleOpenModal(banner)}>Edit</button>
                  <button className="btn" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(banner.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {banners.length === 0 && !isLoading && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-3)' }}>
                  No banners found. Create one to display it in the dealer app.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '1rem' }}>{editingBanner ? 'Edit Banner' : 'New Banner'}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Upload Image</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  disabled={uploading}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--color-bg-2)', color: 'var(--color-text)' }}
                />
                {uploading && <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '4px' }}>Uploading...</div>}
                {formData.image_url && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={formData.image_url} alt="Preview" style={{ width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '4px' }} />
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Action Link (Optional)</label>
                <input 
                  type="url" 
                  value={formData.action_link} 
                  onChange={e => setFormData({...formData, action_link: e.target.value})} 
                  placeholder="https://"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--color-bg-2)', color: 'var(--color-text)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Sort Order</label>
                  <input 
                    type="number" 
                    value={formData.sort_order} 
                    onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})} 
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--color-bg-2)', color: 'var(--color-text)' }}
                  />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={formData.is_active} 
                    onChange={e => setFormData({...formData, is_active: e.target.checked})} 
                    style={{ width: '1.25rem', height: '1.25rem' }}
                  />
                  <label htmlFor="isActive" style={{ fontWeight: 500 }}>Is Active</label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn" onClick={handleCloseModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={uploading || !formData.image_url}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
