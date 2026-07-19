// navigation/AppNavigator.tsx
// Main app navigation setup

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';
import LoginScreen from '../components/auth/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import StorageBreakdownScreen from '../screens/StorageBreakdownScreen';
import FileListScreen from '../screens/FileListScreen';
import CleanTrashScreen from '../screens/CleanTrashScreen';
import ManagerFilesScreen from '../screens/ManagerFilesScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const user = useSelector(selectCurrentUser);
  
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Authenticated routes
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="StorageBreakdown" component={StorageBreakdownScreen} />
            <Stack.Screen name="FileList" component={FileListScreen} />
            <Stack.Screen name="CleanTrash" component={CleanTrashScreen} />
            <Stack.Screen name="ManagerFiles" component={ManagerFilesScreen} />
          </>
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