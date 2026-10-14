// app/index.tsx
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice';

export default function Index() {
  const user = useSelector(selectCurrentUser);
  return <Redirect href={user ? '/(protected)/home' : '/login'} />;
}