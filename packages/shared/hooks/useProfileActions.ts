// /packages/shared/hooks/useProfileActions.ts
import { useContext } from 'react';
import { ShopContext } from '../context/ShopContext';
import { addToFavorites } from '../api/profileActionsApi';
import { toast } from 'react-toastify';

export const useProfileActions = () => {
  const { backendUrl, token } = useContext(ShopContext);

  const handleAddToFavorites = async (recipientId: string) => {
    try {
      const response = await addToFavorites(backendUrl, token, recipientId);
      toast.success(response.data.message || 'Added to favorites');
    } catch (error: any) {
      console.error('Failed to add to favorites:', error);
      toast.error(error.response?.data?.message || 'Failed to add to favorites');
    }
  };

  return { handleAddToFavorites };
};
