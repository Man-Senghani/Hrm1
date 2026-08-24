import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: (() => {
    try {
      const stored = sessionStorage.getItem('user');
      return (stored && stored !== 'undefined' && stored !== 'null') ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })(),
  token: sessionStorage.getItem('token') || null,
  isAuthenticated: !!sessionStorage.getItem('token'),
  
  setAuth: (user, token) => {
    sessionStorage.setItem('user', JSON.stringify(user));
    sessionStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    set({ user: null, token: null, isAuthenticated: false });
    const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    window.location.href = `${baseUrl}/login`;
  },

  updateProfile: (profileData) => {
    set((state) => {
      const newUser = { ...state.user, profile: { ...state.user.profile, ...profileData } };
      sessionStorage.setItem('user', JSON.stringify(newUser));
      return { user: newUser };
    });
  }
}));

export default useAuthStore;
