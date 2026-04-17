# TODO: Google OAuth Integration

## 1. Google Cloud Console (manual — fazer primeiro)
- [ ] Criar projeto no [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Ativar a API "Google Identity" / OAuth 2.0
- [ ] Criar credenciais OAuth (Client ID + Client Secret)
- [ ] Adicionar domínios autorizados (localhost para dev, domínio de prod)
- [ ] Configurar redirect URIs
- [ ] Copiar `Client ID` e `Client Secret` para o `.env`

## 2. Backend

- [ ] Adicionar `google-auth` ao `requirements.txt`
- [ ] Criar endpoint `POST /auth/google` em `backend/app/api/routes/auth.py`
  - Recebe o ID token do Google
  - Valida o token via Google API
  - Encontra utilizador existente por `auth_provider_id` ou cria novo
  - Devolve JWT igual ao login normal
- [ ] Adicionar variáveis ao `backend/.env`:
  ```
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  ```

## 3. Frontend

- [ ] Instalar `@react-oauth/google`
- [ ] Adicionar `NEXT_PUBLIC_GOOGLE_CLIENT_ID` ao `frontend/.env`
- [ ] Envolver o layout com `GoogleOAuthProvider` (em `layout.tsx` ou `_app.tsx`)
- [ ] Ligar o botão "Continue with Google" na página de login (`login/page.tsx`)
- [ ] Ligar o botão "Continue with Google" na página de registo (`register/page.tsx`)
- [ ] Adicionar método `googleLogin` ao `auth-context.tsx`
  - Recebe o ID token do Google
  - Chama `POST /auth/google` no backend
  - Armazena o JWT e redireciona

## 4. Testes
- [ ] Testar login com Google em dev (localhost)
- [ ] Testar registo com conta Google nova
- [ ] Testar login com conta Google já registada
- [ ] Verificar que utilizador criado via Google não tem campo de password exposto
