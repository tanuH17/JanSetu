import React, { useState, useRef } from 'react';
import { Camera, Loader2, User, AlertCircle, Check } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function AvatarUploader({ currentAvatarUrl, onAvatarUpdated }) {
  const { user, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      setError('Photo size must be less than 3 MB.');
      return;
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    if (!isSupabaseConfigured || !user) {
      setError('Supabase is not configured.');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      let publicUrl = null;

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        publicUrl = urlData?.publicUrl;
      } else {
        // Fallback: If bucket is not yet created in Supabase dashboard, use object URL or data URL preview
        const reader = new FileReader();
        publicUrl = await new Promise((resolve) => {
          reader.onload = (re) => resolve(re.target.result);
          reader.readAsDataURL(file);
        });
      }

      if (publicUrl) {
        // Save to profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id);

        if (profileError) throw profileError;

        setSuccess(true);
        if (onAvatarUpdated) onAvatarUpdated(publicUrl);
        await refreshProfile();
        setTimeout(() => setSuccess(false), 2500);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload profile photo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative group">
        <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center text-slate-400 shadow-xs">
          {currentAvatarUrl ? (
            <img
              src={currentAvatarUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-10 h-10 text-slate-300" />
          )}
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 bg-slate-900/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
          title="Change profile photograph"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Camera className="w-5 h-5" />
              <span className="text-[9px] font-bold mt-1">Change</span>
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
          >
            {uploading ? 'Uploading…' : 'Upload New Photo'}
          </button>
          {success && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
              <Check className="w-3.5 h-3.5" /> Updated
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400">
          JPG, PNG or WEBP up to 3MB. Recommended square 400×400.
        </p>
        {error && (
          <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </p>
        )}
      </div>
    </div>
  );
}
