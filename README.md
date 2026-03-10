# 💰 Finanças Front

Frontend moderno para sistema de controle de finanças pessoais, construído com **React**, **TypeScript** e **Tailwind CSS v4**, usando o design system **Liquid Glass**.

## ✨ Tecnologias

- **React 19** + **TypeScript**
- **Vite 6** (build & dev server)
- **Tailwind CSS v4**
- **React Router DOM** (rotas protegidas)
- **Recharts** (gráficos)
- **Lucide React** (ícones)

## 🎨 Design System

- Fundo escuro (`#050a14`) com blobs animados
- Painéis glass com backdrop blur
- Tipografia **Montserrat** (headings) + **Open Sans** (body)
- Cor primária `#007bff`
- Animações suaves e micro-interações

## 📁 Estrutura

```
src/
├── components/       # Componentes reutilizáveis (Glass*)
├── hooks/            # useAuth
├── pages/            # Páginas da aplicação
├── services/         # API service layer
├── styles/           # CSS global + design system
└── types.ts          # Interfaces TypeScript
```

## 🚀 Getting Started

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com a URL do backend

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## ⚙️ Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_API_URL` | URL base da API | `http://localhost:8000/api` |

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
