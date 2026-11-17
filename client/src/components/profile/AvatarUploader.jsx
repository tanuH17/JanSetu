import React, { useEffect, useState, useRef } from 'react';
import { Camera, Loader2, User, AlertCircle, Check } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { removePrivateMedia, resolvePrivateMediaUrl, uploadPrivateMedia, validateMediaFile } from '../../lib/media';

export default function AvatarUploader({ currentAvatarUrl, onAvatarUpdated }) {
  const { user, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [avatarView, setAvatarView] = useState({ source: null, url: null });
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (!currentAvatarUrl) return () => { active = false; };
    resolvePrivateMediaUrl('avatars', currentAvatarUrl)
      .then((url) => { if (active) setAvatarView({ source: currentAvatarUrl, url }); })
      .catch(() => { if (active) setAvatarView({ source: currentAvatarUrl, url: null }); });
    return () => { active = false; };
  }, [currentAvatarUrl]);
  const avatarViewUrl = avatarView.source === currentAvatarUrl ? avatarView.url : null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateMediaFile(file, 'avatar');
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!isSupabaseConfigured || !user) {
      setError('Supabase is not configured.');
      return;
    }

    setError(null);
    setUploading(true);

    let uploadedPath = null;
    try {
      uploadedPath = await uploadPrivateMedia('avatars', file, 'avatar', user.id);
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: uploadedPath })
        .eq('id', user.id);
      if (profileError) throw profileError;
      const viewUrl = await resolvePrivateMediaUrl('avatars', uploadedPath);
      setAvatarView({ source: uploadedPath, url: viewUrl });
      setSuccess(true);
      if (onAvatarUpdated) onAvatarUpdated(uploadedPath);
      await refreshProfile();
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      if (uploadedPath) {
        try { await removePrivateMedia('avatars', uploadedPath); } catch { /* best-effort cleanup */ }
      }
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
          {avatarViewUrl ? (
            <img
              src={avatarViewUrl}
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
