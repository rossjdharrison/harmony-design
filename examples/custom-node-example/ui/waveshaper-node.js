/**
 * Waveshaper Node UI Component
 * 
 * Custom node for waveshaping distortion effect.
 * Demonstrates EventBus integration and parameter control.
 * 
 * @extends HTMLElement
 * 
 * Related documentation:
 * - docs/graph-extension-guide.md - Extension patterns
 * - docs/graph-model.md - Core graph concepts
 */
export class WaveshaperNode extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._nodeId = null;
        this._drive = 1.0;
        this._mix = 1.0;
        this._curveType = 'soft';
    }

    static get observedAttributes() {
        return ['node-id', 'drive', 'mix', 'curve-type'];
    }

    connectedCallback() {
        this._nodeId = this.getAttribute('node-id');
        this.render();
        this.setupEventListeners();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        
        switch (name) {
            case 'drive':
                this._drive = parseFloat(newValue);
                break;
            case 'mix':
                this._mix = parseFloat(newValue);
                break;
            case 'curve-type':
                this._curveType = newValue;
                break;
        }
        
        if (this.shadowRoot.innerHTML) {
            this.updateControls();
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background: var(--surface-color, #2a2a2a);
                    border: 1px solid var(--border-color, #444);
                    border-radius: 8px;
                    padding: 16px;
                    min-width: 200px;
                    font-family: var(--font-family, system-ui);
                    color: var(--text-color, #fff);
                }

                .node-header {
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 12px;
                    color: var(--primary-color, #4CAF50);
                }

                .parameter {
                    margin-bottom: 12px;
                }

                .parameter-label {
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                    margin-bottom: 4px;
                    opacity: 0.8;
                }

                input[type="range"] {
                    width: 100%;
                    height: 4px;
                    background: var(--track-color, #444);
                    border-radius: 2px;
                    outline: none;
                    -webkit-appearance: none;
                }

                input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 16px;
                    height: 16px;
                    background: var(--primary-color, #4CAF50);
                    border-radius: 50%;
                    cursor: pointer;
                }

                select {
                    width: 100%;
                    padding: 6px;
                    background: var(--input-bg, #1a1a1a);
                    color: var(--text-color, #fff);
                    border: 1px solid var(--border-color, #444);
                    border-radius: 4px;
                    font-size: 12px;
                }

                .ports {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 16px;
                    padding-top: 12px;
                    border-top: 1px solid var(--border-color, #444);
                }

                .port {
                    width: 12px;
                    height: 12px;
                    background: var(--port-color, #666);
                    border-radius: 50%;
                    cursor: pointer;
                }

                .port:hover {
                    background: var(--primary-color, #4CAF50);
                }
            </style>

            <div class="node-header">Waveshaper</div>

            <div class="parameter">
                <div class="parameter-label">
                    <span>Drive</span>
                    <span id="drive-value">${this._drive.toFixed(2)}</span>
                </div>
                <input 
                    type="range" 
                    id="drive" 
                    min="0" 
                    max="10" 
                    step="0.1" 
                    value="${this._drive}"
                />
            </div>

            <div class="parameter">
                <div class="parameter-label">
                    <span>Mix</span>
                    <span id="mix-value">${(this._mix * 100).toFixed(0)}%</span>
                </div>
                <input 
                    type="range" 
                    id="mix" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value="${this._mix}"
                />
            </div>

            <div class="parameter">
                <div class="parameter-label">
                    <span>Curve Type</span>
                </div>
                <select id="curve-type">
                    <option value="soft" ${this._curveType === 'soft' ? 'selected' : ''}>Soft</option>
                    <option value="hard" ${this._curveType === 'hard' ? 'selected' : ''}>Hard</option>
                    <option value="asymmetric" ${this._curveType === 'asymmetric' ? 'selected' : ''}>Asymmetric</option>
                </select>
            </div>

            <div class="ports">
                <div class="port input-port" data-port="input"></div>
                <div class="port output-port" data-port="output"></div>
            </div>
        `;
    }

    setupEventListeners() {
        const driveInput = this.shadowRoot.getElementById('drive');
        const mixInput = this.shadowRoot.getElementById('mix');
        const curveSelect = this.shadowRoot.getElementById('curve-type');

        driveInput.addEventListener('input', (e) => {
            this._drive = parseFloat(e.target.value);
            this.shadowRoot.getElementById('drive-value').textContent = this._drive.toFixed(2);
            this.publishParameterChange('drive', this._drive);
        });

        mixInput.addEventListener('input', (e) => {
            this._mix = parseFloat(e.target.value);
            this.shadowRoot.getElementById('mix-value').textContent = (this._mix * 100).toFixed(0) + '%';
            this.publishParameterChange('mix', this._mix);
        });

        curveSelect.addEventListener('change', (e) => {
            this._curveType = e.target.value;
            this.publishCurveChange(this._curveType);
        });
    }

    updateControls() {
        const driveInput = this.shadowRoot.getElementById('drive');
        const mixInput = this.shadowRoot.getElementById('mix');
        const curveSelect = this.shadowRoot.getElementById('curve-type');

        if (driveInput) driveInput.value = this._drive;
        if (mixInput) mixInput.value = this._mix;
        if (curveSelect) curveSelect.value = this._curveType;

        const driveValue = this.shadowRoot.getElementById('drive-value');
        const mixValue = this.shadowRoot.getElementById('mix-value');
        if (driveValue) driveValue.textContent = this._drive.toFixed(2);
        if (mixValue) mixValue.textContent = (this._mix * 100).toFixed(0) + '%';
    }

    /**
     * Publish parameter change to EventBus
     * Pattern: UI component → EventBus → Bounded Context
     * 
     * @param {string} paramName - Parameter name
     * @param {number} value - New value
     */
    publishParameterChange(paramName, value) {
        const event = new CustomEvent('harmony:command:graph:set-parameter', {
            bubbles: true,
            composed: true,
            detail: {
                nodeId: this._nodeId,
                parameter: paramName,
                value: value,
                timestamp: performance.now()
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Publish curve type change
     * 
     * @param {string} curveType - Curve type name
     */
    publishCurveChange(curveType) {
        const event = new CustomEvent('harmony:command:graph:set-curve', {
            bubbles: true,
            composed: true,
            detail: {
                nodeId: this._nodeId,
                curveType: curveType,
                timestamp: performance.now()
            }
        });
        window.dispatchEvent(event);
    }
}

customElements.define('waveshaper-node', WaveshaperNode);