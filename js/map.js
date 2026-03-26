// ===== MAP FUNCTIONALITY =====
GringoSafe.map = {
  mapbox: null,
  markers: [],
  userMarker: null,
  routeLayer: null,
  
  // Initialize map
  init: async function() {
    try {
      // Initialize Mapbox
      mapboxgl.accessToken = GringoSafe.config.mapbox.accessToken;
      
      this.mapbox = new mapboxgl.Map({
        container: 'map',
        style: GringoSafe.config.mapbox.style,
        center: GringoSafe.config.mapbox.center,
        zoom: GringoSafe.config.mapbox.zoom,
        pitch: 45,
        bearing: -17.6,
        antialias: true
      });
      
      // Add navigation controls
      this.mapbox.addControl(new mapboxgl.NavigationControl());
      
      // Add geolocate control
      this.mapbox.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }));
      
      // Wait for map to load
      await new Promise((resolve) => {
        this.mapbox.on('load', resolve);
      });
      
      // Add custom markers layer
      this.addMarkersLayer();
      
      // Get user location
      await this.getUserLocation();
      
      // Load existing markers
      this.loadMarkers();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log("Map initialized successfully");
      
    } catch (error) {
      console.error("Error initializing map:", error);
      GringoSafe.utils.showNotification("Erro ao carregar o mapa", "error");
    }
  },
  
  // Add custom markers layer
  addMarkersLayer: function() {
    // Add markers source
    this.mapbox.addSource('markers', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });
    
    // Add markers layer
    this.mapbox.addLayer({
      id: 'markers',
      type: 'circle',
      source: 'markers',
      paint: {
        'circle-radius': [
          'case',
          ['==', ['get', 'type'], 'premium'], 12,
          ['==', ['get', 'type'], 'question'], 10,
          8
        ],
        'circle-color': [
          'case',
          ['==', ['get', 'type'], 'validated'], '#10b981',
          ['==', ['get', 'type'], 'premium'], '#f59e0b',
          ['==', ['get', 'type'], 'question'], '#8b5cf6',
          '#6366f1'
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9
      }
    });
    
    // Add markers symbols
    this.mapbox.addLayer({
      id: 'markers-symbols',
      type: 'symbol',
      source: 'markers',
      layout: {
        'text-field': [
          'case',
          ['==', ['get', 'type'], 'validated'], '✓',
          ['==', ['get', 'type'], 'premium'], '★',
          ['==', ['get', 'type'], 'question'], '?',
          '•'
        ],
        'text-size': 12,
        'text-justify': 'center',
        'text-anchor': 'center'
      },
      paint: {
        'text-color': '#ffffff'
      }
    });
  },
  
  // Get user location
  getUserLocation: async function() {
    try {
      const location = await GringoSafe.utils.getCurrentLocation();
      GringoSafe.state.location = location;
      
      // Center map on user location
      this.mapbox.flyTo({
        center: [location.lng, location.lat],
        zoom: 14,
        essential: true
      });
      
      // Add user marker
      this.addUserMarker(location);
      
    } catch (error) {
      console.error("Error getting location:", error);
      // Use default location (São Paulo)
      GringoSafe.state.location = {
        lat: GringoSafe.config.mapbox.center[1],
        lng: GringoSafe.config.mapbox.center[0]
      };
    }
  },
  
  // Add user marker
  addUserMarker: function(location) {
    if (this.userMarker) {
      this.userMarker.remove();
    }
    
    const el = document.createElement('div');
    el.className = 'user-marker';
    el.innerHTML = `
      <div style="
        background: var(--profile-primary);
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      "></div>
    `;
    
    this.userMarker = new mapboxgl.Marker({
      element: el,
      anchor: 'center'
    })
    .setLngLat([location.lng, location.lat])
    .addTo(this.mapbox);
  },
  
  // Add marker to map
  addMarker: function(markerData) {
    const marker = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [markerData.lng, markerData.lat]
      },
      properties: {
        id: markerData.id,
        type: markerData.type || 'validated',
        title: markerData.title,
        price: markerData.price,
        currency: markerData.currency || 'BRL',
        description: markerData.description,
        timestamp: markerData.timestamp,
        userId: markerData.userId,
        verified: markerData.verified || false
      }
    };
    
    // Add to source
    const source = this.mapbox.getSource('markers');
    const features = source._data.features;
    features.push(marker);
    source.setData({
      type: 'FeatureCollection',
      features: features
    });
    
    // Add popup
    this.addMarkerPopup(marker);
    
    // Store in state
    GringoSafe.state.markers.push(markerData);
  },
  
  // Add popup to marker
  addMarkerPopup: function(marker) {
    const popup = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      offset: [0, -15]
    });
    
    const props = marker.properties;
    const formattedPrice = GringoSafe.utils.formatCurrency(props.price, props.currency);
    
    popup.setHTML(`
      <div style="
        padding: 12px;
        min-width: 200px;
        font-family: var(--font-inter);
      ">
        <h4 style="
          margin: 0 0 8px 0;
          font-family: var(--font-poppins);
          font-size: 16px;
          font-weight: 600;
          color: var(--profile-primary);
        ">${props.title}</h4>
        <div style="
          font-size: 18px;
          font-weight: 600;
          color: var(--success);
          margin-bottom: 8px;
        ">${formattedPrice}</div>
        ${props.description ? `<p style="
          margin: 0 0 8px 0;
          font-size: 14px;
          color: var(--gray-light);
          line-height: 1.4;
        ">${props.description}</p>` : ''}
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
        ">
          <button onclick="GringoSafe.map.voteMarker('${props.id}', 'up')" style="
            background: var(--success);
            border: none;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">👍</button>
          <button onclick="GringoSafe.map.voteMarker('${props.id}', 'down')" style="
            background: var(--danger);
            border: none;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">👎</button>
          <button onclick="GringoSafe.map.reportMarker('${props.id}')" style="
            background: var(--warning);
            border: none;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">Denunciar</button>
        </div>
      </div>
    `);
    
    // Add popup on click
    this.mapbox.on('click', 'markers', (e) => {
      if (e.features[0].properties.id === props.id) {
        popup.setLngLat(e.features[0].geometry.coordinates)
             .addTo(this.mapbox);
      }
    });
  },
  
  // Vote on marker
  voteMarker: async function(markerId, vote) {
    try {
      // Update marker in database
      await GringoSafe.db.updateMarkerVotes(markerId, vote);
      
      // Update local state
      const marker = GringoSafe.state.markers.find(m => m.id === markerId);
      if (marker) {
        if (!marker.votes) marker.votes = { up: 0, down: 0 };
        marker.votes[vote]++;
      }
      
      GringoSafe.utils.showNotification("Voto registrado!", "success");
      
    } catch (error) {
      console.error("Error voting on marker:", error);
      GringoSafe.utils.showNotification("Erro ao registrar voto", "error");
    }
  },
  
  // Report marker
  reportMarker: async function(markerId) {
    try {
      await GringoSafe.db.reportMarker(markerId);
      GringoSafe.utils.showNotification("Denúncia registrada", "success");
      
    } catch (error) {
      console.error("Error reporting marker:", error);
      GringoSafe.utils.showNotification("Erro ao registrar denúncia", "error");
    }
  },
  
  // Draw safe route
  drawSafeRoute: function(waypoints) {
    // Remove existing route
    if (this.routeLayer) {
      this.mapbox.removeLayer('route');
      this.mapbox.removeSource('route');
    }
    
    // Create route coordinates
    const coordinates = waypoints.map(wp => [wp.lng, wp.lat]);
    
    // Add route source
    this.mapbox.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        }
      }
    });
    
    // Add route layer
    this.mapbox.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#10b981',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });
    
    this.routeLayer = true;
  },
  
  // Load markers from database
  loadMarkers: async function() {
    try {
      const markers = await GringoSafe.db.getMarkers();
      markers.forEach(marker => {
        this.addMarker(marker);
      });
    } catch (error) {
      console.error("Error loading markers:", error);
    }
  },
  
  // Setup event listeners
  setupEventListeners: function() {
    // Map click event
    this.mapbox.on('click', (e) => {
      // Check if clicking on empty space
      if (e.features.length === 0) {
        // Could be used to add new marker
        const coords = e.lngLat;
        console.log('Clicked at:', coords);
      }
    });
    
    // Marker hover effect
    this.mapbox.on('mouseenter', 'markers', () => {
      this.mapbox.getCanvas().style.cursor = 'pointer';
    });
    
    this.mapbox.on('mouseleave', 'markers', () => {
      this.mapbox.getCanvas().style.cursor = '';
    });
  },
  
  // Filter markers
  filterMarkers: function(filters) {
    const source = this.mapbox.getSource('markers');
    const allFeatures = source._data.features;
    
    let filteredFeatures = allFeatures;
    
    if (filters.category && filters.category !== 'all') {
      filteredFeatures = filteredFeatures.filter(feature => 
        feature.properties.category === filters.category
      );
    }
    
    if (filters.priceRange) {
      filteredFeatures = filteredFeatures.filter(feature => {
        const price = feature.properties.price;
        return price >= filters.priceRange.min && price <= filters.priceRange.max;
      });
    }
    
    if (filters.distance && GringoSafe.state.location) {
      filteredFeatures = filteredFeatures.filter(feature => {
        const distance = GringoSafe.utils.calculateDistance(
          GringoSafe.state.location.lat,
          GringoSafe.state.location.lng,
          feature.geometry.coordinates[1],
          feature.geometry.coordinates[0]
        );
        return distance <= filters.distance;
      });
    }
    
    // Update source with filtered features
    source.setData({
      type: 'FeatureCollection',
      features: filteredFeatures
    });
  },
  
  // Clear all markers
  clearMarkers: function() {
    const source = this.mapbox.getSource('markers');
    source.setData({
      type: 'FeatureCollection',
      features: []
    });
    
    GringoSafe.state.markers = [];
  }
};

// Add pulse animation
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(99, 102, 241, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
    }
  }
`;
document.head.appendChild(style);
