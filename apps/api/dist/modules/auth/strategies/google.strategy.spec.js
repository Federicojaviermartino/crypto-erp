"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _testing = require("@nestjs/testing");
const _googlestrategy = require("./google.strategy");
const _authservice = require("../auth.service");
const _config = require("@nestjs/config");
const _common = require("@nestjs/common");
describe('GoogleStrategy', ()=>{
    let strategy;
    let authService;
    const mockConfigService = {
        get: jest.fn((key)=>{
            const config = {
                GOOGLE_CLIENT_ID: 'test-client-id',
                GOOGLE_CLIENT_SECRET: 'test-client-secret',
                GOOGLE_CALLBACK_URL: 'http://localhost:3000/auth/sso/google/callback'
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
                _googlestrategy.GoogleStrategy,
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
        strategy = module.get(_googlestrategy.GoogleStrategy);
        authService = module.get(_authservice.AuthService);
        jest.clearAllMocks();
    });
    it('should be defined', ()=>{
        expect(strategy).toBeDefined();
    });
    describe('validate', ()=>{
        it('should validate and auto-provision user from Google profile', async ()=>{
            const mockProfile = {
                id: 'google-123',
                emails: [
                    {
                        value: 'user@example.com',
                        verified: true
                    }
                ],
                name: {
                    givenName: 'John',
                    familyName: 'Doe'
                },
                photos: [
                    {
                        value: 'https://example.com/photo.jpg'
                    }
                ],
                _json: {
                    locale: 'en'
                }
            };
            const mockUser = {
                id: 'user-123',
                email: 'user@example.com',
                firstName: 'John',
                lastName: 'Doe'
            };
            mockAuthService.findOrCreateSSOUser.mockResolvedValue(mockUser);
            const done = jest.fn();
            await strategy.validate('access-token', 'refresh-token', mockProfile, done);
            expect(authService.findOrCreateSSOUser).toHaveBeenCalledWith({
                ssoProvider: 'google',
                ssoId: 'google-123',
                email: 'user@example.com',
                firstName: 'John',
                lastName: 'Doe',
                avatarUrl: 'https://example.com/photo.jpg',
                ssoMetadata: {
                    accessToken: 'access-token',
                    refreshToken: 'refresh-token',
                    locale: 'en'
                }
            });
            expect(done).toHaveBeenCalledWith(null, mockUser);
        });
        it('should throw error if no email in profile', async ()=>{
            const mockProfile = {
                id: 'google-123',
                emails: [],
                name: {
                    givenName: 'John',
                    familyName: 'Doe'
                }
            };
            const done = jest.fn();
            await strategy.validate('access-token', 'refresh-token', mockProfile, done);
            expect(done).toHaveBeenCalledWith(expect.any(_common.UnauthorizedException), false);
        });
        it('should handle service errors gracefully', async ()=>{
            const mockProfile = {
                id: 'google-123',
                emails: [
                    {
                        value: 'user@example.com'
                    }
                ],
                name: {
                    givenName: 'John',
                    familyName: 'Doe'
                }
            };
            const error = new Error('Database error');
            mockAuthService.findOrCreateSSOUser.mockRejectedValue(error);
            const done = jest.fn();
            await strategy.validate('access-token', 'refresh-token', mockProfile, done);
            expect(done).toHaveBeenCalledWith(error, false);
        });
    });
});

//# sourceMappingURL=google.strategy.spec.js.map