import { Platform } from "react-native";

export const useNavigation = Platform.select({
  web: () => require("./navigation.web").useNavigation,
  default: () => require("./navigation.native").useNavigation,
})();
