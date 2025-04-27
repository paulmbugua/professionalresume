import React from 'react';
import { ScrollView, View, Text } from 'react-native';

const CookiePolicyNative: React.FC = () => {
  return (
    <ScrollView
      contentContainerClassName="p-6 bg-white rounded-lg shadow-md"
      className="flex-1 bg-white"
    >
      <Text className="text-3xl font-bold text-plum mb-6">
        Cookie Policy for FunzaSasa
      </Text>
      <Text className="text-sm text-gray-500 mb-8">
        Effective Date: 01-02-2025
      </Text>

      <View className="mb-8">
        <Text className="text-2xl font-semibold text-blue-500 mb-4">
          1. Introduction
        </Text>
        <Text className="text-base text-gray-800 leading-relaxed">
          Welcome to FunzaSasa. This Cookie Policy explains how we use cookies and
          similar technologies on our website. By using our site, you consent to
          the use of cookies as described in this policy.
        </Text>
      </View>

      <View className="mb-8">
        <Text className="text-2xl font-semibold text-blue-500 mb-4">
          2. What Are Cookies?
        </Text>
        <Text className="text-base text-gray-800 leading-relaxed">
          Cookies are small text files placed on your device by websites you visit.
          They are widely used to make websites work efficiently and to provide
          information to site owners.
        </Text>
      </View>

      <View className="mb-8">
        <Text className="text-2xl font-semibold text-blue-500 mb-4">
          3. How We Use Cookies
        </Text>
        <Text className="text-base text-gray-800 leading-relaxed mb-4">
          We use cookies to:
        </Text>
        <View className="ml-4">
          <Text className="text-base text-gray-800 mb-2">
            • Enhance User Experience: Remember your preferences and settings.
          </Text>
          <Text className="text-base text-gray-800 mb-2">
            • Analytics: Understand how you use our site to improve functionality.
          </Text>
          <Text className="text-base text-gray-800">
            • Authentication: Keep you logged in as you navigate our site.
          </Text>
        </View>
      </View>

      <View className="mb-8">
        <Text className="text-2xl font-semibold text-blue-500 mb-4">
          4. Types of Cookies We Use
        </Text>
        <View className="ml-4">
          <Text className="text-base text-gray-800 mb-2">
            • Essential Cookies: Necessary for the operation of our website.
          </Text>
          <Text className="text-base text-gray-800 mb-2">
            • Performance Cookies: Collect information about how visitors use our site.
          </Text>
          <Text className="text-base text-gray-800 mb-2">
            • Functionality Cookies: Remember choices you make to improve your experience.
          </Text>
          <Text className="text-base text-gray-800">
            • Targeting Cookies: Track your browsing habits to deliver relevant advertisements.
          </Text>
        </View>
      </View>

      <View className="mb-8">
        <Text className="text-2xl font-semibold text-blue-500 mb-4">
          5. Third-Party Cookies
        </Text>
        <Text className="text-base text-gray-800 leading-relaxed mb-4">
          We may allow third-party service providers to place cookies on your device for
          analytics and advertising purposes. These providers include:
        </Text>
        <View className="ml-4">
          <Text className="text-base text-gray-800">
            • [List of Third-Party Providers]
          </Text>
        </View>
      </View>

      <View className="mb-8">
        <Text className="text-2xl font-semibold text-blue-500 mb-4">
          6. Managing Cookies
        </Text>
        <Text className="text-base text-gray-800 leading-relaxed">
          You can control and manage cookies through your browser settings. However,
          disabling cookies may affect the functionality of our website.
        </Text>
      </View>

      <View className="mb-8">
        <Text className="text-2xl font-semibold text-blue-500 mb-4">
          7. Changes to This Policy
        </Text>
        <Text className="text-base text-gray-800 leading-relaxed">
          We may update this Cookie Policy from time to time. We encourage you to review
          this policy periodically for any changes.
        </Text>
      </View>

      <View>
        <Text className="text-2xl font-semibold text-blue-500 mb-4">
          8. Contact Us
        </Text>
        <Text className="text-base text-gray-800 leading-relaxed">
          If you have any questions about our use of cookies, please contact us at:
        </Text>
        <Text className="text-base text-gray-800 mt-2">
          +254 720 423 764
        </Text>
      </View>
    </ScrollView>
  );
};

export default CookiePolicyNative;
