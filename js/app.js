// GringoSafe App Controller
window.GringoSafe = window.GringoSafe || {};

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
    
    // Load saved preferences
    const currentProfile = GringoSafe.auth.currentUser?.profile || 'turista';
    this.updateUIForProfile(currentProfile);
    
    console.log("GringoSafe initialized successfully!");
  },
  
  setupEventListeners: function() {
    // Profile switcher
    document.querySelectorAll('.profile-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const profile = e.currentTarget.dataset.profile;
        GringoSafe.auth.switchProfile(profile);
        this.updateUIForProfile(profile);
      });
    });
    
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const page = e.currentTarget.dataset.page;
        this.navigateToPage(page);
      });
    });
    
    // Tourist Actions
    document.getElementById('askPriceBtn')?.addEventListener('click', () => {
      if (GringoSafe.state.location) {
        const locationText = `${GringoSafe.state.location.lat.toFixed(6)}, ${GringoSafe.state.location.lng.toFixed(6)}`;
        document.getElementById('locationQuestion').value = locationText;
      }
      document.getElementById('askPriceModal').classList.remove('hidden');
    });
    
    document.getElementById('safeRouteBtn')?.addEventListener('click', () => {
      this.generateSafeRoute();
    });
    
    // Evaluator Actions
    document.getElementById('addPriceBtn')?.addEventListener('click', () => {
      document.getElementById('addPriceModal').classList.remove('hidden');
    });
    
    document.getElementById('answerQuestionsBtn')?.addEventListener('click', () => {
      this.openQuestionsList();
    });
    
    // Store Owner Actions
    document.getElementById('manageStoreBtn')?.addEventListener('click', () => {
      this.openStoreManagement();
    });
    
    document.getElementById('premiumUpgradeBtn')?.addEventListener('click', () => {
      this.openPremiumUpgrade();
    });
    
    // Camera button
    document.getElementById('cameraBtn')?.addEventListener('click', () => {
      this.openCamera();
    });
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', GringoSafe.utils.debounce((e) => {
        this.handleSearch(e.target.value);
      }, 300));
    }
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.currentTarget.dataset.filter;
        this.applyFilter(filter);
      });
    });
    
    // Wallet button
    document.querySelector('.wallet-btn')?.addEventListener('click', () => {
      this.openWalletModal();
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.currentTarget.closest('.modal-overlay');
        if (modal) modal.classList.add('hidden');
      });
    });
  },
  
  updateUIForProfile: function(profile) {
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
    const pageNames = {
      map: 'Mapa',
      search: 'Busca',
      questions: 'Dúvidas',
      wallet: 'Carteira',
      profile: 'Perfil'
    };
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
    
    GringoSafe.utils.showNotification(`Navegando para ${pageNames[page]}`, 'info');
  },
  
  handleSearch: function(query) {
    if (!query.trim()) {
      GringoSafe.map.filterMarkers({});
      return;
    }
    
    GringoSafe.map.filterMarkers({ search: query });
    console.log(`Searching for: ${query}`);
  },
  
  applyFilter: function(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');
    
    GringoSafe.map.filterMarkers({ category: filter });
    GringoSafe.state.filters.category = filter;
  },
  
  generateSafeRoute: function() {
    if (!GringoSafe.state.location) {
      GringoSafe.utils.showNotification("Localização não disponível", "warning");
      return;
    }
    
    GringoSafe.utils.showNotification("Gerando roteiro seguro...", "info");
    // Implementation for safe route generation
  },
  
  openCamera: function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          window.currentPhoto = e.target.result;
          GringoSafe.utils.showNotification("Foto carregada!", "success");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  },
  
  openWalletModal: function() {
    document.getElementById('walletModal')?.classList.remove('hidden');
    this.updateWalletDisplay();
  },
  
  updateWalletDisplay: function() {
    const user = GringoSafe.auth.currentUser;
    if (user) {
      document.querySelector('.balance-amount-large').textContent = 
        `R$ ${user.balance?.toFixed(2) || '0,00'}`;
    }
  },
  
  openQuestionsList: function() {
    GringoSafe.utils.showNotification("Lista de dúvidas de turistas", "info");
  },
  
  openStoreManagement: function() {
    GringoSafe.utils.showNotification("Área do Lojista", "info");
  },
  
  openPremiumUpgrade: function() {
    GringoSafe.utils.showNotification("Plano Ouro - Destaque seu negócio", "info");
  }
};

// Global functions
window.closeModal = function(modalId) {
  document.getElementById(modalId)?.classList.add('hidden');
};

window.submitQuestion = function() {
  const product = document.getElementById('productQuestion')?.value;
  const location = document.getElementById('locationQuestion')?.value;
  const description = document.getElementById('descriptionQuestion')?.value;
  
  if (!product) {
    GringoSafe.utils.showNotification("Preencha o produto", "warning");
    return;
  }
  
  GringoSafe.db.addQuestion({
    product,
    location,
    description,
    userId: GringoSafe.auth.currentUser?.uid || 'anonymous',
    timestamp: new Date()
  });
  
  closeModal('askPriceModal');
  GringoSafe.utils.showNotification("Pergunta enviada!", "success");
  
  document.getElementById('productQuestion').value = '';
  document.getElementById('descriptionQuestion').value = '';
};

window.submitPrice = function() {
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
    location: GringoSafe.state.location || { lat: -23.5505, lng: -46.6333 },
    userId: GringoSafe.auth.currentUser?.uid || 'anonymous',
    timestamp: new Date()
  };
  
  GringoSafe.map.addMarker(priceData);
  GringoSafe.db.addMarker(priceData);
  
  closeModal('addPriceModal');
  GringoSafe.utils.showNotification("Preço adicionado! +10 pontos", "success");
  
  document.getElementById('productName').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('establishmentName').value = '';
};

window.requestWithdrawal = function() {
  const pixKey = document.getElementById('pixKey')?.value;
  const amount = document.getElementById('withdrawAmount')?.value;
  
  if (!pixKey || !amount) {
    GringoSafe.utils.showNotification("Preencha todos os campos", "warning");
    return;
  }
  
  if (parseFloat(amount) < 10) {
    GringoSafe.utils.showNotification("Mínimo R$ 10,00", "warning");
    return;
  }
  
  GringoSafe.db.requestWithdrawal({
    pixKey,
    amount: parseFloat(amount),
    userId: GringoSafe.auth.currentUser?.uid || 'anonymous',
    timestamp: new Date()
  });
  
  closeModal('walletModal');
  GringoSafe.utils.showNotification("Saque solicitado!", "success");
  
  document.getElementById('pixKey').value = '';
  document.getElementById('withdrawAmount').value = '';
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  GringoSafe.app.init();
});
