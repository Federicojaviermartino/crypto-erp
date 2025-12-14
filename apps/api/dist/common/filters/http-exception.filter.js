"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "GlobalExceptionFilter", {
    enumerable: true,
    get: function() {
        return GlobalExceptionFilter;
    }
});
const _common = require("@nestjs/common");
const _client = require("@prisma/client");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let GlobalExceptionFilter = class GlobalExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const errorResponse = this.buildErrorResponse(exception, request.url);
        // Log error
        if (errorResponse.statusCode >= 500) {
            this.logger.error(`${request.method} ${request.url} - ${errorResponse.statusCode}`, exception instanceof Error ? exception.stack : String(exception));
        } else {
            this.logger.warn(`${request.method} ${request.url} - ${errorResponse.statusCode}: ${JSON.stringify(errorResponse.message)}`);
        }
        response.status(errorResponse.statusCode).json(errorResponse);
    }
    buildErrorResponse(exception, path) {
        const timestamp = new Date().toISOString();
        // HTTP exceptions
        if (exception instanceof _common.HttpException) {
            const status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            let message;
            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const resp = exceptionResponse;
                message = resp['message'] || exception.message;
            } else {
                message = String(exceptionResponse);
            }
            return {
                statusCode: status,
                message,
                error: _common.HttpStatus[status] || 'Error',
                timestamp,
                path
            };
        }
        // Prisma exceptions
        if (exception instanceof _client.Prisma.PrismaClientKnownRequestError) {
            return this.handlePrismaError(exception, path, timestamp);
        }
        if (exception instanceof _client.Prisma.PrismaClientValidationError) {
            return {
                statusCode: _common.HttpStatus.BAD_REQUEST,
                message: 'Invalid data provided',
                error: 'Bad Request',
                timestamp,
                path
            };
        }
        // Unknown errors
        return {
            statusCode: _common.HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
            error: 'Internal Server Error',
            timestamp,
            path
        };
    }
    handlePrismaError(exception, path, timestamp) {
        switch(exception.code){
            case 'P2002':
                return {
                    statusCode: _common.HttpStatus.CONFLICT,
                    message: `Duplicate entry for ${exception.meta?.['target']?.join(', ') || 'field'}`,
                    error: 'Conflict',
                    timestamp,
                    path
                };
            case 'P2025':
                return {
                    statusCode: _common.HttpStatus.NOT_FOUND,
                    message: 'Record not found',
                    error: 'Not Found',
                    timestamp,
                    path
                };
            case 'P2003':
                return {
                    statusCode: _common.HttpStatus.BAD_REQUEST,
                    message: 'Foreign key constraint failed',
                    error: 'Bad Request',
                    timestamp,
                    path
                };
            default:
                return {
                    statusCode: _common.HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Database error',
                    error: 'Internal Server Error',
                    timestamp,
                    path
                };
        }
    }
    constructor(){
        this.logger = new _common.Logger(GlobalExceptionFilter.name);
    }
};
GlobalExceptionFilter = _ts_decorate([
    (0, _common.Catch)()
], GlobalExceptionFilter);

//# sourceMappingURL=http-exception.filter.js.map