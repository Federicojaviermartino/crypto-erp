import { captureException } from '../../exports.js';
import { SPAN_STATUS_ERROR } from '../spanstatus.js';
import { ANTHROPIC_AI_INSTRUMENTED_METHODS } from './constants.js';

/**
 * Check if a method path should be instrumented
 */
function shouldInstrument(methodPath) {
  return ANTHROPIC_AI_INSTRUMENTED_METHODS.includes(methodPath );
}

/**
 * Capture error information from the response
 * @see https://docs.anthropic.com/en/api/errors#error-shapes
 */
function handleResponseError(span, response) {
  if (response.error) {
    span.setStatus({ code: SPAN_STATUS_ERROR, message: response.error.type || 'internal_error' });

    captureException(response.error, {
      mechanism: {
        handled: false,
        type: 'auto.ai.anthropic.anthropic_error',
      },
    });
  }
}

/**
 * Include the system prompt in the messages list, if available
 */
function messagesFromParams(params) {
  const { system, messages } = params;

  const systemMessages = typeof system === 'string' ? [{ role: 'system', content: params.system }] : [];

  const userMessages = Array.isArray(messages) ? messages : messages != null ? [messages] : [];

  return [...systemMessages, ...userMessages];
}

export { handleResponseError, messagesFromParams, shouldInstrument };
//# sourceMappingURL=utils.js.map
