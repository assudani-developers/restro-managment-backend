describe('Master Admin Revocation Check', () => {
  function isRevokedMasterAdmin(value?: string | null): boolean {
    if (!value) return false;
    const clean = value.toLowerCase().replace(/[\s\-_.]/g, '');
    return clean.includes('piyushassudani') || clean.includes('9413879444');
  }

  it('correctly blocks piyushassudani and phone 9413879444 in various formats', () => {
    expect(isRevokedMasterAdmin('piyushassudani')).toBe(true);
    expect(isRevokedMasterAdmin('Piyush Assudani')).toBe(true);
    expect(isRevokedMasterAdmin('piyushassudani96@gmail.com')).toBe(true);
    expect(isRevokedMasterAdmin('piyush.assudani')).toBe(true);
    expect(isRevokedMasterAdmin('piyush-assudani')).toBe(true);
    expect(isRevokedMasterAdmin('9413879444')).toBe(true);
    expect(isRevokedMasterAdmin('+91 9413879444')).toBe(true);
    expect(isRevokedMasterAdmin('94138-79444')).toBe(true);
  });

  it('allows valid users and new master admin', () => {
    expect(isRevokedMasterAdmin('masteradmin@restrocore.com')).toBe(false);
    expect(isRevokedMasterAdmin('masteradmin')).toBe(false);
    expect(isRevokedMasterAdmin('owner@demo.local')).toBe(false);
    expect(isRevokedMasterAdmin('admin@restaurant.com')).toBe(false);
    expect(isRevokedMasterAdmin(null)).toBe(false);
    expect(isRevokedMasterAdmin(undefined)).toBe(false);
  });
});
