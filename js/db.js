// ===== DATABASE FUNCTIONS =====
GringoSafe.db = {
  db: null,
  
  // Initialize Firestore
  init: function() {
    if (firebase.apps.length > 0) {
      this.db = firebase.firestore();
      console.log("Firestore initialized");
    }
  },
  
  // Get all markers
  getMarkers: async function(filters = {}) {
    try {
      let query = this.db.collection('markers');
      
      // Apply filters
      if (filters.category && filters.category !== 'all') {
        query = query.where('category', '==', filters.category);
      }
      
      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }
      
      if (filters.verified !== undefined) {
        query = query.where('verified', '==', filters.verified);
      }
      
      // Limit results for performance
      query = query.limit(100);
      
      const snapshot = await query.get();
      const markers = [];
      
      snapshot.forEach(doc => {
        markers.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return markers;
      
    } catch (error) {
      console.error("Error getting markers:", error);
      throw error;
    }
  },
  
  // Add new marker
  addMarker: async function(markerData) {
    try {
      const marker = {
        ...markerData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        votes: { up: 0, down: 0 },
        reports: 0,
        verified: false
      };
      
      const docRef = await this.db.collection('markers').add(marker);
      
      return {
        success: true,
        id: docRef.id
      };
      
    } catch (error) {
      console.error("Error adding marker:", error);
      throw error;
    }
  },
  
  // Update marker
  updateMarker: async function(markerId, updates) {
    try {
      await this.db.collection('markers').doc(markerId).update({
        ...updates,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true };
      
    } catch (error) {
      console.error("Error updating marker:", error);
      throw error;
    }
  },
  
  // Update marker votes
  updateMarkerVotes: async function(markerId, vote) {
    try {
      const markerRef = this.db.collection('markers').doc(markerId);
      const markerDoc = await markerRef.get();
      
      if (!markerDoc.exists) {
        throw new Error("Marker not found");
      }
      
      const currentVotes = markerDoc.data().votes || { up: 0, down: 0 };
      
      await markerRef.update({
        votes: {
          ...currentVotes,
          [vote]: firebase.firestore.FieldValue.increment(1)
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true };
      
    } catch (error) {
      console.error("Error updating marker votes:", error);
      throw error;
    }
  },
  
  // Report marker
  reportMarker: async function(markerId) {
    try {
      const markerRef = this.db.collection('markers').doc(markerId);
      
      await markerRef.update({
        reports: firebase.firestore.FieldValue.increment(1),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Check if marker should be suspended
      const markerDoc = await markerRef.get();
      const reports = markerDoc.data().reports || 0;
      
      if (reports >= 5) {
        await markerRef.update({
          verified: false,
          suspended: true
        });
      }
      
      return { success: true };
      
    } catch (error) {
      console.error("Error reporting marker:", error);
      throw error;
    }
  },
  
  // Get questions
  getQuestions: async function(filters = {}) {
    try {
      let query = this.db.collection('questions');
      
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      }
      
      query = query.orderBy('createdAt', 'desc').limit(50);
      
      const snapshot = await query.get();
      const questions = [];
      
      snapshot.forEach(doc => {
        questions.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return questions;
      
    } catch (error) {
      console.error("Error getting questions:", error);
      throw error;
    }
  },
  
  // Add question
  addQuestion: async function(questionData) {
    try {
      const question = {
        ...questionData,
        status: 'open',
        answers: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 20 * 60 * 1000) // 20 minutes
      };
      
      const docRef = await this.db.collection('questions').add(question);
      
      return {
        success: true,
        id: docRef.id
      };
      
    } catch (error) {
      console.error("Error adding question:", error);
      throw error;
    }
  },
  
  // Add answer to question
  addAnswer: async function(questionId, answerData) {
    try {
      const answer = {
        ...answerData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await this.db.collection('questions').doc(questionId).update({
        answers: firebase.firestore.FieldValue.arrayUnion(answer),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Check if question should be closed
      const questionDoc = await this.db.collection('questions').doc(questionId).get();
      const question = questionDoc.data();
      
      if (question.answers.length >= 3) {
        // Generate consensus
        const consensus = GringoSafe.ai.generateConsensus(question.answers);
        
        await this.db.collection('questions').doc(questionId).update({
          status: 'closed',
          consensus: consensus,
          closedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Award points to answerers
        for (const answer of question.answers) {
          await GringoSafe.auth.addPoints(15, 'Respondeu dúvida');
        }
      }
      
      return { success: true };
      
    } catch (error) {
      console.error("Error adding answer:", error);
      throw error;
    }
  },
  
  // Get verified locations
  getVerifiedLocations: async function() {
    try {
      const snapshot = await this.db.collection('markers')
        .where('verified', '==', true)
        .where('suspended', '!=', true)
        .get();
      
      const locations = [];
      
      snapshot.forEach(doc => {
        locations.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return locations;
      
    } catch (error) {
      console.error("Error getting verified locations:", error);
      throw error;
    }
  },
  
  // Get user statistics
  getUserStats: async function(userId) {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new Error("User not found");
      }
      
      const userData = userDoc.data();
      
      // Get additional stats
      const markersCount = await this.db.collection('markers')
        .where('userId', '==', userId)
        .get()
        .then(snapshot => snapshot.size);
      
      const answersCount = await this.db.collection('questions')
        .where('answers', 'array-contains', { userId: userId })
        .get()
        .then(snapshot => snapshot.size);
      
      return {
        ...userData.statistics,
        markersCount,
        answersCount,
        balance: userData.balance,
        points: userData.points,
        level: userData.level
      };
      
    } catch (error) {
      console.error("Error getting user stats:", error);
      throw error;
    }
  },
  
  // Get exchange rates
  getExchangeRates: async function() {
    try {
      // Check if we have cached rates
      const cachedRates = localStorage.getItem('gringosafe-exchange-rates');
      const cachedTime = localStorage.getItem('gringosafe-exchange-rates-time');
      
      if (cachedRates && cachedTime) {
        const age = Date.now() - parseInt(cachedTime);
        // Cache for 1 hour
        if (age < 3600000) {
          return JSON.parse(cachedRates);
        }
      }
      
      // Fetch new rates
      const response = await fetch(`${GringoSafe.config.api.exchangeRates}BRL`);
      const data = await response.json();
      
      // Cache the rates
      localStorage.setItem('gringosafe-exchange-rates', JSON.stringify(data.rates));
      localStorage.setItem('gringosafe-exchange-rates-time', Date.now().toString());
      
      return data.rates;
      
    } catch (error) {
      console.error("Error getting exchange rates:", error);
      
      // Return default rates if fetch fails
      return {
        USD: 0.20,
        EUR: 0.18,
        ARS: 180.5
      };
    }
  },
  
  // Convert currency
  convertCurrency: async function(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    try {
      const rates = await this.getExchangeRates();
      
      // Convert to BRL first, then to target currency
      let amountInBRL = amount;
      
      if (fromCurrency !== 'BRL') {
        const rate = rates[fromCurrency];
        if (rate) {
          amountInBRL = amount / rate;
        }
      }
      
      // Convert from BRL to target currency
      if (toCurrency === 'BRL') {
        return amountInBRL;
      }
      
      const targetRate = rates[toCurrency];
      if (targetRate) {
        return amountInBRL * targetRate;
      }
      
      return amount; // Return original amount if conversion fails
      
    } catch (error) {
      console.error("Error converting currency:", error);
      return amount;
    }
  },
  
  // Search places
  searchPlaces: async function(query, location) {
    try {
      const url = `${GringoSafe.config.api.geocoding}${encodeURIComponent(query)}.json`;
      const params = new URLSearchParams({
        access_token: GringoSafe.config.mapbox.accessToken,
        proximity: `${location.lng},${location.lat}`,
        limit: 10
      });
      
      const response = await fetch(`${url}?${params}`);
      const data = await response.json();
      
      return data.features.map(feature => ({
        id: feature.id,
        name: feature.text,
        place_name: feature.place_name,
        center: feature.center,
        geometry: feature.geometry
      }));
      
    } catch (error) {
      console.error("Error searching places:", error);
      return [];
    }
  },
  
  // Setup real-time listeners
  setupRealtimeListeners: function() {
    // Listen for new markers
    this.db.collection('markers')
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const marker = {
              id: change.doc.id,
              ...change.doc.data()
            };
            GringoSafe.map.addMarker(marker);
          }
        });
      });
    
    // Listen for new questions
    this.db.collection('questions')
      .where('status', '==', 'open')
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const question = {
              id: change.doc.id,
              ...change.doc.data()
            };
            GringoSafe.state.questions.push(question);
          }
        });
      });
  }
};

// Initialize database when Firebase is ready
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    GringoSafe.db.init();
  }, 1000);
});
