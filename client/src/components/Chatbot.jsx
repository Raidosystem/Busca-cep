import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { buscarCepViaCep, buscarEnderecoGuaira } from '../services/viaCepService';
import { MessageCircle, Send, X, Sparkles } from 'lucide-react';

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Olá! Eu sou a Lumi, seu assistente de CEP e endereços 😊' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { from: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    let botResponse = 'Desculpe, não entendi 😅';

    const lower = input.toLowerCase();
    
    try {
      if (lower.includes('oi') || lower.includes('olá') || lower.includes('ola')) {
        botResponse = 'Olá! 👋 Posso ajudar a encontrar CEPs ou logradouros de Guaíra/SP e todo o Brasil. O que você procura?';
      } else if (lower.includes('cep')) {
        // Tenta extrair um CEP do texto
        const match = input.match(/\d{5}-?\d{3}/);
        if (match) {
          const cep = match[0].replace(/\D/g, '');
          
          // Tenta Supabase primeiro
          const { data, error } = await supabase
            .from('ceps')
            .select('*')
            .eq('cep', cep)
            .limit(1);
          
          if (data && data.length > 0) {
            botResponse = `📍 O CEP ${cep} corresponde a:\n${data[0].logradouro}, ${data[0].bairro}\nGuaíra/SP`;
          } else {
            // Se não encontrou, tenta ViaCEP
            const viaCepData = await buscarCepViaCep(cep);
            if (viaCepData) {
              botResponse = `📍 O CEP ${cep} corresponde a:\n${viaCepData.logradouro}, ${viaCepData.bairro}\n${viaCepData.localidade}/${viaCepData.uf}\n\n✨ Resultado via ViaCEP`;
            } else {
              botResponse = 'Não encontrei esse CEP 😕 Verifique se está correto.';
            }
          }
        } else {
          botResponse = 'Informe o CEP no formato 00000-000 que eu busco para você! 🔍';
        }
      } else if (lower.includes('rua') || lower.includes('logradouro') || lower.includes('avenida')) {
        const query = input.replace(/(rua|logradouro|avenida|av)/gi, '').trim();
        
        // Tenta Supabase primeiro
        const { data, error } = await supabase
          .from('ceps')
          .select('*')
          .ilike('logradouro', `%${query}%`)
          .limit(3);
        
        if (data && data.length > 0) {
          botResponse = '🗺️ Encontrei em Guaíra:\n' + data.map(d => `• ${d.logradouro}, ${d.bairro}\n  CEP: ${d.cep}`).join('\n\n');
        } else {
          // Se não encontrou, tenta ViaCEP para Guaíra
          const viaCepData = await buscarEnderecoGuaira(query);
          if (viaCepData && viaCepData.length > 0) {
            botResponse = '🗺️ Encontrei via ViaCEP:\n' + viaCepData.slice(0, 3).map(d => `• ${d.logradouro}, ${d.bairro}\n  CEP: ${d.cep}`).join('\n\n');
          } else {
            botResponse = 'Não encontrei nenhum logradouro com esse nome. 🤔 Tente outro termo.';
          }
        }
      } else if (lower.includes('ajuda') || lower.includes('help')) {
        botResponse = '💡 Posso te ajudar com:\n• Buscar CEP (ex: "CEP 14900-000")\n• Buscar rua (ex: "Rua 8")\n• Encontrar logradouros de Guaíra e todo o Brasil!\n\nO que você gostaria de fazer?';
      } else if (lower.includes('obrigad')) {
        botResponse = 'Por nada! 😊 Estou aqui sempre que precisar!';
      } else {
        botResponse = '🤔 Não entendi muito bem. Tente perguntar sobre um CEP ou endereço!\n\nExemplos:\n• "CEP 14900-000"\n• "Rua 8"\n• "Avenida Brasil"';
      }
    } catch (err) {
      console.error('Erro no chatbot:', err);
      botResponse = '❌ Ops! Tive um problema ao consultar. Tente novamente!';
    }

    setTimeout(() => {
      setMessages(prev => [...prev, { from: 'bot', text: botResponse }]);
      setIsTyping(false);
    }, 800);
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
