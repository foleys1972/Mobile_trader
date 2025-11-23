import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: null,

      // Actions
      login: async (credentials) => {
        set({ loading: true, error: null });
        
        try {
          const response = await axios.post('/api/auth/login', credentials);
          const { user, token } = response.data;
          
          set({
            isAuthenticated: true,
            user,
            token,
            loading: false,
            error: null,
          });

          // Set default axios header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          return { success: true, user };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Login failed';
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            loading: false,
            error: errorMessage,
          });
          return { success: false, error: errorMessage };
        }
      },

      logout: () => {
        // Clear axios header
        delete axios.defaults.headers.common['Authorization'];
        
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
          error: null,
        });
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }));
      },

      clearError: () => {
        set({ error: null });
      },

      // Check if user has permission
      hasPermission: (permission) => {
        const { user } = get();
        if (!user || !user.permissions) return false;
        return user.permissions.includes(permission);
      },

      // Check if user has role
      hasRole: (role) => {
        const { user } = get();
        if (!user || !user.roles) return false;
        return user.roles.includes(role);
      },

      // Get user's groups
      getUserGroups: () => {
        const { user } = get();
        return user?.groups || [];
      },

      // Check if user is in group
      isInGroup: (groupId) => {
        const { user } = get();
        if (!user || !user.groups) return false;
        return user.groups.some(group => group.id === groupId);
      },

      // Refresh user data
      refreshUser: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const response = await axios.get('/api/auth/me');
          const { user } = response.data;
          
          set({ user });
          return { success: true, user };
        } catch (error) {
          console.error('Failed to refresh user data:', error);
          return { success: false, error: error.message };
        }
      },

      // Initialize auth from stored token
      initializeAuth: async () => {
        const { token } = get();
        if (!token) return;

        try {
          // Set axios header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token and get user data
          const response = await axios.get('/api/auth/me');
          const { user } = response.data;
          
          set({
            isAuthenticated: true,
            user,
          });
          
          return { success: true, user };
        } catch (error) {
          // Token is invalid, clear auth state
          set({
            isAuthenticated: false,
            user: null,
            token: null,
          });
          delete axios.defaults.headers.common['Authorization'];
          return { success: false, error: 'Token expired' };
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export { useAuthStore };
