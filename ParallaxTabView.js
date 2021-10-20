/**
 * https://gist.github.com/andigu/dbd407baecc16ab073f3ede5e0f009f7
 * https://github.com/jichang/react-native-parallax-scrollable-tab-view/blob/master/src/ScrollableTabView.tsx
 */
import React, { createRef } from "react";
import {
  StatusBar,
  StyleSheet,
  View,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleProp,
  Animated,
  Text,
  Platform,
  TouchableOpacity,
  NativeModules,
} from "react-native";
import SceneView from "./SceneView";
import ScrollableTabView from "./ScrollableTabView";
import ScrollableTabBar from "./ScrollableTabBar";

const { width: screenWidth, height } = Dimensions.get("window");
const { StatusBarManager } = NativeModules;

const screenHeight =
  Platform.OS === "ios"
    ? height
    : height / screenWidth > 1.8
    ? height + StatusBarManager.HEIGHT * 2
    : height;

const statusBarHeight = StatusBar.currentHeight || 0;
const navigationBarHeight = Platform.OS === "ios" ? 44 : 50;
const scrollTabBarHeight = 50;
const footerBarHeight = 0;

export default class ParallaxTabView extends React.Component {
  static defaultProps = {
    onEndReachedThreshold: 0.5,
    parallaxType: "follow",
    setContainerHeight: true,
  };

  currentOffset = 0;
  childRefs = [];

  nScroll = new Animated.Value(0);
  scroll = new Animated.Value(0);
  SCREEN_HEIGHT = 0;
  initailViewHeight = 0;
  tabs;
  scrollView: RefObject<ScrollView>;

  constructor(props) {
    super(props);

    this.screenHeight = screenHeight;

    this.initailViewHeight =
      this.screenHeight -
      (props.disableNavigationBarHeight ? 0 : statusBarHeight) -
      (props.disableNavigationBarHeight ? 0 : navigationBarHeight) -
      scrollTabBarHeight -
      footerBarHeight;

    this.nScroll.addListener(
      Animated.event([{ value: this.scroll }], { useNativeDriver: false })
    );
    const { estimateHeight = 100, children } = this.props;

    this.state = {
      children,
      activeTab: 0,
      height: this.initailViewHeight,
      headerHeight: 0,
      heights: new Array(children.length).fill(this.initailViewHeight),
      offsets: new Array(children.length).fill(0),
      tabY: this.nScroll.interpolate({
        inputRange: [0, estimateHeight, estimateHeight + 1],
        outputRange: [0, 0, 1],
      }),
      haderTabY: this.nScroll.interpolate({
        inputRange: [0, estimateHeight, estimateHeight + 1],
        outputRange: [0, 0, 1],
      }),
      scrollY: 0,
    };

    this.scrollView = React.createRef();
  }

  UNSAFE_componentWillReceiveProps(nextProps: ParallaxProps) {
    if (nextProps.children && nextProps.children != this.state.children) {
      this.setState({ children: nextProps.children });
    }
  }

  componentDidMount() {}

  // 获取子组件
  _children(children = this.state.children) {
    const { headerHeight } = this.state;
    const childrens = React.Children.map(children, (child, index) => {
      const ref = `_child${index}`;
      this.childRefs.push(ref);
      return React.cloneElement(child, {
        ref,
        headerHeight,
      });
    });
    return childrens;
  }

  _handleScroll = (e: any) => {
    const { activeTab, scrollY, height, headerHeight, offsets } = this.state;
    const {
      onEndReachedThreshold = 0,
      lineColors,
      onParallaxScroll,
    } = this.props;
    const offsetY = e.nativeEvent.contentOffset.y;

    onParallaxScroll && onParallaxScroll(this.scroll);

    let contentSize = headerHeight + scrollTabBarHeight + height;
    let dValue =
      contentSize - offsetY - this.initailViewHeight - scrollTabBarHeight;

    offsets[activeTab] = offsetY;
    this.currentOffset = offsetY;
    const childRef = this.childRefs[activeTab];
    if (this.refs[childRef]) {
      const loadMore = this.refs[childRef];
      if (dValue < this.screenHeight * onEndReachedThreshold) {
        loadMore.handleLoadMore && loadMore.handleLoadMore();
      }

      if (loadMore.isEmpty && loadMore.isEmpty()) {
        const offsetDValue = offsetY - offsets[activeTab];
        loadMore.scrollEmptyView && loadMore.scrollEmptyView(offsetDValue);
      }
    }
  };

