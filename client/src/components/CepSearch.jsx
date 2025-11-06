import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useHistory, useFavorites } from '../hooks/useFavorites';
import { buscarCepViaCep, formatarCep as formatarCepViaCep } from '../services/viaCepService';
import { 
  Search, MapPin, Heart, Copy, Share2, ExternalLink, 
  Trash2, Clock, Sparkles, Info, Check, Hash 
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
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    } else {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = texto;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const resultado = document.execCommand('copy');
      document.body.removeChild(textArea);
      return resultado;
    }
  } catch (err) {
    return false;
  }
}

// Função para compartilhar o endereço via WhatsApp, Email e Outlook
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

export default function CepSearch() {
  const [cep, setCep] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedCep, setCopiedCep] = useState('');
  const [sharedCep, setSharedCep] = useState('');

  const { history, addHistory, clearHistory } = useHistory('cepHistory');
  const { favorites, addFavorite, removeFavorite } = useFavorites();

  async function onSearch(e) {
    e?.preventDefault();
    setError("");
    setResults([]);
    setLoading(true);

    try {
      // Processa números por extenso antes de extrair dígitos
      const cepProcessado = numerosPorExtenso(cep);
      const digits = cepProcessado.replace(/\D/g, "");
      
      if (digits.length !== 8) {
        throw new Error("CEP inválido. Digite 8 números.");
      }

      let resultadosEncontrados = [];

      // 1. Tenta buscar no Supabase primeiro (banco local)
      try {
        const { data, error: supabaseError } = await supabase
          .from("ceps")
          .select("*")
          .or(`cep.eq.${digits},cep.eq.${formatCep(digits)}`)
          .limit(20);

        if (!supabaseError && data && data.length > 0) {
          resultadosEncontrados = data.map(item => ({
            ...item,
            origem: 'local'
          }));
        }
      } catch (supabaseErr) {
        console.warn('Erro no Supabase, tentando ViaCEP:', supabaseErr);
      }

      // 2. Se não encontrou no Supabase, busca na ViaCEP
      if (resultadosEncontrados.length === 0) {
        try {
          const dadosViaCep = await buscarCepViaCep(digits);
          
          if (dadosViaCep) {
            resultadosEncontrados = [{
              cep: dadosViaCep.cep,
              logradouro: dadosViaCep.logradouro,
              bairro: dadosViaCep.bairro,
              localidade: dadosViaCep.localidade,
              uf: dadosViaCep.uf,
              origem: 'viacep'
            }];
          }
        } catch (viaCepErr) {
          console.warn('Erro na ViaCEP:', viaCepErr);
        }
      }

      if (resultadosEncontrados.length === 0) {
        setError('CEP não encontrado. Verifique se o CEP está correto.');
      } else {
        setResults(resultadosEncontrados);
        addHistory(formatCep(digits));
      }
    } catch (err) {
      console.error('Erro na busca de CEP:', err);
      if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
        setError('Erro de conexão. Verifique sua internet e tente novamente.');
      } else if (err.message.includes('inválido')) {
        setError(err.message);
      } else {
        setError(err.message || 'Erro ao buscar CEP. Tente novamente.');
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
        {/* INPUT */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-teal-700 mb-2">
            <Hash size={16} />
            CEP (8 dígitos)
          </label>
          <input
            value={cep}
            onChange={(e) => setCep(e.target.value)}
            placeholder="Ex: 01234-567 ou zero um dois três..."
            className="w-full p-3 text-sm rounded-xl border-2 border-teal-200 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100 transition-all bg-white"
          />
        </div>

        {/* BOTÕES */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search size={18} />
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setCep("");
              setResults([]);
              setError("");
            }}
            className="flex items-center justify-center gap-2 border-2 border-teal-300 text-teal-700 bg-white hover:bg-teal-50 px-4 py-2.5 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </form>

      {/* FEEDBACK */}
      {loading && (
        <div className="flex items-center gap-3 text-teal-600 bg-teal-50 p-4 rounded-xl border border-teal-200">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-teal-600 border-t-transparent"></div>
          <span className="font-medium">Buscando CEP...</span>
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl border border-red-200">
          <Info size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* RESULTADOS */}
      {!loading && !error && results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-teal-700 font-bold text-lg">
            <Sparkles size={20} />
            <h3>{results.length} Resultado{results.length > 1 ? 's' : ''} Encontrado{results.length > 1 ? 's' : ''}</h3>
          </div>
          
          <div className="space-y-3">
            {results.map((r, i) => {
              const isFavorited = favorites.some(fav => fav.key === r.cep);
              
              return (
                <div
                  key={i}
                  className="bg-white p-4 rounded-xl border-2 border-teal-100 hover:border-teal-300 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-teal-800 text-base">{r.logradouro || "—"}</div>
                        {r.origem === 'viacep' && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                            ViaCEP
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-teal-600">
                        <MapPin size={14} />
                        {r.bairro || "—"}
                        {r.localidade && (
                          <span className="text-xs text-slate-500">• {r.localidade}/{r.uf || 'SP'}</span>
                        )}
                      </div>
                      <div className="inline-block bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-3 py-1 rounded-lg text-sm font-mono font-bold">
                        {formatCep(r.cep)}
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

                        <button
                          onClick={() => {
                            if (isFavorited) {
                              removeFavorite(r.cep);
                            } else {
                              addFavorite({
                                key: r.cep,
                                logradouro: r.logradouro || '',
                                bairro: r.bairro || '',
                                cep: r.cep
                              });
                            }
                          }}
                          className={`p-2 rounded-lg transition-all hover:scale-110 ${
                            isFavorited
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                          }`}
                          title={isFavorited ? 'Remover favorito' : 'Adicionar favorito'}
                        >
                          <Heart size={18} className={isFavorited ? 'fill-red-600' : ''} />
                        </button>
                      </div>

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `CEP ${r.cep}, ${r.logradouro || ''}, ${r.bairro || ''}, Guaira, SP, Brasil`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105"
                      >
                        <ExternalLink size={14} />
                        Mapa
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && results.length === 0 && !error && cep && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mb-4">
            <Search className="text-teal-400" size={32} />
          </div>
          <p className="text-slate-600">Nenhum resultado encontrado para este CEP.</p>
        </div>
      )}

      {/* Histórico */}
      {history.length > 0 && results.length === 0 && (
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-bold text-teal-700 text-sm">
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
                  setCep(h);
                  const event = { preventDefault: () => {} };
                  onSearch(event);
                }}
                className="px-3 py-1.5 bg-white hover:bg-teal-100 text-teal-700 text-sm rounded-full border border-teal-200 transition-all hover:scale-105 hover:shadow-md font-medium"
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

function formatCep(cep) {
  if (!cep) return "";
  const s = cep.replace(/\D/g, "");
  if (s.length === 8) return `${s.slice(0, 5)}-${s.slice(5)}`;
  return cep;
}
