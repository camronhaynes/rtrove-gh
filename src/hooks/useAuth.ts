import { useState } from 'react';
import { useUserInfo } from '../../context/UserInfoContext';

export const useAuth = () => {
  const { users, setCurrentUser, getUserByUsername } = useUserInfo();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = getUserByUsername(username);
      if (user) {
        await setCurrentUser(user);
      } else {
        throw new Error('User not found');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await setCurrentUser(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    logout,
    isLoading,
    error,
  };
};

