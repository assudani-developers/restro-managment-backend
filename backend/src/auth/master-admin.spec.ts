describe('Master Piyush Access Check', () => {
  it('identifies Master Piyush access correctly', () => {
    const isMaster = (name: string, email?: string) => {
      return (
        name.toLowerCase() === 'piyushassudani' ||
        Boolean(email?.toLowerCase().includes('piyushassudani'))
      );
    };

    expect(isMaster('Piyushassudani')).toBe(true);
    expect(isMaster('piyushassudani', 'piyushassudani96@gmail.com')).toBe(true);
    expect(isMaster('staff_user', 'staff@restaurant.com')).toBe(false);
  });
});
