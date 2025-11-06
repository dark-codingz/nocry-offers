# Wordlists para FunilSpy

Este diretório contém as wordlists usadas pelo scanner FunilSpy.

## Arquivos

- **paths.txt**: Lista de paths/rotas para testar em URLs
- **subdomains.txt**: Lista de prefixos de subdomínios para testar

## Formato

Cada arquivo deve conter uma palavra por linha. Linhas vazias e linhas começando com `#` são ignoradas.

### Exemplo paths.txt:
```
admin
login
dashboard
api
test
# Comentário é ignorado
config
```

### Exemplo subdomains.txt:
```
www
mail
ftp
admin
api
test
```

## Personalização

Você pode editar estes arquivos diretamente para adicionar/remover entradas conforme necessário.

**Importante**: 
- Mantenha uma entrada por linha
- Use apenas caracteres ASCII (evite acentos ou caracteres especiais em subdomínios)
- Comentários começam com `#`

## Recomendações

### Para Paths:
- Use palavras comuns de administração (admin, login, dashboard)
- Inclua endpoints de API (api, v1, v2)
- Adicione diretórios comuns (files, upload, download)
- Mantenha em minúsculas

### Para Subdomínios:
- Use subdomínios comuns (www, mail, ftp)
- Inclua ambientes (test, dev, staging)
- Adicione serviços (api, cdn, static)
- Mantenha em minúsculas

## Segurança

⚠️ **Aviso**: Estas wordlists são para uso educacional apenas. Não use para escanear sistemas sem autorização explícita.


