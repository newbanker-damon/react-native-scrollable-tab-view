import React, {Component} from 'react';
import {View} from 'react-native';

export default class SceneView extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    const {
      children,
      ...restProps
    } = this.props
    return <View {...restProps}>
      {
        children
      }
    </View>
  }
}