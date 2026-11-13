import { User } from '../../src/domain/User.js';

/**
 * Object Mother: fornece usuários fixos e pré-configurados.
 * Usuários são entidades simples e que variam pouco entre os testes,
 * por isso um conjunto pequeno de "fábricas" nomeadas é suficiente.
 */
export class UserMother {
    static umUsuarioPadrao() {
        return new User(1, 'Usuário Padrão', 'padrao@email.com', 'PADRAO');
    }

    static umUsuarioPremium() {
        return new User(2, 'Usuário Premium', 'premium@email.com', 'PREMIUM');
    }
}
