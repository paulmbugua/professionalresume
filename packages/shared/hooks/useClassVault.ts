import { useEffect, useState } from 'react';
import {
  fetchAllVideos,
  fetchVideoById,
  fetchDownloadResources,
} from '@mytutorapp/shared/api/classVaultApi';
import type { RecordedVideo } from '@mytutorapp/shared/types';

export const useClassVault = () => {
  const [videos, setVideos] = useState<RecordedVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllVideos()
      .then(setVideos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { videos, loading };
};

export const useClassVaultDetail = (videoId: number, token?: string) => {
  const [video, setVideo] = useState<RecordedVideo | null>(null);
  const [resources, setResources] = useState<{ video_url: string; pdf_url: string } | null>(null);
  const [error, setError] = useState('');

  const loadVideo = async () => {
    try {
      const data = await fetchVideoById(videoId);
      setVideo(data);
    } catch (err) {
      setError('Failed to load video');
    }
  };

  const unlockContent = async () => {
    try {
      if (!token) throw new Error('Unauthorized');
      const res = await fetchDownloadResources(videoId, token);
      setResources(res);
    } catch (err) {
      setError('Purchase required or access denied');
    }
  };

  useEffect(() => {
    loadVideo();
  }, [videoId]);

  return { video, resources, unlockContent, error };
};
