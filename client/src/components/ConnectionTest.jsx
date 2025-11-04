import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { AlertCircle, CheckCircle, Wifi } from 'lucide-react';

export default function ConnectionTest() {
  const [status, setStatus] = useState('testing');
  const [message, setMessage] = useState('Testando conexão...');

  useEffect(() => {
    testConnection();
  }, []);

  async function testConnection() {
    try {
      // Testa a conexão com o Supabase
      const { data, error } = await supabase
        .from('ceps')
        .select('cep')
        .limit(1);

      if (error) {
        console.error('Erro de conexão:', error);
        setStatus('error');
        setMessage(`Erro: ${error.message}`);
      } else {
        setStatus('success');
        setMessage('Conexão OK! Banco de dados funcionando.');
      }
    } catch (err) {
      console.error('Erro ao testar conexão:', err);
      setStatus('error');
      setMessage(`Erro de rede: ${err.message}. Verifique sua conexão com a internet.`);
    }
  }

  if (status === 'success') {
    return null; // Não mostra nada se está tudo OK
  }

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-xl shadow-lg border-2 ${
      status === 'error' ? 'bg-red-50 border-red-300' : 'bg-yellow-50 border-yellow-300'
    }`}>
      <div className="flex items-start gap-3">
        {status === 'testing' && <Wifi className="text-yellow-600 animate-pulse" size={24} />}
        {status === 'error' && <AlertCircle className="text-red-600" size={24} />}
        
        <div className="flex-1">
          <h4 className={`font-bold text-sm mb-1 ${
            status === 'error' ? 'text-red-800' : 'text-yellow-800'
          }`}>
            {status === 'error' ? 'Erro de Conexão' : 'Conectando...'}
          </h4>
          <p className={`text-xs ${
            status === 'error' ? 'text-red-700' : 'text-yellow-700'
          }`}>
            {message}
          </p>
          
          {status === 'error' && (
            <button
              onClick={testConnection}
              className="mt-3 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Tentar Novamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
