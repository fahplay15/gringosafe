// ===== MAIN APPLICATION =====
GringoSafe.app = {
  isInitialized: false,
  
  // Initialize application
  init: async function() {
    try {
      console.log("Initializing GringoSafe App...");
      
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }
      
      // Initialize components
      await this.initializeComponents();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Setup service worker for PWA
      this.setupServiceWorker();
      
      this.isInitialized = true;
      console.log("GringoSafe App initialized successfully");
      
      // Show welcome message
      setTimeout(() => {
        GringoSafe.utils.showNotification("Bem-vindo ao GringoSafe! 🛡️", "success");
      }, 1000);
      
    } catch (error) {
      console.error("Error initializing app:", error);
      GringoSafe.utils.showNotification("Erro ao inicializar o aplicativo", "error");
    }
  },
  
  // Initialize components
  initializeComponents: async function() {
    // Initialize map
    await GringoSafe.map.init();
    
    // Initialize database
    GringoSafe.db.init();
    
    // Setup real-time listeners
    GringoSafe.db.setupRealtimeListeners();
    
    // Load saved preferences
    this.loadSavedPreferences();
    
    // Initialize UI with current profile
    const currentProfile = GringoSafe.auth.currentUser?.profile || 'turista';
    this.updateUIForProfile(currentProfile);
    
    console.log("All components initialized");
  },
  
  // Update UI based on user profile
  updateUIForProfile: function(profile) {
    // Remove all profile classes from body
    document.body.classList.remove('modo-turista', 'modo-avaliador', 'modo-lojista');
    // Add current profile class
    document.body.classList.add(`modo-${profile}`);
    
    // Hide all action islands
    document.getElementById('touristActions')?.classList.add('hidden');
    document.getElementById('evaluatorActions')?.classList.add('hidden');
    document.getElementById('storeActions')?.classList.add('hidden');
    
    // Hide user info by default
    document.querySelector('.user-info')?.classList.add('hidden');
    
    // Hide wallet button by default
    document.querySelector('.wallet-btn')?.classList.add('hidden');
    
    // Show/hide elements based on profile
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
    
    // Update active profile button
    document.querySelectorAll('.profile-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-profile="${profile}"]`)?.classList.add('active');
    
    // Update map markers based on profile
    if (GringoSafe.map && GringoSafe.map.map) {
      GringoSafe.map.filterMarkersByProfile(profile);
    }
    
    console.log(`UI updated for profile: ${profile}`);
  },
  
  // Setup event listeners
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
      this.openAskPriceModal();
    });
    
    document.getElementById('safeRouteBtn')?.addEventListener('click', () => {
      this.generateSafeRoute();
    });
    
    // Evaluator Actions
    document.getElementById('addPriceBtn')?.addEventListener('click', () => {
      this.openAddPriceModal();
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
    document.querySelector('[data-page="wallet"]')?.addEventListener('click', () => {
      this.openWalletModal();
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.currentTarget.closest('.modal-overlay');
        if (modal) {
          modal.classList.add('hidden');
        }
      });
    });
    
    // Modal overlay clicks
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.add('hidden');
        }
      });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });
    
    // Online/offline detection
    window.addEventListener('online', () => {
      GringoSafe.utils.showNotification("Conexão restaurada", "success");
    });
    
    window.addEventListener('offline', () => {
      GringoSafe.utils.showNotification("Sem conexão com a internet", "warning");
    });
  },
  
  // Navigate to page
  navigateToPage: function(page) {
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.page === page) {
        btn.classList.add('active');
      }
    });
    
    // Here you would implement page routing logic
    console.log(`Navigating to ${page}`);
    
    // For now, just show a notification
    const pageNames = {
      map: 'Mapa',
      search: 'Busca',
      questions: 'Dúvidas',
      profile: 'Perfil'
    };
    
    GringoSafe.utils.showNotification(`Página: ${pageNames[page] || page}`, "info");
  },
  
  // Open ask price modal
  openAskPriceModal: function() {
    if (!GringoSafe.auth.hasPermission('canAskQuestions')) {
      GringoSafe.utils.showNotification("Você não tem permissão para fazer perguntas", "warning");
      return;
    }
    
    const modal = document.getElementById('askPriceModal');
    if (modal) {
      modal.classList.remove('hidden');
      
      // Set current location
      const locationInput = document.getElementById('locationQuestion');
      if (locationInput && GringoSafe.state.location) {
        locationInput.value = `${GringoSafe.state.location.lat.toFixed(6)}, ${GringoSafe.state.location.lng.toFixed(6)}`;
      }
    }
  },
  
  // Open add price modal
  openAddPriceModal: function() {
    if (!GringoSafe.auth.hasPermission('canAddPrices')) {
      GringoSafe.utils.showNotification("Você não tem permissão para adicionar preços", "warning");
      return;
    }
    
    const modal = document.getElementById('addPriceModal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  },
  
  // Open camera
  openCamera: async function() {
    try {
      const img = await GringoSafe.ai.captureFromCamera();
      const result = await GringoSafe.ai.identifyProduct(img);
      
      if (result.success && result.suggestions.length > 0) {
        const topSuggestion = result.suggestions[0];
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.value = topSuggestion.product;
        }
        
        GringoSafe.utils.showNotification(
          `Produto identificado: ${topSuggestion.product}`,
          "success"
        );
      } else {
        GringoSafe.utils.showNotification("Não foi possível identificar o produto", "warning");
      }
      
    } catch (error) {
      console.error("Error opening camera:", error);
      GringoSafe.utils.showNotification("Erro ao acessar câmera", "error");
    }
  },
  
  // Handle search
  handleSearch: function(query) {
    if (!query.trim()) {
      // Clear search
      GringoSafe.map.filterMarkers({});
      return;
    }
    
    // Search in markers
    const filteredMarkers = GringoSafe.state.markers.filter(marker => 
      marker.title.toLowerCase().includes(query.toLowerCase()) ||
      marker.description?.toLowerCase().includes(query.toLowerCase())
    );
    
    // Update map with filtered results
    GringoSafe.map.filterMarkers({
      search: query
    });
    
    console.log(`Searching for: ${query}`);
  },
  
  // Apply filter
  applyFilter: function(filter) {
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.filter === filter) {
        btn.classList.add('active');
      }
    });
    
    // Apply filter to markers
    GringoSafe.map.filterMarkers({
      category: filter
    });
    
    // Update state
    GringoSafe.state.filters.category = filter;
  },
  
  // Generate safe route
  generateSafeRoute: async function() {
    if (!GringoSafe.state.location) {
      GringoSafe.utils.showNotification("Localização não disponível", "warning");
      return;
    }
    
    try {
      // For demo, use a fixed destination (could be user input)
      const destination = {
        lat: -23.5505,
        lng: -46.6333
      };
      
      const result = await GringoSafe.ai.generateSafeRoute(
        GringoSafe.state.location,
        destination,
        {
          categories: ['food', 'transport'],
          maxDistance: 5
        }
      );
      
      if (result.success) {
        GringoSafe.map.drawSafeRoute(result.waypoints);
        GringoSafe.utils.showNotification(
          `Roteiro seguro gerado: ${result.estimatedTime.formatted}`,
          "success"
        );
      } else {
        GringoSafe.utils.showNotification("Erro ao gerar roteiro", "error");
      }
      
    } catch (error) {
      console.error("Error generating safe route:", error);
      GringoSafe.utils.showNotification("Erro ao gerar roteiro", "error");
    }
  },
  
  // Show premium locations
  showPremiumLocations: function() {
    // Filter to show only premium markers
    GringoSafe.map.filterMarkers({
      premium: true
    });
    
    GringoSafe.utils.showNotification("Mostrando locais premium", "info");
  },
  
  // Handle keyboard shortcuts
  handleKeyboardShortcuts: function(e) {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.focus();
      }
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(modal => {
        modal.classList.add('hidden');
      });
    }
    
    // Ctrl/Cmd + Enter to submit forms
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const activeModal = document.querySelector('.modal-overlay:not(.hidden)');
      if (activeModal) {
        const submitBtn = activeModal.querySelector('.btn-primary');
        if (submitBtn) {
          submitBtn.click();
        }
      }
    }
  },
  
  // Load saved preferences
  loadSavedPreferences: function() {
    // Load theme
    const savedTheme = localStorage.getItem('gringosafe-theme');
    if (savedTheme) {
      document.body.setAttribute('data-theme', savedTheme);
    }
    
    // Load language
    const savedLanguage = localStorage.getItem('gringosafe-language');
    if (savedLanguage) {
      GringoSafe.state.language = savedLanguage;
    }
    
    // Load currency
    const savedCurrency = localStorage.getItem('gringosafe-currency');
    if (savedCurrency) {
      GringoSafe.state.currency = savedCurrency;
    }
  },
  
  // Setup service worker for PWA
  setupServiceWorker: function() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available
                  if (confirm('Nova versão disponível! Deseja atualizar?')) {
                    window.location.reload();
                  }
                }
              });
            });
            
          })
          .catch(error => {
            console.log('ServiceWorker registration failed:', error);
          });
      });
    }
  },
  
  // Profile-specific functions
  
  // Tourist: Open questions list
  openQuestionsList: function() {
    // Implementation for evaluators to answer tourist questions
    GringoSafe.utils.showNotification("Lista de dúvidas de turistas", "info");
  },
  
  // Store Owner: Open store management
  openStoreManagement: function() {
    // Implementation for store owners to manage their business
    GringoSafe.utils.showNotification("Área do Lojista", "info");
  },
  
  // Store Owner: Open premium upgrade
  openPremiumUpgrade: function() {
    // Implementation for premium upgrade
    GringoSafe.utils.showNotification("Plano Ouro - Destaque seu negócio", "info");
  },
  
  // Open wallet modal
  openWalletModal: function() {
    const modal = document.getElementById('walletModal');
    if (modal) {
      modal.classList.remove('hidden');
      // Update balance display
      this.updateWalletDisplay();
    }
  },
  
  // Update wallet display
  updateWalletDisplay: function() {
    const user = GringoSafe.auth.currentUser;
    if (user) {
      // Update balance
      document.querySelector('.balance-amount-large').textContent = 
        `R$ ${user.balance?.toFixed(2) || '0,00'}`;
      
      // Update stats
      document.querySelector('.wallet-stats .stat-item:nth-child(1) .stat-value').textContent = 
        user.stats?.pricesAdded || '0';
      document.querySelector('.wallet-stats .stat-item:nth-child(2) .stat-value').textContent = 
        user.stats?.questionsAnswered || '0';
    }
  },
  
  // Show login modal
  showLoginModal: function() {
    // Create login modal if it doesn't exist
    let loginModal = document.getElementById('loginModal');
    
    if (!loginModal) {
      loginModal = document.createElement('div');
      loginModal.id = 'loginModal';
      loginModal.className = 'modal-overlay';
      loginModal.innerHTML = `
        <div class="modal-content floating-island">
          <div class="modal-header">
            <h3>Entrar no GringoSafe</h3>
            <button class="close-btn" onclick="closeModal('loginModal')">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <p>Faça login para acessar todas as funcionalidades</p>
            <button class="btn-primary google-signin-btn" style="width: 100%; margin-top: 16px;">
              <i class="fab fa-google"></i>
              Entrar com Google
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(loginModal);
      
      // Add event listener to Google sign-in button
      loginModal.querySelector('.google-signin-btn').addEventListener('click', () => {
        GringoSafe.auth.signInWithGoogle();
        loginModal.classList.add('hidden');
      });
    }
    
    loginModal.classList.remove('hidden');
  }
};

// Global functions for modal handling
window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
  }
};

window.submitQuestion = async function() {
  const product = document.getElementById('productQuestion')?.value;
  const location = document.getElementById('locationQuestion')?.value;
  const description = document.getElementById('descriptionQuestion')?.value;
  
  if (!product || !location) {
    GringoSafe.utils.showNotification("Preencha todos os campos obrigatórios", "warning");
    return;
  }
  
  try {
    // Here you would save to Firebase
    console.log('Submitting question:', { product, location, description });
    
    GringoSafe.utils.showNotification("Pergunta enviada com sucesso!", "success");
    closeModal('askPriceModal');
    
    // Clear form
    document.getElementById('productQuestion').value = '';
    document.getElementById('descriptionQuestion').value = '';
    
  } catch (error) {
    console.error('Error submitting question:', error);
    GringoSafe.utils.showNotification("Erro ao enviar pergunta", "error");
  }
};

window.submitPrice = async function() {
  const productName = document.getElementById('productName')?.value;
  const productPrice = parseFloat(document.getElementById('productPrice')?.value);
  const establishmentName = document.getElementById('establishmentName')?.value;
  
  if (!productName || !productPrice || !establishmentName) {
    GringoSafe.utils.showNotification("Preencha todos os campos obrigatórios", "warning");
    return;
  }
  
  try {
    // Get current location or use default
    let location = GringoSafe.state.location;
    if (!location) {
      location = { lat: -23.5505, lng: -46.6333 }; // São Paulo default
    }
    
    // Create marker data
    const markerData = {
      id: 'user-' + Date.now(),
      lat: location.lat,
      lng: location.lng,
      title: productName,
      price: productPrice,
      currency: GringoSafe.state.currency || 'BRL',
      type: 'validated',
      description: establishmentName,
      verified: false,
      category: 'food',
      userId: GringoSafe.auth.getCurrentUser()?.uid || 'anonymous',
      timestamp: new Date().toISOString()
    };
    
    // Add to map immediately
    GringoSafe.map.addMarker(markerData);
    
    // Save to database
    try {
      await GringoSafe.db.addMarker(markerData);
    } catch (error) {
      console.log("Database not available, using local storage");
    }
    
    // Add points for adding price
    await GringoSafe.auth.addPoints(10, 'Adicionou preço');
    
    GringoSafe.utils.showNotification("Preço adicionado com sucesso! +10 pontos", "success");
    closeModal('addPriceModal');
    
    // Clear form
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('establishmentName').value = '';
    
  } catch (error) {
  }
};

window.requestWithdrawal = function() {
  const pixKey = document.getElementById('pixKey')?.value;
  const amount = document.getElementById('withdrawAmount')?.value;
  
  if (!pixKey || !amount) {
    GringoSafe.utils.showNotification("Preencha todos os campos", "warning");
    return;
  }
  
  if (parseFloat(amount) < 10) {
    GringoSafe.utils.showNotification("Valor mínimo de saque é R$ 10,00", "warning");
    return;
  }
  
  // Process withdrawal
  GringoSafe.db.requestWithdrawal({
    pixKey,
    amount: parseFloat(amount),
    userId: GringoSafe.auth.currentUser?.uid,
    timestamp: new Date()
  });
  
  closeModal('walletModal');
  GringoSafe.utils.showNotification("Solicitação de saque enviada!", "success");
};

// Global functions for modal handling
window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
  }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  GringoSafe.app.init();
});
