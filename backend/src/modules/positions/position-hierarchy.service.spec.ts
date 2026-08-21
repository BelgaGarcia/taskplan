import { BadRequestException } from '@nestjs/common';
import { PositionHierarchyService } from './position-hierarchy.service';

describe('PositionHierarchyService', () => {
  it('rejects self inheritance and cycles', () => {
    const service = new PositionHierarchyService({} as never);
    expect(() =>
      service.validateNoCycle([{ positionId: 'a', inheritedPositionId: 'a' }]),
    ).toThrow(BadRequestException);
    expect(() =>
      service.validateNoCycle([
        { positionId: 'a', inheritedPositionId: 'b' },
        { positionId: 'b', inheritedPositionId: 'c' },
        { positionId: 'c', inheritedPositionId: 'a' },
      ]),
    ).toThrow(BadRequestException);
  });

  it('resolves direct and transitive inherited positions', async () => {
    const service = new PositionHierarchyService({
      positionInheritance: {
        findMany: jest.fn().mockResolvedValue([
          { positionId: 'analyst', inheritedPositionId: 'intern' },
          { positionId: 'intern', inheritedPositionId: 'apprentice' },
        ]),
      },
    } as never);

    await expect(service.getInheritedPositionIds('analyst')).resolves.toEqual(
      expect.arrayContaining(['analyst', 'intern', 'apprentice']),
    );
  });
});
