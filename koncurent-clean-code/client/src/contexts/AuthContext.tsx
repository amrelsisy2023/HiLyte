import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { type User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status with server on app start
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (data.authenticated && data.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        } else {
          // Not authenticated, clear any stored user data
          setUser(null);
          localStorage.removeItem("user");
        }
      } catch (error) {
        // Error checking status, fallback to localStorage
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData && userData.id && userData.username) {
              setUser(userData);
            } else {
              localStorage.removeItem("user");
              setUser(null);
            }
          } catch (error) {
            localStorage.removeItem("user");
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    };
    
    checkAuthStatus();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      // Call server logout endpoint
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // Continue with client-side logout even if server call fails
      console.error('Server logout failed:', error);
    }
    
    // Always clear client-side state
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}