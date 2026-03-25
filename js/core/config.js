// CONFIGURAÇÕES GLOBAIS - GringoSafe
window.GringoSafeConfig = {
    // Firebase
    firebase: {
        apiKey: "AIzaSyDFsKM3nO9kMqOfqNkUL5rW3ukS4yzzTzs",
        authDomain: "gringosafe-1f434.firebaseapp.com",
        projectId: "gringosafe-1f434",
        storageBucket: "gringosafe-1f434.firebasestorage.app",
        messagingSenderId: "949745647794",
        appId: "1:949745647794:web:e81698e40bd8d7aa5d09ab"
    },

    // Mapbox
    mapbox: {
        accessToken: 'pk.eyJ1IjoiZmFocGxheTE1IiwiYSI6ImNtbXk2Z3UzMDB2YnYyb3BsMTA2ZzV2NmkifQ.Tvdrpof80mAktc3Z3dB3cw',
        defaultCenter: [-43.2302, -22.9121],
        defaultZoom: 15.5
    },

    // Taxas de câmbio
    taxasCambio: {
        'BRL': { sim: 'R$', taxa: 1 },
        'USD': { sim: 'US$', taxa: 0.20 },
        'EUR': { sim: '€', taxa: 0.18 },
        'ARS': { sim: '$', taxa: 170.0 }
    },

    // Preços base da IA
    basePrecosIA: {
        'água': { min: 4, max: 7 },
        'agua': { min: 4, max: 7 },
        'water': { min: 4, max: 7 },
        'cerveja': { min: 8, max: 15 },
        'beer': { min: 8, max: 15 },
        'cadeira': { min: 15, max: 30 },
        'chair': { min: 15, max: 30 },
        'silla': { min: 15, max: 30 },
        'guarda-sol': { min: 20, max: 40 },
        'umbrella': { min: 20, max: 40 },
        'barraca': { min: 20, max: 40 },
        'coco': { min: 8, max: 12 },
        'coconut': { min: 8, max: 12 },
        'caipirinha': { min: 15, max: 30 },
        'espetinho': { min: 30, max: 60 },
        'porção': { min: 30, max: 60 },
        'skewer': { min: 30, max: 60 }
    },

    // Planos de assinatura
    planos: {
        precosUSD: [4.99, 7.99, 12.99]
    }
};
