// AUTENTICAÇÃO - GringoSafe

// Inicializar Firebase Auth
window.auth = getAuth(app);
window.provider = new GoogleAuthProvider();

// Login
window.fazerLogin = () => signInWithPopup(auth, provider).catch(() => alert("Erro no início de sessão."));

// Logout
window.fazerLogout = () => signOut(auth).then(() => alert("Sessão terminada."));

// Monitorar estado de autenticação
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Usuário logado
        estadoApp.usuario = user; 
        getEl('menuAvatar').innerHTML = `<img src="${user.photoURL}" alt="Foto">`; 
        setTxt('menuNome', user.displayName.split(" ")[0]); 
        getEl('btnLoginGoogleMenu').style.display = 'none'; 
        getEl('btnLogout').style.display = 'block'; 
        getEl('bloqueioLoginOverlay').style.display = 'none'; 
        
        const docRef = doc(db, "usuarios", user.uid); 
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

        // Configurar notificações
        const q = query(collection(db, "notificacoes"), where("userId", "==", user.uid));
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
        // Usuário deslogado
        estadoApp.usuario = null; 
        estadoApp.saldo = 0.00; 
        estadoApp.buscasRestantes = 3; 
        estadoApp.isLojistaPremium = false; 
        estadoApp.fimTrial = null; 
        setTxt('saldoDisplay', `R$ 0,00`); 
        setTxt('menuNome', `Visitante`); 
        
        if(getEl('menuAvatar')) getEl('menuAvatar').innerHTML = `👤`;
        if(getEl('btnLoginGoogleMenu')) getEl('btnLoginGoogleMenu').style.display = 'flex';
        if(getEl('btnLogout')) getEl('btnLogout').style.display = 'none';
        if(getEl('bloqueioLoginOverlay')) getEl('bloqueioLoginOverlay').style.display = 'flex';
        
        window.atualizarBadgeBuscas();
        
        if(window.listenerNotificacoes) { 
            window.listenerNotificacoes(); 
            window.listenerNotificacoes = null; 
        }
        
        if(getEl('badgeNotificacoes')) getEl('badgeNotificacoes').style.display = 'none';
    }
});

// Event listeners de autenticação
bindClick('btnLoginGoogleMenu', fazerLogin); 
bindClick('btnLoginGoogleOverlay', fazerLogin); 
bindClick('btnLogout', fazerLogout);
