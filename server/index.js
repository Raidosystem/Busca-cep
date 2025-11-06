require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 🔍 Normalização de strings para busca flexível
function normalize(s) {
  return s?.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

// Buscar CEP por logradouro e bairro
app.get('/api/lookup', async (req, res) => {
  const { logradouro, bairro } = req.query;

  if (!logradouro && !bairro)
    return res.status(400).json({ error: 'Informe logradouro e/ou bairro' });

  let query = supabase.from('ceps').select('*');

  // Busca case-insensitive usando ilike
  if (logradouro) {
    query = query.ilike('logradouro', `%${logradouro}%`);
  }
  
  // Bairro é opcional - só filtra se fornecido
  if (bairro) {
    query = query.ilike('bairro', `%${bairro}%`);
  }

  const { data, error } = await query.limit(100);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ count: data.length, results: data });
});

// Buscar endereço por CEP
app.get('/api/cep/:cep', async (req, res) => {
  const cep = req.params.cep?.replace(/\D/g, '');
  if (!cep) return res.status(400).json({ error: 'CEP inválido' });

  const { data, error } = await supabase
    .from('ceps')
    .select('*')
    .eq('cep', cep)
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ count: data.length, results: data });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
