/**
 * https://gist.github.com/andigu/dbd407baecc16ab073f3ede5e0f009f7
 * https://github.com/jichang/react-native-parallax-scrollable-tab-view/blob/master/src/ScrollableTabView.tsx
 */
import React, {createRef} from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleProp,
  Animated,
  Text
} from "react-native";

const screenWidth = Dimensions.get("window").width;

export class ScrollableTabView extends React.PureComponent {

  onMomentumScrollEnd = ({
    nativeEvent: {
      contentOffset: { x }
    }
  }) => {
    let { activeTabKey, tabs } = this.props;
    let page = Math.floor(x / screenWidth);
    let tab = tabs[page];
    if (tab.key !== activeTabKey) {
      this.props.onTabChange({ tab });
    }
  };

  render() {
    const { activeTabKey, tabs, renderTab } = this.props;
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollview}
          pagingEnabled={true}
          horizontal
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={this.onMomentumScrollEnd}
        >
          {tabs.map(tab => {
            const isActive = tab.key === activeTabKey;

            return (
              <View style={styles.tab} key={tab.key}>
                {renderTab({
                  isActive,
                  tab
                })}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }
}

export class ParallaxScrollableTabView extends React.Component {
  parallaxOffset = 0;
  tabRefs = new Map();
  tabScrollOffsets = new Map();
  tabParallaxInterpolateLowerBounds = new Map();
  tabScrollOffsetValues = new Map();

  constructor(props) {
    super(props);

    let { activeTabKey, tabs } = this.props;

    for (let tab of tabs) {
      let tabRef = createRef();
      let scrollOffsetValue = new Animated.Value(0);

      this.tabRefs.set(tab.key, tabRef);
      this.tabScrollOffsets.set(tab.key, 0);
      this.tabParallaxInterpolateLowerBounds.set(tab.key, 0);
      this.tabScrollOffsetValues.set(tab.key, scrollOffsetValue);
    }

    this.state = {
      parallaxOffsetValue: this.generateParallaxOffsetValue(activeTabKey)
    };
  }

  generateParallaxOffsetValue(tabKey: string) {
    let { headerOffset } = this.props;
    let tabParallaxInterpolateLowerBound = this.tabParallaxInterpolateLowerBounds.get(
      tabKey
    );
    let tabScrollOffsetValue = this.tabScrollOffsetValues.get(
      tabKey
    );
    tabScrollOffsetValue.removeAllListeners();
    tabScrollOffsetValue.addListener(() => {});

    return tabScrollOffsetValue.interpolate({
      inputRange: [
        tabParallaxInterpolateLowerBound,
        tabParallaxInterpolateLowerBound + headerOffset
      ],
      outputRange: [0, -headerOffset],
      extrapolate: "clamp"
    });
  }

  checkParallaxInterpolateLowerBound(tabKey, offsetY) {
    if (offsetY < 0) {
      return;
    }

    let needRebind = false;
    const { headerOffset } = this.props;
    const tabParallaxInterpolateLowerBound = this.tabParallaxInterpolateLowerBounds.get(
      tabKey
    );
    // @ts-ignore
    const parallaxOffset = this.state.parallaxOffsetValue.__getValue();
    const tabScrollOffset = this.tabScrollOffsets.get(tabKey);
    const deltaY = offsetY - tabScrollOffset;
    if (
      Math.abs(parallaxOffset) === headerOffset &&
      tabParallaxInterpolateLowerBound !== 0
    ) {
      this.tabParallaxInterpolateLowerBounds.set(tabKey, 0);
      needRebind = true;
    } else if (
      deltaY > 0 &&
      parallaxOffset === 0 &&
      tabParallaxInterpolateLowerBound !== 0
    ) {
      this.tabParallaxInterpolateLowerBounds.set(tabKey, tabScrollOffset);
      needRebind = true;
    }

    if (needRebind) {
      this.setState({
        parallaxOffsetValue: this.generateParallaxOffsetValue(tabKey)
      });
    }
  }

  updateParallaxInterpolateLowerBound(tabKey: string) {
    const { headerOffset } = this.props;
    const tabScrollOffset = this.tabScrollOffsets.get(tabKey);
    if (tabScrollOffset <= -this.parallaxOffset) {
      this.tabScrollOffsets.set(tabKey, -this.parallaxOffset);
      this.tabParallaxInterpolateLowerBounds.set(tabKey, 0);
    } else if (this.parallaxOffset === -headerOffset) {
      this.tabParallaxInterpolateLowerBounds.set(tabKey, 0);
    } else {
      this.tabParallaxInterpolateLowerBounds.set(
        tabKey,
        tabScrollOffset + this.parallaxOffset
      );
    }
  }

  onTabChange = ({ tab }) => {
    this.updateParallaxInterpolateLowerBound(tab.key);

    this.setState({
      parallaxOffsetValue: this.generateParallaxOffsetValue(tab.key)
    });

    if (this.props.onTabChange) {
      this.props.onTabChange({ tab });
    }
  };

  synchronizeScrollOffsets() {
    // @ts-ignore
    const parallaxOffset = this.state.parallaxOffsetValue.__getValue();
    const delta = parallaxOffset - this.parallaxOffset;
    if (delta === 0) {
      return;
    }

    const { activeTabKey } = this.props;

    this.tabRefs.forEach((tabRef, tabKey) => {
      if (tabKey !== activeTabKey) {
        const tabScrollOffset = this.tabScrollOffsets.get(tabKey);
        const syncedScrollOffset = tabScrollOffset - delta;
        const tabScrollOffsetValue = this.tabScrollOffsetValues.get(tabKey);
        if (tabRef && tabRef.current) {
          tabRef.current.scrollToOffset({
            offset: syncedScrollOffset,
            animated: false
          });
        }
        this.tabScrollOffsets.set(tabKey, syncedScrollOffset);
        tabScrollOffsetValue.setValue(syncedScrollOffset);
      }
    });

    this.parallaxOffset = parallaxOffset;
  }

  onScroll = (tab) => {
    return Animated.event(
      [
        {
          nativeEvent: {
            contentOffset: {
              y: this.tabScrollOffsetValues.get(tab.key)
            }
          }
        }
      ],
      {
        useNativeDriver: true,
        listener: ({
          nativeEvent: {
            contentOffset: { y }
          }
        }) => {
          this.checkParallaxInterpolateLowerBound(tab.key, y);
          this.tabScrollOffsets.set(tab.key, y);
        }
      }
    );
  };

  onScrollBeginDrag = ({
    nativeEvent: {
      contentOffset: { y }
    }
  }) => {
    // @ts-ignore
    this.parallaxOffset = this.state.parallaxOffsetValue.__getValue();
  };

  onScrollEndDrag = ({
    nativeEvent: {
      contentOffset: { y }
    }
  }) => {
    this.synchronizeScrollOffsets();
  };

  onMomentumScrollEnd = ({
    nativeEvent: {
      contentOffset: { y }
    }
  }) => {
    this.synchronizeScrollOffsets();
  };

  render() {
    const {
      headerOffset,
      activeTabKey,
      tabs,
      renderTab,
      renderHeader
    } = this.props;
    const { parallaxOffsetValue } = this.state;

    return (
      <View
        style={[
          styles.container,
          {
            paddingTop: headerOffset
          }
        ]}
      >
        <ScrollableTabView
          activeTabKey={activeTabKey}
          tabs={tabs}
          onTabChange={this.onTabChange}
          renderTab={({ isActive, tab }) => {
            let ref = this.tabRefs.get(tab.key);

            return renderTab({
              ref,
              isActive,
              tab,
              onScroll: isActive ? this.onScroll(tab) : undefined,
              onScrollBeginDrag: isActive ? this.onScrollBeginDrag : undefined,
              onScrollEndDrag: isActive ? this.onScrollEndDrag : undefined,
              onMomentumScrollEnd: isActive
                ? this.onMomentumScrollEnd
                : undefined
            });
          }}
        ></ScrollableTabView>
        <Animated.View
          style={[
            styles.header,
            {
              transform: [
                {
                  translateY: parallaxOffsetValue
                }
              ]
            }
          ]}
        >
          {renderHeader({ offsetY: parallaxOffsetValue })}
        </Animated.View>
      </View>
    );
  }
}

const HEADER_OFFSET = 100;
export class Demo extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      activeTabKey: "tab 1",
      tabs: [
        {
          key: "tab 1",
          title: "Tab 1"
        },
        {
          key: "tab 2",
          title: "Tab 2"
        }
      ]
    };
  }

