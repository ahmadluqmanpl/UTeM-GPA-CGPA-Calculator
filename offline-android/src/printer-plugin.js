var capacitorPrinter = (function (exports, core) {
    'use strict';

    const Printer = core.registerPlugin('Printer', {
        web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.PrinterWeb()),
    });

    const PDF_PRINT_DELAY_MS = 500;
    const HTML_PRINT_DELAY_MS = 100;
    const CLEANUP_FALLBACK_MS = 60000;
    class PrinterWeb extends core.WebPlugin {
        async printBase64(options) {
            const { data, mimeType, name } = options;
            const byteCharacters = atob(data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });
            const url = URL.createObjectURL(blob);
            try {
                await this.printFromUrl(url, name, mimeType);
            }
            finally {
                URL.revokeObjectURL(url);
            }
        }
        async printFile(options) {
            const { path, name, mimeType } = options;
            await this.printFromUrl(path, name, mimeType);
        }
        async printHtml(options) {
            const { html, name } = options;
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            try {
                await this.printFromUrl(url, name, 'text/html');
            }
            finally {
                URL.revokeObjectURL(url);
            }
        }
        async printPdf(options) {
            const { path, name } = options;
            await this.printFromUrl(path, name, 'application/pdf');
        }
        async printIframe(options) {
            const { selector, name } = options;
            const iframe = document.querySelector(selector);
            if (!(iframe instanceof HTMLIFrameElement) || !iframe.contentWindow) {
                throw new Error(`iframe not found: ${selector}`);
            }
            const originalTitle = document.title;
            if (name) {
                document.title = name;
            }
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            document.title = originalTitle;
        }
        async printWebView(options) {
            const originalTitle = document.title;
            if (options === null || options === void 0 ? void 0 : options.name) {
                document.title = options.name;
            }
            window.print();
            document.title = originalTitle;
        }
        async getPluginVersion() {
            return { version: '7.0.0' };
        }
        async printFromUrl(url, name, mimeType) {
            return new Promise((resolve, reject) => {
                const iframe = document.createElement('iframe');
                iframe.style.position = 'fixed';
                iframe.style.right = '0';
                iframe.style.bottom = '0';
                iframe.style.width = '0';
                iframe.style.height = '0';
                iframe.style.border = 'none';
                let cleanedUp = false;
                const cleanup = () => {
                    if (cleanedUp) {
                        return;
                    }
                    cleanedUp = true;
                    if (iframe.parentNode) {
                        document.body.removeChild(iframe);
                    }
                    resolve();
                };
                const printDelayMs = (mimeType === null || mimeType === void 0 ? void 0 : mimeType.toLowerCase()) === 'application/pdf' ? PDF_PRINT_DELAY_MS : HTML_PRINT_DELAY_MS;
                iframe.onload = () => {
                    window.setTimeout(() => {
                        try {
                            const iframeWindow = iframe.contentWindow;
                            if (!iframeWindow) {
                                throw new Error('Cannot access iframe window');
                            }
                            if (name && iframe.contentDocument) {
                                iframe.contentDocument.title = name;
                            }
                            iframeWindow.addEventListener('afterprint', () => cleanup(), { once: true });
                            iframeWindow.focus();
                            iframeWindow.print();
                            window.setTimeout(() => cleanup(), CLEANUP_FALLBACK_MS);
                        }
                        catch (error) {
                            cleanup();
                            reject(error);
                        }
                    }, printDelayMs);
                };
                iframe.onerror = () => {
                    if (iframe.parentNode) {
                        document.body.removeChild(iframe);
                    }
                    reject(new Error('Failed to load content for printing'));
                };
                document.body.appendChild(iframe);
                iframe.src = url;
            });
        }
    }

    var web = /*#__PURE__*/Object.freeze({
        __proto__: null,
        PrinterWeb: PrinterWeb
    });

    exports.Printer = Printer;

    return exports;

})({}, capacitorExports);
//# sourceMappingURL=plugin.js.map