  goToPage(pageNumber: number) {
    this.tabs.goToPage(pageNumber);
  }

  render() {
    const {
      renderHeader,
      containerStyle,
      headerStyle,
      tabStyle,
      tabBarUnderlineStyle,
      tabBarInactiveTextColor,
      childContainerStyle,
      tabBarActiveTextColor,
      tabsContainerStyle,
      parallaxType,
      onChangeTab,
      footerHeight,
      refreshControl,
      lineColors,
      headerStopTop,
      locked,
      setContainerHeight,
      tabBarStyle,
      estimateUnderLineLeft,
      contentInsetAdjustmentBehavior,
      disableNavigationBarHeight,
    } = this.props;
    const { height, headerHeight, activeTab, scrollY, heights, offsets } =
      this.state;
    const childrens = this._children();
    let tabBarProps = {
      tabs: childrens.map((child) => child.props.tabLabel),
      childrens,
      activeTab: activeTab,
    };

    const footerH = footerHeight && footerHeight > 0 ? footerHeight : 0;
    let scrollViewHeight =
      this.screenHeight -
      (disableNavigationBarHeight ? 0 : statusBarHeight) -
      (disableNavigationBarHeight ? 0 : navigationBarHeight) -
      footerBarHeight;
    scrollViewHeight = footerHeight
      ? scrollViewHeight - footerH
      : scrollViewHeight;
    const stopTop = headerStopTop && headerStopTop > 0 ? headerStopTop : 0;

    const headerAnimatedStyle =
      stopTop > 0
        ? {
            zIndex: 4,
            transform: [{ translateY: this.state.haderTabY }],
            width: "100%",
            backgroundColor: "#fff",
            ...headerStyle,
          }
        : { width: "100%", backgroundColor: "#fff", ...headerStyle };
    return (
      <View
        style={[
          { backgroundColor: "#f7f7f7", height: scrollViewHeight },
          containerStyle,
        ]}
      >
        <View>
          <Animated.ScrollView
            ref={this.scrollView}
            scrollEventThrottle={5}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: this.nScroll } } }],
              { useNativeDriver: true, listener: this._handleScroll }
            )}
            refreshControl={refreshControl}
            contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
            // onMomentumScrollEnd={(e) => this.onMomentumScrollEnd(e)}
            style={[{ zIndex: 0, height: scrollViewHeight }, containerStyle]}
            contentContainerStyle={
              setContainerHeight
                ? {
                    height:
                      headerHeight +
                      scrollTabBarHeight +
                      height -
                      stopTop -
                      footerH,
                  }
                : {}
            }
          >
            {parallaxType == "delay" ? (
              <Animated.View
                style={{
                  transform: [
                    { translateY: Animated.multiply(this.nScroll, 0.65) },
                  ],
                }}
              >
                <View
                  style={[
                    { width: "100%", backgroundColor: "#fff" },
                    headerStyle,
                  ]}
                  onLayout={({
                    nativeEvent: {
                      layout: { height },
                    },
                  }) => {
                    this.setState({
                      headerHeight: height + 1,
                      tabY: this.nScroll.interpolate({
                        inputRange: [0, height, height + 1],
                        outputRange: [0, 0, 1],
                      }),
                    });
                  }}
                >
                  {renderHeader}
                </View>
              </Animated.View>
            ) : (
              <Animated.View
                style={headerAnimatedStyle}
                onLayout={({
                  nativeEvent: {
                    layout: { height },
                  },
                }) => {
                  this.setState({
                    headerHeight: height + 1,
                    tabY:
                      height === 0
                        ? this.nScroll.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 1],
                          })
                        : this.nScroll.interpolate({
                            inputRange: [
                              0,
                              height - stopTop,
                              height - stopTop + 1,
                            ],
                            outputRange: [0, 0, 1],
                          }),
                    haderTabY: this.nScroll.interpolate({
                      inputRange: [0, height - stopTop, height - stopTop + 1],
                      outputRange: [0, 0, 1],
                    }),
                  });
                }}
              >
                {renderHeader}
              </Animated.View>
            )}
            <ScrollableTabView
              ref={(ref) => (this.tabs = ref)}
              locked={locked}
              prerenderingSiblingsNumber={3}
              tabBarUnderlineStyle={tabBarUnderlineStyle}
              onChangeTab={({ i }) => {
                this.setState({ height: heights[i], activeTab: i });
                const scrollOffset =
                  Math.floor(this.currentOffset) >= headerHeight - stopTop
                    ? Math.floor(offsets[i]) >= headerHeight - stopTop
                      ? Math.floor(offsets[i])
                      : headerHeight - stopTop
                    : Math.floor(this.currentOffset);

                if (!!this.scrollView.current) {
                  this.scrollView.current.scrollTo({
                    x: 0,
                    y: scrollOffset + this.props.scrollTop?this.props.scrollTop : 0,
                    animated: false,
                  });
                }

                onChangeTab ? onChangeTab({ i }) : null;
              }}
              renderTabBar={
                tabBarProps.tabs.length == 0
                  ? false
                  : (props) => (
                      <Animated.View
                        style={{
                          transform: [{ translateY: this.state.tabY }],
                          zIndex: 1,
                          width: "100%",
                        }}
                      >
                        <ScrollableTabBar
                          {...props}
                          style={tabBarStyle}
                          // underlineStyle={{ backgroundColor: '#007aff', height: 3, borderRadius: 1.5, width: 30 }}
                          tabsContainerStyle={[
                            { backgroundColor: "#fff" },
                            tabsContainerStyle,
                          ]}
                          renderTab={(
                            name,
                            page,
                            active,
                            onPress,
                            onLayout
                          ) => (
                            <TouchableOpacity
                              key={page}
                              onPress={() => {
                                onPress(page);
                              }}
                              onLayout={onLayout}
                              activeOpacity={0.4}
                            >
                              <Animated.View
                                style={{
                                  flex: 1,
                                  minWidth: 60,
                                }}
                              >
                                <View
                                  style={[
                                    {
                                      backgroundColor: "#fff",
                                      height: scrollTabBarHeight,
                                      justifyContent: "center",
                                      alignContent: "center",
                                    },
                                    tabStyle,
                                  ]}
                                >
                                  {typeof name === "string" ? (
                                    <Animated.Text
                                      style={{
                                        fontWeight: active ? "bold" : "normal",
                                        color: active
                                          ? tabBarActiveTextColor
                                          : tabBarInactiveTextColor,
                                        fontSize: active ? 16 : 14,
                                        textAlign: "center",
                                      }}
                                    >
                                      {name}
                                    </Animated.Text>
                                  ) : (
                                    React.cloneElement(name, {
                                      childStyle: {
                                        fontWeight: active ? "bold" : "normal",
                                        color: active
                                          ? tabBarActiveTextColor
                                          : tabBarInactiveTextColor,
                                        fontSize: active ? 16 : 14,
                                      },
                                    })
                                  )}
                                </View>
                              </Animated.View>
                            </TouchableOpacity>
                          )}
                        />
                      </Animated.View>
                    )
              }
            >
              {tabBarProps.tabs.map((item, index) => {
                return (
                  <SceneView key={`tab-content-${index}`} tabLabel={item}>
                    <View
                      style={[
                        {
                          height: this.state.height,
                          backgroundColor: "#ececec",
                        },
                        childContainerStyle,
                      ]}
                    >
                      <View
                        onLayout={({
                          nativeEvent: {
                            layout: { height },
                          },
                        }) => {
                          const stateHeight =
                            height > this.initailViewHeight - footerH
                              ? height + footerH
                              : this.initailViewHeight;
                          heights[index] = stateHeight;
                          if (this.state.activeTab === index)
                            this.setState({ height: stateHeight });
                        }}
                      >
                        {tabBarProps.childrens[index]}
                      </View>
                    </View>
                  </SceneView>
                );
              })}
            </ScrollableTabView>
          </Animated.ScrollView>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollview: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
  },
  tab: {
    flex: 1,
    width: screenWidth,
  },
});
