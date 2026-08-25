# Typescript

## As 3 Dores do JavaScript em Projetos Grandes

A. Erros que só estouram na mão do cliente (Runtime Error)

```javascript
// JavaScript Puro:
const user = { name: "Carlos", age: 28 };
console.log(user.email.toLowerCase());
// 💥 TypeError: Cannot read properties of undefined (reading 'toLowerCase')
// O código rodou, chegou no cliente e CAPOTOU.
```

B. Operações Bizarras Sem Alerta

```javascript
// JavaScript Puro:
const total = "100" + 5; // Resultado: "1005" (String)
const desconto = "100" - 5; // Resultado: 95 (Number)
// O JS tenta "ajudar" convertendo tipos em segundo plano (Coerção Implícita), gerando bugs bizarros.
```

C. Falta de Autocompletar e Refatoração Cega

Em um projeto JS gigante, você altera o nome de um campo no banco de dados e precisa torcer para ter achado todas as referências no código na base do Ctrl + F.

Com TypeScript, você teria autocompletar e verificações de tipo em tempo de compilação, reduzindo drasticamente esses problemas.

## O que o TypeScript Entrega de Verdade?

1. **Detecção de Erros em Tempo de Compilação**
   - Erros que só apareceriam no runtime em JavaScript são capturados antes mesmo de rodar o código.

2. **Autocompletar e Refatoração Segura**
   - IDEs conseguem fornecer sugestões precisas e refatorações seguras graças à tipagem estática.

3. **Documentação Implícita**
   - Tipos funcionam como documentação viva, facilitando a compreensão do código por novos desenvolvedores.

4. **Integração com Bibliotecas e Frameworks**
   - TypeScript melhora a experiência de uso de bibliotecas populares, fornecendo tipos e prevenindo erros comuns.

5. **O Ciclo do TypeScript**
    - O TS não roda no navegador nem no Node.js diretamente. Ele passa pelo tsc (transpilador), limpa todos os tipos e gera JavaScript limpo para produção.

```text
[ Seu Código TypeScript (.ts) ]
               │
               ▼  (O TS checa se há erros de digitação e tipo)
[ Transpilador TypeScript ]
               │
               ▼  (Remove as interfaces e tipos)
[ Código JavaScript Limpo (.js) ] ──> Rodando no Node.js / Navegador
```
