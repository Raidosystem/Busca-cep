import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useFavorites, useHistory } from '../hooks/useFavorites';
import { buscarEnderecoGuaira, buscarEnderecoViaCep } from '../services/viaCepService';
import { 
  Search, MapPin, Heart, Copy, Share2, ExternalLink, 
  Trash2, Clock, Sparkles, Info, Check 
} from 'lucide-react';

// Função para converter números por extenso para dígitos
function numerosPorExtenso(texto) {
  const numerosExtenso = {
    'zero': '0', 'um': '1', 'uma': '1', 'dois': '2', 'duas': '2', 'três': '3', 'tres': '3',
    'quatro': '4', 'cinco': '5', 'seis': '6', 'sete': '7', 'oito': '8', 'nove': '9',
    'dez': '10', 'onze': '11', 'doze': '12', 'treze': '13', 'catorze': '14', 'quatorze': '14',
    'quinze': '15', 'dezesseis': '16', 'dezessete': '17', 'dezoito': '18', 'dezenove': '19',
    'vinte': '20', 'trinta': '30', 'quarenta': '40', 'cinquenta': '50', 'sessenta': '60',
    'setenta': '70', 'oitenta': '80', 'noventa': '90', 'cem': '100', 'cento': '100'
  };

  let resultado = texto.toLowerCase();
  
  // Substitui números por extenso pelos dígitos
  Object.entries(numerosExtenso).forEach(([extenso, digito]) => {
    const regex = new RegExp(`\\b${extenso}\\b`, 'gi');
    resultado = resultado.replace(regex, digito);
  });

  return resultado;
}

