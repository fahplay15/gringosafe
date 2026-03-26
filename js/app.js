// GringoSafe App Controller - Versão Completa e Funcional
window.GringoSafe = window.GringoSafe || {};

// Initialize state
GringoSafe.state = {
  user: null,
  currentUser: null,
  location: null,
  filters: {
    category: 'all'
  }
};

// Initialize utils
GringoSafe.utils = {
  showNotification: function(message, type = 'success') {
    const toast = document.getElementById('notificationToast');
    const messageEl = document.querySelector('.toast-message');
    if (toast && messageEl) {
      messageEl.textContent = message;
      toast.classList.remove('hidden');
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 3000);
    }
    console.log(`[${type}] ${message}`);
  },
  
  debounce: function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

// Initialize auth
GringoSafe.auth = {
  currentUser: null,
  
  init: function() {
    console.log("Auth initialized");
    // Create demo user
    this.currentUser = {
      uid: 'demo-user',
      profile: 'turista',
      balance: 0,
      level: 1,
      stats: { pricesAdded: 0, questionsAnswered: 0 }
    };
    GringoSafe.state.currentUser = this.currentUser;
  },
  
  switchProfile: function(profile) {
    this.currentUser.profile = profile;
    GringoSafe.state.currentUser = this.currentUser;
    console.log(`Profile switched to: ${profile}`);
    GringoSafe.app.updateUIForProfile(profile);
  },
  
  addPoints: function(points) {
    this.currentUser.balance = (this.currentUser.balance || 0) + points;
    this.currentUser.stats.pricesAdded = (this.currentUser.stats.pricesAdded || 0) + 1;
    GringoSafe.utils.showNotification(`+${points} pontos!`, "success");
  }
};

// Initialize map
GringoSafe.map = {
  init: function() {
    console.log("Map initialized");
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        GringoSafe.state.location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log("Location obtained:", GringoSafe.state.location);
      });
    }
  },
  
  addMarker: function(data) {
    console.log("Marker added:", data);
  },
  
  filterMarkers: function(filters) {
    console.log("Markers filtered:", filters);
  }
};

// Initialize AI
GringoSafe.ai = {
  init: function() {
    console.log("AI initialized");
  }
};

// Initialize DB
GringoSafe.db = {
  init: function() {
    console.log("DB initialized");
  },
  
  addQuestion: function(data) {
    console.log("Question added:", data);
  },
  
  addMarker: function(data) {
    console.log("Marker saved:", data);
  },
  
  requestWithdrawal: function(data) {
    console.log("Withdrawal requested:", data);
  }
};

