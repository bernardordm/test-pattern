import { CheckoutService } from '../src/services/CheckoutService.js';
import { Item } from '../src/domain/Item.js';
import { UserMother } from './builders/UserMother.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';

const CARTAO = '4111 1111 1111 1111';

describe('CheckoutService', () => {
    describe('quando o pagamento falha', () => {
        it('deve retornar null e não salvar o pedido nem enviar e-mail', async () => {
            // Arrange
            const carrinho = CarrinhoBuilder.umCarrinho().build();
            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: false }) };
            const repositoryDummy = { salvar: jest.fn() };
            const emailDummy = { enviarEmail: jest.fn() };
            const checkoutService = new CheckoutService(gatewayStub, repositoryDummy, emailDummy);

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, CARTAO);

            // Assert (verificação de estado)
            expect(pedido).toBeNull();
            expect(repositoryDummy.salvar).not.toHaveBeenCalled();
            expect(emailDummy.enviarEmail).not.toHaveBeenCalled();
        });
    });

    describe('quando um cliente Padrão finaliza a compra', () => {
        it('deve retornar o pedido salvo com o total sem desconto', async () => {
            // Arrange
            const carrinho = CarrinhoBuilder.umCarrinho()
                .comUser(UserMother.umUsuarioPadrao())
                .comItens([new Item('Livro', 50), new Item('Caneta', 30)])
                .build();
            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
            const repositoryStub = {
                salvar: jest.fn().mockImplementation(async (pedido) => ({ ...pedido, id: 42 })),
            };
            const emailDummy = { enviarEmail: jest.fn().mockResolvedValue(undefined) };
            const checkoutService = new CheckoutService(gatewayStub, repositoryStub, emailDummy);

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, CARTAO);

            // Assert (verificação de estado)
            expect(pedido.id).toBe(42);
            expect(pedido.totalFinal).toBe(80);
            expect(pedido.status).toBe('PROCESSADO');
        });
    });

    describe('quando um cliente Premium finaliza a compra', () => {
        it('deve cobrar com 10% de desconto e enviar e-mail de confirmação', async () => {
            // Arrange
            const usuarioPremium = UserMother.umUsuarioPremium();
            const carrinho = CarrinhoBuilder.umCarrinho()
                .comUser(usuarioPremium)
                .comItens([new Item('Fone', 150), new Item('Capa', 50)])
                .build();
            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
            const pedidoSalvo = { id: 123, carrinho, totalFinal: 180, status: 'PROCESSADO' };
            const repositoryStub = { salvar: jest.fn().mockResolvedValue(pedidoSalvo) };
            const emailMock = { enviarEmail: jest.fn().mockResolvedValue(undefined) };
            const checkoutService = new CheckoutService(gatewayStub, repositoryStub, emailMock);

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, CARTAO);

            // Assert (verificação de comportamento)
            expect(gatewayStub.cobrar).toHaveBeenCalledWith(180, CARTAO);
            expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
            expect(emailMock.enviarEmail).toHaveBeenCalledWith(
                'premium@email.com',
                'Seu Pedido foi Aprovado!',
                'Pedido 123 no valor de R$180'
            );
            expect(pedido).toBe(pedidoSalvo);
        });
    });

    describe('quando o envio de e-mail falha', () => {
        it('não deve falhar o checkout e deve retornar o pedido salvo', async () => {
            // Arrange
            const carrinho = CarrinhoBuilder.umCarrinho().build();
            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
            const pedidoSalvo = { id: 7, carrinho, totalFinal: 100, status: 'PROCESSADO' };
            const repositoryStub = { salvar: jest.fn().mockResolvedValue(pedidoSalvo) };
            const emailStub = { enviarEmail: jest.fn().mockRejectedValue(new Error('SMTP fora do ar')) };
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const checkoutService = new CheckoutService(gatewayStub, repositoryStub, emailStub);

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, CARTAO);

            // Assert
            expect(pedido).toBe(pedidoSalvo);
            consoleSpy.mockRestore();
        });
    });
});
