import React, { useRef, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useSelector } from "react-redux";


import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import UserNavigator from "./UserNavigator";
import AdminNavigator from "./AdminNavigator";

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const navigationRef = useRef(null);

  React.useEffect(() => {
    global.navigate = (name, params) => {
      if (navigationRef.current) {
        if (navigationRef.current.isReady()) {
          navigationRef.current.navigate(name, params);
        } else {
          setTimeout(() => {
            if (navigationRef.current?.isReady()) {
              navigationRef.current.navigate(name, params);
            }
          }, 100);
        }
      }
    };
    
    return () => {
      global.navigate = null;
    };
  }, []);

  return (
    <NavigationContainer 
      ref={navigationRef}
      onReady={() => {
        console.log("🔹 Navigation container is ready");
      }}
    >
      
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          user?.role === "admin" ? (
            <Stack.Screen name="Admin" component={AdminNavigator} />
          ) : (
            <Stack.Screen name="User" component={UserNavigator} />
          )
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;