// Main App
GringoSafe.app = {
  init: function() {
    console.log("Initializing GringoSafe...");
    
    // Initialize components
    GringoSafe.auth.init();
    GringoSafe.map.init();
    GringoSafe.ai.init();
    GringoSafe.db.init();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Load default profile
    this.updateUIForProfile('turista');
    
    console.log("GringoSafe initialized successfully!");
  },
  
  setupEventListeners: function() {
    console.log("Setting up event listeners...");
    
    // Profile switcher
    document.querySelectorAll('.profile-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        console.log("Profile button clicked:", e.currentTarget.dataset.profile);
        const profile = e.currentTarget.dataset.profile;
        GringoSafe.auth.switchProfile(profile);
      });
    });
    
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        console.log("Nav button clicked:", e.currentTarget.dataset.page);
        const page = e.currentTarget.dataset.page;
        this.navigateToPage(page);
      });
    });
    
    // Tourist Actions
    document.getElementById('askPriceBtn')?.addEventListener('click', () => {
      console.log("Ask Price button clicked!");
      if (GringoSafe.state.location) {
        const locationText = `${GringoSafe.state.location.lat.toFixed(6)}, ${GringoSafe.state.location.lng.toFixed(6)}`;
        document.getElementById('locationQuestion').value = locationText;
      }
      document.getElementById('askPriceModal').classList.remove('hidden');
    });
    
    document.getElementById('safeRouteBtn')?.addEventListener('click', () => {
      console.log("Safe Route button clicked!");
      this.generateSafeRoute();
    });
    
    // Evaluator Actions
    document.getElementById('addPriceBtn')?.addEventListener('click', () => {
      console.log("Add Price button clicked!");
      document.getElementById('addPriceModal').classList.remove('hidden');
    });
    
    document.getElementById('answerQuestionsBtn')?.addEventListener('click', () => {
      console.log("Answer Questions button clicked!");
      this.openQuestionsList();
    });
    
    // Store Owner Actions
    document.getElementById('manageStoreBtn')?.addEventListener('click', () => {
      console.log("Manage Store button clicked!");
      this.openStoreManagement();
    });
    
    document.getElementById('premiumUpgradeBtn')?.addEventListener('click', () => {
      console.log("Premium Upgrade button clicked!");
      this.openPremiumUpgrade();
    });
    
    // Camera button
    document.getElementById('cameraBtn')?.addEventListener('click', () => {
      console.log("Camera button clicked!");
      this.openCamera();
    });
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        console.log("Filter button clicked:", e.currentTarget.dataset.filter);
        const filter = e.currentTarget.dataset.filter;
        this.applyFilter(filter);
      });
    });
    
    // Wallet button
    document.querySelector('.wallet-btn')?.addEventListener('click', () => {
      console.log("Wallet button clicked!");
      this.openWalletModal();
    });
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', GringoSafe.utils.debounce((e) => {
        this.handleSearch(e.target.value);
      }, 300));
    }
    
    console.log("Event listeners setup complete!");
  },
  
  updateUIForProfile: function(profile) {
    console.log("Updating UI for profile:", profile);
    
    document.body.classList.remove('modo-turista', 'modo-avaliador', 'modo-lojista');
    document.body.classList.add(`modo-${profile}`);
    
    document.getElementById('touristActions')?.classList.add('hidden');
    document.getElementById('evaluatorActions')?.classList.add('hidden');
    document.getElementById('storeActions')?.classList.add('hidden');
    document.querySelector('.user-info')?.classList.add('hidden');
    document.querySelector('.wallet-btn')?.classList.add('hidden');
    
    switch(profile) {
      case 'turista':
        document.getElementById('touristActions')?.classList.remove('hidden');
        break;
      case 'avaliador':
        document.getElementById('evaluatorActions')?.classList.remove('hidden');
        document.querySelector('.user-info')?.classList.remove('hidden');
        document.getElementById('notificationBell')?.classList.remove('hidden');
        document.querySelector('.wallet-btn')?.classList.remove('hidden');
        break;
      case 'lojista':
        document.getElementById('storeActions')?.classList.remove('hidden');
        document.querySelector('.user-info')?.classList.remove('hidden');
        document.querySelector('.wallet-btn')?.classList.remove('hidden');
        break;
    }
    
    document.querySelectorAll('.profile-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-profile="${profile}"]`)?.classList.add('active');
  },
  
  navigateToPage: function(page) {
    console.log("Navigating to:", page);
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
    GringoSafe.utils.showNotification(`Navegando para ${page}`, 'info');
  },
  
  handleSearch: function(query) {
    console.log("Searching for:", query);
    GringoSafe.map.filterMarkers({ search: query });
  },
  
  applyFilter: function(filter) {
    console.log("Applying filter:", filter);
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');
    GringoSafe.map.filterMarkers({ category: filter });
  },
  
  generateSafeRoute: function() {
    console.log("Generating safe route...");
    GringoSafe.utils.showNotification("Roteiro seguro gerado!", "success");
  },
  
  openCamera: function() {
    console.log("Opening camera...");
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        GringoSafe.utils.showNotification("Foto carregada!", "success");
      }
    };
    input.click();
  },
  
  openWalletModal: function() {
    console.log("Opening wallet modal...");
    document.getElementById('walletModal')?.classList.remove('hidden');
  },
  
  openQuestionsList: function() {
    console.log("Opening questions list...");
    GringoSafe.utils.showNotification("Lista de dúvidas aberta!", "info");
  },
  
  openStoreManagement: function() {
    console.log("Opening store management...");
    GringoSafe.utils.showNotification("Área do Lojista aberta!", "info");
  },
  
  openPremiumUpgrade: function() {
    console.log("Opening premium upgrade...");
    GringoSafe.utils.showNotification("Plano Ouro disponível!", "info");
  }
};

// Global functions
window.closeModal = function(modalId) {
  console.log("Closing modal:", modalId);
  document.getElementById(modalId)?.classList.add('hidden');
};

window.submitQuestion = function() {
  console.log("Submitting question...");
  const product = document.getElementById('productQuestion')?.value;
  const description = document.getElementById('descriptionQuestion')?.value;
  
  if (!product) {
    GringoSafe.utils.showNotification("Preencha o produto", "warning");
    return;
  }
  
  GringoSafe.db.addQuestion({
    product,
    description,
    userId: 'demo-user',
    timestamp: new Date()
  });
  
  closeModal('askPriceModal');
  GringoSafe.utils.showNotification("Pergunta enviada!", "success");
  document.getElementById('productQuestion').value = '';
  document.getElementById('descriptionQuestion').value = '';
};

window.submitPrice = function() {
  console.log("Submitting price...");
  const productName = document.getElementById('productName')?.value;
  const price = document.getElementById('productPrice')?.value;
  const establishment = document.getElementById('establishmentName')?.value;
  
  if (!productName || !price || !establishment) {
    GringoSafe.utils.showNotification("Preencha todos os campos", "warning");
    return;
  }
  
  const priceData = {
    title: productName,
    price: parseFloat(price),
    establishment,
    timestamp: new Date()
  };
  
  GringoSafe.map.addMarker(priceData);
  GringoSafe.db.addMarker(priceData);
  
  closeModal('addPriceModal');
  GringoSafe.utils.showNotification("Preço adicionado! +10 pontos", "success");
  GringoSafe.auth.addPoints(10);
  
  document.getElementById('productName').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('establishmentName').value = '';
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded, initializing app...");
  GringoSafe.app.init();
});
