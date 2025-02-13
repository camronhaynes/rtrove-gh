export const theme = {
    colors: {
      // Base colors
      background: '#000000',
      surface: '#1A1A1A',
      
      // Neutral palette from Carta
      neutral100: '#c4dce5',
      neutral200: '#cae0e8',
      neutral300: '#d0e3ea',
      neutral400: '#d6e7ed',
      neutral500: '#dceaef',
      neutral600: '#e2eef2',
      neutral700: '#e7f1f5',
      neutral800: '#edf5f7',
      neutral900: '#f3f8fa',
      
      // UI colors
      primary: '#c4dce5',
      secondary: '#e2eef2',
      tertiary: '#f3f8fa',
      text: '#FFFFFF',
      textSecondary: '#c4dce5',
      border: '#2A2A2A',
      
      // Tab colors
      tabActive: '#c4dce5',
      tabInactive: '#2A2A2A',
      tabBackground: '#1A1A1A',
      
      // Utility colors
      gray: '#808080',
      error: '#FF4444',
      success: '#00C851',
  
      // Additional colors used in components
      muted: 'rgba(255, 255, 255, 0.1)', // Used for some button backgrounds
      likeButton: '#F28482', // Used for the like button when active
      joinButton: '#6A476B', // Used for join project button
    },
    fonts: {
      header: 'BebasNeue_400Regular',
      regular: undefined, // System default
    },
    // Button styles
    joinButton: {
      backgroundColor: 'rgba(196, 220, 229, 0.1)',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#c4dce5',
      shadowColor: '#c4dce5',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    joinButtonText: {
      color: '#c4dce5',
      fontSize: 14,
      fontWeight: '600',
    },
    leaveButton: {
      backgroundColor: 'rgba(242, 132, 130, 0.1)',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#F28482',
      shadowColor: '#F28482',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    leaveButtonText: {
      color: '#F28482',
      fontSize: 14,
      fontWeight: '600',
    },
  };
  
  export type Theme = typeof theme;
  
  