import React from "react";
import { Platform } from "react-native";
import { Provider } from "react-redux";
import store from "./src/redux/store";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <Provider store={store}>
      <AppNavigator />
    </Provider>
  );
}