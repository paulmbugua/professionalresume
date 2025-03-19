import { Platform } from "react-native";

let useSafeNavigate: any;

if (Platform.OS === "web") {
  const navigation = require("./navigation.web");
  useSafeNavigate = navigation.useSafeNavigate;
} else {
  const navigation = require("./navigation.native");
  useSafeNavigate = navigation.useSafeNavigate;
}

export { useSafeNavigate };
