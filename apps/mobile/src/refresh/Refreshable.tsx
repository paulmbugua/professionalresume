import React from 'react';
import {
  RefreshControl,
  ScrollView,
  FlatList,
  type ScrollViewProps,
  type FlatListProps,
  Platform,
} from 'react-native';
import { useGlobalRefresh } from './GlobalRefreshProvider';

export function RefreshableScrollView(props: ScrollViewProps) {
  const { refreshing, refresh } = useGlobalRefresh();

  return (
    <ScrollView
      // Make sure the pull can engage even if content is short:
      contentContainerStyle={[
        { flexGrow: 1, minHeight: '120%' },
        props.contentContainerStyle,
      ]}
      // On iOS/Android make overscroll possible
      alwaysBounceVertical
      overScrollMode="always"
      // If your Navbar overlaps, push spinner below it
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          // visual tweaks (dark app)
          tintColor="#fff"               // iOS spinner
          colors={['#0ea5e9']}           // Android spinner colors
          progressBackgroundColor="#0f172a"
          progressViewOffset={Platform.select({ android: 56, ios: 0 })}
        />
      }
      {...props}
    />
  );
}

export function RefreshableFlatList<ItemT>(props: FlatListProps<ItemT>) {
  const { refreshing, refresh } = useGlobalRefresh();
  return (
    <FlatList
      // Same idea: allow pull even with few items
      contentContainerStyle={[
        { paddingBottom: 16, minHeight: '120%' },
        props.contentContainerStyle,
      ]}
      refreshing={refreshing}
      onRefresh={refresh}
      {...props}
    />
  );
}
