export const toNodeHandler = jest.fn().mockReturnValue(
  (_req: any, _res: any, next: any) => next(),
);
export const fromNodeHeaders = jest.fn().mockReturnValue({});
