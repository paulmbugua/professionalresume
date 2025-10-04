// apps/web/src/components/ClassVaultUpload.tsx
import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faCloudUploadAlt } from '@fortawesome/free-solid-svg-icons';
import { useShopContext } from '@mytutorapp/shared/context';
import { uploadClassVaultAsset, UploadResult } from '@mytutorapp/shared/api/classVaultUploadApi';
import useUploadClassVault, {
  CreateRecordedVideoPayload,
} from '@mytutorapp/shared/hooks/useUploadClassVault';

const SUBJECT_OPTIONS = [
  'Math',
  'Science',
  'English',
  'History',
  'Programming',
  'Art & Design',
  'Languages',
  'Wellness',
] as const;

const GRADE_OPTIONS = [
  'Pre-Primary',
  'Lower Primary',
  'Upper Primary',
  'High School',
  'University/College',
  'Adults',
] as const;

export default function ClassVaultUpload() {
  const navigate = useNavigate();
  const { role, backendUrl, token } = useShopContext();
  const { uploading: uploadingMeta, handleSubmitMetadata } = useUploadClassVault();

  // File-upload-specific state
  const [fileType, setFileType] = useState<'video' | 'pdf'>('video');
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Metadata fields
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [tags, setTags] = useState('');

  // 🔹 Shared input style (matches your other form)
  const inputBase =
    'w-full p-3 rounded-xl border border-[#cedbe8] dark:border-darkCard bg-slate-50 dark:bg-[#0f1821] text-[#0d141c] dark:text-darkTextPrimary';

  const labelTone = 'text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary';
  const subtleTone = 'text-sm text-[#49739c] dark:text-darkTextSecondary';
  const headingTone = 'text-2xl font-bold text-center text-pink-600';

  const toggleBtn = (active: boolean) =>
    `px-4 py-2 rounded focus:outline-none transition ring-1 ${
      active
        ? 'bg-pink-600 text-white ring-pink-500'
        : 'bg-[#e7edf4] text-[#49739c] dark:bg-[#172534] dark:text-darkTextSecondary ring-transparent hover:opacity-90'
    }`;

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !backendUrl || !token) return;

    try {
      setProgress(0);
      setUploadedUrl('');
      setUploadingFile(true);

      const { url }: UploadResult = await uploadClassVaultAsset(
        backendUrl,
        token,
        file,
        fileType,
        (pct) => setProgress(pct)
      );

      setProgress(100);
      setUploadedUrl(url);
    } catch (err: any) {
      alert('Upload failed: ' + (err.message || err));
      setProgress(0);
      setUploadedUrl('');
    } finally {
      setUploadingFile(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !subject || !gradeLevel || !price || !uploadedUrl) {
      alert('Please fill all required fields and select a file.');
      return;
    }

    const payload: CreateRecordedVideoPayload = {
      title,
      subject,
      grade_level: gradeLevel,
      price: Number(price),
      duration: duration ? Number(duration) : undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      video_url: fileType === 'video' ? uploadedUrl : '',
      pdf_url: fileType === 'pdf' ? uploadedUrl : '',
    };

    try {
      await handleSubmitMetadata(payload);
      alert('Success! Your content is now uploaded.');
      setProgress(0);
      setUploadedUrl('');
      navigate(-1);
    } catch (err: any) {
      alert('Submission failed: ' + (err.message || err));
    }
  };

  if (role === null) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-darkBg">
        <p className="text-[#49739c] dark:text-darkTextSecondary">Checking permissions…</p>
      </div>
    );
  }
  if (role !== 'tutor') {
    return (
      <div className="flex items-center justify-center h-64 p-4 bg-slate-50 dark:bg-darkBg">
        <p className="text-red-600 dark:text-red-400 text-center text-lg">
          Access Denied<br />Only tutors can upload content.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-darkBg py-10 sm:py-16 px-3 sm:px-4">
      <form
        onSubmit={onSubmit}
        className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6 rounded-2xl border border-[#cedbe8] 
                   dark:border-darkCard bg-white dark:bg-[#0f1821] shadow-sm 
                   text-[#0d141c] dark:text-darkTextPrimary"
      >
        <h2 className={headingTone}>Upload To Earn!</h2>

        {/* Title */}
        <div>
          <label className={`${labelTone} block mb-1`}>Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputBase}
            placeholder="Enter class title"
            required
          />
        </div>

        {/* Subject */}
        <div>
          <label className={`${labelTone} block mb-1`}>Subject *</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputBase}
            required
          >
            <option value="" disabled>Select Subject…</option>
            {SUBJECT_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Grade Level */}
        <div>
          <label className={`${labelTone} block mb-1`}>Grade Level *</label>
          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className={inputBase}
            required
          >
            <option value="" disabled>Select Grade Level…</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Price */}
        <div>
          <label className={`${labelTone} block mb-1`}>
            Price in Tokens (1 Token = $1) *
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputBase}
            placeholder="e.g. 5"
            min={1}
            required
          />
        </div>

        {/* Duration */}
        <div>
          <label className={`${labelTone} block mb-1`}>Duration (mins)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={inputBase}
            placeholder="Optional"
            min={0}
          />
        </div>

        {/* Tags */}
        <div>
          <label className={`${labelTone} block mb-1`}>Tags</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className={inputBase}
            placeholder="comma-separated keywords"
          />
          <p className={`${subtleTone} mt-1`}>
            E.g.: <span className="text-pink-600">fractions, addition, grade1</span>
          </p>
        </div>

        {/* File Type Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setFileType('video'); setUploadedUrl(''); setProgress(0); }}
            className={toggleBtn(fileType === 'video')}
          >
            Video
          </button>
          <span className="text-[#49739c] dark:text-darkTextSecondary font-medium">or</span>
          <button
            type="button"
            onClick={() => { setFileType('pdf'); setUploadedUrl(''); setProgress(0); }}
            className={toggleBtn(fileType === 'pdf')}
          >
            Class Notes
          </button>
        </div>

        {/* File Picker */}
        <div>
          <label className={`${labelTone} block mb-1`}>
            {uploadingFile
              ? 'Uploading…'
              : uploadedUrl
              ? `✅ ${fileType === 'video' ? 'Video uploaded' : 'PDF selected'}`
              : `Select ${fileType === 'video' ? 'Video' : 'PDF'} *`}
          </label>

          <div className="flex items-center mb-2">
            <FontAwesomeIcon
              icon={faCloudUploadAlt as IconProp}
              className="mr-2 text-[#49739c] dark:text-darkTextSecondary"
            />
            <input
              type="file"
              accept={fileType === 'video' ? 'video/*' : 'application/pdf'}
              onChange={onFileChange}
              disabled={uploadingFile}
              className="focus:outline-none text-[#0d141c] dark:text-darkTextPrimary"
              required={!uploadedUrl}
            />
          </div>

          {/* Progress Bar */}
          {uploadingFile && (
            <div className="space-y-1">
              <div className="w-full h-2 rounded overflow-hidden bg-[#e7edf4] dark:bg-[#172534]">
                <div
                  className="h-full bg-pink-600 transition-all duration-300 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-right text-sm text-[#49739c] dark:text-darkTextSecondary">
                {progress}%
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={uploadingMeta}
          className="w-full py-3 rounded-lg text-white bg-[#3d99f5] hover:brightness-110 transition disabled:opacity-50"
        >
          {uploadingMeta ? 'Submitting…' : 'Submit ClassVault'}
        </button>
      </form>
    </div>
  );
}
