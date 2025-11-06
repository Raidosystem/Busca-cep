// Serviço para integração com API ViaCEP

/**
 * Busca CEP pela API ViaCEP
 * @param {string} cep - CEP com 8 dígitos (sem hífen)
 * @returns {Promise<Object|null>} Dados do endereço ou null se não encontrado
 */
export async function buscarCepViaCep(cep) {
  try {
    const cepLimpo = cep.replace(/\D/g, '');
    
    if (cepLimpo.length !== 8) {
      throw new Error('CEP deve ter 8 dígitos');
    }

    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar CEP na ViaCEP');
    }

    const data = await response.json();
    
    // ViaCEP retorna erro: true quando não encontra
    if (data.erro) {
      return null;
    }

    // Normaliza o formato para o padrão do app
    return {
      cep: cepLimpo,
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      localidade: data.localidade || '',
      uf: data.uf || '',
      complemento: data.complemento || '',
      origem: 'viacep'
    };
  } catch (error) {
    console.error('Erro ao buscar na ViaCEP:', error);
    throw error;
  }
}

/**
 * Busca endereços por cidade, UF e logradouro usando ViaCEP
 * @param {string} uf - Sigla do estado (ex: 'SP')
 * @param {string} cidade - Nome da cidade (ex: 'Guaíra')
 * @param {string} logradouro - Nome da rua/avenida
 * @returns {Promise<Array>} Array de endereços encontrados
 */
export async function buscarEnderecoViaCep(uf, cidade, logradouro) {
  try {
    if (!uf || !cidade || !logradouro) {
      throw new Error('UF, cidade e logradouro são obrigatórios');
    }

    const logradouroLimpo = logradouro.trim();
    
    if (logradouroLimpo.length < 3) {
      throw new Error('Logradouro deve ter pelo menos 3 caracteres');
    }

    const url = `https://viacep.com.br/ws/${uf}/${encodeURIComponent(cidade)}/${encodeURIComponent(logradouroLimpo)}/json/`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar endereço na ViaCEP');
    }

    const data = await response.json();
    
    // ViaCEP retorna erro ou array vazio quando não encontra
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Normaliza o formato
    return data.map(item => ({
      cep: item.cep?.replace(/\D/g, '') || '',
      logradouro: item.logradouro || '',
      bairro: item.bairro || '',
      localidade: item.localidade || '',
      uf: item.uf || '',
      complemento: item.complemento || '',
      origem: 'viacep'
    }));
  } catch (error) {
    console.error('Erro ao buscar endereço na ViaCEP:', error);
    throw error;
  }
}

/**
 * Busca endereços em Guaíra/SP especificamente
 * @param {string} logradouro - Nome da rua/avenida
 * @returns {Promise<Array>} Array de endereços encontrados
 */
export async function buscarEnderecoGuaira(logradouro) {
  return buscarEnderecoViaCep('SP', 'Guaíra', logradouro);
}

/**
 * Formata CEP para o padrão 00000-000
 * @param {string} cep - CEP com ou sem formatação
 * @returns {string} CEP formatado
 */
export function formatarCep(cep) {
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length !== 8) return cep;
  return `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`;
}
