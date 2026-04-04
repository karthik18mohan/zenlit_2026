// Dynamic Expo config to allow environment-driven values
// This file lets us derive iOS URL schemes from .env instead of hardcoding.

import { ConfigContext, ExpoConfig } from "expo/config";

const uniqueSchemes = (schemes: Array<string | undefined>): string[] =>
  Array.from(new Set((schemes.filter(Boolean) as string[])));

const removeTrailingSlash = (value?: string): string | undefined =>
  typeof value === "string" && value.trim().length ? value.trim().replace(/\/$/, "") : undefined;

type PluginConfig = NonNullable<ExpoConfig["plugins"]>[number];

type ConfigExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  webBaseUrl?: string;
  supportEmail?: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
  accountDeletionUrl?: string;
  eas?: ExpoConfig["extra"];
  router?: ExpoConfig["extra"];
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const existingExtra = (config.extra ?? {}) as ConfigExtra;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? existingExtra.supabaseUrl;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? existingExtra.supabaseAnonKey;
  const webBaseUrl = removeTrailingSlash(process.env.EXPO_PUBLIC_WEB_BASE_URL ?? existingExtra.webBaseUrl);
  const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? existingExtra.supportEmail;
  const privacyPolicyUrl =
    removeTrailingSlash(process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? existingExtra.privacyPolicyUrl) ||
    (webBaseUrl ? `${webBaseUrl}/privacy` : undefined);
  const termsUrl =
    removeTrailingSlash(process.env.EXPO_PUBLIC_TERMS_URL ?? existingExtra.termsUrl) ||
    (webBaseUrl ? `${webBaseUrl}/terms` : undefined);
  const accountDeletionUrl =
    removeTrailingSlash(process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL ?? existingExtra.accountDeletionUrl) ||
    (webBaseUrl ? `${webBaseUrl}/delete-account` : undefined);

  const buildPropertiesPluginConfig: PluginConfig = [
    "expo-build-properties",
    {
      android: {
        compileSdkVersion: 35,
        targetSdkVersion: 35,
        buildToolsVersion: "35.0.0",
      },
    },
  ];

  // Ensure redirectScheme is a string, even if config.scheme is an array
  const configSchemeString = Array.isArray(config.scheme)
    ? config.scheme[0]
    : config.scheme;
  const redirectScheme: string = configSchemeString || "zenlit";

  const existingInfoPlistSchemes: string[] =
    Array.isArray(config?.ios?.infoPlist?.CFBundleURLTypes) &&
    config.ios?.infoPlist?.CFBundleURLTypes?.[0]?.CFBundleURLSchemes
      ? (config.ios!.infoPlist!.CFBundleURLTypes![0]!.CFBundleURLSchemes as string[])
      : [];

  const configSchemesArray: string[] = Array.isArray(config.scheme)
    ? (config.scheme as string[])
    : (config.scheme ? [config.scheme as string] : []);

  const mergedSchemes = uniqueSchemes([
    redirectScheme,
    ...configSchemesArray,
    ...existingInfoPlistSchemes,
  ]);

  const existingPlugins = config.plugins ?? [];
  const hasBuildPropertiesPlugin = existingPlugins.some((plugin) => {
    if (typeof plugin === "string") {
      return plugin === "expo-build-properties";
    }
    return Array.isArray(plugin) && plugin[0] === "expo-build-properties";
  });
  const mergedPlugins = hasBuildPropertiesPlugin
    ? existingPlugins.map((plugin) => {
        if (
          (typeof plugin === "string" && plugin === "expo-build-properties") ||
          (Array.isArray(plugin) && plugin[0] === "expo-build-properties")
        ) {
          return buildPropertiesPluginConfig;
        }
        return plugin;
      })
    : [...existingPlugins, buildPropertiesPluginConfig];

  const result: ExpoConfig = {
    ...config,
    // Ensure required top-level fields are present for typing
    name: config.name ?? "zenlit",
    slug: config.slug ?? "zenlit",
    owner: "arjungowdal4601",
    scheme: redirectScheme,
    ios: {
      ...(config.ios ?? {}),
      bundleIdentifier: "com.arjungowdal4601.zenlit",
      infoPlist: {
        ...(config.ios?.infoPlist ?? {}),
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: mergedSchemes,
          },
        ],
      },
    },
    android: {
      ...(config.android ?? {}),
      package: "com.arjungowdal4601.zenlit",
    },
    runtimeVersion: {
      policy: "sdkVersion",
    },
    plugins: mergedPlugins,
    extra: {
      ...(config.extra ?? {}),
      supabaseUrl,
      supabaseAnonKey,
      webBaseUrl,
      supportEmail,
      privacyPolicyUrl,
      termsUrl,
      accountDeletionUrl,
      eas: config.extra?.eas,
      router: config.extra?.router,
    },
  };

  return result;
};
