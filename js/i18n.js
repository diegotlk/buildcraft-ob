/* ============================================================
   Binaryzando — Idioma (PT/EN) + Fuso horário
   - Idioma: botão flutuante, persiste em localStorage, traduz
     qualquer elemento marcado com data-i18n="chave".
   - Fuso: detectado automaticamente do navegador (IANA, ex:
     'America/Sao_Paulo'), com seletor manual pra quando o
     usuário viaja ou quer ver em outro fuso. Mandado pra API
     em toda chamada de backtest (campo "timezone") pra filtrar
     dia da semana e período no calendário de quem está testando,
     não em UTC.
   ============================================================ */

const I18N_LANG_KEY = 'buildcraft_idioma';
const I18N_TZ_KEY = 'buildcraft_timezone';

const I18N_DICT = {
  pt: {
    'lang.toggle.label': 'EN',
    'lang.toggle.title': 'Mudar para inglês',
    'tz.label': 'Fuso horário',
    'tz.auto': 'Detectado automaticamente',
    'periodo.titulo': 'Período',
    'periodo.tudo': 'Todo o histórico',
    'periodo.especifico': 'Período específico',
    'periodo.ontem': 'Ontem',
    'periodo.semana': 'Última semana',
    'periodo.mes': 'Último mês',
    'dias.titulo': 'Dias da semana',
    'dias.seg': 'Seg', 'dias.ter': 'Ter', 'dias.qua': 'Qua', 'dias.qui': 'Qui',
    'dias.sex': 'Sex', 'dias.sab': 'Sáb', 'dias.dom': 'Dom',

    'nav.inicio': 'Início', 'nav.laboratorio': 'Laboratório', 'nav.inventario': 'Inventário',
    'nav.planos': 'Planos', 'nav.embreve': 'Em breve', 'nav.ranking': 'Ranking',
    'nav.batalhas': 'Batalhas', 'nav.loja': 'Loja', 'nav.cartas': 'Cartas',
    'nav.comecargratis': 'Começar Grátis',

    'hero.eyebrow': '🎮 Backtest gamificado de opções binárias',
    'hero.title': 'Monte sua <span class="hl">estratégia</span>, teste contra o histórico real e <span class="hl">ganhe cartas</span>.',
    'hero.subtitle': 'Sem achismo. Sem operar dinheiro real só pra "ver se funciona". Teste primeiro, valide com dados, depois decida.',
    'hero.criarbuild': '🎨 Criar Estratégia',
    'hero.comofunciona': 'Como funciona ➜',
    'how.titulo': 'Como funciona', 'how.subtitulo': 'Quatro passos entre a ideia e a carta na sua coleção.',
    'how.1.titulo': '1. Monte', 'how.1.desc': 'Desenhe um padrão de velas ou monte uma estratégia com quadrantes/indicadores.',
    'how.2.titulo': '2. Teste', 'how.2.desc': 'Rode contra o histórico real de cotações — sem arriscar um real.',
    'how.3.titulo': '3. Veja o resultado', 'how.3.desc': 'Taxa de acerto, número de entradas, nota — tudo na hora.',
    'how.4.titulo': '4. Ganhe a carta', 'how.4.desc': 'Cada teste vira uma carta com raridade baseada na performance.',
    'featured.titulo': 'Cartas em destaque', 'featured.subtitulo': 'Algumas das melhores estratégias já testadas na comunidade.',
    'rankings.titulo': 'Ranking', 'rankings.subtitulo': 'As builds com melhor desempenho no histórico.',
    'rankings.vertodos': 'Ver todos ➜',
    'rankings.pos': 'Pos', 'rankings.build': 'Build', 'rankings.raridade': 'Raridade',
    'rankings.winrate': 'Acerto', 'rankings.entradas': 'Entradas', 'rankings.nota': 'Nota',
    'battle.titulo': 'Batalha de builds', 'battle.subtitulo': 'Duas estratégias, lado a lado, no mesmo histórico.',
    'battle.winrate': 'Acerto', 'battle.drawdown': 'Drawdown', 'battle.estabilidade': 'Estabilidade',
    'battle.vs': 'VS', 'battle.melhor12meses': 'Melhor dos últimos 12 meses',
    'battle.vencedora': 'Vencedora', 'battle.placar': 'Placar', 'battle.empate': 'Empate',
    'stats.estrategias': 'Estratégias testadas', 'stats.builds': 'Builds criadas',
    'stats.lendarias': 'Cartas lendárias', 'stats.criadores': 'Criadores ativos',
    'pricing.titulo': 'Planos', 'pricing.subtitulo': 'Comece grátis. Vire Premium quando quiser desbloquear tudo.',
    'pricing.mes': '/mês',
    'pricing.free.1': '2 estratégias (MHI 1 e Milhão)', 'pricing.free.2': 'Pares disponíveis',
    'pricing.free.3': 'Testes no histórico real', 'pricing.free.4': 'Demais estratégias',
    'pricing.free.5': 'Montar estratégia do zero',
    'pricing.premium.1': 'Todas as estratégias', 'pricing.premium.2': 'Montar estratégia do zero',
    'pricing.premium.3': 'Todos os pares', 'pricing.premium.4': 'Testes ilimitados',
    'pricing.premium.5': 'Tudo que entrar depois',
    'pricing.assinar': 'Assinar Premium',
    'cta.titulo': 'Pronto pra testar sua <span class="hl">primeira estratégia</span>?',
    'cta.subtitulo': 'É grátis. Sem cartão. Em 2 minutos você já tem sua primeira carta.',
    'cta.comecar': 'Começar agora — é grátis',
    'footer.desc': 'Backtest gamificado de opções binárias. Educacional, não é recomendação de investimento.',
    'footer.produto': 'Produto', 'footer.comunidade': 'Comunidade', 'footer.topcriadores': 'Top Criadores',
    'footer.halldafama': 'Hall da Fama', 'footer.eventos': 'Eventos', 'footer.educacao': 'Educação',
    'footer.legal': 'Legal', 'footer.termos': 'Termos de Uso', 'footer.privacidade': 'Política de Privacidade',
    'footer.avisorisco': 'Aviso de Risco',
    'footer.disclaimer': '⚠️ Ferramenta <strong>educacional de simulação</strong>. Não é recomendação de investimento. Opções binárias têm alto risco de perda.',
    'footer.copyright': '© 2026 Binaryzando. Todos os direitos reservados.',
    'footer.feitopor': 'Feito com 💙 por Diego',

    'pricing.subtitulopagina': 'Comece grátis. Vire Premium quando quiser desbloquear tudo.',
    'pricing.pagamentovia': 'Pagamento via Pix e cartão. Você pode cancelar quando quiser.',
    'pricing.cobrancanome': '💡 A cobrança aparece em nome de <strong>Diego Simplicio Figueredo Silva</strong> (CPF 046.397.291-03) — responsável legal pelo Binaryzando, conforme os <a href="termos.html" style="color:var(--accent-hover)">Termos de Uso</a>. É normal: como toda cobrança por Pix, o nome do titular da conta aparece por exigência de segurança contra fraude.',
    'pricing.avisorisco': '⚠️ Ferramenta <strong>educacional de simulação</strong>. Não é recomendação de investimento e não garante resultados. Opções binárias têm <strong>alto risco de perda</strong>. Ao assinar, você concorda com os <a href="termos.html" style="color:var(--accent-hover)">Termos de Uso</a>, a <a href="privacidade.html" style="color:var(--accent-hover)">Política de Privacidade</a> e o <a href="aviso-risco.html" style="color:var(--accent-hover)">Aviso de Risco</a>.',

    'auth.entrar': 'Entrar', 'auth.criarconta': 'Criar Conta', 'auth.email': 'E-mail', 'auth.senha': 'Senha',
    'auth.senhaprecisa': 'Sua senha precisa ter:',
    'auth.req.tamanho': 'Pelo menos 8 caracteres', 'auth.req.maiuscula': 'Uma letra maiúscula (A-Z)',
    'auth.req.minuscula': 'Uma letra minúscula (a-z)', 'auth.req.numero': 'Um número (0-9)',
    'auth.req.especial': 'Um caractere especial (!@#$%...)',
    'auth.esquecisenha': 'Esqueci minha senha', 'auth.seuemail': 'Seu e-mail',
    'auth.enviarlink': 'Enviar link de redefinição',
    'auth.naotemconta': 'Não tem conta?', 'auth.criaruma': 'Criar uma agora',
    'auth.jatemconta': 'Já tem conta?',
    'auth.voltarinicio': '⬅ Voltar para o início',
    'auth.erro.senhafraca': 'Sua senha precisa atender todos os requisitos acima.',
    'auth.entrando': 'Entrando...', 'auth.criandoconta': 'Criando conta...',
    'auth.erro.generico': 'Algo deu errado. Tente novamente.',
    'auth.erro.apioffline': 'Não foi possível conectar ao servidor. Tente novamente em alguns instantes.',
    'auth.erro.emailinvalido': 'Digite um e-mail válido.',
    'auth.enviando': 'Enviando...',
    'auth.linkenviado': 'Se esse e-mail existir, enviamos um link de redefinição.',
    'auth.erro.apioffline2': 'Não foi possível conectar ao servidor. Tente novamente em alguns instantes.',

    'legal.termos.titulo': 'Termos de Uso', 'legal.privacidade.titulo': 'Política de Privacidade',
    'legal.aviso.titulo': 'Aviso de Risco', 'legal.atualizacao': 'Última atualização:',
    'legal.voltarinicio': '⬅ Início',

    'inv.titulo': '🎒 Inventário',
    'inv.subtitulo': 'Suas cartas — o resultado real de cada teste, com raridade e nota.',
    'inv.vazio.titulo': 'Seu inventário está vazio',
    'inv.vazio.desc': 'Teste uma estratégia, gerenciamento ou build no Laboratório pra ganhar sua primeira carta.',
    'inv.vazio.ir': '⚡ Ir para o Laboratório',
    'inv.tab.cartas': '🃏 Minhas Cartas', 'inv.tab.historicos': '📊 Históricos', 'inv.tab.lixeira': '🗑️ Lixeira',
    'inv.subtab.estrategias': '📋 Estratégias', 'inv.subtab.gerenciamentos': '♻️ Gerenciamentos',
    'inv.dica.virar': 'Clique em uma carta para virar e ver os detalhes.',
    'inv.dica.historicos': 'Gerados ao testar uma estratégia no Laboratório. Use-os em "Criar Gerenciamento" → "Testar Gerenciamento".',
    'inv.esvaziarlixeira': 'Esvaziar lixeira',
    'inv.dica.lixeira': 'Itens ficam aqui por 30 dias antes de serem apagados pra sempre.',
    'inv.vazio.historicos': 'Nenhum histórico ainda. Teste uma estratégia no Laboratório e clique em "📊 Salvar Histórico".',
    'inv.toast.movidolixeira.titulo': '🗑️ Movido para a lixeira',
    'inv.toast.movidolixeira.desc': 'pode ser recuperado na lixeira por 30 dias.',
    'inv.toast.restaurado.titulo': '♻️ Restaurado',
    'inv.toast.restaurado.desc': 'voltou para o inventário.',
    'inv.confirm.excluirdefinitivo': 'Excluir definitivamente? Essa ação não pode ser desfeita.',
    'inv.confirm.esvaziarlixeira': 'Esvaziar a lixeira inteira? Essa ação não pode ser desfeita.',
    'inv.lixeira.carta': 'Carta', 'inv.lixeira.estrategiasalva': 'Estratégia salva',
    'inv.lixeira.expiraem': 'expira em', 'inv.lixeira.dia': 'dia', 'inv.lixeira.dias': 'dias',
    'inv.restaurar': 'Restaurar', 'inv.excluirparasempre': 'Excluir para sempre',
    'inv.vazio.gerenciamentos': 'Nenhuma carta de gerenciamento ainda. Teste um gerenciamento no Laboratório.',
    'inv.vazio.estrategias': 'Nenhuma carta de estratégia ainda. Teste uma estratégia no Laboratório.',
    'inv.vazio.lixeira': 'Lixeira vazia.',

    'lab.titulo': '🎨 Criar Estratégia',
    'lab.subtitulo': 'Monte seu padrão de velas, escolha a direção e teste contra histórico real.',
    'lab.grupo.criar': '🎨 Criar', 'lab.grupo.testar': '♻️ Testar',
    'lab.criarestrategia': '📐 Criar Estratégia', 'lab.testarestrategia': '📐 Testar Estratégia',
    'lab.antesdetudo': 'Antes de tudo',
    'lab.timeframe.titulo': '⏱️ Qual timeframe você vai operar?',
    'lab.timeframe.desc': 'Define o intervalo de tempo de cada vela (M1, M5 ou M15). Pode mudar depois se quiser testar outro.',
    'lab.embreve': 'Em breve',
    'lab.proximo': 'Próximo ➜',
    'lab.mode.pergunta': 'Como você quer montar sua estratégia?',
    'lab.mode.titulo': '🧩 Escolha o tipo de estratégia',
    'lab.mode.pintar.titulo': '🎨 Pintar velas',
    'lab.mode.pintar.desc': 'Você desenha um padrão de velas (ex: 🟩🟩🟥) e aposta na próxima vela. Simples e direto.',
    'lab.mode.quadrante.titulo': '🔲 Usar quadrantes',
    'lab.mode.quadrante.desc': 'Olha um bloco maior de velas (ex: quadrante de 5 min = 5 velas de 1 min), analisa a maioria/minoria e entra na próxima. Estilo MHI, Milhão.',

    'lab.voltar': '⬅ Voltar', 'lab.fechar': 'Fechar', 'lab.cancelar': 'Cancelar', 'lab.testar': '⚡ Testar',
    'lab.confirmar': 'Confirmar', 'lab.salvar': 'Salvar', 'lab.limpar': 'Limpar', 'lab.trocarmodo': '⬅ Trocar modo',
    'lab.de': 'De', 'lab.ate': 'Até', 'lab.bancadisponivel': 'Banca disponível', 'lab.payout': 'Payout (%)',
    'lab.existente.passo': 'Testar Estratégia Existente',
    'lab.existente.titulo': '♻️ Qual estratégia você quer testar de novo?',
    'lab.existente.desc': 'Carrega a mesma estratégia pra você testar de novo ou ajustar o período.',

    'ger.titulo': '📊 Gerenciamento de banca',
    'ger.intro': 'Escolha a base e configure em poucos passos. <strong style="color:#22c55e;">Soros</strong> sobe a entrada depois de uma vitória; <strong style="color:#a78bfa;">Martingale</strong> sobe depois de uma derrota; <strong style="color:#38bdf8;">Mão Fixa</strong> nunca muda.',
    'ger.configurar': 'Configurar',
    'ger.q.momento': 'Quer entrar na próxima vela ou na próxima entrada?',
    'ger.proximavela': 'Próxima Vela', 'ger.proximaentrada': 'Próxima Entrada',
    'ger.q.niveis': 'Quantas vezes seguidas você quer repetir? Depois disso volta pra entrada base.',
    'ger.entre1e20': 'Entre 1 e 20 repetições.',
    'ger.q.valorentrada': 'Qual o valor da entrada base? (mínimo 1)',
    'ger.q.soros': 'Depois de uma vitória, o que somar à entrada base?',
    'ger.lucrototal': 'Lucro total da anterior', 'ger.percentualanterior': '% da entrada anterior',
    'ger.percentual': 'Percentual (%)',
    'ger.q.martingale': 'Depois de uma derrota, multiplicar a entrada anterior por quanto?',
    'ger.q.custom': 'Monte sua sequência de entradas',
    'ger.custom.desc': 'A 1ª entrada é sempre a entrada base. Cada passo abaixo define a próxima entrada conforme o resultado. Se o resultado não bater com o passo, volta pra entrada base.',
    'ger.addpasso': '＋ Adicionar passo',
    'ger.q.nome': 'Pra terminar, dê um nome a esse gerenciamento',
    'ger.nomeplaceholder': 'Ex: Meu Gerenciamento',
    'ger.testar.titulo': '🧪 Testar Gerenciamento',
    'ger.testar.desc': 'Escolha um gerenciamento que você criou e teste contra um histórico real de entradas (o padrão, liberado pra todos, ou um gerado a partir de uma estratégia sua).',
    'ger.criarhistorico': '📊 Criar Histórico',
    'ger.historico.desc': 'Sequência real de vitória/derrota usada pra testar o gerenciamento. Gere uma padrão (liberada pra todos), ou a partir de uma estratégia sua já testada.',
    'ger.historicopadrao': 'Histórico padrão (liberado pra todos)',
    'ger.historicopadrao.desc': 'Pega as últimas 1000 velas reais do EURUSD e entra só no verde: vela verde = ganho, vermelha = perda. Use pra criar/testar um gerenciamento sem precisar de estratégia.',
    'ger.parplaceholder': 'EURUSD-OTC (padrão — deixe em branco)',
    'ger.entradaverde': '🟩 Entrada no Verde · EURUSD · 1000 velas',
    'ger.gerardeestrategia': '📋 Gerar a partir de uma estratégia salva',
    'ger.gerardeestrategia.titulo': '📋 Gerar histórico a partir de uma estratégia salva',
    'periodo.tudo.icone': '🌍 Todo o período disponível', 'periodo.especifico.icone': '📅 Período específico',
    'ger.escolhaestrategia': 'Escolha a estratégia (clique para gerar)',
    'ger.historicoscriados': 'Históricos criados',
    'ger.historico': 'Histórico',
    'ger.replay.desc': 'Faz o replay do gerenciamento entrada por entrada contra um histórico real de W/L. O resultado define a raridade da carta.',

    'build.testar.passo': 'Testar Build · Passo 1',
    'build.testar.titulo': '♻️ Qual build você quer testar de novo?',
    'build.testar.desc': 'Carrega a mesma estratégia, gerenciamento, banca e payout pra você testar de novo ou ajustar.',
    'build.lab': 'Laboratório de Builds',
    'build.montar.titulo': '🧬 Montar Build',
    'build.montar.desc': 'Junte uma <strong style="color:#22c55e;">estratégia</strong> com um <strong style="color:#a78bfa;">gerenciamento</strong>, defina a banca e descubra a raridade, a nota e a classe da sua build.',
    'build.passo1': '1. Escolha a estratégia', 'build.passo2': '2. Escolha o gerenciamento', 'build.passo3': '3. Banca e payout',
    'build.testarbuild': '⚡ Testar Build',

    'tec.pergunta': 'Indicador ou figura?', 'tec.titulo': '📈 O que você quer usar?',
    'tec.indicador.titulo': '📈 Indicador técnico',
    'tec.indicador.desc': 'Cálculo sobre o preço: Média Móvel, RSI, MACD, Bollinger — ou monte o seu.',
    'tec.figura.titulo': '🕯️ Figura gráfica',
    'tec.figura.desc': 'Padrão de velas: engolfo, martelo, estrela cadente, três soldados, três corvos.',

    'fig.passo1': 'Figuras · Passo 1', 'fig.titulo': '🕯️ Qual figura?',
    'fig.engolfoalta.titulo': '🟩 Engolfo de Alta', 'fig.engolfoalta.desc': 'Vela verde engole a vermelha anterior. → CALL',
    'fig.engolfobaixa.titulo': '🟥 Engolfo de Baixa', 'fig.engolfobaixa.desc': 'Vela vermelha engole a verde anterior. → PUT',
    'fig.martelo.titulo': '🔨 Martelo', 'fig.martelo.desc': 'Pavio inferior longo (rejeição de baixa). → CALL',
    'fig.estrela.titulo': '🌠 Estrela Cadente', 'fig.estrela.desc': 'Pavio superior longo (rejeição de alta). → PUT',
    'fig.soldados.titulo': '🟩🟩🟩 Três Soldados', 'fig.soldados.desc': '3 velas verdes subindo. → CALL',
    'fig.corvos.titulo': '🟥🟥🟥 Três Corvos', 'fig.corvos.desc': '3 velas vermelhas caindo. → PUT',

    'ind.passo1': 'Indicadores · Passo 1', 'ind.titulo': '📈 Qual indicador?',
    'ind.media.titulo': '📊 Média Móvel', 'ind.media.desc': 'Entra quando o preço cruza a média (SMA ou EMA).',
    'ind.rsi.titulo': '🌡️ RSI', 'ind.rsi.desc': 'Reversão nas zonas de sobrevenda e sobrecompra.',
    'ind.macd.titulo': '〽️ MACD', 'ind.macd.desc': 'Entra no cruzamento da linha MACD com a linha de sinal.',
    'ind.bollinger.titulo': '🎯 Bandas de Bollinger', 'ind.bollinger.desc': 'Reversão quando o preço toca a banda inferior/superior.',
    'ind.montar.titulo': '🛠️ Montar meu indicador',
    'ind.montar.desc': 'Crie o seu combinando condições (ex: RSI &lt; 30 <strong>E</strong> preço &lt; EMA 50) e escolha a direção.',
    'ind.passo2': 'Indicadores · Passo 2', 'ind.configurar': '⚙️ Configurar',
    'ind.config.desc': 'Já vem com o padrão clássico. Ajuste se quiser.',

    'mont.passo': 'Indicadores · Montar meu indicador', 'mont.titulo': '🛠️ Monte suas condições',
    'mont.desc': 'A estratégia entra quando as condições forem satisfeitas. Ex: <em>RSI &lt; 30 E preço &lt; EMA 50</em>.',
    'mont.como': 'Como juntar as condições?',
    'mont.todas': '<strong>E</strong> — todas precisam valer', 'mont.qualquer': '<strong>OU</strong> — qualquer uma vale',
    'mont.addcondicao': '＋ Adicionar condição', 'mont.quandosatisfeito': 'Quando satisfeito, entrar:',

    'pat.passo1': 'Passo 1 de 6: Monte seu padrão', 'pat.quantasvelas': '🎯 Quantas velas você quer?',
    'pat.3velas': '3 velas', 'pat.5velas': '5 velas', 'pat.10velas': '10 velas', 'pat.20velas': '20 velas',
    'pat.outro': 'Outro...', 'pat.digiteentre': 'Digite entre 1 e 20:', 'pat.cliquemudar': 'Clique para mudar as cores',
    'pat.legenda': '⬜ = Qualquer cor | 🟩 = Verde | 🟥 = Vermelho<br/>Clique em uma vela para mudar a cor',
    'pat.limpar': '🔄 Limpar',

    'quad.passo1': 'Quadrantes · Passo 1', 'quad.prontaouzero': '🔲 Estratégia pronta ou montar do zero?',
    'quad.usarpronta.titulo': '⚡ Usar uma pronta', 'quad.usarpronta.desc': 'Escolha clássicas como MHI 1/2/3, Milhão, Vituxo e D21 com um clique.',
    'quad.montarzero.titulo': '🛠️ Montar do zero', 'quad.montarzero.desc': 'Defina o quadrante, a análise (maioria/minoria ou pintar), a direção e em qual vela entrar.',
    'quad.escolhaestrategia': 'Escolha uma estratégia',
    'quad.passo2': 'Quadrantes · Passo 2', 'quad.tamanho': '📦 Qual o tamanho do quadrante?',
    'quad.tamanho.desc': 'O quadrante precisa ser maior que o timeframe escolhido (<span id="q-tf-lembrete">M1</span>).',
    'quad.passo3': 'Quadrantes · Passo 3', 'quad.comoanalisar': '🔍 Como analisar o quadrante?',
    'quad.maioriaminoria.titulo': '🔢 Maioria / Minoria', 'quad.maioriaminoria.desc': 'Conta a cor predominante das velas do quadrante.',
    'quad.pintar.titulo': '🎨 Pintar o quadrante', 'quad.pintar.desc': 'Define a cor exata de cada vela do bloco (⬜ = qualquer).',
    'quad.quaisvelas': 'Quais velas do quadrante olhar?', 'quad.todas': 'Todas', 'quad.3primeiras': '3 primeiras', 'quad.3ultimas': '3 últimas',
    'quad.pinteasvelas': 'Pinte as velas do quadrante', 'quad.legenda': '⬜ = Qualquer | 🟩 = Verde | 🟥 = Vermelho · Clique para mudar',
    'quad.passo4': 'Quadrantes · Passo 4', 'quad.qualdirecao': '📈 Em qual direção entrar?',
    'quad.entrarmaioria': 'Entrar pra maioria', 'quad.entrarmaioria.desc': 'Na cor que mais apareceu',
    'quad.entrarminoria': 'Entrar pra minoria', 'quad.entrarminoria.desc': 'Na cor que menos apareceu — estilo MHI',
    'quad.entrarambas': 'Entrar pra ambas', 'quad.entrarambas.desc': 'Testa as duas e mostra a melhor',
    'quad.passo5': 'Quadrantes · Passo 5', 'quad.qualvelaentrar': '🎯 Em qual vela do próximo quadrante entrar?',
    'quad.mhiexplica': 'MHI entra na 1ª · MHI 2 na 2ª · MHI 3 na 3ª.',

    'dir.passo2': 'Passo 2 de 6: Escolha a direção', 'dir.titulo': '📈 Você quer apostar em CALL ou PUT?',
    'dir.explica': '<strong>CALL</strong> = aposta em vela verde (subida)<br/><strong>PUT</strong> = aposta em vela vermelha (queda)',
    'dir.velaverde': 'Vela Verde', 'dir.velavermelha': 'Vela Vermelha', 'dir.osdois': 'OS DOIS', 'dir.testarambas': 'Testar ambas',

    'anc.passo3': 'Passo 3 de 6: Escolha a ancoragem', 'anc.titulo': '⚓ Exato ou No Mínimo?',
    'anc.exato.titulo': '📌 Exato', 'anc.exato.desc': 'A vela anterior <strong>TEM QUE</strong> ser de cor DIFERENTE. Padrão fixo e rigoroso.',
    'anc.exato.exemplo': '<strong>Exemplo:</strong><br/>Se seu padrão é: 🟩🟩🟥<br/>Antes deve vir: <span style="color: var(--danger); font-weight: 600;">🟥</span> 🟩🟩🟥',
    'anc.minimo.titulo': '➡️ No Mínimo', 'anc.minimo.desc': 'A vela anterior pode ser qualquer cor. Aceita variações do padrão.',
    'anc.minimo.exemplos': '<strong>Exemplos válidos:</strong><br/>🟥 🟩🟩🟥 ✓<br/>🟥 🟩🟩🟩...🟩 🟥 ✓<br/>🟩 🟩🟩🟥 ✓',

    'mir.passo4': 'Passo 4 de 6: Padrão espelho', 'mir.titulo': '🔀 Incluir padrão espelho?',
    'mir.original': 'Padrão Original', 'mir.espelho': 'Padrão Espelho',
    'mir.somente': '❌ Só o Meu', 'mir.osdois': '✅ Os Dois', 'mir.qualdirecao': '📊 Qual direção para o espelho?',

    'par.passo5': 'Passo 5 de 6: Escolha o par', 'par.titulo': '💱 Qual par você quer testar?',
    'par.mercadoaberto': 'Mercado Aberto', 'par.buscar': '🔍 Buscar par (ex: USD, EUR)...',

    'hor.passo6': 'Passo 6 de 6: Escolha o horário', 'hor.titulo': '🕐 Qual horário você quer testar?',
    'hor.desc': 'Escolha a hora de início e fim da sessão que deseja testar',
    'hor.inicio': 'Início', 'hor.fim': 'Fim', 'hor.qualperiodo': '📅 Qual período do histórico testar?',
    'hor.avisofiltro': '⚠️ Filtros de período e dias da semana disponíveis apenas para estratégias de padrão de velas ("Pintar velas") por enquanto.',
    'hor.diassemana': '📆 Em quais dias da semana operar?',
    'hor.diassemana.desc': 'Clique pra <b>tirar</b> um dia. Aceso = entra · riscado = fora. (É a base pro bot sugerir "tira a sexta" depois.)',

    'dia.seg': 'Seg', 'dia.ter': 'Ter', 'dia.qua': 'Qua', 'dia.qui': 'Qui', 'dia.sex': 'Sex', 'dia.sab': 'Sáb', 'dia.dom': 'Dom',

    'rev.passo7': 'Passo 7 de 7: Revisão Final', 'rev.titulo': '✅ Resumo da sua estratégia',
    'rev.deenome': '💾 Dê um nome para esta estratégia', 'rev.nomeplaceholder': 'Ex: Reversão 3 velas',
    'rev.testarestrategia': '⚡ Testar Estratégia', 'rev.salvarestrategia': '💾 Salvar Estratégia',
    'rev.salvarhistorico': '📊 Salvar Histórico', 'rev.novaestrategia': '🔄 Criar Nova Estratégia',
  },
  en: {
    'lang.toggle.label': 'PT',
    'lang.toggle.title': 'Switch to Portuguese',
    'tz.label': 'Timezone',
    'tz.auto': 'Auto-detected',
    'periodo.titulo': 'Period',
    'periodo.tudo': 'Entire history',
    'periodo.especifico': 'Specific period',
    'periodo.ontem': 'Yesterday',
    'periodo.semana': 'Last week',
    'periodo.mes': 'Last month',
    'dias.titulo': 'Days of week',
    'dias.seg': 'Mon', 'dias.ter': 'Tue', 'dias.qua': 'Wed', 'dias.qui': 'Thu',
    'dias.sex': 'Fri', 'dias.sab': 'Sat', 'dias.dom': 'Sun',

    'nav.inicio': 'Home', 'nav.laboratorio': 'Lab', 'nav.inventario': 'Inventory',
    'nav.planos': 'Plans', 'nav.embreve': 'Coming soon', 'nav.ranking': 'Ranking',
    'nav.batalhas': 'Battles', 'nav.loja': 'Shop', 'nav.cartas': 'Cards',
    'nav.comecargratis': 'Start Free',

    'hero.eyebrow': '🎮 Gamified backtesting for binary options',
    'hero.title': 'Build your <span class="hl">strategy</span>, test it against real history, and <span class="hl">earn cards</span>.',
    'hero.subtitle': 'No guessing. No risking real money just to "see if it works." Test first, validate with data, then decide.',
    'hero.criarbuild': '🎨 Create Strategy',
    'hero.comofunciona': 'How it works ➜',
    'how.titulo': 'How it works', 'how.subtitulo': 'Four steps between the idea and the card in your collection.',
    'how.1.titulo': '1. Build', 'how.1.desc': 'Draw a candle pattern or build a strategy with quadrants/indicators.',
    'how.2.titulo': '2. Test', 'how.2.desc': 'Run it against real historical price data — without risking a cent.',
    'how.3.titulo': '3. See the result', 'how.3.desc': 'Win rate, number of entries, score — all instantly.',
    'how.4.titulo': '4. Earn the card', 'how.4.desc': 'Every test becomes a card with rarity based on performance.',
    'featured.titulo': 'Featured cards', 'featured.subtitulo': 'Some of the best strategies tested in the community.',
    'rankings.titulo': 'Ranking', 'rankings.subtitulo': 'The best-performing builds in the history data.',
    'rankings.vertodos': 'See all ➜',
    'rankings.pos': 'Rank', 'rankings.build': 'Build', 'rankings.raridade': 'Rarity',
    'rankings.winrate': 'Win rate', 'rankings.entradas': 'Entries', 'rankings.nota': 'Score',
    'battle.titulo': 'Build battle', 'battle.subtitulo': 'Two strategies, side by side, on the same history.',
    'battle.winrate': 'Win rate', 'battle.drawdown': 'Drawdown', 'battle.estabilidade': 'Stability',
    'battle.vs': 'VS', 'battle.melhor12meses': 'Best of the last 12 months',
    'battle.vencedora': 'Winner', 'battle.placar': 'Score', 'battle.empate': 'Tie',
    'stats.estrategias': 'Strategies tested', 'stats.builds': 'Builds created',
    'stats.lendarias': 'Legendary cards', 'stats.criadores': 'Active creators',
    'pricing.titulo': 'Plans', 'pricing.subtitulo': 'Start free. Go Premium when you want to unlock everything.',
    'pricing.mes': '/mo',
    'pricing.free.1': '2 strategies (MHI 1 and Million)', 'pricing.free.2': 'Available pairs',
    'pricing.free.3': 'Tests on real history', 'pricing.free.4': 'Other strategies',
    'pricing.free.5': 'Build a strategy from scratch',
    'pricing.premium.1': 'All strategies', 'pricing.premium.2': 'Build a strategy from scratch',
    'pricing.premium.3': 'All pairs', 'pricing.premium.4': 'Unlimited tests',
    'pricing.premium.5': 'Everything that comes next',
    'pricing.assinar': 'Subscribe to Premium',
    'cta.titulo': 'Ready to test your <span class="hl">first strategy</span>?',
    'cta.subtitulo': "It's free. No card required. In 2 minutes you'll have your first card.",
    'cta.comecar': 'Start now — it\'s free',
    'footer.desc': 'Gamified backtesting for binary options. Educational, not investment advice.',
    'footer.produto': 'Product', 'footer.comunidade': 'Community', 'footer.topcriadores': 'Top Creators',
    'footer.halldafama': 'Hall of Fame', 'footer.eventos': 'Events', 'footer.educacao': 'Education',
    'footer.legal': 'Legal', 'footer.termos': 'Terms of Use', 'footer.privacidade': 'Privacy Policy',
    'footer.avisorisco': 'Risk Disclosure',
    'footer.disclaimer': '⚠️ <strong>Educational simulation</strong> tool. Not investment advice. Binary options carry a high risk of loss.',
    'footer.copyright': '© 2026 Binaryzando. All rights reserved.',
    'footer.feitopor': 'Made with 💙 by Diego',

    'pricing.subtitulopagina': 'Start free. Go Premium when you want to unlock everything.',
    'pricing.pagamentovia': 'Payment via Pix and card. Cancel anytime.',
    'pricing.cobrancanome': '💡 The charge appears under <strong>Diego Simplicio Figueredo Silva</strong> (Brazilian tax ID 046.397.291-03) — legally responsible for Binaryzando, per the <a href="termos.html" style="color:var(--accent-hover)">Terms of Use</a>. This is normal: as with any Pix charge, the account holder\'s name appears for anti-fraud security reasons.',
    'pricing.avisorisco': '⚠️ <strong>Educational simulation</strong> tool. Not investment advice and does not guarantee results. Binary options carry a <strong>high risk of loss</strong>. By subscribing, you agree to the <a href="termos.html" style="color:var(--accent-hover)">Terms of Use</a>, the <a href="privacidade.html" style="color:var(--accent-hover)">Privacy Policy</a>, and the <a href="aviso-risco.html" style="color:var(--accent-hover)">Risk Disclosure</a>.',

    'auth.entrar': 'Log In', 'auth.criarconta': 'Sign Up', 'auth.email': 'Email', 'auth.senha': 'Password',
    'auth.senhaprecisa': 'Your password needs:',
    'auth.req.tamanho': 'At least 8 characters', 'auth.req.maiuscula': 'One uppercase letter (A-Z)',
    'auth.req.minuscula': 'One lowercase letter (a-z)', 'auth.req.numero': 'One number (0-9)',
    'auth.req.especial': 'One special character (!@#$%...)',
    'auth.esquecisenha': 'Forgot my password', 'auth.seuemail': 'Your email',
    'auth.enviarlink': 'Send reset link',
    'auth.naotemconta': "Don't have an account?", 'auth.criaruma': 'Create one now',
    'auth.jatemconta': 'Already have an account?',
    'auth.voltarinicio': '⬅ Back to home',
    'auth.erro.senhafraca': 'Your password must meet all the requirements above.',
    'auth.entrando': 'Logging in...', 'auth.criandoconta': 'Creating account...',
    'auth.erro.generico': 'Something went wrong. Please try again.',
    'auth.erro.apioffline': 'Could not connect to the server. Please try again shortly.',
    'auth.erro.emailinvalido': 'Enter a valid email.',
    'auth.enviando': 'Sending...',
    'auth.linkenviado': "If that email exists, we've sent a reset link.",
    'auth.erro.apioffline2': 'Could not connect to the server. Please try again shortly.',

    'legal.termos.titulo': 'Terms of Use', 'legal.privacidade.titulo': 'Privacy Policy',
    'legal.aviso.titulo': 'Risk Disclosure', 'legal.atualizacao': 'Last updated:',
    'legal.voltarinicio': '⬅ Home',

    'inv.titulo': '🎒 Inventory',
    'inv.subtitulo': 'Your cards — the real outcome of each test, with rarity and score.',
    'inv.vazio.titulo': 'Your inventory is empty',
    'inv.vazio.desc': 'Test a strategy, money management, or build in the Lab to earn your first card.',
    'inv.vazio.ir': '⚡ Go to the Lab',
    'inv.tab.cartas': '🃏 My Cards', 'inv.tab.historicos': '📊 History', 'inv.tab.lixeira': '🗑️ Trash',
    'inv.subtab.estrategias': '📋 Strategies', 'inv.subtab.gerenciamentos': '♻️ Money Management',
    'inv.dica.virar': 'Click a card to flip it and see the details.',
    'inv.dica.historicos': 'Generated when testing a strategy in the Lab. Use them in "Create Money Management" → "Test Money Management".',
    'inv.esvaziarlixeira': 'Empty trash',
    'inv.dica.lixeira': 'Items stay here for 30 days before being permanently deleted.',
    'inv.vazio.historicos': 'No history yet. Test a strategy in the Lab and click "📊 Save History".',
    'inv.toast.movidolixeira.titulo': '🗑️ Moved to trash',
    'inv.toast.movidolixeira.desc': 'can be restored from the trash for 30 days.',
    'inv.toast.restaurado.titulo': '♻️ Restored',
    'inv.toast.restaurado.desc': 'is back in your inventory.',
    'inv.confirm.excluirdefinitivo': 'Delete permanently? This action cannot be undone.',
    'inv.confirm.esvaziarlixeira': 'Empty the entire trash? This action cannot be undone.',
    'inv.lixeira.carta': 'Card', 'inv.lixeira.estrategiasalva': 'Saved strategy',
    'inv.lixeira.expiraem': 'expires in', 'inv.lixeira.dia': 'day', 'inv.lixeira.dias': 'days',
    'inv.restaurar': 'Restore', 'inv.excluirparasempre': 'Delete forever',
    'inv.vazio.gerenciamentos': 'No money management cards yet. Test one in the Lab.',
    'inv.vazio.estrategias': 'No strategy cards yet. Test a strategy in the Lab.',
    'inv.vazio.lixeira': 'Trash is empty.',

    'lab.titulo': '🎨 Create Strategy',
    'lab.subtitulo': 'Build your candle pattern, pick a direction, and test it against real history.',
    'lab.grupo.criar': '🎨 Create', 'lab.grupo.testar': '♻️ Test',
    'lab.criarestrategia': '📐 Create Strategy', 'lab.testarestrategia': '📐 Test Strategy',
    'lab.antesdetudo': 'Before anything',
    'lab.timeframe.titulo': '⏱️ Which timeframe will you trade?',
    'lab.timeframe.desc': 'Sets the time interval of each candle (M1, M5, or M15). You can change it later to test another one.',
    'lab.embreve': 'Coming soon',
    'lab.proximo': 'Next ➜',
    'lab.mode.pergunta': 'How do you want to build your strategy?',
    'lab.mode.titulo': '🧩 Choose the strategy type',
    'lab.mode.pintar.titulo': '🎨 Paint candles',
    'lab.mode.pintar.desc': 'You draw a candle pattern (e.g. 🟩🟩🟥) and bet on the next candle. Simple and direct.',
    'lab.mode.quadrante.titulo': '🔲 Use quadrants',
    'lab.mode.quadrante.desc': 'Looks at a larger block of candles (e.g. a 5-min quadrant = 5 one-min candles), checks the majority/minority, and enters on the next one. MHI/Milhão style.',

    'lab.voltar': '⬅ Back', 'lab.fechar': 'Close', 'lab.cancelar': 'Cancel', 'lab.testar': '⚡ Test',
    'lab.confirmar': 'Confirm', 'lab.salvar': 'Save', 'lab.limpar': 'Clear', 'lab.trocarmodo': '⬅ Change mode',
    'lab.de': 'From', 'lab.ate': 'To', 'lab.bancadisponivel': 'Available balance', 'lab.payout': 'Payout (%)',
    'lab.existente.passo': 'Test Existing Strategy',
    'lab.existente.titulo': '♻️ Which strategy do you want to test again?',
    'lab.existente.desc': 'Loads the same strategy for you to retest or adjust the period.',

    'ger.titulo': '📊 Money Management',
    'ger.intro': 'Pick a base and configure it in a few steps. <strong style="color:#22c55e;">Soros</strong> raises the entry after a win; <strong style="color:#a78bfa;">Martingale</strong> raises it after a loss; <strong style="color:#38bdf8;">Fixed Stake</strong> never changes.',
    'ger.configurar': 'Configure',
    'ger.q.momento': 'Do you want to enter on the next candle or the next entry?',
    'ger.proximavela': 'Next Candle', 'ger.proximaentrada': 'Next Entry',
    'ger.q.niveis': 'How many times in a row do you want to repeat? After that it goes back to the base entry.',
    'ger.entre1e20': 'Between 1 and 20 repetitions.',
    'ger.q.valorentrada': 'What is the base entry amount? (minimum 1)',
    'ger.q.soros': 'After a win, what should be added to the base entry?',
    'ger.lucrototal': 'Total profit from the previous one', 'ger.percentualanterior': '% of the previous entry',
    'ger.percentual': 'Percentage (%)',
    'ger.q.martingale': 'After a loss, multiply the previous entry by how much?',
    'ger.q.custom': 'Build your entry sequence',
    'ger.custom.desc': 'The 1st entry is always the base entry. Each step below defines the next entry based on the result. If the result doesn\'t match the step, it goes back to the base entry.',
    'ger.addpasso': '＋ Add step',
    'ger.q.nome': 'To finish, give this money management a name',
    'ger.nomeplaceholder': 'E.g.: My Money Management',
    'ger.testar.titulo': '🧪 Test Money Management',
    'ger.testar.desc': 'Pick a money management you created and test it against a real entry history (the default one, free for everyone, or one generated from one of your strategies).',
    'ger.criarhistorico': '📊 Create History',
    'ger.historico.desc': 'Real win/loss sequence used to test the money management. Generate a default one (free for everyone), or from one of your already-tested strategies.',
    'ger.historicopadrao': 'Default history (free for everyone)',
    'ger.historicopadrao.desc': 'Takes the last 1000 real EURUSD candles and only enters on green: green candle = win, red = loss. Use it to create/test a money management without needing a strategy.',
    'ger.parplaceholder': 'EURUSD-OTC (default — leave blank)',
    'ger.entradaverde': '🟩 Green Entry · EURUSD · 1000 candles',
    'ger.gerardeestrategia': '📋 Generate from a saved strategy',
    'ger.gerardeestrategia.titulo': '📋 Generate history from a saved strategy',
    'periodo.tudo.icone': '🌍 Entire available period', 'periodo.especifico.icone': '📅 Specific period',
    'ger.escolhaestrategia': 'Choose the strategy (click to generate)',
    'ger.historicoscriados': 'Histories created',
    'ger.historico': 'History',
    'ger.replay.desc': 'Replays the money management entry by entry against a real W/L history. The result defines the card\'s rarity.',

    'build.testar.passo': 'Test Build · Step 1',
    'build.testar.titulo': '♻️ Which build do you want to test again?',
    'build.testar.desc': 'Loads the same strategy, money management, balance and payout for you to retest or adjust.',
    'build.lab': 'Build Lab',
    'build.montar.titulo': '🧬 Build a Build',
    'build.montar.desc': 'Combine a <strong style="color:#22c55e;">strategy</strong> with a <strong style="color:#a78bfa;">money management</strong>, set the balance, and discover your build\'s rarity, score and class.',
    'build.passo1': '1. Choose the strategy', 'build.passo2': '2. Choose the money management', 'build.passo3': '3. Balance and payout',
    'build.testarbuild': '⚡ Test Build',

    'tec.pergunta': 'Indicator or pattern?', 'tec.titulo': '📈 What do you want to use?',
    'tec.indicador.titulo': '📈 Technical indicator',
    'tec.indicador.desc': 'Calculation on price: Moving Average, RSI, MACD, Bollinger — or build your own.',
    'tec.figura.titulo': '🕯️ Candlestick pattern',
    'tec.figura.desc': 'Candle pattern: engulfing, hammer, shooting star, three white soldiers, three black crows.',

    'fig.passo1': 'Patterns · Step 1', 'fig.titulo': '🕯️ Which pattern?',
    'fig.engolfoalta.titulo': '🟩 Bullish Engulfing', 'fig.engolfoalta.desc': 'A green candle engulfs the previous red one. → CALL',
    'fig.engolfobaixa.titulo': '🟥 Bearish Engulfing', 'fig.engolfobaixa.desc': 'A red candle engulfs the previous green one. → PUT',
    'fig.martelo.titulo': '🔨 Hammer', 'fig.martelo.desc': 'Long lower wick (bearish rejection). → CALL',
    'fig.estrela.titulo': '🌠 Shooting Star', 'fig.estrela.desc': 'Long upper wick (bullish rejection). → PUT',
    'fig.soldados.titulo': '🟩🟩🟩 Three White Soldiers', 'fig.soldados.desc': '3 green candles rising. → CALL',
    'fig.corvos.titulo': '🟥🟥🟥 Three Black Crows', 'fig.corvos.desc': '3 red candles falling. → PUT',

    'ind.passo1': 'Indicators · Step 1', 'ind.titulo': '📈 Which indicator?',
    'ind.media.titulo': '📊 Moving Average', 'ind.media.desc': 'Enters when price crosses the average (SMA or EMA).',
    'ind.rsi.titulo': '🌡️ RSI', 'ind.rsi.desc': 'Reversal in oversold and overbought zones.',
    'ind.macd.titulo': '〽️ MACD', 'ind.macd.desc': 'Enters on the crossover of the MACD line with the signal line.',
    'ind.bollinger.titulo': '🎯 Bollinger Bands', 'ind.bollinger.desc': 'Reversal when price touches the lower/upper band.',
    'ind.montar.titulo': '🛠️ Build my own indicator',
    'ind.montar.desc': 'Create your own by combining conditions (e.g. RSI &lt; 30 <strong>AND</strong> price &lt; EMA 50) and pick the direction.',
    'ind.passo2': 'Indicators · Step 2', 'ind.configurar': '⚙️ Configure',
    'ind.config.desc': 'Comes with the classic default. Adjust if you want.',

    'mont.passo': 'Indicators · Build my own indicator', 'mont.titulo': '🛠️ Build your conditions',
    'mont.desc': 'The strategy enters when the conditions are met. E.g.: <em>RSI &lt; 30 AND price &lt; EMA 50</em>.',
    'mont.como': 'How should the conditions be combined?',
    'mont.todas': '<strong>AND</strong> — all must hold', 'mont.qualquer': '<strong>OR</strong> — any one holds',
    'mont.addcondicao': '＋ Add condition', 'mont.quandosatisfeito': 'When satisfied, enter:',

    'pat.passo1': 'Step 1 of 6: Build your pattern', 'pat.quantasvelas': '🎯 How many candles do you want?',
    'pat.3velas': '3 candles', 'pat.5velas': '5 candles', 'pat.10velas': '10 candles', 'pat.20velas': '20 candles',
    'pat.outro': 'Other...', 'pat.digiteentre': 'Enter between 1 and 20:', 'pat.cliquemudar': 'Click to change the colors',
    'pat.legenda': '⬜ = Any color | 🟩 = Green | 🟥 = Red<br/>Click a candle to change its color',
    'pat.limpar': '🔄 Clear',

    'quad.passo1': 'Quadrants · Step 1', 'quad.prontaouzero': '🔲 Ready-made strategy or build from scratch?',
    'quad.usarpronta.titulo': '⚡ Use a ready-made one', 'quad.usarpronta.desc': 'Pick classics like MHI 1/2/3, Million, Vituxo, and D21 with one click.',
    'quad.montarzero.titulo': '🛠️ Build from scratch', 'quad.montarzero.desc': 'Define the quadrant, the analysis (majority/minority or painting), the direction, and which candle to enter on.',
    'quad.escolhaestrategia': 'Choose a strategy',
    'quad.passo2': 'Quadrants · Step 2', 'quad.tamanho': '📦 What size is the quadrant?',
    'quad.tamanho.desc': 'The quadrant needs to be larger than the chosen timeframe (<span id="q-tf-lembrete">M1</span>).',
    'quad.passo3': 'Quadrants · Step 3', 'quad.comoanalisar': '🔍 How to analyze the quadrant?',
    'quad.maioriaminoria.titulo': '🔢 Majority / Minority', 'quad.maioriaminoria.desc': 'Counts the predominant color of the quadrant\'s candles.',
    'quad.pintar.titulo': '🎨 Paint the quadrant', 'quad.pintar.desc': 'Defines the exact color of each candle in the block (⬜ = any).',
    'quad.quaisvelas': 'Which candles of the quadrant should be looked at?', 'quad.todas': 'All', 'quad.3primeiras': 'First 3', 'quad.3ultimas': 'Last 3',
    'quad.pinteasvelas': 'Paint the quadrant\'s candles', 'quad.legenda': '⬜ = Any | 🟩 = Green | 🟥 = Red · Click to change',
    'quad.passo4': 'Quadrants · Step 4', 'quad.qualdirecao': '📈 Which direction to enter?',
    'quad.entrarmaioria': 'Enter for the majority', 'quad.entrarmaioria.desc': 'On the color that appeared most',
    'quad.entrarminoria': 'Enter for the minority', 'quad.entrarminoria.desc': 'On the color that appeared least — MHI style',
    'quad.entrarambas': 'Enter for both', 'quad.entrarambas.desc': 'Tests both and shows the best one',
    'quad.passo5': 'Quadrants · Step 5', 'quad.qualvelaentrar': '🎯 Which candle of the next quadrant to enter on?',
    'quad.mhiexplica': 'MHI enters on the 1st · MHI 2 on the 2nd · MHI 3 on the 3rd.',

    'dir.passo2': 'Step 2 of 6: Choose the direction', 'dir.titulo': '📈 Do you want to bet on CALL or PUT?',
    'dir.explica': '<strong>CALL</strong> = bet on a green candle (rise)<br/><strong>PUT</strong> = bet on a red candle (fall)',
    'dir.velaverde': 'Green Candle', 'dir.velavermelha': 'Red Candle', 'dir.osdois': 'BOTH', 'dir.testarambas': 'Test both',

    'anc.passo3': 'Step 3 of 6: Choose the anchoring', 'anc.titulo': '⚓ Exact or At Least?',
    'anc.exato.titulo': '📌 Exact', 'anc.exato.desc': 'The previous candle <strong>MUST</strong> be a DIFFERENT color. Fixed and strict pattern.',
    'anc.exato.exemplo': '<strong>Example:</strong><br/>If your pattern is: 🟩🟩🟥<br/>Before it must come: <span style="color: var(--danger); font-weight: 600;">🟥</span> 🟩🟩🟥',
    'anc.minimo.titulo': '➡️ At Least', 'anc.minimo.desc': 'The previous candle can be any color. Accepts variations of the pattern.',
    'anc.minimo.exemplos': '<strong>Valid examples:</strong><br/>🟥 🟩🟩🟥 ✓<br/>🟥 🟩🟩🟩...🟩 🟥 ✓<br/>🟩 🟩🟩🟥 ✓',

    'mir.passo4': 'Step 4 of 6: Mirror pattern', 'mir.titulo': '🔀 Include a mirror pattern?',
    'mir.original': 'Original Pattern', 'mir.espelho': 'Mirror Pattern',
    'mir.somente': '❌ Just Mine', 'mir.osdois': '✅ Both', 'mir.qualdirecao': '📊 Which direction for the mirror?',

    'par.passo5': 'Step 5 of 6: Choose the pair', 'par.titulo': '💱 Which pair do you want to test?',
    'par.mercadoaberto': 'Open Market', 'par.buscar': '🔍 Search pair (e.g. USD, EUR)...',

    'hor.passo6': 'Step 6 of 6: Choose the time', 'hor.titulo': '🕐 Which time do you want to test?',
    'hor.desc': 'Choose the start and end time of the session you want to test',
    'hor.inicio': 'Start', 'hor.fim': 'End', 'hor.qualperiodo': '📅 Which period of the history to test?',
    'hor.avisofiltro': '⚠️ Period and day-of-week filters are only available for candle pattern strategies ("Paint candles") for now.',
    'hor.diassemana': '📆 Which days of the week to trade?',
    'hor.diassemana.desc': 'Click to <b>remove</b> a day. Lit = included · crossed out = excluded. (This is the basis for the bot to later suggest "remove Friday".)',

    'dia.seg': 'Mon', 'dia.ter': 'Tue', 'dia.qua': 'Wed', 'dia.qui': 'Thu', 'dia.sex': 'Fri', 'dia.sab': 'Sat', 'dia.dom': 'Sun',

    'rev.passo7': 'Step 7 of 7: Final Review', 'rev.titulo': '✅ Summary of your strategy',
    'rev.deenome': '💾 Give this strategy a name', 'rev.nomeplaceholder': 'E.g.: 3-candle reversal',
    'rev.testarestrategia': '⚡ Test Strategy', 'rev.salvarestrategia': '💾 Save Strategy',
    'rev.salvarhistorico': '📊 Save History', 'rev.novaestrategia': '🔄 Create New Strategy',
  },
};

