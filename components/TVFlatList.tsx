import { FlatList, FlatListProps } from 'react-native';
import { getTVColumns, isTV } from './useTVDetect';

interface TVFlatListProps<T> extends FlatListProps<T> {
  // TV-aware column override
  tvColumns?: number;
}

export function TVFlatList<T>({
  numColumns,
  tvColumns,
  // TV-safe performance defaults
  removeClippedSubviews,
  initialNumToRender,
  maxToRenderPerBatch,
  windowSize,
  columnWrapperStyle,
  ...props
}: TVFlatListProps<T>) {
  const resolvedColumns = props.horizontal 
    ? undefined 
    : (isTV ? (tvColumns ?? getTVColumns()) : (numColumns ?? getTVColumns()));

  return (
    <FlatList<T>
      key={resolvedColumns}
      numColumns={resolvedColumns}
      // TV-তে removeClippedSubviews false রাখা ভালো
      // না হলে focus করা item render না হতে পারে
      removeClippedSubviews={isTV ? false : (removeClippedSubviews ?? true)}
      initialNumToRender={isTV ? 12 : (initialNumToRender ?? 20)}
      maxToRenderPerBatch={isTV ? 6 : (maxToRenderPerBatch ?? 10)}
      windowSize={isTV ? 3 : (windowSize ?? 5)}
      // TV-তে scroll indicator দেখা যায় না ভালোভাবে
      showsVerticalScrollIndicator={!isTV}
      showsHorizontalScrollIndicator={!isTV}
      columnWrapperStyle={(resolvedColumns ?? 1) > 1 ? columnWrapperStyle : undefined}
      {...props}
    />
  );
}