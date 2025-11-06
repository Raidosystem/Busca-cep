# 🌐 Integração ViaCEP

## 📋 Visão Geral

O sistema agora possui **busca dupla inteligente**:

1. **Base Local (Supabase)** - Dados específicos de Guaíra/SP
2. **ViaCEP** - API pública com CEPs de todo o Brasil

## 🚀 Como Funciona

### Busca por CEP (`CepSearch.jsx`)

```
1. Tenta buscar no Supabase (base local)
   ↓
2. Se não encontrar, busca na ViaCEP
   ↓
3. Retorna o resultado de qualquer uma das fontes
```

**Exemplo:**
- CEP de Guaíra → Encontra no Supabase
- CEP de São Paulo → Encontra na ViaCEP
- CEP de qualquer cidade → Funciona!

### Busca por Endereço (`AddressSearch.jsx`)

```
1. Tenta buscar no Supabase (base local)
   ↓
2. Se não encontrar, busca na ViaCEP (Guaíra/SP)
   ↓
3. Retorna resultados combinados
```

**Exemplo:**
- "Rua 8" em Guaíra → Busca nas duas fontes
- Resultados são mesclados sem duplicatas

## 🎯 Recursos

### ✅ Funções Disponíveis

**`buscarCepViaCep(cep)`**
- Busca um CEP específico
- Retorna dados normalizados
- Exemplo: `buscarCepViaCep('14900000')`

**`buscarEnderecoViaCep(uf, cidade, logradouro)`**
- Busca endereços por cidade
- Retorna array de resultados
- Exemplo: `buscarEnderecoViaCep('SP', 'Guaíra', 'Rua 8')`

**`buscarEnderecoGuaira(logradouro)`**
- Atalho para buscar em Guaíra/SP
- Exemplo: `buscarEnderecoGuaira('Avenida Brasil')`

**`formatarCep(cep)`**
- Formata CEP para padrão 00000-000
- Exemplo: `formatarCep('14900000')` → `'14900-000'`

## 🎨 Indicadores Visuais

### Badge "ViaCEP"
Resultados da API ViaCEP exibem um badge azul:

```jsx
{r.origem === 'viacep' && (
  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
    ViaCEP
  </span>
)}
```

### Informações Adicionais
- Mostra cidade/UF quando diferente de Guaíra
- Exemplo: `Centro • São Paulo/SP`

## 🔄 Fluxo de Dados

```
┌─────────────────────┐
│   Usuário busca     │
│    "14900-000"      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Tenta Supabase     │
│  (Base Local)       │
└──────────┬──────────┘
           │
           ├─► Encontrou? → Retorna
           │
           ├─► Não encontrou?
           │
           ▼
┌─────────────────────┐
│   Tenta ViaCEP      │
│  (API Nacional)     │
└──────────┬──────────┘
           │
           └─► Retorna resultado
```

## 📦 Estrutura de Dados

### Formato Normalizado

```javascript
{
  cep: "14900000",
  logradouro: "Rua Exemplo",
  bairro: "Centro",
  localidade: "Guaíra",
  uf: "SP",
  complemento: "",
  origem: "viacep" // ou "local"
}
```

## 🛠️ Tratamento de Erros

### Estratégia de Fallback
1. Se Supabase falhar → tenta ViaCEP
2. Se ViaCEP falhar → mostra erro amigável
3. Se ambos falharem → mensagem de erro de conexão

### Mensagens de Erro
- ❌ "Erro de conexão. Verifique sua internet"
- ❌ "CEP não encontrado. Verifique se o CEP está correto"
- ❌ "Nenhum endereço encontrado. Tente outra busca"

## 🎯 Vantagens da Integração

### ✅ Cobertura Total
- ✨ Base local (Guaíra/SP) - rápida e completa
- 🌐 ViaCEP (todo Brasil) - quando local não tem

### ✅ Resiliência
- 💪 Se uma fonte falhar, usa a outra
- 🔄 Fallback automático

### ✅ Performance
- ⚡ Tenta local primeiro (mais rápido)
- 🌐 ViaCEP apenas quando necessário

### ✅ UX Melhorada
- 🎨 Badge visual mostra a origem
- 📍 Informações completas de localidade
- ℹ️ Mensagens claras de erro

## 📝 Exemplos de Uso

### Buscar CEP de Guaíra
```javascript
// Encontra no Supabase local
await buscarCep("14900-000")
// Resultado: origem: "local"
```

### Buscar CEP de São Paulo
```javascript
// Não encontra local, busca ViaCEP
await buscarCep("01310-100")
// Resultado: origem: "viacep"
```

### Buscar Endereço
```javascript
// Busca nas duas fontes
await buscarEndereco("Rua 8")
// Resultados combinados
```

## 🔮 Possíveis Melhorias Futuras

- [ ] Cache de resultados ViaCEP
- [ ] Busca em outras cidades (seletor de cidade)
- [ ] Sincronização automática (ViaCEP → Supabase)
- [ ] Estatísticas de uso (local vs ViaCEP)
- [ ] Busca por bairro na ViaCEP

## 📚 Referências

- [ViaCEP - Documentação](https://viacep.com.br/)
- [Supabase - Documentação](https://supabase.com/docs)

---

**🎉 Agora seu app busca CEPs de qualquer lugar do Brasil!**
