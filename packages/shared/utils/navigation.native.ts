import { useNavigation } from "@react-navigation/native";

export const useSafeNavigate = () => {
  const navigation = useNavigation();
  return navigation.navigate;
};
