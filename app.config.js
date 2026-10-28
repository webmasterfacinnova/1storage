import "dotenv/config";

const appEnvironment = process.env.EXPO_PUBLIC_APP_ENVIRONMENT ?? "production";

let appName = "OneStorage";
let appPackage = "com.facinnova.onestorage";

if (appEnvironment === "development") {
  // Development environment settings
  appName = "OneStorage Dev";
  appPackage = "com.facinnova.onestorage.dev";
}

if (appEnvironment === "preview") {
  // Preview (staging) environment settings
  appName = "OneStorage staging";
  appPackage = "com.facinnova.onestorage.staging";
}

export default {
  expo: {
    name: appName,
    slug: "1storage",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    updates: {
      fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: appPackage,
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleTypeRole: "Editor",
            CFBundleURLName: "com.onestorage.app",
            CFBundleURLSchemes: ["onestorage"],
          },
        ],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: appPackage,
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "onestorage",
              host: "*",
              pathPrefix: "/",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      favicon: "./assets/images/favicon.png",
    },
    plugins: ["@react-native-google-signin/google-signin"],
    scheme: "onestorage",
    extra: {
      appScheme: "onestorage",
      appName: appName,
      eas: {
        projectId: "adac947d-77f4-4094-83f1-852835305ffe",
      },
    },
    owner: "facinnova",
  },
};