// Travado por enquanto a pedido do usuário: tradução em inglês ainda incompleta
// em vários arquivos JS (toasts, cards). Quando terminar tudo, trocar pra false
// pra liberar o botão de idioma de novo.
const I18N_LANG_LOCKED = true;

function getIdioma() {
  if (I18N_LANG_LOCKED) return 'pt';
  return localStorage.getItem(I18N_LANG_KEY) || 'pt';
}

function setIdioma(lang) {
  localStorage.setItem(I18N_LANG_KEY, lang);
  aplicarTraducoes();
  atualizarBotaoIdioma();
}

function toggleIdioma() {
  setIdioma(getIdioma() === 'pt' ? 'en' : 'pt');
}

function t(key) {
  const lang = getIdioma();
  return (I18N_DICT[lang] && I18N_DICT[lang][key]) || (I18N_DICT.pt[key]) || key;
}

function aplicarTraducoes() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  // data-i18n-html: igual a data-i18n, mas o texto traduzido pode conter tags
  // (<strong>, <span>, <br>) — usado em frases com trecho destacado no meio.
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

function atualizarBotaoIdioma() {
  const btn = document.getElementById('i18n-lang-btn');
  if (!btn) return;
  btn.textContent = t('lang.toggle.label');
  btn.title = t('lang.toggle.title');
}

