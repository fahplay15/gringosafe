// ===== CONFIGURATION =====
window.GringoSafe = window.GringoSafe || {};

GringoSafe.config = {
  // Firebase Configuration
  firebase: {
    apiKey: "AIzaSyDFsKM3nO9kMqOfqNkUL5rW3ukS4yzzTzs",
    authDomain: "gringosafe-1f434.firebaseapp.com",
    projectId: "gringosafe-1f434",
    storageBucket: "gringosafe-1f434.firebasestorage.app",
    messagingSenderId: "949745647794",
    appId: "1:949745647794:web:e81698e40bd8d7aa5d09ab",
    measurementId: "G-JTQT05JKZW"
  },
  
  // Mapbox Configuration
  mapbox: {
    accessToken: "pk.eyJ1IjoiZmFocGxheTE1IiwiYSI6ImNtbXk2Z3UzMDB2YnYyb3BsMTA2ZzV2NmkifQ.Tvdrpof80mAktc3Z3dB3cw",
    style: "mapbox://styles/mapbox/dark-v11",
    center: [-46.6333, -23.5505], // São Paulo
    zoom: 12
  },
  
  // App Configuration
  app: {
    name: "GringoSafe",
    version: "1.0.0",
    defaultLanguage: "pt-BR",
    supportedLanguages: ["pt-BR", "en-US", "es-ES"],
    currencies: {
      "BRL": { symbol: "R$", name: "Real Brasileiro" },
      "USD": { symbol: "$", name: "Dólar Americano" },
      "EUR": { symbol: "€", name: "Euro" },
      "ARS": { symbol: "$", name: "Peso Argentino" }
    }
  },
  
  // Map Markers Configuration
  markers: {
    validated: {
      color: "#10b981",
      icon: "check-circle"
    },
    premium: {
      color: "#f59e0b",
      icon: "crown"
    },
    question: {
      color: "#8b5cf6",
      icon: "question-circle"
    },
    user: {
      color: "#6366f1",
      icon: "user-circle"
    }
  },
  
  // AI Configuration
  ai: {
    model: "mobilenet",
    confidence: 0.6,
    maxPredictions: 3
  },
  
  // Gamification Configuration
  gamification: {
    levels: [
      { level: 1, name: "Iniciante", minPoints: 0, multiplier: 1.0 },
      { level: 2, name: "Explorador", minPoints: 100, multiplier: 1.1 },
      { level: 3, name: "Especialista", minPoints: 500, multiplier: 1.2 },
      { level: 4, name: "Mestre", minPoints: 1500, multiplier: 1.3 },
      { level: 5, name: "Lenda", minPoints: 5000, multiplier: 1.5 }
    ],
    rewards: {
      addPrice: 10,
      answerQuestion: 15,
      verifiedAnswer: 25,
      dailyLogin: 5,
      referral: 50
    }
  },
  
  // API Configuration
  api: {
    exchangeRates: "https://api.exchangerate-api.com/v4/latest/",
    geocoding: "https://api.mapbox.com/geocoding/v5/mapbox.places/",
    places: "https://api.mapbox.com/places/v1/"
  }
};

// ===== USER PROFILE STATE =====
GringoSafe.state = {
  currentProfile: "turista", // turista, avaliador, lojista
  user: null,
  location: null,
  balance: 0,
  level: 1,
  points: 0,
  language: "pt-BR",
  currency: "BRL",
  markers: [],
  questions: [],
  filters: {
    category: "all",
    priceRange: null,
    distance: null
  }
};

// ===== PROFILE PERMISSIONS =====
GringoSafe.permissions = {
  turista: {
    canViewPrices: true,
    canAskQuestions: true,
    canAddPrices: false,
    canAnswerQuestions: false,
    canViewBalance: false,
    canManageBusiness: false
  },
  avaliador: {
    canViewPrices: true,
    canAskQuestions: true,
    canAddPrices: true,
    canAnswerQuestions: true,
    canViewBalance: true,
    canManageBusiness: false
  },
  lojista: {
    canViewPrices: true,
    canAskQuestions: false,
    canAddPrices: true,
    canAnswerQuestions: false,
    canViewBalance: true,
    canManageBusiness: true
  }
};

// ===== UTILITY FUNCTIONS =====
GringoSafe.utils = {
  // Format currency
  formatCurrency: (amount, currency = "BRL") => {
    const config = GringoSafe.config.app.currencies[currency];
    if (!config) return `${amount}`;
    
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency
    }).format(amount);
  },
  
  // Calculate distance between two points
  calculateDistance: (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },
  
  // Get user level from points
  getUserLevel: (points) => {
    const levels = GringoSafe.config.gamification.levels;
    for (let i = levels.length - 1; i >= 0; i--) {
      if (points >= levels[i].minPoints) {
        return levels[i];
      }
    }
    return levels[0];
  },
  
  // Show notification
  showNotification: (message, type = "success") => {
    const toast = document.getElementById("notificationToast");
    const toastMessage = toast.querySelector(".toast-message");
    const toastIcon = toast.querySelector(".toast-content i");
    
    toastMessage.textContent = message;
    
    // Update icon based on type
    toastIcon.className = type === "success" ? "fas fa-check-circle" :
                         type === "error" ? "fas fa-exclamation-circle" :
                         type === "warning" ? "fas fa-exclamation-triangle" :
                         "fas fa-info-circle";
    
    // Update background color
    const toastContent = toast.querySelector(".toast-content");
    toastContent.style.background = type === "success" ? "var(--success)" :
                                   type === "error" ? "var(--danger)" :
                                   type === "warning" ? "var(--warning)" :
                                   "var(--primary)";
    
    toast.classList.remove("hidden");
    
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 3000);
  },
  
  // Get current location
  getCurrentLocation: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported"));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  },
  
  // Debounce function
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  // Check if user has permission
  hasPermission: (permission) => {
    const currentProfile = GringoSafe.state.currentProfile;
    return GringoSafe.permissions[currentProfile][permission] || false;
  }
};

// ===== INITIALIZE =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("GringoSafe Configuration Loaded");
  
  // Load saved preferences
  const savedProfile = localStorage.getItem("gringosafe-profile");
  if (savedProfile) {
    GringoSafe.state.currentProfile = savedProfile;
    document.body.className = `modo-${savedProfile}`;
  }
  
  const savedLanguage = localStorage.getItem("gringosafe-language");
  if (savedLanguage) {
    GringoSafe.state.language = savedLanguage;
  }
  
  const savedCurrency = localStorage.getItem("gringosafe-currency");
  if (savedCurrency) {
    GringoSafe.state.currency = savedCurrency;
  }
});
