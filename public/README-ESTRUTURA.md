# Estrutura do Projeto DG - Gestão de Contratos

## Arquivos Principais

### Páginas Web
- **`home.html`** - Página inicial do projeto (landing page)
- **`sobre.html`** - Página sobre o projeto e empresa
- **`index.html`** - Sistema de login/cadastro e dashboards (sistema principal)

### Estilos
- **`home-styles.css`** - Estilos para as páginas home e sobre
- **`styles.css`** - Estilos para o sistema de login/dashboards

### Scripts
- **`home-script.js`** - JavaScript para páginas home e sobre (menu mobile, carousel)
- **`script.js`** - JavaScript para o sistema principal (login, dashboards)

### Imagens
- **`img/`** - Pasta com todas as imagens do projeto

## Fluxo de Navegação

1. **Página Inicial** (`home.html`)
   - Apresenta o projeto DG
   - Botões "Começar agora" e "Login" redirecionam para `index.html`
   - Link "Saiba mais" vai para `sobre.html`

2. **Página Sobre** (`sobre.html`)
   - Informações sobre a empresa e produto
   - Botão "Comece agora" redireciona para `index.html`
   - Link "Home" volta para `home.html`

3. **Sistema Principal** (`index.html`)
   - Tela de login/cadastro
   - Dashboard do funcionário
   - Dashboard do cliente
   - Botão "Voltar ao início" retorna para `home.html`

## Funcionalidades

### Páginas Home e Sobre
- Design responsivo
- Menu mobile com toggle
- Carousel automático de imagens (página sobre)
- Navegação entre páginas
- Links para o sistema de login

### Sistema Principal
- Autenticação de usuários (funcionários e clientes)
- Dashboard completo para funcionários
- Dashboard simplificado para clientes
- Gestão de contratos
- Gestão de clientes
- Relatórios e auditoria
- Sistema de arquivos criptografados

## Como Usar

1. Acesse `home.html` para ver a página inicial
2. Navegue para `sobre.html` para mais informações
3. Clique em "Login" ou "Começar agora" para acessar o sistema
4. No sistema, use o botão "Voltar ao início" para retornar à página inicial

## Estrutura de Pastas

```
public/
├── home.html              # Página inicial
├── sobre.html             # Página sobre
├── index.html             # Sistema principal (login/dashboards)
├── home-styles.css        # Estilos para home/sobre
├── styles.css             # Estilos para sistema principal
├── home-script.js         # JavaScript para home/sobre
├── script.js              # JavaScript para sistema principal
├── img/                   # Imagens do projeto
│   ├── cloud.png
│   ├── img 1.jpg
│   ├── img 2.jpg
│   ├── img 3.jpg
│   ├── letra-d.png
│   └── logo dg.jpeg
└── README-ESTRUTURA.md    # Este arquivo
```
