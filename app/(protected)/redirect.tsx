// app/redirect.tsx
import { Redirect } from "expo-router";

export default function RedirectScreen() {
  // Redirige inmediatamente al usuario a la pantalla principal de tu app.
  // Cambia '/' por la ruta que consideres tu "home" (ej. '/home', '/dashboard').
  return <Redirect href="/home" />;
}
