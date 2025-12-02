import React, { forwardRef } from 'react';
import {
  RefreshControl,
  ScrollView,
  FlatList,
  type ScrollViewProps,
  type FlatListProps,
  Platform,
} from 'react-native';
import { useGlobalRefresh } from './GlobalRefreshProvider';

type RefreshableScrollViewProps = ScrollViewProps;

/**
 * ScrollView wrapper that:
 * - hooks into GlobalRefreshProvider
 * - supports ref={scrollRef}
 */
export const RefreshableScrollView = forwardRef<
  ScrollView,
  RefreshableScrollViewProps
>((props, ref) => {
  const { refreshing, refresh } = useGlobalRefresh();
  const { contentContainerStyle, ...restProps } = props;

  return (
    <ScrollView
      ref={ref}
      // Make sure the pull can engage even if content is short:
      contentContainerStyle={[
        { flexGrow: 1, minHeight: '120%' },
        contentContainerStyle,
      ]}
      // On iOS/Android make overscroll possible
      alwaysBounceVertical
      overScrollMode="always"
      // Pull-to-refresh wired to global refresh
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          // visual tweaks (dark app)
          tintColor="#fff" // iOS spinner
          colors={['#0ea5e9']} // Android spinner colors
          progressBackgroundColor="#0f172a"
          progressViewOffset={Platform.select({ android: 56, ios: 0 })}
        />
      }
      {...restProps}
    />
  );
});

RefreshableScrollView.displayName = 'RefreshableScrollView';

export function RefreshableFlatList<ItemT>(props: FlatListProps<ItemT>) {
  const { refreshing, refresh } = useGlobalRefresh();
  const { contentContainerStyle, ...restProps } = props;

  return (
    <FlatList
      // Same idea: allow pull even with few items
      contentContainerStyle={[
        { paddingBottom: 16, minHeight: '120%' },
        contentContainerStyle,
      ]}
      refreshing={refreshing}
      onRefresh={refresh}
      {...restProps}
    />
  );
}
