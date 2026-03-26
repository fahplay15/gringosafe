// ===== AUTHENTICATION =====
GringoSafe.auth = {
  user: null,
  isInitialized: false,
  
  // Initialize Firebase Auth
  init: async function() {
    try {
      // Initialize Firebase
      firebase.initializeApp(GringoSafe.config.firebase);
      
      // Set up auth state listener
      firebase.auth().onAuthStateChanged((user) => {
        this.user = user;
        GringoSafe.state.user = user;
        
        if (user) {
          this.loadUserProfile(user.uid);
          console.log("User logged in:", user.displayName);
        } else {
          console.log("User logged out");
          this.updateUIForLoggedOutUser();
        }
      });
      
      this.isInitialized = true;
      console.log("Firebase Auth initialized");
      
    } catch (error) {
      console.error("Error initializing Firebase Auth:", error);
      GringoSafe.utils.showNotification("Erro ao inicializar autenticação", "error");
    }
  },
  
  // Sign in with Google
  signInWithGoogle: async function() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const result = await firebase.auth().signInWithPopup(provider);
      const user = result.user;
      
      // Create or update user profile in Firestore
      await this.createUserProfile(user);
      
      GringoSafe.utils.showNotification(`Bem-vindo, ${user.displayName}!`, "success");
      
      return {
        success: true,
        user: user
      };
      
    } catch (error) {
      console.error("Error signing in with Google:", error);
      GringoSafe.utils.showNotification("Erro ao fazer login com Google", "error");
      
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Sign out
  signOut: async function() {
    try {
      await firebase.auth().signOut();
      GringoSafe.utils.showNotification("Desconectado com sucesso", "success");
      
      return { success: true };
      
    } catch (error) {
      console.error("Error signing out:", error);
      GringoSafe.utils.showNotification("Erro ao sair", "error");
      
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Create user profile in Firestore
  createUserProfile: async function(user) {
    try {
      const userRef = firebase.firestore().collection('users').doc(user.uid);
      
      const userProfile = {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        profile: GringoSafe.state.currentProfile,
        balance: 0,
        points: 0,
        level: 1,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
        preferences: {
          language: GringoSafe.state.language,
          currency: GringoSafe.state.currency,
          notifications: true
        },
        statistics: {
          pricesAdded: 0,
          questionsAnswered: 0,
          votesReceived: 0,
          helpfulVotes: 0
        }
      };
      
      await userRef.set(userProfile, { merge: true });
      
    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
  },
  
  // Switch user profile
  switchProfile: function(profile) {
    if (!this.user) {
      // Create anonymous user for demo
      this.user = {
        uid: 'demo-user',
        displayName: 'Usuário Demo',
        email: 'demo@gringosafe.com'
      };
    }
    
    // Update user profile
    const userProfile = {
      uid: this.user.uid,
      profile: profile,
      balance: this.currentUser?.balance || 0,
      level: this.currentUser?.level || 1,
      stats: this.currentUser?.stats || { pricesAdded: 0, questionsAnswered: 0 }
    };
    
    this.currentUser = userProfile;
    GringoSafe.state.user = this.user;
    GringoSafe.state.currentUser = userProfile;
    
    // Save to localStorage for demo
    localStorage.setItem('gringosafe-profile', JSON.stringify(userProfile));
    
    console.log(`Profile switched to: ${profile}`);
  },
  
  // Add points to user
  addPoints: function(points) {
    if (this.currentUser) {
      this.currentUser.stats = this.currentUser.stats || {};
      this.currentUser.stats.pricesAdded = (this.currentUser.stats.pricesAdded || 0) + 1;
      
      // Update balance for evaluators
      if (this.currentUser.profile === 'avaliador') {
        this.currentUser.balance = (this.currentUser.balance || 0) + points;
      }
      
      // Update level
      const totalActions = this.currentUser.stats.pricesAdded + (this.currentUser.stats.questionsAnswered || 0);
      this.currentUser.level = Math.floor(totalActions / 10) + 1;
      
      // Save to localStorage
      localStorage.setItem('gringosafe-profile', JSON.stringify(this.currentUser));
      
      // Update UI
      this.updateUserUI();
      
      GringoSafe.utils.showNotification(`+${points} pontos!`, "success");
    }
  },
  
  // Update user balance
  updateBalance: function(amount) {
    if (this.currentUser) {
      this.currentUser.balance = Math.max(0, (this.currentUser.balance || 0) + amount);
      localStorage.setItem('gringosafe-profile', JSON.stringify(this.currentUser));
      this.updateUserUI();
    }
  },
  
  // Update user UI
  updateUserUI: function() {
    if (this.currentUser) {
      // Update balance display
      const balanceElements = document.querySelectorAll('.balance, .balance-amount');
      balanceElements.forEach(el => {
        el.textContent = `R$ ${this.currentUser.balance?.toFixed(2) || '0,00'}`;
      });
      
      // Update level display
      const levelElements = document.querySelectorAll('.level, .level-text');
      levelElements.forEach(el => {
        el.textContent = `Nível ${this.currentUser.level || 1}`;
      });
    }
  },
  
  // Load user profile from localStorage
  loadUserProfile: function(userId) {
    const savedProfile = localStorage.getItem('gringosafe-profile');
    if (savedProfile) {
      this.currentUser = JSON.parse(savedProfile);
      GringoSafe.state.currentUser = this.currentUser;
      this.updateUserUI();
    } else {
      // Create default profile
      this.switchProfile('turista');
    }
  },
  
  // Load user profile from Firestore
  loadUserProfileFromFirestore: async function(userId) {
    try {
      const userDoc = await firebase.firestore()
        .collection('users')
        .doc(userId)
        .get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        // Update global state
        GringoSafe.state.balance = userData.balance || 0;
        GringoSafe.state.points = userData.points || 0;
        GringoSafe.state.level = userData.level || 1;
        
        // Update preferences
        if (userData.preferences) {
          GringoSafe.state.language = userData.preferences.language || 'pt-BR';
          GringoSafe.state.currency = userData.preferences.currency || 'BRL';
        }
        
        // Update UI
        this.updateUIForLoggedInUser(userData);
        
      } else {
        // Create profile if it doesn't exist
        await this.createUserProfile(this.user);
      }
      
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  },
  
  // Update user profile
  updateUserProfile: async function(updates) {
    try {
      if (!this.user) {
        throw new Error("User not logged in");
      }
      
      const userRef = firebase.firestore()
        .collection('users')
        .doc(this.user.uid);
      
      await userRef.update(updates);
      
      // Update local state
      if (updates.balance !== undefined) GringoSafe.state.balance = updates.balance;
      if (updates.points !== undefined) GringoSafe.state.points = updates.points;
      if (updates.level !== undefined) GringoSafe.state.level = updates.level;
      
      // Update UI
      this.updateUIForLoggedInUser({ ...updates, ...GringoSafe.state });
      
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  },
  
  // Switch user profile
  switchProfile: async function(newProfile) {
    try {
      if (!this.user) {
        GringoSafe.utils.showNotification("Faça login para trocar de perfil", "warning");
        return;
      }
      
      // Update in Firestore
      await this.updateUserProfile({
        profile: newProfile
      });
      
      // Update global state
      GringoSafe.state.currentProfile = newProfile;
      
      // Update UI
      document.body.className = `modo-${newProfile}`;
      localStorage.setItem("gringosafe-profile", newProfile);
      
      // Update profile buttons
      document.querySelectorAll('.profile-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.profile === newProfile) {
          btn.classList.add('active');
        }
      });
      
      // Show/hide user info based on profile
      const userInfo = document.querySelector('.user-info');
      if (newProfile === 'avaliador' || newProfile === 'lojista') {
        userInfo.classList.remove('hidden');
      } else {
        userInfo.classList.add('hidden');
      }
      
      GringoSafe.utils.showNotification(`Perfil alterado para: ${newProfile}`, "success");
      
    } catch (error) {
      console.error("Error switching profile:", error);
      GringoSafe.utils.showNotification("Erro ao trocar perfil", "error");
    }
  },
  
  // Add points to user
  addPoints: async function(points, reason) {
    try {
      if (!this.user) return;
      
      const newPoints = GringoSafe.state.points + points;
      const newLevel = GringoSafe.utils.getUserLevel(newPoints);
      
      await this.updateUserProfile({
        points: newPoints,
        level: newLevel.level
      });
      
      // Log points transaction
      await firebase.firestore()
        .collection('users')
        .doc(this.user.uid)
        .collection('transactions')
        .add({
          type: 'points',
          amount: points,
          reason: reason,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      
      // Check for level up
      if (newLevel.level > GringoSafe.state.level) {
        GringoSafe.utils.showNotification(
          `Parabéns! Você alcançou o nível ${newLevel.level} - ${newLevel.name}!`,
          "success"
        );
      }
      
    } catch (error) {
      console.error("Error adding points:", error);
    }
  },
  
  // Add balance to user
  addBalance: async function(amount, reason) {
    try {
      if (!this.user) return;
      
      const newBalance = GringoSafe.state.balance + amount;
      
      await this.updateUserProfile({
        balance: newBalance
      });
      
      // Log balance transaction
      await firebase.firestore()
        .collection('users')
        .doc(this.user.uid)
        .collection('transactions')
        .add({
          type: 'balance',
          amount: amount,
          reason: reason,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      
    } catch (error) {
      console.error("Error adding balance:", error);
    }
  },
  
  // Request withdrawal via PIX
  requestWithdrawal: async function(amount, pixKey) {
    try {
      if (!this.user) {
        throw new Error("User not logged in");
      }
      
      if (amount > GringoSafe.state.balance) {
        throw new Error("Saldo insuficiente");
      }
      
      if (amount < 10) { // Minimum withdrawal amount
        throw new Error("Valor mínimo para saque é R$ 10,00");
      }
      
      // Create withdrawal request
      await firebase.firestore()
        .collection('withdrawals')
        .add({
          userId: this.user.uid,
          amount: amount,
          pixKey: pixKey,
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      
      // Deduct from balance
      await this.updateUserProfile({
        balance: GringoSafe.state.balance - amount
      });
      
      GringoSafe.utils.showNotification(
        `Solicitação de R$ ${amount.toFixed(2)} enviada com sucesso!`,
        "success"
      );
      
      return { success: true };
      
    } catch (error) {
      console.error("Error requesting withdrawal:", error);
      GringoSafe.utils.showNotification(error.message, "error");
      return { success: false, error: error.message };
    }
  },
  
  // Update UI for logged in user
  updateUIForLoggedInUser: function(userData) {
    // Update balance display
    const balanceElement = document.querySelector('.balance-amount');
    if (balanceElement) {
      balanceElement.textContent = GringoSafe.utils.formatCurrency(userData.balance || 0);
    }
    
    // Update level display
    const levelElement = document.querySelector('.level-text');
    if (levelElement) {
      const levelInfo = GringoSafe.utils.getUserLevel(userData.points || 0);
      levelElement.textContent = `Nível ${levelInfo.level}`;
    }
    
    // Update profile buttons
    const currentProfile = userData.profile || 'turista';
    document.querySelectorAll('.profile-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.profile === currentProfile) {
        btn.classList.add('active');
      }
    });
    
    // Update body class
    document.body.className = `modo-${currentProfile}`;
    
    // Show/hide user info
    const userInfo = document.querySelector('.user-info');
    if (currentProfile === 'avaliador' || currentProfile === 'lojista') {
      userInfo.classList.remove('hidden');
    } else {
      userInfo.classList.add('hidden');
    }
  },
  
  // Update UI for logged out user
  updateUIForLoggedOutUser: function() {
    // Reset displays
    const balanceElement = document.querySelector('.balance-amount');
    if (balanceElement) {
      balanceElement.textContent = 'R$ 0,00';
    }
    
    const levelElement = document.querySelector('.level-text');
    if (levelElement) {
      levelElement.textContent = 'Nível 1';
    }
    
    // Hide user info
    const userInfo = document.querySelector('.user-info');
    if (userInfo) {
      userInfo.classList.add('hidden');
    }
    
    // Reset to tourist profile
    document.body.className = 'modo-turista';
    document.querySelectorAll('.profile-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.profile === 'turista') {
        btn.classList.add('active');
      }
    });
  },
  
  // Check if user has specific permission
  hasPermission: function(permission) {
    if (!this.user) return false;
    return GringoSafe.utils.hasPermission(permission);
  },
  
  // Get current user
  getCurrentUser: function() {
    return this.user;
  },
  
  // Check if user is logged in
  isLoggedIn: function() {
    return this.user !== null;
  }
};

// Initialize auth when page loads
document.addEventListener("DOMContentLoaded", () => {
  GringoSafe.auth.init();
});