// Função para copiar texto para área de transferência
async function copiarParaAreaTransferencia(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch (err) {
    // Fallback para navegadores mais antigos
    const textArea = document.createElement('textarea');
    textArea.value = texto;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

// Função para compartilhar o CEP via WhatsApp, Email e Outlook
async function compartilharEndereco(endereco) {
  const textoCep = `CEP: ${endereco.cep}`;
  const textoCompleto = `Endereço encontrado:\n${endereco.logradouro}, ${endereco.bairro}\nCEP: ${endereco.cep}`;
  
  // Primeiro tenta usar Web Share API se disponível
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'CEP encontrado',
        text: textoCompleto
      });
      return true;
    } catch (err) {
      // Se o usuário cancelou, não faz nada
      if (err && err.name && err.name === 'AbortError') return false;
    }
  }

  // Fallback: abre opções de compartilhamento
  const opcao = confirm(
    'Escolha como compartilhar:\n' +
    'OK = WhatsApp\n' +
    'Cancelar = Abrir opções de Email'
  );

  if (opcao) {
    // WhatsApp
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(textoCompleto)}`;
    window.open(whatsappUrl, '_blank');
    return true;
  } else {
    // Opções de Email
    const emailOpcao = confirm(
      'Escolha o cliente de email:\n' +
      'OK = Email padrão\n' +
      'Cancelar = Outlook'
    );
    
    const subject = 'CEP encontrado';
    const body = textoCompleto;
    
    if (emailOpcao) {
      // Email padrão
      const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = emailUrl;
    } else {
      // Outlook
      const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(outlookUrl, '_blank');
    }
    return true;
  }
}

export default function AddressSearch() {
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedCep, setCopiedCep] = useState('');
  const [sharedCep, setSharedCep] = useState('');

  const { favorites, addFavorite, removeFavorite } = useFavorites();
  const { history, addHistory, clearHistory } = useHistory('addressHistory');

  async function onSearch(e) {
    e?.preventDefault();
    if (!logradouro && !bairro) {
      setError('Informe pelo menos o logradouro ou bairro');
      return;
    }

    setError('');
    setResults([]);
    setLoading(true);

    try {
      let allResults = [];
      
      if (logradouro) {
        // Converte números por extenso para dígitos antes da busca
        const logradouroConvertido = numerosPorExtenso(logradouro);
        
        // Limpa e normaliza o termo de busca
        const termo = logradouroConvertido.trim().replace(/\s+/g, ' ');
        
        // Diferentes variações do termo para buscar
        const variacoes = [
          termo, // Original: "av 1A"
          termo.toUpperCase(), // Maiúsculas: "AV 1A"
          termo.toLowerCase(), // Minúsculas: "av 1a"
          termo.replace(/\s+/g, ''), // Sem espaços: "av1A"
          termo.replace(/([0-9])([A-Za-z])/g, '$1 $2'), // Com espaço entre número e letra: "av 1 A"
          termo.replace(/([0-9])\s+([A-Za-z])/g, '$1$2'), // Remove espaço entre número e letra: "av 1A" -> "av 1A"
          termo.replace(/^(av|avenida|r|rua|al|alameda)\s*/i, ''), // Sem prefixo: "1A"
          termo.replace(/^av\s*/i, 'avenida '), // Expandir "av" para "avenida"
          termo.replace(/^r\s*/i, 'rua '), // Expandir "r" para "rua"
          // Variações específicas para números com letras
          termo.replace(/([0-9])([A-Za-z])/g, '$1-$2'), // Com hífen: "av 1-A"
        ];

        // Remove duplicatas e valores vazios
        const variacoesUnicas = [...new Set(variacoes)].filter(v => v && v.length > 0);

        // Busca por cada variação
        for (const variacao of variacoesUnicas) {
          let query = supabase.from('ceps').select('*').ilike('logradouro', `%${variacao}%`);
          
          if (bairro) {
            query = query.ilike('bairro', `%${bairro.trim()}%`);
          }
          
          const { data } = await query.limit(50);
          if (data && data.length > 0) {
            allResults.push(...data);
          }
        }
      } else if (bairro) {
        // Busca apenas por bairro
        const { data } = await supabase
          .from('ceps')
          .select('*')
          .ilike('bairro', `%${bairro.trim()}%`)
          .limit(50);
        
        if (data) allResults.push(...data);
      }

      // Remove duplicatas baseado no CEP
      const resultadosUnicos = allResults.filter((item, index, self) =>
        index === self.findIndex(t => t.cep === item.cep)
      );

      // Se não encontrou no Supabase, tenta buscar na ViaCEP (Guaíra/SP)
      if (resultadosUnicos.length === 0 && logradouro) {
        try {
          const dadosViaCep = await buscarEnderecoGuaira(logradouro);
          
          if (dadosViaCep && dadosViaCep.length > 0) {
            // Filtra por bairro se foi informado
            const resultadosFiltrados = bairro 
              ? dadosViaCep.filter(item => 
                  item.bairro.toLowerCase().includes(bairro.toLowerCase())
                )
              : dadosViaCep;
            
            allResults.push(...resultadosFiltrados);
          }
        } catch (viaCepErr) {
          console.warn('Erro ao buscar na ViaCEP:', viaCepErr);
        }
      }

      const resultadosFinais = allResults.length > resultadosUnicos.length 
        ? allResults.filter((item, index, self) =>
            index === self.findIndex(t => t.cep === item.cep)
          ).slice(0, 20)
        : resultadosUnicos.slice(0, 20);

      setResults(resultadosFinais);
      
      if (resultadosFinais.length > 0) {
        addHistory(logradouro || bairro);
      } else {
        setError('Nenhum endereço encontrado. Tente outra busca.');
      }
    } catch (err) {
      console.error('Erro na busca:', err);
      if (err.message.includes('fetch')) {
        setError('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        setError(err.message || 'Erro ao buscar endereços. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Função para copiar endereço completo
  const handleCopyCep = async (endereco) => {
    const enderecoCompleto = `${endereco.logradouro}, ${endereco.bairro} - CEP: ${endereco.cep}`;
    const sucesso = await copiarParaAreaTransferencia(enderecoCompleto);
    
    if (sucesso) {
      setCopiedCep(endereco.cep);
      setTimeout(() => setCopiedCep(''), 2000);
    }
  };

  // Função para compartilhar endereço
  const handleShareEndereco = async (endereco) => {
    const sucesso = await compartilharEndereco(endereco);
    
    if (sucesso) {
      setSharedCep(endereco.cep);
      setTimeout(() => setSharedCep(''), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="space-y-4">
        {/* Inputs */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-2">
            <MapPin size={16} />
            Logradouro (Rua, Av, etc)
          </label>
          <input
            value={logradouro}
            onChange={(e) => setLogradouro(e.target.value)}
            placeholder="Ex: Rua 8, Av. Brasil, Rua oito..."
            className="w-full p-3 text-sm rounded-xl border-2 border-emerald-200 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all bg-white"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-2">
            <MapPin size={16} />
            Bairro (opcional)
          </label>
          <input
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            placeholder="Ex: Centro"
            className="w-full p-3 text-sm rounded-xl border-2 border-emerald-200 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all bg-white"
          />
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search size={18} />
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setLogradouro('');
              setBairro('');
              setResults([]);
              setError('');
            }}
            className="flex items-center justify-center gap-2 border-2 border-emerald-300 text-emerald-700 bg-white hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </form>

      {/* Status */}
      {loading && (
        <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-600 border-t-transparent"></div>
          <span className="font-medium">Buscando endereços...</span>
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl border border-red-200">
          <Info size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Resultados */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
            <Sparkles size={20} />
            <h3>{results.length} Resultados Encontrados</h3>
          </div>
          
          <div className="space-y-3">
            {results.map((r) => (
              <div
                key={r.cep}
                className="bg-white p-4 rounded-xl border-2 border-emerald-100 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-emerald-800 text-base">{r.logradouro || '—'}</div>
                      {r.origem === 'viacep' && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                          ViaCEP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                      <MapPin size={14} />
                      {r.bairro || '—'}
                      {r.localidade && r.localidade !== 'Guaíra' && (
                        <span className="text-xs text-slate-500">• {r.localidade}/{r.uf}</span>
                      )}
                    </div>
                    <div className="inline-block bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1 rounded-lg text-sm font-mono font-bold">
                      {r.cep}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyCep(r)}
                        className={`p-2 rounded-lg transition-all ${
                          copiedCep === r.cep
                            ? 'bg-green-500 text-white scale-110'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                        title="Copiar endereço"
                      >
                        {copiedCep === r.cep ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                      
                      <button
                        onClick={() => handleShareEndereco(r)}
                        className={`p-2 rounded-lg transition-all ${
                          sharedCep === r.cep
                            ? 'bg-green-500 text-white scale-110'
                            : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                        }`}
                        title="Compartilhar"
                      >
                        <Share2 size={18} />
                      </button>

                      {favorites.some((f) => f.key === r.cep) ? (
                        <button
                          onClick={() => removeFavorite(r.cep)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all hover:scale-110"
                          title="Remover favorito"
                        >
                          <Heart size={18} className="fill-red-600" />
                        </button>
                      ) : (
                        <button
                          onClick={() => addFavorite({ key: r.cep, logradouro: r.logradouro, bairro: r.bairro })}
                          className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all hover:scale-110"
                          title="Adicionar favorito"
                        >
                          <Heart size={18} />
                        </button>
                      )}
                    </div>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `CEP ${r.cep}, ${r.logradouro || ''}, ${r.bairro || ''}, Guaira, SP, Brasil`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105"
                    >
                      <ExternalLink size={14} />
                      Mapa
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico */}
      {history.length > 0 && results.length === 0 && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-bold text-emerald-700 text-sm">
              <Clock size={16} />
              Pesquisas Recentes
            </div>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded-lg transition-colors font-semibold"
              title="Limpar histórico"
            >
              <Trash2 size={14} />
              Limpar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((h, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setLogradouro(h);
                  onSearch();
                }}
                className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-700 text-sm rounded-full border border-emerald-200 transition-all hover:scale-105 hover:shadow-md font-medium"
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
