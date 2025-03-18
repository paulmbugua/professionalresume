import { useNavigate } from "react-router-dom"; // ✅ Web-only import

export const useNavigation = () => {
  return useNavigate();
};
