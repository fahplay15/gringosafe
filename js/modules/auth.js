// AUTENTICACAO - GringoSafe

// Inicializar Firebase Auth quando app estiver disponível
window.auth = null;
window.provider = null;
window.initAuth = function() {
    if (!window.app) return;
    
    window.auth = getAuth(window.app);
    window.provider = new GoogleAuthProvider();
    
    // Login
    window.fazerLogin = () => signInWithPopup(window.auth, window.provider).catch(() => alert("Erro no inicio de sessao."));

    // Logout
    window.fazerLogout = () => signOut(window.auth).then(() => alert("Sessao terminada."));

    // Monitorar estado de autenticacao
    onAuthStateChanged(window.auth, async (user) => {
        if (user) {
            // Usuario logado
            estadoApp.usuario = user; 
            getEl('menuAvatar').innerHTML = `<img src="${user.photoURL}" alt="Foto">`; 
            setTxt('menuNome', user.displayName.split(" ")[0]); 
            getEl('btnLoginGoogleMenu').style.display = 'none'; 
            getEl('btnLogout').style.display = 'block'; 
            getEl('bloqueioLoginOverlay').style.display = 'none';
            
            const docRef = doc(window.db, "usuarios", user.uid); 
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) { 
                const dadosUsuario = docSnap.data(); 
                estadoApp.saldo = dadosUsuario.saldo || 0.00; 
                estadoApp.buscasRestantes = dadosUsuario.buscas !== undefined ? dadosUsuario.buscas : 3; 
                estadoApp.isLojistaPremium = dadosUsuario.isLojistaPremium || false; 
                estadoApp.fimTrial = dadosUsuario.fimTrial || null;
            } else { 
                estadoApp.saldo = 0.00; 
                estadoApp.buscasRestantes = 3; 
                estadoApp.fimTrial = null; 
                await setDoc(docRef, { 
                    nome: user.displayName, 
                    email: user.email, 
                    saldo: 0, 
                    buscas: 3, 
                    isLojistaPremium: false, 
                    dataCadastro: new Date() 
                }); 
            }
            
            setTxt('saldoDisplay', formatarMoeda(estadoApp.saldo, estadoApp.moeda)); 
            window.atualizarBadgeBuscas();

            // Configurar notificacoes
            if (window.db) {
                const q = query(collection(window.db, "notificacoes"), where("userId", "==", user.uid));
                window.listenerNotificacoes = onSnapshot(q, (snapshot) => {
                    estadoApp.notificacoes = []; 
                    let qtdNaoLidas = 0;
                    snapshot.forEach(d => { 
                        let notif = d.data(); 
                        notif.id = d.id; 
                        estadoApp.notificacoes.push(notif); 
                        if(!notif.lida) qtdNaoLidas++; 
                    });
                    estadoApp.notificacoes.sort((a,b) => b.data.toMillis() - a.data.toMillis());
                    const bN = getEl('badgeNotificacoes'); 
                    if(qtdNaoLidas > 0) { 
                        bN.style.display = 'flex'; 
                        bN.innerText = qtdNaoLidas; 
                    } else { 
                        bN.style.display = 'none'; 
                    }
                });
            } else {
                // Usuario deslogado
                if (window.estadoApp) {
                    window.estadoApp.usuario = null; 
                    window.estadoApp.saldo = 0.00; 
                    window.estadoApp.buscasRestantes = 3; 
                    window.estadoApp.isLojistaPremium = false; 
                    window.estadoApp.fimTrial = null; 
                }
                setTxt('saldoDisplay', `R$ 0,00`); 
                setTxt('menuNome', `Visitante`); 
                
                if(getEl('menuAvatar')) getEl('menuAvatar').innerHTML = `👤`;
                if(getEl('btnLoginGoogleMenu')) getEl('btnLoginGoogleMenu').style.display = 'flex';
                if(getEl('btnLogout')) getEl('btnLogout').style.display = 'none';
                if(getEl('bloqueioLoginOverlay')) getEl('bloqueioLoginOverlay').style.display = 'flex';
                
                if (typeof window.atualizarBadgeBuscas === 'function') {
                    window.atualizarBadgeBuscas();
                }
                
                if(window.listenerNotificacoes) { 
                    window.listenerNotificacoes(); 
                    window.listenerNotificacoes = null; 
                }
                
                if(getEl('badgeNotificacoes')) getEl('badgeNotificacoes').style.display = 'none';
            }
        }
    });
};

// Event listeners de autenticacao
if (typeof bindClick === 'function') {
    bindClick('btnLoginGoogleMenu', fazerLogin); 
    bindClick('btnLoginGoogleOverlay', fazerLogin); 
    bindClick('btnLogout', fazerLogout);
}
