// GringoSafe MASTER MODULE
import { db, auth, provider } from './firebase-config.js';
import dicionario from './locales.js';

// Configuração Mapbox
globalThis.mapboxgl = window.mapboxgl;
mapboxgl.accessToken = 'pk.eyJ1IjoiZmFocGxheTE1IiwiYSI6ImNtbXk2Z3UzMDB2YnYyb3BsMTA2ZzV2NmkifQ.Tvdrpof80mAktc3Z3dB3cw';

import { collection, addDoc, onSnapshot, doc, updateDoc, getDoc, setDoc, increment, arrayUnion, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Registro do Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                reg.update();
                console.log('GringoSafe Service Worker Registado!', reg);
            })
            .catch(err => console.error('Erro no Service Worker', err));
    });
}

// ...restante do código do app.js antigo, adaptado para usar os imports acima...
