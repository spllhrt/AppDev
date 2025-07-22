// CustomWebView.jsx
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';

// Native WebView for Android/iOS
const NativeWebView = React.forwardRef((props, ref) => (
  <RNWebView ref={ref} {...props} />
));

// Web version using iframe
const WebIframe = React.forwardRef((props, ref) => (
  <iframe
    ref={ref}
    srcDoc={props.source?.html}
    style={{
      ...StyleSheet.flatten(props.style),
      borderWidth: 0,
      backgroundColor: 'transparent',
    }}
    sandbox="allow-scripts allow-same-origin allow-popups"
    onLoad={props.onLoadEnd}
    title="Web Map"
  />
));

// Export based on platform
const CustomWebView = Platform.OS === 'web' ? WebIframe : NativeWebView;
export default CustomWebView;
