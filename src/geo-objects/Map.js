import React from 'react';
import PropTypes from 'prop-types';

import * as events from '../util/events';
import { omit } from '../util/omit';
import { getProp, isControlledProp } from '../util/props';
import withYMaps from '../withYMaps';
import { ParentContext } from '../Context';

export class Map extends React.Component {
  constructor() {
    super();
    this.state = { instance: null };
    this._parentElement = null;
    this._getRef = ref => {
      this._parentElement = ref;
    };
  }

  componentDidMount() {
    const instance = Map.mountObject(
      this._parentElement,
      this.props.ymaps.Map,
      this.props
    );

    this.setState({ instance });
  }

  componentDidUpdate(prevProps) {
    if (this.state.instance !== null) {
      Map.updateObject(this.state.instance, prevProps, this.props);
    }
  }

  componentWillUnmount() {
    Map.unmountObject(this.state.instance, this.props);
  }

  render() {
    const parentElementStyle = Map.getParentElementSize(this.props);
    const separatedProps = events.separateEvents(this.props);

    const parentElementProps = omit(separatedProps, [
      '_events',
      'state',
      'defaultState',
      'options',
      'defaultOptions',
      'instanceRef',
      'ymaps',
      'children',
      'width',
      'height',
      'style',
      'className',
    ]);

    return (
      <ParentContext.Provider value={this.state.instance}>
        <div ref={this._getRef} {...parentElementStyle} {...parentElementProps}>
          {this.props.children}
        </div>
      </ParentContext.Provider>
    );
  }

  static getParentElementSize(props) {
    const { width, height, style, className } = props;

    if (typeof style !== 'undefined' || typeof className !== 'undefined') {
      return { style, className };
    }

    return { style: Object.assign({ width, height }, style), className };
  }

  static mountObject(parentElement, Map, props) {
    const { instanceRef, _events } = events.separateEvents(props);

    const state = getProp(props, 'state');
    const options = getProp(props, 'options');

    const instance = new Map(parentElement, state, options);

    Object.keys(_events).forEach(key =>
      events.addEvent(instance, key, _events[key])
    );

    if (typeof instanceRef === 'function') {
      instanceRef(instance);
    }

    return instance;
  }

  static updateObject(instance, oldProps, newProps) {
    const { _events: newEvents, instanceRef } = events.separateEvents(newProps);
    const { _events: oldEvents, instanceRef: oldRef } = events.separateEvents(
      oldProps
    );

    if (isControlledProp(newProps, 'state')) {
      const oldState = getProp(oldProps, 'state');
      const newState = getProp(newProps, 'state');

      if (oldState.type !== newState.type) {
        instance.setType(newState.type);
      }

      if (oldState.behaviors !== newState.behaviors) {
        instance.behaviors.disable(oldState.behaviors || []);
        instance.behaviors.enable(newState.behaviors || []);
      }

      if (oldState.zoom !== newState.zoom) {
        instance.setZoom(newState.zoom);
      }

      if (oldState.center !== newState.center) {
        instance.setCenter(newState.center);
      }

      if (newState.bounds && oldState.bounds !== newState.bounds) {
        instance.setBounds(newState.bounds);
      }
    }

    if (isControlledProp(newProps, 'options')) {
      const oldOptions = getProp(oldProps, 'options');
      const newOptions = getProp(newProps, 'options');

      if (oldOptions !== newOptions) {
        instance.options.set(newOptions);
      }
    }

    events.updateEvents(instance, oldEvents, newEvents);

    // Mimic React callback ref behavior:
    // https://reactjs.org/docs/refs-and-the-dom.html#caveats-with-callback-refs
    if (oldRef !== instanceRef) {
      if (typeof oldRef === 'function') oldRef(null);
      if (typeof instanceRef === 'function') instanceRef(instance);
    }
  }

  static unmountObject(instance, props) {
    const { instanceRef, _events } = events.separateEvents(props);

    if (instance !== null) {
      Object.keys(_events).forEach(key =>
        events.removeEvent(this.state.instance, key, _events[key])
      );

      instance.destroy();

      if (typeof instanceRef === 'function') {
        instanceRef(null);
      }
    }
  }
}

const MapStatePropTypes = {
  bounds: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  center: PropTypes.arrayOf(PropTypes.number),
  controls: PropTypes.arrayOf(PropTypes.string),
  behaviors: PropTypes.arrayOf(PropTypes.string),
  margin: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.number),
    PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  ]),
  type: PropTypes.oneOf(['yandex#map', 'yandex#satellite', 'yandex#hybrid']),
  zoom: PropTypes.number,
};

// TODO: https://tech.yandex.com/maps/doc/jsapi/2.1/ref/reference/Map-docpage/
const MapOptionsPropTypes = {};

Map.propTypes = {
  // Map state parameters
  // https://tech.yandex.com/maps/doc/jsapi/2.1/ref/reference/Map-docpage/#param-state
  state: PropTypes.shape(MapStatePropTypes),
  defaultState: PropTypes.shape(MapStatePropTypes),

  // TODO: https://tech.yandex.com/maps/doc/jsapi/2.1/ref/reference/Map-docpage/
  options: PropTypes.shape(MapOptionsPropTypes),
  defaultOptions: PropTypes.shape(MapOptionsPropTypes),

  // ref prop but for YMaps object instances
  instanceRef: PropTypes.func,

  // Yandex.Maps API object
  ymaps: PropTypes.object,

  children: PropTypes.node,

  /**
   * Yandex.Maps Map parent element should have at least
   * some size set to it, otherwise the map is rendered
   * into the container with size 0
   *
   * To avoid this we will use `width` and `height` props as default
   * way of sizing the map element, but then if we see that
   * the library user also provides `style` or `className` prop,
   * we will assume that the Map is sized by those and will
   * not use these
   */
  width: PropTypes.number,
  height: PropTypes.number,
  style: PropTypes.object,
  className: PropTypes.string,
};

Map.defaultProps = {
  width: 320,
  height: 240,
};

export default withYMaps(Map, true, ['Map']);