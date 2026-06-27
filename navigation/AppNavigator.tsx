// navigation/AppNavigator.tsx
// Main app navigation setup

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';
import LoginScreen from '../components/auth/LoginScreen';
import HomeScreen from '../screens/HomeScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const user = useSelector(selectCurrentUser);
  
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Authenticated routes
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          // Unauthenticated routes
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            {/* Add other auth screens here */}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;