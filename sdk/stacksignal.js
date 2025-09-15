function getOrCreateSessionId() {
    let id = sessionStorage.getItem('STACKSIGNAL_SESSION_ID');
    if (!id) {
        id = 'ss-' + Math.random().toString(36).slice(2) + Date.now();
        sessionStorage.setItem('STACKSIGNAL_SESSION_ID', id);
    }
    return id;
}
const STACKSIGNAL_SESSION_ID = getOrCreateSessionId();

(function () {
    if (window.__STACKSIGNAL_WIDGET_LOADED__) return;
    window.__STACKSIGNAL_WIDGET_LOADED__ = true;

    window.StackSignalWidget = window.StackSignalWidget || {
        init(config) {
            window.StackSignalWidgetConfig = config;
        }
    };

    // iframe.onload = function() {
    //     iframe.contentWindow.postMessage({
    //         type: 'STACKSIGNAL_CONFIG',
    //         clientId: window.StackSignalWidgetConfig?.clientId,
    //         apiBase: window.StackSignalWidgetConfig?.apiBase
    //     }, '*');
    // };

    // window.StackSignalWidget.init({
    //     clientId: "your-client-id",
    //     apiBase: "https://api.example.com"
    // });

    let capturedLogs = [];

    function serializeData(data) {
        try {
            return JSON.parse(JSON.stringify(data, function(key, value) {
                if (typeof value === 'function') {
                    return '[Function: ' + (value.name || 'anonymous') + ']';
                }

                if (typeof value === 'object' && value !== null) {
                    if (value instanceof Error) {
                        return {
                            name: value.name,
                            message: value.message,
                            stack: value.stack
                        };
                    }
                }
                return value;
            }));
        } catch (error) {
            console.warn('StackSignal: Could not serialize data', error);
            return { error: 'Serialization failed', original: String(data) };
        }
    }

    function captureLog(type, args, source) {
        const serializedArgs = args.map(a => serializeData(a));
        const stack = new Error().stack.split("\n").slice(2).join("\n");
        capturedLogs.push({ type, source, args: serializedArgs, stack, timestamp: Date.now() });
    }

    // Patch console methods
    ['log', 'error', 'warn', 'info'].forEach(type => {
        const orig = console[type];
        console[type] = function (...args) {
            captureLog(type, args, "consoleLogs"); 
            orig.apply(console, args);
        };
    });

     // Global errors
    window.onerror = function (message, source, lineno, colno, error) {
        capturedLogs.push({
            type: 'uncaught-error',
            source: 'global-error',
            message: String(message),
            source,
            lineno,
            colno,
            error: error ? { name: error.name, message: error.message, stack: error.stack } : null,
            timestamp: Date.now()
        });
    };

    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        try {
            const res = await originalFetch.apply(this, args);
    
            if(!res.ok) {
                captureLog('fetch-error', [
                    {
                        url: args[0],
                        status: res.status,
                        statusText: res. statusText
                    }
                ],
                'network'
            )
            }
    
            return res;
        } catch (error) {
            captureLog('fetch-error', [
                {
                    url: args[0],
                    error: serializeData(error)
                }
            ],
            network
        )
        }
    }

    // Patch XHR
    const OrigXHR = window.XMLHttpRequest;
    function PatchedXHR() {
        const xhr = new OrigXHR();

        xhr.addEventListener('error', function () {
            captureLog('xhr-error', [{ url: xhr.responseURL, status: xhr.status }], 'network',);
        });

        xhr.addEventListener('timeout', function () {
            captureLog('xhr-timeout'[{ url: xhr.responseURL, timeout: true }], 'network',);
        });

        xhr.addEventListener('load', function () {
            if (xhr.status >= 400) {
                captureLog('xhr-error', [{ url: xhr.responseURL, status: xhr.status }], 'network',);
            }
        });

        return xhr;
    }
    window.XMLHttpRequest = PatchedXHR;


    let iframe = document.createElement('iframe');
    // iframe.src = (window.StackSignalWidgetConfig?.apiBase) || 'http://localhost:3000';
    iframe.src = 'http://localhost:3000'; // Add cache busting
    // iframe.onload = function () {
    //     iframe.contentWindow.postMessage({
    //         type: 'STACKSIGNAL_CONFIG',
    //         clientId: window.StackSignalWidgetConfig?.clientId,
    //         apiBase: window.StackSignalWidgetConfig?.apiBase,
    //     }, '*');
    // };
    iframe.style.position = 'fixed';
    iframe.style.bottom = '70px';
    iframe.style.right = '20px';
    iframe.style.width = '400px';
    iframe.style.height = '500px';
    iframe.style.border = '1px solid #ccc';
    iframe.style.zIndex = '99998';
    iframe.style.display = 'none';
    iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin');

    let button = document.createElement('button');
    button.innerText = 'Feedback';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '99999';
    button.style.padding = '10px 16px';
    button.style.backgroundColor = '#4f46e5';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    button.style.fontSize = '14px';
    button.style.fontWeight = '500';
    button.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.3)';
    button.style.transition = 'all 0.2s ease';

    button.addEventListener('mouseenter', function() {
        button.style.backgroundColor = '#4338ca';
        button.style.transform = 'translateY(-1px)';
        button.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.4)';
    });

    button.addEventListener('mouseleave', function() {
        button.style.backgroundColor = '#4f46e5';
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.3)';
    });

    function addElementsToDOM() {
        if (document.body) {
            document.body.appendChild(iframe);
            document.body.appendChild(button);
        } else {
            setTimeout(addElementsToDOM, 10);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addElementsToDOM);
    } else {
        addElementsToDOM();
    }

    button.addEventListener('click', function () {
    if (iframe.style.display === 'none') {
        iframe.style.display = 'block';

        console.log(serializeData(capturedLogs));
        console.log(window.StackSignalWidgetConfig?.clientId);
        iframe.contentWindow.postMessage(
        {
            type: 'STACKSIGNAL_LOGS',
            payload: serializeData(capturedLogs),
            clientId: window.StackSignalWidgetConfig?.clientId,
            sessionId: STACKSIGNAL_SESSION_ID
        },
        '*'
        );

        capturedLogs = []; // reset after sending
    } else {
        iframe.style.display = 'none';
    }
    });
})();
