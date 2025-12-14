"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _azureadstrategy = require("./azure-ad.strategy");
const _authservice = require("../auth.service");
const _config = require("@nestjs/config");
const _common = require("@nestjs/common");
describe('AzureADStrategy', ()=>{
    let strategy;
    let authService;
    const mockConfigService = {
        get: jest.fn((key)=>{
            const config = {
                AZURE_TENANT_ID: 'test-tenant-id',
                AZURE_CLIENT_ID: 'test-client-id'
            };
            return config[key];
        })
    };
    const mockAuthService = {
        findOrCreateSSOUser: jest.fn()
    };
    beforeEach(async ()=>{
        const module = await _testing.Test.createTestingModule({
            providers: [
                _azureadstrategy.AzureADStrategy,
                {
                    provide: _config.ConfigService,
                    useValue: mockConfigService
                },
                {
                    provide: _authservice.AuthService,
                    useValue: mockAuthService
                }
            ]
        }).compile();
        strategy = module.get(_azureadstrategy.AzureADStrategy);
        authService = module.get(_authservice.AuthService);
        jest.clearAllMocks();
    });
    it('should be defined', ()=>{
        expect(strategy).toBeDefined();
    });
    describe('validate', ()=>{
        it('should validate Azure AD token payload', async ()=>{
            const mockPayload = {
                oid: 'azure-object-id-123',
                email: 'user@company.com',
                preferred_username: 'user@company.com',
                name: 'John Doe',
                tid: 'tenant-id-123',
                upn: 'user@company.com',
                roles: [
                    'User'
                ]
            };
            const mockUser = {
                id: 'user-123',
                email: 'user@company.com',
                firstName: 'John',
                lastName: 'Doe'
            };
            mockAuthService.findOrCreateSSOUser.mockResolvedValue(mockUser);
            const result = await strategy.validate(mockPayload);
            expect(authService.findOrCreateSSOUser).toHaveBeenCalledWith({
                ssoProvider: 'azure',
                ssoId: 'azure-object-id-123',
                email: 'user@company.com',
                firstName: 'John',
                lastName: 'Doe',
                ssoMetadata: {
                    tenantId: 'tenant-id-123',
                    upn: 'user@company.com',
                    roles: [
                        'User'
                    ]
                }
            });
            expect(result).toEqual(mockUser);
        });
        it('should use preferred_username if email is not present', async ()=>{
            const mockPayload = {
                oid: 'azure-object-id-123',
                preferred_username: 'user@company.com',
                name: 'John Doe',
                tid: 'tenant-id-123'
            };
            const mockUser = {
                id: 'user-123'
            };
            mockAuthService.findOrCreateSSOUser.mockResolvedValue(mockUser);
            await strategy.validate(mockPayload);
            expect(authService.findOrCreateSSOUser).toHaveBeenCalledWith(expect.objectContaining({
                email: 'user@company.com'
            }));
        });
        it('should throw error if no email or preferred_username', async ()=>{
            const mockPayload = {
                oid: 'azure-object-id-123',
                name: 'John Doe'
            };
            await expect(strategy.validate(mockPayload)).rejects.toThrow(_common.UnauthorizedException);
        });
        it('should handle name parsing correctly', async ()=>{
            const mockPayload = {
                oid: 'azure-object-id-123',
                email: 'user@company.com',
                name: 'John Michael Doe'
            };
            const mockUser = {
                id: 'user-123'
            };
            mockAuthService.findOrCreateSSOUser.mockResolvedValue(mockUser);
            await strategy.validate(mockPayload);
            expect(authService.findOrCreateSSOUser).toHaveBeenCalledWith(expect.objectContaining({
                firstName: 'John',
                lastName: 'Michael Doe'
            }));
        });
    });
});

//# sourceMappingURL=azure-ad.strategy.spec.js.map