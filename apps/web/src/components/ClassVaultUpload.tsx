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
        pct => setProgress(pct)
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
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
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
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Checking permissions…</p>
      </div>
    );
  }
  if (role !== 'tutor') {
    return (
      <div className="flex items-center justify-center h-64 p-4">
        <p className="text-red-600 text-center text-lg">
          Access Denied<br />Only tutors can upload content.
        </p>
      </div>
    );
  }

  return (
    <div className="py-16"> {/* ✅ top and bottom padding */}
      <form
        onSubmit={onSubmit}
        className="max-w-xl mx-auto p-6 space-y-6 bg-white rounded-lg shadow"
      >
        <h2 className="text-2xl font-bold text-center text-pink-600">
          Upload To Earn!
        </h2>

        {/* Title */}
        <div>
          <label className="block mb-1 text-gray-700">Title *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
            placeholder="Enter class title"
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block mb-1 text-gray-700">Subject *</label>
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
          >
            <option value="">Select Subject…</option>
            {SUBJECT_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Grade Level */}
        <div>
          <label className="block mb-1 text-gray-700">Grade Level *</label>
          <select
            value={gradeLevel}
            onChange={e => setGradeLevel(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
          >
            <option value="">Select Grade Level…</option>
            {GRADE_OPTIONS.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Price */}
        <div>
          <label className="block mb-1 text-gray-700">
            Price in Tokens (1 Token=10Kshs) *
          </label>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
            placeholder="e.g. 50"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block mb-1 text-gray-700">Duration (mins)</label>
          <input
            type="number"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
            placeholder="Optional"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block mb-1 text-gray-700">Tags</label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
            placeholder="comma-separated keywords"
          />
          <p className="text-sm text-gray-500 mt-1">
            E.g.: <span className="text-pink-600">fractions, addition, grade1</span>
          </p>
        </div>

        {/* File Type Toggle */}
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => { setFileType('video'); setUploadedUrl(''); setProgress(0); }}
            className={`px-4 py-2 rounded focus:outline-none ${
              fileType === 'video' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Video
          </button>
          <span className="text-gray-500 font-medium">or</span>
          <button
            type="button"
            onClick={() => { setFileType('pdf'); setUploadedUrl(''); setProgress(0); }}
            className={`px-4 py-2 rounded focus:outline-none ${
              fileType === 'pdf' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Class Notes
          </button>
        </div>

        {/* File Picker */}
        <div>
          <label className="block mb-1 text-gray-700">
            {uploadingFile
              ? `Uploading… ${progress}%`
              : uploadedUrl
              ? `✅ ${fileType === 'video' ? 'Video Selected' : 'PDF Selected'}`
              : `Select ${fileType === 'video' ? 'Video' : 'PDF'} *`}
          </label>
          <div className="flex items-center mb-2">
            <FontAwesomeIcon icon={faCloudUploadAlt as IconProp} className="text-gray-600 mr-2" />
            <input
              type="file"
              accept={fileType === 'video' ? 'video/*' : 'application/pdf'}
              onChange={onFileChange}
              disabled={uploadingFile}
              className="focus:outline-none"
            />
          </div>

          {/* Progress Bar */}
          {uploadingFile && (
            <div className="space-y-1">
              <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-full bg-pink-600 transition-all duration-300 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-right text-sm text-gray-600">
                {progress}%
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={uploadingMeta}
          className="w-full py-3 bg-pink-600 text-white rounded hover:bg-pink-700 transition disabled:opacity-50"
        >
          {uploadingMeta ? 'Submitting…' : 'Submit ClassVault'}
        </button>
      </form>
    </div>
  );
}
