// /apps/mobile/src/screens/CookiePolicy.native.tsx
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

const CookiePolicy = () => {
  return (
    <ScrollView className="p-6 bg-white">
      <View className="mb-6">
        <Text className="text-3xl font-bold text-plum">
          Cookie Policy for FunzaSasa
        </Text>
        <Text className="text-sm text-gray-500 mt-2">
          Effective Date: 01-02-2025
        </Text>
      </View>

      <View className="mb-8">
        <Text className="text-2xl font-semibold text-primary">
          1. Introduction
        </Text>
        <Text className="text-base text-gray-800 mt-2 leading-relaxed">
          Welcome to FunzaSasa. This Cookie Policy explains how we use cookies and
          similar technologies on our website. By using our site, you consent to
          the use of cookies as described in this policy.
        </Text>
      </View>

      <View className="mb-8">
        <Text className="text-2xl font-semibold text-primary">
          2. What Are Cookies?
        </Text>
        <Text className="text-base text-gray-800 mt-2 leading-relaxed">
          Cookies are small text files placed on your device by websites you visit.
          They are widely used to make websites work efficiently and to provide
          information to site owners.
        </Text>
      </View>

      <View className="mb-8">
        <Text className="text-2xl font-semibold text-primary">
          3. How We Use Cookies
        </Text>
        <Text className="text-base text-gray-800 mt-2 leading-relaxed">
          We use cookies to:
        </Text>
        <View className="mt-2">
          <Text className="text-base text-gray-800 leading-relaxed">
            • Enhance User Experience: Remember your preferences and settings.
          </Text>
          <Text className="text-base text-gray-800 leading-relaxed">
            • Analytics: Understand how you use our site to improve functionality.
          </Text>
          <Text className="text-base text-gray-800 leading-relaxed">
            • Authentication: Keep you logged in as you navigate our site.
          </Text>
        </View>
      </View>

      <View className="mb-8">
        <Text className="text-2xl font-semibold text-primary">
          4. Types of Cookies We Use
        </Text>
        <View className="mt-2">
          <Text className="text-base text-gray-800 leading-relaxed">
            • Essential Cookies: Necessary for the operation of our website.
          </Text>
          <Text className="text-base text-gray-800 leading-relaxed">
            • Performance Cookies: Collect information about how visitors use our site.
          </Text>
          <Text className="text-base text-gray-800 leading-relaxed">
            • Functionality Cookies: Remember choices you make to improve your experience.
          </Text>
          <Text className="text-base text-gray-800 leading-relaxed">
            • Targeting Cookies: Track your browsing habits to deliver relevant advertisements.
          </Text>
        </View>
      </View>

      <View className="mb-8">
        <Text className="text-2xl font-semibold text-primary">
          5. Third-Party Cookies
        </Text>
        <Text className="text-base text-gray-800 mt-2 leading-relaxed">
          We may allow third-party service providers to place cookies on your device
          for analytics and advertising purposes. These providers include:
        </Text>
        <View className="mt-2">
          <Text className="text-base text-gray-800 leading-relaxed">
            • [List of Third-Party Providers]
          </Text>
        </View>
      </View>

      <View className="mb-8">
        <Text className="text-2xl font-semibold text-primary">
          6. Managing Cookies
        </Text>
        <Text className="text-base text-gray-800 mt-2 leading-relaxed">
          You can control and manage cookies through your device settings.
          However, disabling cookies may affect the functionality of our website.
        </Text>
      </View>

      <View className="mb-8">
        <Text className="text-2xl font-semibold text-primary">
          7. Changes to This Policy
        </Text>
        <Text className="text-base text-gray-800 mt-2 leading-relaxed">
          We may update this Cookie Policy from time to time. We encourage you
          to review this policy periodically for any changes.
        </Text>
      </View>

      <View>
        <Text className="text-2xl font-semibold text-primary">
          8. Contact Us
        </Text>
        <Text className="text-base text-gray-800 mt-2 leading-relaxed">
          If you have any questions about our use of cookies, please contact us at:
        </Text>
        <Text className="text-base text-gray-800 mt-2 leading-relaxed">
          +254 720 423 764
        </Text>
      </View>
    </ScrollView>
  );
};

export default CookiePolicy;
