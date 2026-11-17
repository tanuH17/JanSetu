import React, { useState, useEffect } from 'react';
import { X, Loader2, FolderGit2, IndianRupee, Upload, Trash2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Alert from '../common/Alert';
import { removePrivateMedia, uploadPrivateMedia, validateMediaFile } from '../../lib/media';

const PROJECT_CATEGORIES = [
  'Roads & Civic Infrastructure',
  'Water Distribution & Pipelines',
  'Sewerage & Urban Drainage',
  'Electrical Grid & Streetlights',
  'Public Health Facilities',
  'School & Educational Amenities',
  'Parks & Green Spaces',
  'Community Centers & Markets',
];

export default function CreateProjectModal({
  isOpen,
  onClose,
  onCreated,
  constituency,
  district,
}) {
  const { user, profile } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(PROJECT_CATEGORIES[0]);
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [budgetInr, setBudgetInr] = useState('');
  const [status, setStatus] = useState('planned');
  const [startDate, setStartDate] = useState('');
  const [targetCompletion, setTargetCompletion] = useState('');
  const [projectLocation, setProjectLocation] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const mediaInputRef = React.useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Load departments
  useEffect(() => {
    let mounted = true;
    async function fetchDepts() {
      if (!isSupabaseConfigured) return;
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('id, name, code')
          .order('name');
        if (error) throw error;
        if (mounted && data) {
          setDepartments(data);
        }
      } catch (loadError) {
        console.error('Could not load departments for project form.', loadError);
      }
    }
    fetchDepts();
    return () => {
      mounted = false;
    };
  }, []);

  if (!isOpen) return null;

  function resetForm() {
    setTitle('');
    setDescription('');
    setCategory(PROJECT_CATEGORIES[0]);
    setBudgetInr('');
    setStatus('planned');
    setStartDate('');
    setTargetCompletion('');
    setProjectLocation('');
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    setError(null);
    setSuccess(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || title.trim().length < 5) {
      setError('Project title must be at least 5 characters.');
      return;
    }
    if (!description.trim() || description.trim().length < 15) {
      setError('Project description must be at least 15 characters.');
      return;
    }

    if (!isSupabaseConfigured || !user || !profile) {
      setError('Supabase is not configured or your account profile is unavailable.');
      return;
    }
    const targetConstituency = constituency || profile.constituency;
    const targetDistrict = district || profile.district;
    if (!targetConstituency || !targetDistrict || !departmentId) {
      setError('Your assigned constituency, district, and a responsible department are required.');
      return;
    }
    if (targetCompletion && startDate && targetCompletion < startDate) {
      setError('Expected completion date must be on or after the start date.');
      return;
    }

    setLoading(true);
    let uploadedProjectPath = null;
    try {
      const projectId = crypto.randomUUID();
      if (mediaFile) {
        uploadedProjectPath = await uploadPrivateMedia('project-media', mediaFile, 'project', `${user.id}/${projectId}`);
      }
      const insertPayload = {
        id: projectId,
        title: title.trim(),
        description: description.trim(),
        category,
        location_text: projectLocation.trim(),
        department_id: departmentId || null,
        district: targetDistrict,
        constituency: targetConstituency,
        budget_inr: budgetInr ? parseFloat(budgetInr) : 0,
        status,
        start_date: startDate || null,
        target_completion: targetCompletion || null,
        project_image_url: mediaFile?.type.startsWith('image/') ? uploadedProjectPath : null,
        video_url: mediaFile?.type.startsWith('video/') ? uploadedProjectPath : null,
      };

      const { data, error: insertError } = await supabase
        .from('public_projects')
        .insert([insertPayload])
        .select('*, departments(name, code)')
        .single();

      if (insertError) throw insertError;
      if (!data) throw new Error('The project was not returned by the database. Refresh and verify before retrying.');
      const created = data;

      setSuccess(true);
      if (onCreated) onCreated(created);

      setTimeout(() => {
        resetForm();
        onClose();
      }, 1200);
    } catch (err) {
      if (uploadedProjectPath) {
        try { await removePrivateMedia('project-media', uploadedProjectPath); } catch { /* best-effort cleanup */ }
      }
      setError(err.message || 'Failed to create development project.');
    } finally {
      setLoading(false);
    }
  }

  function handleMediaChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const validationError = validateMediaFile(file, 'project');
    if (validationError) {
      setError(validationError);
      event.target.value = '';
      return;
    }
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setError(null);
  }

  function removeMedia() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    if (mediaInputRef.current) mediaInputRef.current.value = '';
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="relative bg-white rounded-3xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proj-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <div>
              <h3 id="proj-modal-title" className="text-base font-bold text-slate-900">
                Register Constituency Development Project
              </h3>
              <p className="text-xs text-slate-500">
                Track civic capital works for {constituency || 'Constituency'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
          {success && (
            <Alert
              type="success"
              message="Public development project registered and added to constituency tracking."
            />
          )}

          {/* Title */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Project Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ring Road Overbridge &amp; Stormwater Drainage Upgrade"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Infrastructure Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {PROJECT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Executing Department <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">Select a department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Detailed Scope &amp; Deliverables <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline project objectives, contractor details, citizen benefits, and milestones…"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Budget & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Estimated Budget (INR)
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <IndianRupee className="w-3.5 h-3.5" />
                </div>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={budgetInr}
                  onChange={(e) => setBudgetInr(e.target.value)}
                  placeholder="5000000"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Initial Project Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="planned">Proposed</option>
                <option value="in_progress">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>
          </div>

          {/* Dates & Location */}
          <div className="space-y-1">
            <label htmlFor="project-location" className="block text-xs font-semibold text-slate-700">Project locality or landmark</label>
            <input
              id="project-location"
              type="text"
              maxLength={180}
              value={projectLocation}
              onChange={(e) => setProjectLocation(e.target.value)}
              placeholder="Locality or public site name"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Project photo or video (optional)</label>
            {mediaPreview ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-2.5">
                {mediaFile.type.startsWith('video/') ? (
                  <video src={mediaPreview} controls className="w-24 h-16 rounded-lg bg-black object-cover" />
                ) : (
                  <img src={mediaPreview} alt="Project media preview" className="w-24 h-16 rounded-lg object-cover" />
                )}
                <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{mediaFile.name}</span>
                <button type="button" onClick={removeMedia} aria-label="Remove project media" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => mediaInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <Upload className="h-4 w-4" /> Add photo or video (up to 50 MB)
              </button>
            )}
            <input ref={mediaInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={handleMediaChange} className="hidden" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Commencement Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Target Completion Date
              </label>
              <input
                type="date"
                value={targetCompletion}
                onChange={(e) => setTargetCompletion(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering…</span>
                </>
              ) : (
                <span>Register Public Project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