// ── FUSO HORÁRIO ──
function getFusoHorario() {
  let tz = localStorage.getItem(I18N_TZ_KEY);
  if (!tz) {
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (e) {
      tz = 'UTC';
    }
    localStorage.setItem(I18N_TZ_KEY, tz);
  }
  return tz;
}

function setFusoHorario(tz) {
  localStorage.setItem(I18N_TZ_KEY, tz);
  const sel = document.getElementById('i18n-tz-select');
  if (sel) sel.value = tz;
}

// Lista curta de fusos comuns + o detectado (evita um dropdown gigante de
// 400 fusos IANA pra um caso de uso que é "viajei" ou "quero ver em UTC").
const I18N_FUSOS_COMUNS = [
  'America/Sao_Paulo', 'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'America/Mexico_City', 'America/Bogota', 'America/Argentina/Buenos_Aires',
  'Europe/Lisbon', 'Europe/London', 'Europe/Madrid', 'UTC',
];

function montarWidgetIdiomaFuso() {
  if (document.getElementById('i18n-widget')) return;

  const tzAtual = getFusoHorario();
  const fusos = I18N_FUSOS_COMUNS.includes(tzAtual)
    ? I18N_FUSOS_COMUNS
    : [tzAtual, ...I18N_FUSOS_COMUNS];

  const wrap = document.createElement('div');
  wrap.id = 'i18n-widget';
  wrap.style.cssText = `
    position: fixed; bottom: 16px; right: 16px; z-index: 9999;
    display: flex; gap: 8px; align-items: center;
    background: rgba(10, 14, 22, 0.85); border: 1px solid rgba(0, 229, 255, 0.3);
    border-radius: 10px; padding: 6px 8px; backdrop-filter: blur(6px);
    font-family: inherit; font-size: 12px;
  `;
  wrap.innerHTML = `
    <select id="i18n-tz-select" title="${t('tz.label')}" style="
      background: transparent; color: #b8c2cc; border: none; font-size: 12px;
      max-width: 140px; cursor: pointer;">
      ${fusos.map(f => `<option value="${f}" ${f === tzAtual ? 'selected' : ''}>${f.replace('_', ' ')}</option>`).join('')}
    </select>
    ${I18N_LANG_LOCKED ? '' : `<button id="i18n-lang-btn" style="
      background: linear-gradient(135deg, #00e5ff, #7b2ff7); color: white; border: none;
      border-radius: 6px; padding: 4px 10px; font-weight: 700; cursor: pointer; font-size: 12px;
    ">${t('lang.toggle.label')}</button>`}
  `;
  document.body.appendChild(wrap);

  document.getElementById('i18n-tz-select').addEventListener('change', (e) => {
    setFusoHorario(e.target.value);
  });
  if (!I18N_LANG_LOCKED) {
    document.getElementById('i18n-lang-btn').addEventListener('click', toggleIdioma);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  montarWidgetIdiomaFuso();
  aplicarTraducoes();
});
