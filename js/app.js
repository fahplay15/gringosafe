/* --- CONFIGURAÇÃO E LÓGICA DO SISTEMA --- */

// 🚨 INICIALIZAÇÃO DO MAPA RESTAURADA (ESTÁVEL E SEM TRAVAR)
mapboxgl.accessToken = 'pk.eyJ1IjoiZmFocGxheTE1IiwiYSI6ImNtbXk2Z3UzMDB2YnYyb3BsMTA2ZzV2NmkifQ.Tvdrpof80mAktc3Z3dB3cw';

window.mapa = new mapboxgl.Map({
    container: 'mapa',
    // Usando estilo padrão de rua para maior compatibilidade
    style: 'mapbox://styles/mapbox/streets-v12', 
    center: [-43.2302, -22.9121], // Rio de Janeiro como padrão
    zoom: 15.5,
    // 🚨 DESLIGAR INCLINAÇÃO E ROTAÇÃO PARA NÃO TRAVAR O CELULAR
    pitch: 0,
    bearing: 0,
    antialias: false // Desligar antialias poupa processamento
});

// Desligar interações que pesam (opcional, mas recomendado para performance)
window.mapa.dragRotate.disable();
window.mapa.touchZoomRotate.disableRotation();

// ... [Mantenha aqui todo o resto do seu código JavaScript original: Firebase, Categorias, TensorFlow, Autenticação, etc.] ...
// ... [Vou focar apenas na função que desenha os pinos, que é onde está o bug] ...

/* --- FUNÇÃO DESENHAR PINOS CORRIGIDA (UX PERFECT) --- */
function desenharPinos() {
    if (!window.mapa || !window.mapa.isStyleLoaded()) {
        setTimeout(desenharPinos, 500);
        return;
    }

    // Limpar marcadores antigos
    if(window.marcadoresAtuais) {
        window.marcadoresAtuais.forEach(m => m.remove());
    }
    window.marcadoresAtuais = [];
    
    // Pegar configurações atuais (moeda e idioma)
    const t = dicionario[estadoApp.idioma]; 
    const cotacao = taxasCambio[estadoApp.moeda].taxa; 
    const sim = taxasCambio[estadoApp.moeda].sim;

    // 1. DESENHAR LOCAIS REGISTADOS (Pinos Verdes/Dourados)
    for (const nomeL in estadoApp.dadosHospedados) {
        try {
            const dadosL = estadoApp.dadosHospedados[nomeL]; 
            if (!dadosL.lat || !dadosL.lng) continue;

            const latNum = parseFloat(dadosL.lat);
            const lngNum = parseFloat(dadosL.lng);

            const avaliacoesValidas = dadosL.itens.filter(i => !i.isLojistaPlace);
            let tItens = avaliacoesValidas.length; let qAb = 0; let qAp = 0; let htmlLista = '';
            
            // Verificar status do local
            const isPremium = dadosL.itens.some(i => i.premium === true);
            const lugarLojista = dadosL.itens.find(i => i.isLojistaPlace);
            const isDono = estadoApp.usuario && lugarLojista && lugarLojista.autor === estadoApp.usuario.email;

            // ... [Lógica de montar a lista de itens e calcular média (mantenha a sua original)] ...
            // ... [Vou pular para a parte da criação do pino físico] ...

            let pinoMapbox;
            let elPinoBase = null;

            // 🚨 SOLUÇÃO PARA O BUG DOS PINOS TRANSPARENTES / GIGANTES NO ANDROID 🚨
            // Nós criamos uma DIV física e aplicamos a cor original sólida (#00e676)
            
            if (isPremium) {
                elPinoBase = document.createElement('div');
                elPinoBase.className = 'marker-premium'; // Usa estilo do style.css
                elPinoBase.innerHTML = '⭐';
            } else if (isDono) {
                elPinoBase = document.createElement('div');
                elPinoBase.className = 'minha-loja-container'; 
                elPinoBase.innerHTML = '<div class="marker-minha-loja" style="background:linear-gradient(135deg, #03a9f4, #01579b); border-color:white; box-shadow:0 0 15px rgba(2, 136, 209, 0.8);">🏬<div class="label-minha-loja" style="background:#01579b; border-color:white;">SUA LOJA</div></div>';
            } else {
                // 🚨 A CORREÇÃO: PINO BÁSICO SÓLIDO VERDE ORIGINAL
                elPinoBase = document.createElement('div');
                elPinoBase.className = 'marker-base'; // Usa tamanho do style.css
                elPinoBase.style.backgroundColor = '#00e676'; // COR VERDE SÓLIDA ORIGINAL
            }

            // Criar e adicionar o marcador ao mapa
            if (elPinoBase) {
                pinoMapbox = new mapboxgl.Marker({element: elPinoBase})
                    .setLngLat([lngNum, latNum])
                    .addTo(window.mapa);

                // Configurar o Pop-up Perfect
                const safeLocalName = nomeL.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                
                // ... [Monte o popupHtml aqui (mantenha o seu original)] ...

                // Adicionar evento de clique para abrir o pop-up
                elPinoBase.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Fechar pop-ups abertos
                    document.querySelectorAll('.mapboxgl-popup').forEach(p => p.remove());
                    // Abrir novo pop-up
                    new mapboxgl.Popup({offset: 25, closeOnClick: true})
                        .setLngLat([lngNum, latNum])
                        .setHTML(popupHtml)
                        .addTo(window.mapa);
                });
            }
            window.marcadoresAtuais.push(pinoMapbox);
            
        } catch(err) { 
            console.error("Falha ao desenhar o pino:", nomeL, err); 
        }
    }

    // 2. DESENHAR PERGUNTAS ABERTAS (Pinos Roxos com Ghost Anim)
    for (const idPerg in estadoApp.perguntasAbertas) {
        try {
            const perg = estadoApp.perguntasAbertas[idPerg]; 
            const autorP = perg.autorUid || '';
            
            if (!perg.lat || !perg.lng) continue;
            const latNum = parseFloat(perg.lat);
            const lngNum = parseFloat(perg.lng);

            // Regra de exibição de perguntas (mantenha a sua original)

            let corArea = 'var(--brand-secondary)';      
            let typeAnim = 'marker-pergunta-anim'; let typeIcon = '?';
            if (perg.fotoSolicitada) { typeAnim = 'marker-camera-anim'; typeIcon = '📸'; corArea = '#f57c00'; } 
            else if (perg.fotoUrl) { typeAnim = 'marker-foto-anim'; typeIcon = '🖼️'; corArea = '#1976d2'; }

            // Criar elemento HTML para o pino roxo (mantenha o original que já funcionava)
            const elDuvida = document.createElement('div');
            elDuvida.className = 'marker-pergunta-container';
            elDuvida.innerHTML = `<div class="ghost-anim"><div class="${typeAnim}">${typeIcon}</div></div>`;

            // Adicionar ao mapa
            const pinoDuvida = new mapboxgl.Marker({element: elDuvida})
                .setLngLat([lngNum, latNum])
                .addTo(window.mapa);
            window.marcadoresAtuais.push(pinoDuvida);

            // ... [Monte o htmlPopup e adicione o listener de clique (mantenha o original)] ...

        } catch (err) { console.error("Falha ao desenhar a pergunta", err); }
    }
}

// ... [Mantenha todo o resto do seu código JS original abaixo] ...