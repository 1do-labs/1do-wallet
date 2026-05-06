import PropTypes from 'prop-types';
import React, { Component } from 'react';

export default class Mascot extends Component {
  static propTypes = {
    animationEventEmitter: PropTypes.object.isRequired,
    width: PropTypes.string,
    height: PropTypes.string,
    followMouse: PropTypes.bool,
    lookAtTarget: PropTypes.object,
    lookAtDirection: PropTypes.oneOf(['up', 'down', 'left', 'right', 'middle']),
  };

  static defaultProps = {
    width: '200',
    height: '200',
    followMouse: true,
    lookAtTarget: {},
    lookAtDirection: null,
  };

  componentWillUnmount() {
    this.props.animationEventEmitter.removeAllListeners();
  }

  render() {
    const { width, height } = this.props;

    return (
      <img
        src="./images/logo/1do-mark.svg"
        width={width}
        height={height}
        alt=""
        style={{ zIndex: 0 }}
      />
    );
  }
}
