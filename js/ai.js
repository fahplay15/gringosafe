// ===== AI FUNCTIONALITY =====
GringoSafe.ai = {
  model: null,
  isModelLoaded: false,
  
  // Initialize AI model
  init: async function() {
    try {
      console.log("Loading AI model...");
      
      // Load MobileNet model
      this.model = await mobilenet.load();
      this.isModelLoaded = true;
      
      console.log("AI model loaded successfully");
      GringoSafe.utils.showNotification("IA carregada com sucesso", "success");
      
    } catch (error) {
      console.error("Error loading AI model:", error);
      GringoSafe.utils.showNotification("Erro ao carregar modelo de IA", "error");
    }
  },
  
  // Identify product from image
  identifyProduct: async function(imageElement) {
    if (!this.isModelLoaded) {
      throw new Error("AI model not loaded");
    }
    
    try {
      // Get predictions from the model
      const predictions = await this.model.classify(imageElement);
      
      // Filter predictions by confidence threshold
      const filteredPredictions = predictions
        .filter(prediction => prediction.probability >= GringoSafe.config.ai.confidence)
        .slice(0, GringoSafe.config.ai.maxPredictions);
      
      // Map predictions to product categories
      const productSuggestions = this.mapPredictionsToProducts(filteredPredictions);
      
      return {
        success: true,
        predictions: filteredPredictions,
        suggestions: productSuggestions
      };
      
    } catch (error) {
      console.error("Error identifying product:", error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Map AI predictions to product categories
  mapPredictionsToProducts: function(predictions) {
    const productMapping = {
      // Beverages
      'water bottle': 'Água mineral',
      'soda bottle': 'Refrigerante',
      'juice': 'Suco',
      'coffee cup': 'Café',
      'beer': 'Cerveja',
      
      // Food
      'pizza': 'Pizza',
      'hamburger': 'Hambúrguer',
      'sandwich': 'Sanduíche',
      'hot dog': 'Cachorro-quente',
      'ice cream': 'Sorvete',
      'popcorn': 'Pipoca',
      'chocolate': 'Chocolate',
      'candy': 'Doce/Bala',
      'fruit': 'Fruta',
      'bread': 'Pão',
      'cake': 'Bolo',
      
      // Transportation
      'taxi': 'Táxi',
      'bus': 'Ônibus',
      'metro': 'Metrô',
      'train': 'Trem',
      'bicycle': 'Bicicleta',
      'motorcycle': 'Moto',
      'car': 'Carro',
      
      // Shopping
      't-shirt': 'Camiseta',
      'jeans': 'Calça jeans',
      'shoes': 'Sapatos',
      'bag': 'Bolsa',
      'watch': 'Relógio',
      'sunglasses': 'Óculos de sol',
      'hat': 'Chapéu',
      
      // Electronics
      'phone': 'Celular',
      'laptop': 'Notebook',
      'headphones': 'Fone de ouvido',
      'camera': 'Câmera',
      
      // Services
      'hotel': 'Hotel',
      'restaurant': 'Restaurante',
      'pharmacy': 'Farmácia',
      'hospital': 'Hospital',
      'bank': 'Banco',
      'atm': 'Caixa eletrônico'
    };
    
    const suggestions = [];
    
    predictions.forEach(prediction => {
      const className = prediction.className.toLowerCase();
      
      // Direct mapping
      if (productMapping[className]) {
        suggestions.push({
          product: productMapping[className],
          confidence: prediction.probability,
          category: this.getCategoryForProduct(productMapping[className])
        });
      }
      
      // Partial matching
      Object.keys(productMapping).forEach(key => {
        if (className.includes(key) || key.includes(className)) {
          suggestions.push({
            product: productMapping[key],
            confidence: prediction.probability * 0.8, // Lower confidence for partial matches
            category: this.getCategoryForProduct(productMapping[key])
          });
        }
      });
    });
    
    // Remove duplicates and sort by confidence
    const uniqueSuggestions = suggestions
      .filter((suggestion, index, self) => 
        index === self.findIndex(s => s.product === suggestion.product)
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
    
    return uniqueSuggestions;
  },
  
  // Get category for product
  getCategoryForProduct: function(product) {
    const categories = {
      'Água mineral': 'food',
      'Refrigerante': 'food',
      'Suco': 'food',
      'Café': 'food',
      'Cerveja': 'food',
      'Pizza': 'food',
      'Hambúrguer': 'food',
      'Sanduíche': 'food',
      'Cachorro-quente': 'food',
      'Sorvete': 'food',
      'Pipoca': 'food',
      'Chocolate': 'food',
      'Doce/Bala': 'food',
      'Fruta': 'food',
      'Pão': 'food',
      'Bolo': 'food',
      'Táxi': 'transport',
      'Ônibus': 'transport',
      'Metrô': 'transport',
      'Trem': 'transport',
      'Bicicleta': 'transport',
      'Moto': 'transport',
      'Carro': 'transport',
      'Camiseta': 'shopping',
      'Calça jeans': 'shopping',
      'Sapatos': 'shopping',
      'Bolsa': 'shopping',
      'Relógio': 'shopping',
      'Óculos de sol': 'shopping',
      'Chapéu': 'shopping',
      'Celular': 'shopping',
      'Notebook': 'shopping',
      'Fone de ouvido': 'shopping',
      'Câmera': 'shopping',
      'Hotel': 'services',
      'Restaurante': 'services',
      'Farmácia': 'services',
      'Hospital': 'services',
      'Banco': 'services',
      'Caixa eletrônico': 'services'
    };
    
    return categories[product] || 'other';
  },
  
  // Capture image from camera
  captureFromCamera: function() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'camera';
      
      input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target.result;
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        } else {
          reject(new Error('No file selected'));
        }
      };
      
      input.onerror = () => reject(new Error('Failed to open camera'));
      input.click();
    });
  },
  
  // Select image from gallery
  selectFromGallery: function() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target.result;
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        } else {
          reject(new Error('No file selected'));
        }
      };
      
      input.onerror = () => reject(new Error('Failed to open gallery'));
      input.click();
    });
  },
  
  // Generate price consensus from answers
  generateConsensus: function(answers) {
    if (!answers || answers.length === 0) {
      return null;
    }
    
    // Filter out outliers (more than 2 standard deviations from mean)
    const prices = answers.map(a => a.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    const filteredPrices = prices.filter(price => 
      Math.abs(price - mean) <= 2 * stdDev
    );
    
    // Calculate consensus price
    const consensusPrice = filteredPrices.reduce((a, b) => a + b, 0) / filteredPrices.length;
    
    // Calculate confidence based on number of answers and variance
    const answerCount = answers.length;
    const priceRange = Math.max(...filteredPrices) - Math.min(...filteredPrices);
    const confidence = Math.min(1, (answerCount / 5) * (1 - priceRange / consensusPrice));
    
    return {
      price: Math.round(consensusPrice * 100) / 100,
      confidence: Math.round(confidence * 100),
      answerCount: answerCount,
      priceRange: Math.round(priceRange * 100) / 100,
      currency: answers[0].currency || 'BRL'
    };
  },
  
  // Generate safe route using AI
  generateSafeRoute: async function(start, end, preferences = {}) {
    try {
      // Get all verified locations
      const verifiedLocations = await GringoSafe.db.getVerifiedLocations();
      
      // Filter locations based on preferences
      let filteredLocations = verifiedLocations;
      
      if (preferences.categories && preferences.categories.length > 0) {
        filteredLocations = filteredLocations.filter(loc => 
          preferences.categories.includes(loc.category)
        );
      }
      
      if (preferences.maxDistance) {
        filteredLocations = filteredLocations.filter(loc => {
          const distToStart = GringoSafe.utils.calculateDistance(
            start.lat, start.lng, loc.lat, loc.lng
          );
          const distToEnd = GringoSafe.utils.calculateDistance(
            end.lat, end.lng, loc.lat, loc.lng
          );
          return distToStart <= preferences.maxDistance || distToEnd <= preferences.maxDistance;
        });
      }
      
      // Generate route waypoints (simplified algorithm)
      const waypoints = [start];
      
      // Add intermediate safe points
      if (filteredLocations.length > 0) {
        // Sort by distance from start
        filteredLocations.sort((a, b) => {
          const distA = GringoSafe.utils.calculateDistance(
            start.lat, start.lng, a.lat, a.lng
          );
          const distB = GringoSafe.utils.calculateDistance(
            start.lat, start.lng, b.lat, b.lng
          );
          return distA - distB;
        });
        
        // Add top safe locations as waypoints
        const maxWaypoints = Math.min(3, filteredLocations.length);
        for (let i = 0; i < maxWaypoints; i++) {
          const location = filteredLocations[i];
          const distToPrevious = GringoSafe.utils.calculateDistance(
            waypoints[waypoints.length - 1].lat,
            waypoints[waypoints.length - 1].lng,
            location.lat, location.lng
          );
          
          // Only add if it's not too far from previous waypoint
          if (distToPrevious <= 5) { // 5km max between waypoints
            waypoints.push(location);
          }
        }
      }
      
      waypoints.push(end);
      
      return {
        success: true,
        waypoints: waypoints,
        safeLocations: filteredLocations.length,
        estimatedTime: this.calculateRouteTime(waypoints)
      };
      
    } catch (error) {
      console.error("Error generating safe route:", error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Calculate estimated route time
  calculateRouteTime: function(waypoints) {
    let totalDistance = 0;
    
    for (let i = 1; i < waypoints.length; i++) {
      totalDistance += GringoSafe.utils.calculateDistance(
        waypoints[i-1].lat, waypoints[i-1].lng,
        waypoints[i].lat, waypoints[i].lng
      );
    }
    
    // Assume average speed of 30 km/h in urban areas
    const averageSpeed = 30; // km/h
    const timeInHours = totalDistance / averageSpeed;
    const timeInMinutes = Math.round(timeInHours * 60);
    
    return {
      distance: Math.round(totalDistance * 100) / 100, // km
      time: timeInMinutes, // minutes
      formatted: `${Math.round(totalDistance)} km, ${timeInMinutes} min`
    };
  }
};

// Initialize AI when page loads
document.addEventListener("DOMContentLoaded", () => {
  // Load AI model in background
  setTimeout(() => {
    GringoSafe.ai.init();
  }, 2000);
});
