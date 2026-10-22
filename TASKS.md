# Atividades

## Exercício 1: Implemente a lógica passada em aula no PokeApi

## Exercício 2: Implemente um handler que leia o Refresh Token

1. Endpoint /auth/refresh-token

Implemente um handler que leia o Refresh Token a partir de um cookie seguro HttpOnly (req.cookies.refreshToken) em vez do corpo da requisição (req.body), ajustando o retorno para gravar o novo Refresh Token também em um novo cookie HttpOnly.
