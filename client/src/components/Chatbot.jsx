import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { buscarCepViaCep, buscarEnderecoGuaira, buscarEnderecoViaCep, formatarCep } from '../services/viaCepService';
import { MessageCircle, Send, X, Sparkles } from 'lucide-react';

// ─── Funções auxiliares de normalização e busca inteligente ───

/** Remove acentos de um texto */
function removerAcentos(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Normaliza texto para comparação: minúsculo, sem acentos, sem pontuação extra */
function normalizar(texto) {
  return removerAcentos(texto.toLowerCase().trim())
    .replace(/[.,;:!?'"()\-\/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Converte números por extenso para dígitos */
function numerosPorExtenso(texto) {
  const mapa = {
    'zero':'0','um':'1','uma':'1','dois':'2','duas':'2','tres':'3','quatro':'4',
    'cinco':'5','seis':'6','sete':'7','oito':'8','nove':'9','dez':'10',
    'onze':'11','doze':'12','treze':'13','catorze':'14','quatorze':'14',
    'quinze':'15','dezesseis':'16','dezessete':'17','dezoito':'18','dezenove':'19',
    'vinte':'20','trinta':'30','quarenta':'40','cinquenta':'50','sessenta':'60',
    'setenta':'70','oitenta':'80','noventa':'90','cem':'100'
  };
  let r = texto;
  Object.entries(mapa).forEach(([ext, dig]) => {
    r = r.replace(new RegExp(`\\b${ext}\\b`, 'gi'), dig);
  });
  return r;
}

/** Corrige erros comuns de digitação em nomes de logradouros */
function corrigirErrosComuns(texto) {
  const correcoes = {
    'roa': 'rua', 'rau': 'rua', 'rue': 'rua', 'rya': 'rua',
    'avnida': 'avenida', 'avendia': 'avenida', 'aveinida': 'avenida', 'avenid': 'avenida',
    'aveinda': 'avenida', 'avenia': 'avenida', 'avinida': 'avenida', 'avedina': 'avenida',
    'travesa': 'travessa', 'travssa': 'travessa', 'traveza': 'travessa',
    'praca': 'praca', 'parça': 'praca', 'prasa': 'praca',
    'logradoro': 'logradouro', 'logadouro': 'logradouro',
    'bairo': 'bairro', 'bairoo': 'bairro', 'barro': 'bairro',
    'endereso': 'endereco', 'enderço': 'endereco', 'enderasso': 'endereco',
    'endereço': 'endereco', 'enderezo': 'endereco',
    'guraira': 'guaira', 'guairá': 'guaira', 'guarira': 'guaira', 'guiara': 'guaira',
    'brasill': 'brasil', 'brazill': 'brasil', 'brazul': 'brasil', 'brazil': 'brasil',
  };
  let r = normalizar(texto);
  Object.entries(correcoes).forEach(([errado, certo]) => {
    r = r.replace(new RegExp(`\\b${errado}\\b`, 'gi'), certo);
  });
  return r;
}

/** Gera variações de busca para encontrar mesmo com erros */
function gerarVariacoes(query) {
  const base = normalizar(query);
  const corrigido = corrigirErrosComuns(query);
  const comNumeros = numerosPorExtenso(corrigido);
  
  const variacoes = new Set([base, corrigido, comNumeros]);
  
  // Tenta remover prefixos comuns para buscar só o nome
  const prefixos = ['rua ', 'r ', 'avenida ', 'av ', 'travessa ', 'tv ', 'praca ', 'pc ', 'alameda ', 'al ', 'viela ', 'beco '];
  for (const p of prefixos) {
    if (base.startsWith(p)) variacoes.add(base.slice(p.length).trim());
    if (corrigido.startsWith(p)) variacoes.add(corrigido.slice(p.length).trim());
    if (comNumeros.startsWith(p)) variacoes.add(comNumeros.slice(p.length).trim());
  }
  
  // Remove variações muito curtas
  return [...variacoes].filter(v => v.length >= 2);
}

/** Calcula similaridade entre duas strings (0 a 1) - Dice coefficient */
function similaridade(a, b) {
  const na = normalizar(a);
  const nb = normalizar(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;
  
  const bigramsA = new Set();
  for (let i = 0; i < na.length - 1; i++) bigramsA.add(na.slice(i, i + 2));
  const bigramsB = new Set();
  for (let i = 0; i < nb.length - 1; i++) bigramsB.add(nb.slice(i, i + 2));
  
  let inter = 0;
  for (const bg of bigramsA) if (bigramsB.has(bg)) inter++;
  return (2 * inter) / (bigramsA.size + bigramsB.size);
}

/** Detecta se o texto contém um CEP (8 dígitos agrupados) */
function extrairCep(texto) {
  // Formatos: 14900-000, 14900000, 14900 000
  const match = texto.match(/\b(\d{5})\s?[-.]?\s?(\d{3})\b/);
  if (match) return match[1] + match[2];
  // Tenta sequência pura de 8 dígitos
  const match2 = texto.match(/\b(\d{8})\b/);
  if (match2) return match2[1];
  return null;
}

/** Detecta se o texto parece ser uma busca de endereço */
function pareceEndereco(texto) {
  const lower = normalizar(texto);
  const indicadores = [
    'rua', 'roa', 'avenida', 'avnida', 'av ', 'travessa', 'praca', 'alameda',
    'logradouro', 'endereco', 'endereso', 'onde fica', 'qual o cep', 'qual cep',
    'cep da', 'cep do', 'cep de', 'bairro', 'centro', 'vila', 'jardim',
    'maraca', 'ipiranga', 'cohab', 'residencial'
  ];
  return indicadores.some(ind => lower.includes(ind));
}

/** Detecta saudações */
function isSaudacao(texto) {
  const lower = normalizar(texto);
  const saudacoes = ['oi', 'ola', 'eai', 'e ai', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'hello', 'hi', 'fala', 'salve'];
  return saudacoes.some(s => lower === s || lower.startsWith(s + ' ') || lower.endsWith(' ' + s));
}

/** Detecta agradecimento */
function isAgradecimento(texto) {
  const lower = normalizar(texto);
  return ['obrigad', 'valeu', 'thanks', 'brigad', 'vlw', 'tmj'].some(s => lower.includes(s));
}

/** Detecta pedido de ajuda */
function isAjuda(texto) {
  const lower = normalizar(texto);
  return ['ajuda', 'help', 'como funciona', 'o que voce faz', 'o que vc faz', 'como usar', 'comandos'].some(s => lower.includes(s));
}

/** Extrai a parte relevante da busca (remove palavras comuns de pergunta) */
function extrairTermoBusca(texto) {
  let t = normalizar(texto);
  // Remove frases de pergunta comuns
  const remover = [
    'qual o cep da ', 'qual o cep de ', 'qual o cep do ', 'qual cep da ', 'qual cep de ',
    'qual cep do ', 'qual e o cep da ', 'qual e o cep de ', 'me diz o cep da ',
    'me fala o cep da ', 'quero saber o cep da ', 'cep da ', 'cep de ', 'cep do ',
    'onde fica a ', 'onde fica o ', 'onde e a ', 'onde e o ',
    'procuro a ', 'procuro o ', 'buscar ', 'busca ', 'pesquisar ', 'pesquisa ',
    'encontrar ', 'achar ', 'me mostra a ', 'me mostra o ', 'mostra a ', 'mostra o ',
    'quero o endereco da ', 'quero o endereco de ', 'endereco da ', 'endereco de ',
    'qual endereco da ', 'qual endereco de ',
    'por favor ', 'pf ', 'pfv ',
  ];
  for (const r of remover) {
    if (t.startsWith(r)) t = t.slice(r.length).trim();
  }
  return t;
}

/** Formata resultado de endereço para exibição */
function formatarResultado(item, origem) {
  const cepFmt = formatarCep(item.cep);
  const local = item.localidade
    ? `${item.localidade}/${item.uf}`
    : 'Guaíra/SP';
  const logradouro = item.logradouro || 'Sem logradouro';
  const bairro = item.bairro || 'Sem bairro';
  let texto = `📍 ${logradouro}, ${bairro}\n🏙️ ${local}\n📮 CEP: ${cepFmt}`;
  if (origem === 'viacep') texto += '\n✨ via ViaCEP';
  return texto;
}

/** Busca inteligente no Supabase com múltiplas variações */
async function buscarSupabaseInteligente(query) {
  const variacoes = gerarVariacoes(query);
  const todosResultados = [];
  const cepsVistos = new Set();

  for (const v of variacoes) {
    if (v.length < 2) continue;
    try {
      const { data } = await supabase
        .from('ceps')
        .select('*')
        .ilike('logradouro', `%${v}%`)
        .limit(5);
      if (data) {
        for (const d of data) {
          if (!cepsVistos.has(d.cep)) {
            cepsVistos.add(d.cep);
            todosResultados.push(d);
          }
        }
      }
    } catch (e) { /* ignora erro de uma variação */ }
  }

  // Também tenta buscar por bairro
  for (const v of variacoes) {
    if (v.length < 3) continue;
    try {
      const { data } = await supabase
        .from('ceps')
        .select('*')
        .ilike('bairro', `%${v}%`)
        .limit(3);
      if (data) {
        for (const d of data) {
          if (!cepsVistos.has(d.cep)) {
            cepsVistos.add(d.cep);
            todosResultados.push(d);
          }
        }
      }
    } catch (e) { /* ignora erro */ }
  }

  // Ordena por similaridade com o texto original
  const queryNorm = normalizar(query);
  todosResultados.sort((a, b) => {
    const simA = Math.max(similaridade(a.logradouro, queryNorm), similaridade(a.bairro || '', queryNorm));
    const simB = Math.max(similaridade(b.logradouro, queryNorm), similaridade(b.bairro || '', queryNorm));
    return simB - simA;
  });

  return todosResultados.slice(0, 5);
}

/** Busca inteligente via ViaCEP com variações */
async function buscarViaCepInteligente(query) {
  const variacoes = gerarVariacoes(query);
  const todosResultados = [];
  const cepsVistos = new Set();

  for (const v of variacoes) {
    if (v.length < 3) continue;
    try {
      const data = await buscarEnderecoGuaira(v);
      if (data && data.length > 0) {
        for (const d of data) {
          if (!cepsVistos.has(d.cep)) {
            cepsVistos.add(d.cep);
            todosResultados.push({ ...d, origem: 'viacep' });
          }
        }
      }
    } catch (e) { /* ignora */ }
  }

  // Ordena por similaridade
  const queryNorm = normalizar(query);
  todosResultados.sort((a, b) => {
    const simA = similaridade(a.logradouro, queryNorm);
    const simB = similaridade(b.logradouro, queryNorm);
    return simB - simA;
  });

  return todosResultados.slice(0, 5);
}

// ─── Componente Chatbot ───

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Olá! Eu sou a Lumi ✨ sua assistente de CEP e endereços!\n\nVocê pode digitar qualquer coisa:\n• Um CEP (ex: 14900000)\n• Um endereço (ex: rua 8)\n• Ou perguntar "qual o cep da rua Brasil?"\n\nMesmo com erros de digitação, eu entendo! 😊' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const textoOriginal = input.trim();
    const userMessage = { from: 'user', text: textoOriginal };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    let botResponse = '';

    try {
      // 1. Saudação
      if (isSaudacao(textoOriginal)) {
        botResponse = 'Olá! 👋 Que bom te ver!\n\nMe diga um CEP ou endereço e eu encontro para você. Pode digitar de qualquer jeito, mesmo com erros! 😉';
      }
      // 2. Agradecimento
      else if (isAgradecimento(textoOriginal)) {
        botResponse = 'Por nada! 😊 Fico feliz em ajudar!\nSe precisar de mais alguma coisa, é só digitar!';
      }
      // 3. Ajuda
      else if (isAjuda(textoOriginal)) {
        botResponse = '💡 Sou a Lumi e sei encontrar endereços e CEPs!\n\n📮 Para buscar por CEP:\n• Digite o número: 14900000\n• Ou com hífen: 14900-000\n\n🏠 Para buscar endereço:\n• "rua 8"\n• "qual cep da rua brasil?"\n• "avenida Gabriel"\n\n✨ Dica: pode digitar errado que eu entendo!\nEx: "roa oito" → Rua 8';
      }
      // 4. Detecta CEP no texto
      else if (extrairCep(textoOriginal)) {
        const cep = extrairCep(textoOriginal);
        
        // Supabase primeiro
        const { data } = await supabase
          .from('ceps')
          .select('*')
          .eq('cep', cep)
          .limit(1);
        
        if (data && data.length > 0) {
          botResponse = `✅ Encontrei!\n\n${formatarResultado(data[0], 'local')}`;
        } else {
          // ViaCEP
          const viaCepData = await buscarCepViaCep(cep);
          if (viaCepData) {
            botResponse = `✅ Encontrei!\n\n${formatarResultado(viaCepData, 'viacep')}`;
          } else {
            botResponse = `😕 Não encontrei o CEP ${formatarCep(cep)}.\n\nVerifique se os números estão corretos e tente novamente!`;
          }
        }
      }
      // 5. Busca de endereço (inteligente)
      else {
        const termoBusca = extrairTermoBusca(textoOriginal);
        const termoCorrigido = corrigirErrosComuns(termoBusca);
        const termoComNumeros = numerosPorExtenso(termoCorrigido);
        
        // Busca em paralelo: Supabase + ViaCEP
        const [resultadosSupabase, resultadosViaCep] = await Promise.all([
          buscarSupabaseInteligente(termoBusca),
          buscarViaCepInteligente(termoBusca)
        ]);

        // Combina resultados sem duplicar
        const cepsVistos = new Set();
        const resultados = [];
        for (const r of [...resultadosSupabase, ...resultadosViaCep]) {
          if (!cepsVistos.has(r.cep)) {
            cepsVistos.add(r.cep);
            resultados.push(r);
          }
        }

        if (resultados.length > 0) {
          const qtd = resultados.length;
          const mostrando = resultados.slice(0, 5);
          
          // Mostra se houve correção
          let header = `✅ Encontrei ${qtd} resultado${qtd > 1 ? 's' : ''}`;
          if (termoComNumeros !== normalizar(termoBusca)) {
            header += `\n🔄 Entendi como: "${termoComNumeros}"`;
          }
          header += '\n';
          
          const lista = mostrando.map((r, i) => {
            const cepFmt = formatarCep(r.cep);
            const local = r.localidade ? `${r.localidade}/${r.uf}` : 'Guaíra/SP';
            const origem = r.origem === 'viacep' ? ' ✨' : '';
            return `${i + 1}. ${r.logradouro}, ${r.bairro}\n   📮 ${cepFmt} — ${local}${origem}`;
          }).join('\n\n');

          botResponse = header + '\n' + lista;
          
          if (qtd > 5) {
            botResponse += `\n\n📋 Mostrando 5 de ${qtd}. Seja mais específico para refinar!`;
          }
        } else {
          // Não encontrou nada — dá sugestões
          botResponse = `🤔 Não encontrei resultados para "${textoOriginal}".\n\n💡 Dicas:\n• Tente só o nome da rua: "rua 8"\n• Ou busque pelo bairro: "centro"\n• Também aceito CEP: "14900000"\n\nDigite "ajuda" para ver exemplos!`;
        }
      }
    } catch (err) {
      console.error('Erro no chatbot:', err);
      botResponse = '❌ Ops! Tive um probleminha ao consultar. Pode tentar de novo? 🙏';
    }

    setTimeout(() => {
      setMessages(prev => [...prev, { from: 'bot', text: botResponse }]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-shadow hover:scale-105"
        >
          <MessageCircle size={26} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
        </button>
      )}

      {open && (
        <div className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-bold text-base">Lumi</h3>
                <p className="text-xs text-white/80">Assistente virtual</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="h-96 p-4 overflow-y-auto space-y-3 bg-emerald-50/30">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] p-3 rounded-xl shadow-sm ${
                    m.from === 'bot'
                      ? 'bg-white border border-emerald-100 text-slate-700'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                  }`}
                >
                  {m.text.split('\n').map((line, idx) => (
                    <div key={idx} className="text-sm leading-relaxed">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-emerald-100 p-3 rounded-xl shadow-sm">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-emerald-100">
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2.5 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Digite sua mensagem..."
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button
                onClick={handleSend}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-2.5 rounded-lg hover:shadow-md transition-shadow"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
