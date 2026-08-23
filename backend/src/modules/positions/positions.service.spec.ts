import { PositionsService } from './positions.service';

describe('PositionsService', () => {
  const position = {
    id: '43d0fc72-24ca-4ca7-8335-59f1fcce8e27',
    name: 'Analista',
    description: 'Descrição anterior',
    active: true,
  };

  it.each([null, ''])(
    'clears the description when updating it with %p',
    async (description) => {
      const prisma = {
        position: {
          findUnique: jest.fn().mockResolvedValue(position),
          update: jest
            .fn()
            .mockResolvedValue({ ...position, description: null }),
        },
      };
      const service = new PositionsService(prisma as never);

      await expect(
        service.update(position.id, { description }),
      ).resolves.toEqual({ ...position, description: null });
      expect(prisma.position.update).toHaveBeenCalledWith({
        where: { id: position.id },
        data: { description: null },
      });
    },
  );

  it('trims a non-empty description before updating it', async () => {
    const prisma = {
      position: {
        findUnique: jest.fn().mockResolvedValue(position),
        update: jest.fn().mockResolvedValue({
          ...position,
          description: 'Nova descrição',
        }),
      },
    };
    const service = new PositionsService(prisma as never);

    await service.update(position.id, { description: '  Nova descrição  ' });

    expect(prisma.position.update).toHaveBeenCalledWith({
      where: { id: position.id },
      data: { description: 'Nova descrição' },
    });
  });
});
