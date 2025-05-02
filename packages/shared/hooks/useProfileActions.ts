import { useShopContext } from '@mytutorapp/shared/context';
import { addToFavorites } from '@mytutorapp/shared/api';
import { toast } from 'react-toastify';
import type { AxiosError } from 'axios';

const useProfileActions = () => {
  const { backendUrl, token } = useShopContext();

  const handleAddToFavorites = async (recipientId: string) => {
    try {
      const response = await addToFavorites(backendUrl, token, recipientId);
      toast.success(response.data.message || 'Added to favorites');
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>;
      console.error('Failed to add to favorites:', axiosError);
      toast.error(axiosError.response?.data?.message || 'Failed to add to favorites');
    }
  };

  return { handleAddToFavorites };
};

export default useProfileActions;
