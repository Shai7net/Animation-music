// WebGL Robustness Polyfill & Safeguards for Browser / Iframe / Virtualized environments
// Prevents "Uncaught TypeError: Cannot read properties of null (reading 'precision')"
// when WebGL implementations return null for gl.getShaderPrecisionFormat().

if (typeof window !== 'undefined') {
  const patchContextProto = (proto: any) => {
    if (!proto) return;
    const originalGetShaderPrecisionFormat = proto.getShaderPrecisionFormat;

    proto.getShaderPrecisionFormat = function (shaderType: number, precisionType: number) {
      if (typeof originalGetShaderPrecisionFormat === 'function') {
        try {
          const res = originalGetShaderPrecisionFormat.call(this, shaderType, precisionType);
          if (res && typeof res.precision === 'number') {
            return res;
          }
        } catch {
          // Ignore context errors and supply safe standard fallback
        }
      }

      // Safe WebGLShaderPrecisionFormat standard fallback
      return {
        rangeMin: 127,
        rangeMax: 127,
        precision: 23
      };
    };
  };

  try {
    if (typeof WebGLRenderingContext !== 'undefined' && WebGLRenderingContext.prototype) {
      patchContextProto(WebGLRenderingContext.prototype);
    }
    if (typeof WebGL2RenderingContext !== 'undefined' && WebGL2RenderingContext.prototype) {
      patchContextProto(WebGL2RenderingContext.prototype);
    }

    // Also wrap HTMLCanvasElement.prototype.getContext to ensure dynamically created contexts are patched
    if (typeof HTMLCanvasElement !== 'undefined' && HTMLCanvasElement.prototype.getContext) {
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        contextId: string,
        ...args: any[]
      ): any {
        const ctx = (origGetContext as any).apply(this, [contextId, ...args]);
        if (ctx && (contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl')) {
          if (!ctx.getShaderPrecisionFormat || typeof ctx.getShaderPrecisionFormat !== 'function') {
            ctx.getShaderPrecisionFormat = () => ({
              rangeMin: 127,
              rangeMax: 127,
              precision: 23
            });
          }
        }
        return ctx;
      } as any;
    }
  } catch (err) {
    console.warn('WebGL polyfill registration note:', err);
  }
}

export {};
