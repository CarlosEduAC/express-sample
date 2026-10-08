# Atividades

## Exercício 1: Autocadastro vs. Promoção de Admin

Por padrão, qualquer pessoa pode se cadastrar como Treinador (POST /api/v1/users), devendo sempre receber a Role USER. Crie um endpoint protegido PATCH /api/v1/users/:id/role exclusivo para contas ADMIN para permitir promover um Treinador a Administrador.

O que deve ser feito:

1. No CreateUserUseCase, garanta que o campo role receba fixo o valor USER, ignorando qualquer tentativa do cliente de enviar role: "ADMIN" no corpo da requisição.

2.Crie o UpdateUserRoleUseCase exigindo o ID do usuário alvo e o novo papel.

3. Proteja a rota PATCH /api/v1/users/:id/role com os middlewares ensureAuthenticated e ensureRole(['ADMIN']).

## Exercício 2: Proteção da Captura de Pokémons

Um Treinador comum com perfil USER só pode desassociar/soltar um Pokémon se esse Pokémon pertencer a ele próprio. Um usuário ADMIN pode soltar qualquer Pokémon do sistema.

O que deve ser feito:

1. No ReleasePokemonUseCase, receba o currentUserId e o currentUserRole extraídos do req.user.

2. Se o usuário tiver role USER, consulte o Pokémon no repositório e verifique se pokemon.trainerId === currentUserId.

3. Se não pertencer a ele, lance um AppError('Você não tem permissão para alterar Pokémons de outro treinador', 403)
