import React, { useState } from 'react'
import AddressSearch from './components/AddressSearch'
import CepSearch from './components/CepSearch'
import ChatBot from './components/Chatbot'
import { 
  MapPin, Search, Lightbulb, Star, X, Sparkles, 
  Navigation, TrendingUp, Heart, MapPinned, 
  Compass, Locate, Map, Target, ChevronDown, FileText, Home
} from 'lucide-react'
import { useFavorites } from './hooks/useFavorites'

export default function App() {
  const { favorites, removeFavorite, refreshFavorites } = useFavorites()
  const [activeTab, setActiveTab] = useState('search')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Atualiza favoritos automaticamente quando a aba muda
  React.useEffect(() => {
    if (activeTab === 'favorites') {
      refreshFavorites()
    }
  }, [activeTab, refreshFavorites])

  const dicas = [
    {
      titulo: 'Centro da Cidade',
      descricao: 'Rua 8, Centro – encontre o centro da cidade!',
      icone: <Compass className="text-emerald-500" size={24} />,
      cor: 'from-emerald-500 to-teal-500'
    },
    {
      titulo: 'Prefeitura',
      descricao: 'Av. Gabriel Garcia Leal, 676 - Maracá – Ache a Prefeitura de Guaíra!',
      icone: <MapPinned className="text-teal-500" size={24} />,
      cor: 'from-teal-500 to-cyan-500'
    },
    {
      titulo: 'Busca Ampliada',
      descricao: 'Agora com ViaCEP! Busque CEPs de Guaíra e todo o Brasil!',
      icone: <Sparkles className="text-blue-500" size={24} />,
      cor: 'from-blue-500 to-cyan-500'
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 relative font-sans overflow-x-hidden">
      {/* Elemento de fundo sutil */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-20 -right-20 w-80 h-80 bg-gradient-to-br from-emerald-200/30 to-teal-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-br from-cyan-200/30 to-teal-200/30 rounded-full blur-3xl"></div>
      </div>

      {/* HEADER SIMPLIFICADO */}
      <header className="relative z-50 w-full bg-white/80 backdrop-blur-md shadow-md border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-2.5 rounded-xl">
                <MapPin className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Busca CEP
                </h1>
                <p className="text-xs text-emerald-600/70">Guaíra/SP</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-2">
              <div className="relative dropdown-container">
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
                >
                  <Sparkles size={16} />
                  <span>Explore</span>
                  <ChevronDown size={16} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <>
                    {/* Overlay invisível para fechar ao clicar fora */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setDropdownOpen(false)}
                    ></div>
                    
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-emerald-100 overflow-hidden z-50">
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setDropdownOpen(false)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Home size={16} className="text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-emerald-700">Busca CEP</div>
                            <div className="text-xs text-emerald-600/70">Busca de endereços</div>
                          </div>
                        </button>
                        
                        <div className="h-px bg-emerald-100 my-1 mx-3"></div>
                        
                        <a
                          href="https://cria-curriculo.vercel.app"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setDropdownOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors"
                        >
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText size={16} className="text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-blue-700">Currículo</div>
                            <div className="text-xs text-blue-600/70">Crie seu currículo</div>
                          </div>
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 pt-8">
        {/* SEÇÃO HERO COM TABS */}
        <div className="max-w-6xl w-full mb-8">
          {/* Tabs de navegação */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-white rounded-xl p-1 border border-emerald-200 shadow-md">
              <button
                onClick={() => setActiveTab('search')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                  activeTab === 'search'
                    ? 'bg-emerald-500 text-white'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <Search size={16} />
                Buscar
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                  activeTab === 'favorites'
                    ? 'bg-emerald-500 text-white'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <Heart size={16} />
                Favoritos ({favorites.length})
              </button>
              <button
                onClick={() => setActiveTab('tips')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                  activeTab === 'tips'
                    ? 'bg-emerald-500 text-white'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <Lightbulb size={16} />
                Dicas
              </button>
            </div>
          </div>

          {/* Conteúdo das tabs */}
          {activeTab === 'search' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CARD 1 - Busca por Rua */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl">
                    <Map className="text-white" size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-emerald-700">
                      Buscar por Endereço
                    </h2>
                    <p className="text-xs text-emerald-600/70">Rua, avenida ou logradouro</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-5">
                  Digite o nome da rua ou avenida. O bairro é opcional.
                </p>
                <AddressSearch />
              </div>

              {/* CARD 2 - Busca por CEP */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-teal-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl">
                    <Target className="text-white" size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-teal-700">
                      Buscar por CEP
                    </h2>
                    <p className="text-xs text-teal-600/70">Código postal de 8 dígitos</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-5">
                  Informe o CEP com 8 dígitos para encontrar o endereço.
                </p>
                <CepSearch />
              </div>
            </div>
          )}

          {/* ENDEREÇOS FAVORITOS TAB */}
          {activeTab === 'favorites' && (
            <div>
              {favorites.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-4">
                    <Heart className="text-emerald-500" size={36} />
                  </div>
                  <h3 className="text-xl font-bold text-emerald-700 mb-2">Nenhum favorito ainda</h3>
                  <p className="text-slate-600 max-w-md mx-auto">
                    Adicione endereços aos favoritos clicando no coração durante suas buscas!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {favorites.map(fav => (
                    <div
                      key={fav.key}
                      className="bg-white rounded-xl shadow-md p-5 border border-emerald-100 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Star className="text-amber-500 fill-amber-500" size={18} />
                          <span className="text-xs font-semibold text-amber-600">
                            Favorito
                          </span>
                        </div>
                        <button
                          onClick={() => removeFavorite(fav.key)}
                          className="p-1 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="text-red-400 hover:text-red-600" size={16} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-emerald-800 line-clamp-2">{fav.logradouro}</h4>
                        <p className="text-xs text-slate-600 flex items-center gap-1.5">
                          <MapPin size={12} className="text-teal-500" />
                          {fav.bairro}
                        </p>
                        <p className="text-xs font-mono font-semibold text-teal-700 bg-teal-50 px-2.5 py-1.5 rounded-lg inline-block">
                          {fav.key}
                        </p>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('CEP ' + fav.key + ', ' + fav.logradouro + ', ' + fav.bairro + ', Guaira, SP, Brasil')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <Locate size={14} />
                        Ver no Mapa
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DICAS TAB */}
          {activeTab === 'tips' && (
            <div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-emerald-700 mb-2">
                  Dicas Úteis
                </h3>
                <p className="text-slate-600">Lugares importantes em Guaíra</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {dicas.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl shadow-md p-5 border border-emerald-100 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2.5 bg-gradient-to-br ${item.cor} rounded-lg`}>
                        {React.cloneElement(item.icone, { size: 20, className: 'text-white' })}
                      </div>
                      <h4 className="text-base font-bold text-emerald-800">{item.titulo}</h4>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      {item.descricao}
                    </p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.descricao + ', Guaira, SP, Brasil')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-center gap-2 w-full bg-gradient-to-r ${item.cor} text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity`}
                    >
                      <Navigation size={14} />
                      Ver no Mapa
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* CHATBOT */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <ChatBot />
      </div>

      {/* RODAPÉ */}
      <footer className="relative z-10 bg-white/70 backdrop-blur-sm border-t border-emerald-100 py-5 text-center mt-8">
        <p className="text-sm text-emerald-700">
          Feito com <Heart className="inline w-4 h-4 text-red-500 fill-red-500" /> por{' '}
          <span className="font-bold text-emerald-600">
            Talisson Mendes
          </span>
        </p>
        <p className="text-xs text-emerald-600/70 mt-1">Busca de CEP · Guaíra/SP</p>
      </footer>
    </div>
  )
}
