"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SentryExceptionFilter", {
    enumerable: true,
    get: function() {
        return SentryExceptionFilter;
    }
});
const _common = require("@nestjs/common");
const _node = /*#__PURE__*/ _interop_require_wildcard(require("@sentry/node"));
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let SentryExceptionFilter = class SentryExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        // Determine status code
        const status = exception instanceof _common.HttpException ? exception.getStatus() : _common.HttpStatus.INTERNAL_SERVER_ERROR;
        // Determine error message
        const message = exception instanceof _common.HttpException ? exception.message : 'Internal server error';
        // Capture in Sentry (only for 500 errors or non-HTTP exceptions)
        if (status >= 500 || !(exception instanceof _common.HttpException)) {
            _node.captureException(exception, {
                user: request.user ? {
                    id: request.user.id,
                    email: request.user.email
                } : undefined,
                tags: {
                    companyId: request.companyId,
                    endpoint: request.url,
                    method: request.method
                },
                extra: {
                    body: request.body,
                    params: request.params,
                    query: request.query
                }
            });
        }
        // Send response to client
        const errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method
        };
        if (exception instanceof _common.HttpException) {
            const exceptionResponse = exception.getResponse();
            if (typeof exceptionResponse === 'object') {
                Object.assign(errorResponse, exceptionResponse);
            } else {
                errorResponse.message = exceptionResponse;
            }
        } else {
            errorResponse.message = message;
        }
        response.status(status).json(errorResponse);
    }
};
SentryExceptionFilter = _ts_decorate([
    (0, _common.Catch)()
], SentryExceptionFilter);

//# sourceMappingURL=sentry-exception.filter.js.map