  render() {
    const { activeTabKey, tabs } = this.state;

    return (
      <View style={styles.container}>
        <ParallaxScrollableTabView
          headerOffset={HEADER_OFFSET}
          renderHeader={({ offsetY }) => {
            return (
              <Animated.View
                style={{
                  opacity: offsetY.interpolate({
                    inputRange: [0, HEADER_OFFSET],
                    outputRange: [1, 0.5],
                    extrapolate: "clamp"
                  }),
                  alignItems: "center",
                  justifyContent: "center",
                  height: HEADER_OFFSET * 2,
                  backgroundColor: "red"
                }}
              >
                <Text>{activeTabKey}</Text>
              </Animated.View>
            );
          }}
          activeTabKey={activeTabKey}
          tabs={tabs}
          renderTab={({
            ref,
            tab,
            onScroll,
            onScrollBeginDrag,
            onScrollEndDrag,
            onMomentumScrollEnd
          }) => {
            return (
              <Animated.FlatList
                ref={ref}
                key={tab.key}
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  top: HEADER_OFFSET
                }}
                renderItem={({ item }) => {
                  return (
                    <View style={{ height: 100 }} key={item.key}>
                      <Text>
                        {tab.key}
                        {item.key}
                      </Text>
                    </View>
                  );
                }}
                onScroll={onScroll}
                onScrollBeginDrag={onScrollBeginDrag}
                onScrollEndDrag={onScrollEndDrag}
                onMomentumScrollEnd={onMomentumScrollEnd}
                bounces={false}
                data={[
                  { key: "0" },
                  { key: "1" },
                  { key: "2" },
                  { key: "3" },
                  { key: "4" },
                  { key: "5" },
                  { key: "6" },
                  { key: "7" },
                  { key: "8" },
                  { key: "9" },
                  { key: "10" },
                  { key: "11" },
                  { key: "12" },
                  { key: "13" },
                  { key: "14" },
                  { key: "15" }
                ]}
              />
            );
          }}
          onTabChange={({ tab }) => {
            this.setState({
              activeTabKey: tab.key
            });
          }}
        ></ParallaxScrollableTabView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollview: {
    flex: 1
  },
  header: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0
  },
  tab: {
    flex: 1,
    width: screenWidth
  }
});
